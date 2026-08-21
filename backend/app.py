import os
import time
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from .config import (
    BASE_DIR,
    FRONTEND_DIR,
    GENERATED_DIR,
    DAY_TEMPLATE_PATH,
    NIGHT_TEMPLATE_PATH,
    FRAUNCES_FONT_PATH,
)
from .models import (
    PreviewRequest,
    PreviewResponse,
    GenerateRequest,
    GenerateResponse,
)
from .pdf_engine import (
    generate_preview,
    generate_pdf,
    slugify,
)

app = FastAPI(
    title="Food Name Tag Maker API",
    description="Backend service for generating printable 6x4 inch food name tags",
    version="1.0.0",
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def cleanup_old_files():
    """Remove generated PDF files older than 30 minutes to prevent disk accumulation."""
    try:
        if not GENERATED_DIR.exists():
            return
        current_time = time.time()
        for f in GENERATED_DIR.glob("*.pdf"):
            try:
                if current_time - f.stat().st_mtime > 1800:
                    f.unlink(missing_ok=True)
            except Exception:
                pass
    except Exception:
        pass

@app.get("/api/health")
async def health_check():
    """Check API status and template availability."""
    return {
        "status": "healthy",
        "day_template_available": DAY_TEMPLATE_PATH.exists(),
        "night_template_available": NIGHT_TEMPLATE_PATH.exists(),
        "font_available": FRAUNCES_FONT_PATH.exists(),
    }

@app.post("/api/preview", response_model=PreviewResponse)
async def api_preview(req: PreviewRequest):
    """Generate a real-time visual preview of a dish tag."""
    try:
        result = generate_preview(req.template, req.food_name, dpi=150)
        return PreviewResponse(**result)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview generation failed: {str(e)}")

@app.post("/api/generate", response_model=GenerateResponse)
async def api_generate(req: GenerateRequest, background_tasks: BackgroundTasks):
    """Generate the full multi-page 6x4 PDF for the provided dishes and quantities."""
    try:
        output_pdf_path, filename, total_pages = generate_pdf(req.template, req.items)
        file_id = output_pdf_path.stem

        # Schedule background cleanup
        background_tasks.add_task(cleanup_old_files)

        total_tags = sum(item.quantity for item in req.items)
        template_title = "Day Food" if req.template == "day" else "Night Food"
        message = f"{total_tags} {template_title} name tags generated successfully."

        return GenerateResponse(
            success=True,
            file_id=file_id,
            filename=filename,
            total_pages=total_pages,
            total_items=len(req.items),
            message=message,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Something went wrong while generating your PDF. Please check your food names and try again.",
        )

@app.get("/api/download/{file_id}")
async def api_download(file_id: str, name: Optional[str] = None):
    """Download a generated PDF file by ID."""
    # Sanitize file_id to prevent path traversal
    safe_file_id = Path(file_id).name
    pdf_path = GENERATED_DIR / f"{safe_file_id}.pdf"

    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="Generated file not found or expired. Please generate again.")

    download_name = name if name and name.endswith(".pdf") else f"Food-Name-Tags-{safe_file_id[:8]}.pdf"

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=download_name,
        headers={"Content-Disposition": f'attachment; filename="{download_name}"'},
    )

# Mount frontend static directory if exists
static_dir = FRONTEND_DIR / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.get("/")
async def serve_index():
    """Serve main frontend SPA."""
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return JSONResponse({"message": "Food Name Tag Maker API is running. Frontend index.html not found."})
