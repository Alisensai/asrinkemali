"""Capture screenshots at reference resolutions to verify visual fidelity."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS_DIR = ROOT / "docs" / "screenshots"
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

RESOLUTIONS = [
    ("desktop-1536x1024.png", 1536, 1024),
    ("desktop-1440x900.png", 1440, 900),
    ("desktop-1366x768.png", 1366, 768),
    ("tablet-1024x768.png", 1024, 768),
    ("tablet-768x1024.png", 768, 1024),
    ("mobile-430x932.png", 430, 932),
    ("mobile-390x844.png", 390, 844),
    ("mobile-360x800.png", 360, 800),
]

def main():
    url = (ROOT / "index.html").resolve().as_uri()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name, width, height in RESOLUTIONS:
            page = browser.new_page(viewport={"width": width, "height": height})
            page.goto(url, wait_until="networkidle")
            target = SCREENSHOTS_DIR / name
            page.screenshot(path=str(target), full_page=False)
            print(f"Captured: {target.relative_to(ROOT)} ({width}x{height})")
            page.close()
        browser.close()
    print("All fidelity screenshots captured successfully.")

if __name__ == "__main__":
    main()
