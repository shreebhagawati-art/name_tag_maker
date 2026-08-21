#!/usr/bin/env python3
"""
Food Name Tag Maker — Startup Runner
Launches the FastAPI backend and provides local access to the dashboard.
"""

import sys
import webbrowser
import uvicorn

if __name__ == "__main__":
    host = "127.0.0.1"
    port = 8000
    url = f"http://{host}:{port}"
    print("=" * 60)
    print("  FOOD NAME TAG MAKER")
    print(f"  Starting web application on: {url}")
    print("=" * 60)
    
    # Optional auto-launch browser
    if "--open" in sys.argv:
        webbrowser.open(url)

    uvicorn.run("backend.app:app", host=host, port=port, reload=True)
