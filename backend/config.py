import os
from pathlib import Path

# Base project directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Directory paths
TEMPLATES_DIR = BASE_DIR / "templates"
FONTS_DIR = BASE_DIR / "fonts"
GENERATED_DIR = BASE_DIR / "generated"
FRONTEND_DIR = BASE_DIR / "frontend"

# Template file paths
DAY_TEMPLATE_PATH = TEMPLATES_DIR / "day-food.pdf"
NIGHT_TEMPLATE_PATH = TEMPLATES_DIR / "night-food.pdf"

# Font paths
FRAUNCES_FONT_PATH = FONTS_DIR / "Fraunces-Regular.ttf"

# PDF Specifications
PAGE_WIDTH_PT = 432.0   # 6.0 inches (6 * 72)
PAGE_HEIGHT_PT = 288.0  # 4.0 inches (4 * 72)
TARGET_DPI = 300

# Text Layout Configuration
SAFE_TEXT_WIDTH = 340.0
DEFAULT_FONT_SIZE = 25.10
MIN_SINGLE_LINE_FONT_SIZE = 14.5
TEXT_BASELINE_Y = 125.54
TEXT_COLOR_RGB = (66 / 255.0, 35 / 255.0, 7 / 255.0)  # #422307
TEXT_REDACT_RECT = (35.0, 100.0, 397.0, 134.0)

# Constraints
MAX_TOTAL_TAGS = 100
MAX_FOOD_NAME_LENGTH = 120
