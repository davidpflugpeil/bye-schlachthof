"""
Generates the artwork the printed flyers use (flyer/assets/).

  pip install pillow segno
  python3 scripts/generate-flyer-assets.py

Writes the QR code pointing at the public site and a print-resolution cut-out
of the coat of arms. Rerun it only when the public address or the brand mark
changes.
"""

from pathlib import Path

import segno
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "coat-of-arms.png"
TARGET = ROOT / "flyer" / "assets"

# The home page rather than /melden: most people scan while nothing smells, and
# the home page offers the iPhone shortcut first and the report button right
# below it.
SITE_URL = "https://www.byeschlachthof.de"

INK = "#16211f"  # --color-ink
QUIET_ZONE = 4  # modules of white around the code, as the QR standard requires
FLOOD_THRESHOLD = 28


def write_qr(path: Path) -> None:
    """QR code as filled squares — stroked lines leave hairline seams in some PDF viewers."""
    qr = segno.make_qr(SITE_URL, error="q")
    rows = [list(row) for row in qr.matrix]
    size = len(rows) + 2 * QUIET_ZONE

    runs = []
    for y, row in enumerate(rows):
        x = 0
        while x < len(row):
            if not row[x]:
                x += 1
                continue
            start = x
            while x < len(row) and row[x]:
                x += 1
            runs.append(f"M{start + QUIET_ZONE} {y + QUIET_ZONE}h{x - start}v1h-{x - start}z")

    path.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" '
        f'shape-rendering="crispEdges">'
        f'<rect width="{size}" height="{size}" fill="#fff"/>'
        f'<path fill="{INK}" d="{"".join(runs)}"/>'
        f"</svg>\n"
    )
    print(f"{path.relative_to(ROOT)}  version {qr.designator}, {size}×{size} modules → {SITE_URL}")


def write_shield(path: Path) -> None:
    """The shield with the white margin around it made transparent, at full resolution."""
    rgb = Image.open(SOURCE).convert("RGB")
    marked = rgb.copy()

    width, height = rgb.size
    for corner in ((0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)):
        ImageDraw.floodfill(marked, corner, (255, 0, 255), thresh=FLOOD_THRESHOLD)

    difference = ImageChops.difference(marked, rgb).convert("L")
    alpha = difference.point(lambda value: 0 if value > 12 else 255)

    shield = rgb.convert("RGBA")
    shield.putalpha(alpha)
    shield = shield.crop(shield.getbbox())
    # Flat artwork: a palette without dithering keeps the file small and the areas clean.
    shield.quantize(colors=256, method=Image.FASTOCTREE, dither=Image.Dither.NONE).save(
        path, optimize=True
    )
    print(f"{path.relative_to(ROOT)}  {shield.width}×{shield.height}")


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    write_qr(TARGET / "qr.svg")
    write_shield(TARGET / "kindl.png")


if __name__ == "__main__":
    main()
