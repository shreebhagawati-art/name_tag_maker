import os
import sys
import unittest
from pathlib import Path
import pymupdf
from fastapi.testclient import TestClient

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.config import (
    DAY_TEMPLATE_PATH,
    NIGHT_TEMPLATE_PATH,
    FRAUNCES_FONT_PATH,
    PAGE_WIDTH_PT,
    PAGE_HEIGHT_PT,
)
from backend.models import TagItem, GenerateRequest
from backend.pdf_engine import generate_preview, generate_pdf, format_dish_name
from backend.app import app

class TestFoodTagMaker(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_01_assets_exist(self):
        """Ensure all required master templates and fonts exist."""
        self.assertTrue(DAY_TEMPLATE_PATH.exists(), "Day template missing")
        self.assertTrue(NIGHT_TEMPLATE_PATH.exists(), "Night template missing")
        self.assertTrue(FRAUNCES_FONT_PATH.exists(), "Fraunces font missing")

    def test_02_template_dimensions(self):
        """Verify master templates are exact 6x4 inches."""
        for path in [DAY_TEMPLATE_PATH, NIGHT_TEMPLATE_PATH]:
            doc = pymupdf.open(str(path))
            page = doc[0]
            self.assertEqual(page.rect.width, PAGE_WIDTH_PT, f"Width mismatch in {path.name}")
            self.assertEqual(page.rect.height, PAGE_HEIGHT_PT, f"Height mismatch in {path.name}")
            doc.close()

    def test_03_preview_generation(self):
        """Test preview generation for Day and Night."""
        for t in ["day", "night"]:
            res = generate_preview(t, "Paneer Butter Masala", dpi=100)
            self.assertTrue(res["success"])
            self.assertTrue(res["image_base64"].startswith("data:image/png;base64,"))
            self.assertEqual(res["food_name"], "PANEER BUTTER MASALA")
            self.assertEqual(res["lines_count"], 1)

    def test_04_single_dish_100_pages(self):
        """Test generating 100 identical copies of one dish."""
        items = [TagItem(name="Paneer Butter Masala", quantity=100)]
        pdf_path, filename, total_pages = generate_pdf("day", items)
        
        self.assertTrue(pdf_path.exists())
        self.assertEqual(total_pages, 100)
        self.assertEqual(filename, "Day-Food-Paneer-Butter-Masala-100-Tags.pdf")

        # Verify page count and dimensions in actual PDF
        doc = pymupdf.open(str(pdf_path))
        self.assertEqual(len(doc), 100)
        for page in doc:
            self.assertEqual(page.rect.width, PAGE_WIDTH_PT)
            self.assertEqual(page.rect.height, PAGE_HEIGHT_PT)
        doc.close()

    def test_05_multi_dish_100_pages(self):
        """Test generating multiple dishes summing to 100 tags."""
        items = [
            TagItem(name="Paneer Butter Masala", quantity=20),
            TagItem(name="Dal Makhani", quantity=20),
            TagItem(name="Mix Veg", quantity=20),
            TagItem(name="Jeera Rice", quantity=20),
            TagItem(name="Gulab Jamun", quantity=20),
        ]
        pdf_path, filename, total_pages = generate_pdf("night", items)
        
        self.assertTrue(pdf_path.exists())
        self.assertEqual(total_pages, 100)
        self.assertEqual(filename, "Night-Food-Name-Tags-100-Tags.pdf")

        doc = pymupdf.open(str(pdf_path))
        self.assertEqual(len(doc), 100)
        # Check order: first 20 should have Paneer Butter Masala, next 20 Dal Makhani, etc.
        self.assertIn("PANEER BUTTER MASALA", doc[0].get_text())
        self.assertIn("DAL MAKHANI", doc[20].get_text())
        self.assertIn("MIX VEG", doc[40].get_text())
        self.assertIn("JEERA RICE", doc[60].get_text())
        self.assertIn("GULAB JAMUN", doc[80].get_text())
        doc.close()

    def test_06_long_name_text_fitting(self):
        """Test auto-fitting long dish names."""
        long_dish = "Paneer Butter Masala With Special Indian Spices"
        items = [TagItem(name=long_dish, quantity=2)]
        pdf_path, _, total = generate_pdf("day", items)
        self.assertEqual(total, 2)
        doc = pymupdf.open(str(pdf_path))
        txt = doc[0].get_text()
        self.assertIn("PANEER BUTTER MASALA", txt)
        doc.close()

    def test_07_api_endpoints(self):
        """Test FastAPI API endpoints."""
        # Health
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["day_template_available"])

        # Preview
        res = self.client.post("/api/preview", json={"template": "day", "food_name": "Shahi Paneer"})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["success"])

        # Generate
        res = self.client.post("/api/generate", json={
            "template": "day",
            "items": [{"name": "Shahi Paneer", "quantity": 10}]
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["total_pages"], 10)

        # Download
        dl_res = self.client.get(f"/api/download/{data['file_id']}?name={data['filename']}")
        self.assertEqual(dl_res.status_code, 200)
        self.assertEqual(dl_res.headers["content-type"], "application/pdf")

    def test_08_limit_validation(self):
        """Test that requests exceeding 100 tags are properly rejected."""
        with self.assertRaises(ValueError):
            GenerateRequest(template="day", items=[TagItem(name="Test", quantity=101)])

    def test_09_food_list_single_tag_each(self):
        """Test generating single name tags (1 tag each) for a multi-dish food list."""
        dish_list = [
            "Paneer Butter Masala",
            "Dal Makhani",
            "Shahi Paneer",
            "Mix Vegetable Curry",
            "Jeera Rice",
            "Gulab Jamun",
            "Hyderabadi Veg Biryani",
            "Chole Masala",
            "Malai Kofta",
            "Kashmiri Pulao"
        ]
        # 1 single tag per dish
        items = [TagItem(name=dish, quantity=1) for dish in dish_list]
        pdf_path, filename, total_pages = generate_pdf("day", items)

        self.assertEqual(total_pages, 10)
        self.assertTrue(pdf_path.exists())

        doc = pymupdf.open(str(pdf_path))
        self.assertEqual(len(doc), 10)
        for i, dish in enumerate(dish_list):
            page_text = doc[i].get_text().upper()
            # Verify each page contains its respective single dish name
            self.assertIn(dish.upper(), page_text, f"Page {i} missing dish {dish}")
            self.assertEqual(doc[i].rect.width, PAGE_WIDTH_PT)
            self.assertEqual(doc[i].rect.height, PAGE_HEIGHT_PT)
        doc.close()

if __name__ == "__main__":
    unittest.main()
