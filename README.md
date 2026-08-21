# Food Name Tag Maker

**Food Name Tag Maker** is a professional, high-performance web application designed for catering services, wedding banquets, and event management to generate printable food/dish name tags in high-resolution, vector PDF format.

The application preserves the uploaded master PDF templates (Day & Night) with 100% fidelity, modifying **ONLY the food/dish name** with matched typography and automatic text auto-fitting.

---

## 🌟 Key Features

1. **Exact 6 × 4 Inch Landscape Dimensions**
   - Output PDFs are generated in exact standard printing size (**6 in × 4 in / 432 pt × 288 pt**).
   - High-resolution 300 DPI rendering and vector text preserving all borders, floral graphics, logos, wedding celebration text, contact details, and QR codes.

2. **Master Day & Night Templates**
   - ☀️ **DAY FOOD**: Uses [`templates/day-food.pdf`](templates/day-food.pdf) with warm cream floral banquet styling.
   - 🌙 **NIGHT FOOD**: Uses [`templates/night-food.pdf`](templates/night-food.pdf) with crisp white & champagne reception styling.
   - Decoupled template architecture: templates can be updated anytime in `templates/` without changing any application code.

3. **📋 Bulk Food List Import (1 Single Tag Each)**
   - Paste a whole menu list (from WhatsApp, Word, Excel, or notes).
   - Automatically sanitizes leading numbers (`1.`, `2)`), dashes, and bullet points.
   - Automatically creates **1 single name-tag page for each dish** in exact sequential order (e.g. 25 dishes = 25 pages, 1 tag each).

4. **Multi-Dish & Quantity Engine (Up to 100 Tags)**
   - **Mode A (Individual Quantities)**: Enter dishes with custom quantities summing up to 100 (e.g. 20 Paneer Butter Masala, 20 Dal Makhani, 20 Mix Veg, 20 Jeera Rice, 20 Gulab Jamun = 100 pages).
   - **Mode B (Single Dish Batch)**: Generate 100 identical copies of a single dish's tag in one click (*"Make 100 Tags of Dish #1"*).
   - **Mode C (1 Tag per Dish)**: Use *"Set All to 1 Tag Each"* or bulk paste.
   - Real-time tag counter with dynamic progress bar (`X / 100 Tags`).

5. **Smart Typography & Text Auto-Fitting**
   - Matches original master `Fraunces` serif font and `#422307` deep rich color.
   - Automatically computes width and scales font smoothly if food name is long.
   - Gracefully wraps very long dish names into balanced, vertically centered 2-line tags without clipping or overflowing.

6. **Live Real-Time 6 × 4 Interactive Preview**
   - Instant visual feedback as you type or change templates.
   - Multi-dish preview carousel to inspect all dishes in the batch before generating.

7. **Automated Vector PDF Compilation & Download**
   - Generates production-ready, multi-page PDFs ordered exactly as entered.
   - Meaningful filenames: e.g. `Day-Food-Paneer-Butter-Masala-100-Tags.pdf` or `Night-Food-Name-Tags-100-Tags.pdf`.
   - Automatic cleanup of temporary files.

---

## 📁 Project Directory Structure

```
name webapp/
├── backend/
│   ├── app.py               # FastAPI backend with preview, generate & download endpoints
│   ├── config.py            # Global dimensions, typography, and path settings
│   ├── models.py            # Pydantic request & response validation schemas
│   └── pdf_engine.py        # PyMuPDF vector redaction & text insertion engine
├── frontend/
│   ├── index.html           # Luxury catering dashboard SPA
│   └── static/
│       ├── css/
│       │   └── styles.css   # Custom animations, card states, and styling
│       └── js/
│           └── app.js       # Dynamic state, bulk paste parser, preview & API client
├── templates/
│   ├── day-food.pdf         # Master Day 6x4 template (preserved 100%)
│   └── night-food.pdf       # Master Night 6x4 template (preserved 100%)
├── fonts/
│   └── Fraunces-Regular.ttf # Fraunces serif font
├── tests/
│   └── test_app.py          # Automated test suite (9 comprehensive unit tests)
├── generated/               # Generated print-ready PDFs (auto-cleaned)
├── run.py                   # One-click startup runner
├── requirements.txt         # Dependencies list
└── README.md                # Documentation & instructions
```

---

## 🚀 How to Run and Check

### Step 1: Open Terminal in Project Folder
Open PowerShell or Command Prompt in:
```bash
cd "C:\Users\Admin\Desktop\name webapp"
```

### Step 2: Install Dependencies (Already installed)
```bash
pip install -r requirements.txt
```

### Step 3: Run the Application
```bash
python run.py
```
*(Or run with browser auto-open: `python run.py --open`)*

### Step 4: Open in Web Browser
Open your browser and navigate to:
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## 🧪 How to Run Automated Tests

To run the automated verification test suite:
```bash
python -m unittest discover -s tests -p "test_*.py"
```

The test suite automatically validates:
1. Master Day & Night template files existence.
2. Exact 6 × 4 inches physical dimensions (432 × 288 pt).
3. Live preview generation for Day and Night templates.
4. Single dish 100-page batch generation.
5. Multi-dish 100-page batch generation with correct page ordering.
6. Auto-scaling & 2-line balancing for long dish names.
7. Multi-dish list with 1 single tag each.
8. API endpoints (`/api/health`, `/api/preview`, `/api/generate`, `/api/download`).
9. Enforcement of the 100-tag limit.

---

## 📋 How to Use the App

1. **Select Template**: Click ☀️ **DAY FOOD** or 🌙 **NIGHT FOOD**.
2. **Add Food Names**:
   - **Method A (Dish by Dish)**: Type dish names, adjust quantities (`+` / `-` / presets `1`, `10`, `25`, `50`, `100`), or click `+ Add Food`.
   - **Method B (Paste Food List)**: Click **"📋 Paste Food List"**, paste your whole menu (e.g. 20 dishes), set quantity to `1`, and click **"Create 1 Single Tag for Each Dish"**.
3. **Live Preview**: Inspect the 6 × 4 preview card on the right. Use the carousel (`<` / `>`) to check all dishes in your batch.
4. **Generate**: Click **GENERATE PDF**.
5. **Download**: Click **DOWNLOAD PDF** to save the print-ready multi-page PDF.
