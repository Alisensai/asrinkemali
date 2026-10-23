"""Compare the approved reference with the current 1536x1024 Next.js capture."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageStat


ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT / "design" / "ONAYLANAN-TASARIM.webp"
ACTUAL = ROOT / "docs" / "screenshots" / "nextjs-desktop-1536x1024.png"
DIFF = ROOT / "docs" / "screenshots" / "nextjs-reference-diff.png"
REPORT = ROOT / "docs" / "screenshots" / "nextjs-reference-diff.json"


def main() -> None:
    reference = Image.open(REFERENCE).convert("RGB")
    actual = Image.open(ACTUAL).convert("RGB")
    if reference.size != actual.size:
        raise SystemExit(f"Boyutlar eşleşmiyor: {reference.size} != {actual.size}")

    difference = ImageChops.difference(reference, actual)
    stats = ImageStat.Stat(difference)
    mean_absolute_error = sum(stats.mean) / len(stats.mean)
    pixels = difference.load()
    changed = sum(
        1
        for y in range(difference.height)
        for x in range(difference.width)
        if max(pixels[x, y]) > 32
    )
    changed_percent = changed * 100 / (difference.width * difference.height)

    ImageEnhance.Contrast(difference).enhance(2.5).save(DIFF)
    payload = {
        "reference": str(REFERENCE.relative_to(ROOT)),
        "actual": str(ACTUAL.relative_to(ROOT)),
        "dimensions": list(reference.size),
        "mean_absolute_error_0_255": round(mean_absolute_error, 3),
        "pixels_over_32_percent": round(changed_percent, 3),
        "note": "Piksel farkı, içerik ve font render farklarını da kapsar; görsel kabulün tek ölçütü değildir.",
    }
    REPORT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    main()
