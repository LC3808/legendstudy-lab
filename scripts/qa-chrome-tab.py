#!/usr/bin/env python3
"""Capture the real Chrome tab strip so the favicon can be checked as shipped.

Headless Chrome has no tab strip, so this runs a headed Chromium on an Xvfb display
and grabs the root window with ImageMagick. Run it through xvfb-run.

Usage: xvfb-run -a --server-args="-screen 0 1500x900x24" python3 scripts/qa-chrome-tab.py <url> <out.png>
"""
import os
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8099/"
out = sys.argv[2] if len(sys.argv) > 2 else "qa-shots/chrome-tab.png"

with sync_playwright() as p:
    # Only the headless shell ships with the Python package here, so the headed
    # run uses the system Chromium to get a real tab strip.
    exe = "/usr/bin/chromium" if os.path.exists("/usr/bin/chromium") else None
    browser = p.chromium.launch(headless=False, executable_path=exe,
        args=["--no-sandbox", "--disable-dev-shm-usage", "--window-size=1400,880"])
    page = browser.new_page(viewport={"width": 1380, "height": 820})
    page.goto(url, wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(2500)
    title = page.title()
    subprocess.run(["import", "-window", "root", out], check=True)
    print(f"  captured {out} for {url} (title: {title})")
    browser.close()