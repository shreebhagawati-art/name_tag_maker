import os
import re
import uuid
import base64
from pathlib import Path
from typing import List, Tuple, Dict, Any
import pymupdf

from .config import (
    DAY_TEMPLATE_PATH,
    NIGHT_TEMPLATE_PATH,
    FRAUNCES_FONT_PATH,
    GENERATED_DIR,
    PAGE_WIDTH_PT,
    PAGE_HEIGHT_PT,
    SAFE_TEXT_WIDTH,
    DEFAULT_FONT_SIZE,
    MIN_SINGLE_LINE_FONT_SIZE,
    TEXT_BASELINE_Y,
    TEXT_COLOR_RGB,
    TEXT_REDACT_RECT,
    MAX_TOTAL_TAGS,
)
from .models import TagItem

def get_template_path(template_name: str) -> Path:
    """Resolve and validate template file path."""
    t_lower = template_name.lower().strip()
    if t_lower == "night":
        path = NIGHT_TEMPLATE_PATH
    else:
        path = DAY_TEMPLATE_PATH

    if not path.exists():
        raise FileNotFoundError(f"Template PDF not found at {path}")
    return path

def format_dish_name(name: str) -> str:
    """Format dish name for printing (clean extra spaces, uppercase to match master design)."""
    clean = re.sub(r"\s+", " ", name).strip()
    return clean.upper()

def slugify(text: str) -> str:
    """Convert text to a safe filename component."""
    cleaned = re.sub(r"[^\w\s-]", "", text).strip()
    return re.sub(r"[-\s]+", "-", cleaned)

def render_tag_on_page(page: pymupdf.Page, food_name: str) -> Dict[str, Any]:
    """
    Erases only the old food name vector text and inserts the new food name
    with typography matching the original template design.
    """
    display_name = format_dish_name(food_name)
    if not display_name:
        display_name = "PANEER BUTTER MASALA"

    # Redact only the text area without touching images/background graphics
    redact_rect = pymupdf.Rect(*TEXT_REDACT_RECT)
    page.add_redact_annot(redact_rect, fill=None)
    page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE)

    font_path_str = str(FRAUNCES_FONT_PATH.resolve())
    if not FRAUNCES_FONT_PATH.exists():
        raise FileNotFoundError(f"Font not found at {FRAUNCES_FONT_PATH}")

    # Register the font with the page
    page.insert_font(fontname="Fraunces", fontfile=font_path_str)
    font_calc = pymupdf.Font(fontfile=font_path_str)

    # Calculate text layout
    raw_width = font_calc.text_length(display_name, fontsize=DEFAULT_FONT_SIZE)
    
    font_size_used = DEFAULT_FONT_SIZE
    lines_count = 1

    if raw_width <= SAFE_TEXT_WIDTH:
        # Standard single line
        font_size_used = DEFAULT_FONT_SIZE
        start_x = (PAGE_WIDTH_PT - raw_width) / 2.0
        page.insert_text(
            pymupdf.Point(start_x, TEXT_BASELINE_Y),
            display_name,
            fontname="Fraunces",
            fontsize=font_size_used,
            color=TEXT_COLOR_RGB,
        )
    else:
        # Check single-line scaled down
        scaled_size = DEFAULT_FONT_SIZE * (SAFE_TEXT_WIDTH / raw_width)
        if scaled_size >= MIN_SINGLE_LINE_FONT_SIZE:
            font_size_used = round(scaled_size, 2)
            actual_w = font_calc.text_length(display_name, fontsize=font_size_used)
            start_x = (PAGE_WIDTH_PT - actual_w) / 2.0
            page.insert_text(
                pymupdf.Point(start_x, TEXT_BASELINE_Y),
                display_name,
                fontname="Fraunces",
                fontsize=font_size_used,
                color=TEXT_COLOR_RGB,
            )
        else:
            # Multi-line (2 lines) balanced wrapping
            lines_count = 2
            words = display_name.split()
            if len(words) > 1:
                best_split = len(words) // 2
                best_diff = float("inf")
                for i in range(1, len(words)):
                    l1 = " ".join(words[:i])
                    l2 = " ".join(words[i:])
                    w1 = font_calc.text_length(l1, fontsize=1.0)
                    w2 = font_calc.text_length(l2, fontsize=1.0)
                    diff = abs(w1 - w2)
                    if diff < best_diff:
                        best_diff = diff
                        best_split = i
                line1 = " ".join(words[:best_split])
                line2 = " ".join(words[best_split:])
            else:
                line1 = display_name
                line2 = ""
                lines_count = 1

            if line2:
                w1 = font_calc.text_length(line1, fontsize=DEFAULT_FONT_SIZE)
                w2 = font_calc.text_length(line2, fontsize=DEFAULT_FONT_SIZE)
                max_w = max(w1, w2)
                font_size_used = min(15.5, DEFAULT_FONT_SIZE * (SAFE_TEXT_WIDTH / max_w))
                font_size_used = round(max(10.0, font_size_used), 2)

                w1_act = font_calc.text_length(line1, fontsize=font_size_used)
                w2_act = font_calc.text_length(line2, fontsize=font_size_used)

                line_height = font_size_used * 1.18
                y1 = 117.0 - (line_height / 2.0) + (font_size_used * 0.35)
                y2 = y1 + line_height

                page.insert_text(
                    pymupdf.Point((PAGE_WIDTH_PT - w1_act) / 2.0, y1),
                    line1,
                    fontname="Fraunces",
                    fontsize=font_size_used,
                    color=TEXT_COLOR_RGB,
                )
                page.insert_text(
                    pymupdf.Point((PAGE_WIDTH_PT - w2_act) / 2.0, y2),
                    line2,
                    fontname="Fraunces",
                    fontsize=font_size_used,
                    color=TEXT_COLOR_RGB,
                )
            else:
                # Single long word fallback
                font_size_used = round(scaled_size, 2)
                actual_w = font_calc.text_length(line1, fontsize=font_size_used)
                start_x = (PAGE_WIDTH_PT - actual_w) / 2.0
                page.insert_text(
                    pymupdf.Point(start_x, TEXT_BASELINE_Y),
                    line1,
                    fontname="Fraunces",
                    fontsize=font_size_used,
                    color=TEXT_COLOR_RGB,
                )

    return {
        "food_name": display_name,
        "font_size_used": font_size_used,
        "lines_count": lines_count,
    }

