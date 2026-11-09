#!/usr/bin/env python3
"""Renders the logo (src/renderer/js/logo.js) to build-resources/icon.png (+ sizes).
Requires: pip install playwright && playwright install chromium"""
import pathlib, re
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parent.parent
svg = re.search(r"`(<svg.*?</svg>)`", (root / "src/renderer/js/logo.js").read_text(), re.S).group(1)
out = root / "build-resources"
(out / "icons").mkdir(parents=True, exist_ok=True)
(out / "icon.svg").write_text(svg)
with sync_playwright() as p:
    b = p.chromium.launch()
    for size in (16, 32, 48, 64, 128, 256, 512, 1024):
        pg = b.new_page(viewport={"width": size, "height": size})
        sized = svg.replace('<svg ', '<svg width="%d" height="%d" ' % (size, size), 1)
        pg.set_content("<html><body style='margin:0;background:transparent'>" + sized + "</body></html>")
        pg.screenshot(path=str(out / "icons" / f"{size}x{size}.png"), omit_background=True)
        pg.close()
    b.close()
(out / "icon.png").write_bytes((out / "icons" / "512x512.png").read_bytes())
print("icons written to", out)