def generate_preview(template_name: str, food_name: str, dpi: int = 150) -> Dict[str, Any]:
    """Generates a high-quality preview image (base64 PNG) of a single tag."""
    template_path = get_template_path(template_name)
    doc = pymupdf.open(str(template_path))
    try:
        page = doc[0]
        meta = render_tag_on_page(page, food_name)
        pix = page.get_pixmap(dpi=dpi)
        img_bytes = pix.tobytes(output="png")
        b64 = base64.b64encode(img_bytes).decode("ascii")
        data_url = f"data:image/png;base64,{b64}"
        return {
            "success": True,
            "image_base64": data_url,
            "template": template_name.capitalize(),
            "food_name": meta["food_name"],
            "font_size_used": meta["font_size_used"],
            "lines_count": meta["lines_count"],
        }
    finally:
        doc.close()

def generate_pdf(template_name: str, items: List[TagItem]) -> Tuple[Path, str, int]:
    """
    Generates a complete multi-page 6x4 inch PDF based on the dishes and quantities.
    Returns: (output_file_path, filename, total_pages)
    """
    template_path = get_template_path(template_name)
    total_tags = sum(item.quantity for item in items)
    if total_tags <= 0:
        raise ValueError("Total quantity must be greater than 0.")
    if total_tags > MAX_TOTAL_TAGS:
        raise ValueError(f"Total quantity exceeds the maximum allowed limit of {MAX_TOTAL_TAGS}.")

    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    file_id = str(uuid.uuid4())
    output_pdf_path = GENERATED_DIR / f"{file_id}.pdf"

    output_doc = pymupdf.open()
    try:
        for item in items:
            dish_name = item.name.strip()
            quantity = item.quantity
            if not dish_name or quantity <= 0:
                continue

            # Create a single tag page document for this dish
            item_doc = pymupdf.open(str(template_path))
            try:
                page = item_doc[0]
                render_tag_on_page(page, dish_name)

                # Append identical copies for the quantity
                for _ in range(quantity):
                    output_doc.insert_pdf(item_doc, from_page=0, to_page=0)
            finally:
                item_doc.close()

        total_pages = len(output_doc)
        if total_pages == 0:
            raise ValueError("No valid name tags were generated.")

        # Save optimized vector PDF
        output_doc.save(str(output_pdf_path), garbage=4, deflate=True)

        # Generate standard filename
        template_label = "Day-Food" if template_name.lower() == "day" else "Night-Food"
        if len(items) == 1:
            dish_slug = slugify(items[0].name.title())
            if not dish_slug:
                dish_slug = "Dish"
            filename = f"{template_label}-{dish_slug}-{total_tags}-Tags.pdf"
        else:
            filename = f"{template_label}-Name-Tags-{total_tags}-Tags.pdf"

        return output_pdf_path, filename, total_pages
    finally:
        output_doc.close()
