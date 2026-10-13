"""
Builds the static base map for the analytics page from OpenStreetMap tiles.

  python3 scripts/fetch-map.py

Downloads the zoom-16 tiles around the slaughterhouse once, stitches and crops
them to the frame, mutes the colours so the data drawn on top stands out, and
writes two WebP sizes to public/karte/ plus the frame to src/lib/map-frame.json.
The page serves these files itself, so visitors' browsers never contact a tile
server. Re-run only when the frame should change.

Map data © OpenStreetMap contributors (ODbL); the tile cartography is licensed
CC BY-SA 2.0, which carries over to the derived image. The OSM tile usage policy
allows light, one-off use like this — keep the identifying User-Agent and the
pause between requests.
"""

import io
import json
import math
import tempfile
import time
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "public" / "karte"
FRAME_FILE = ROOT / "src" / "lib" / "map-frame.json"
CACHE = Path(tempfile.gettempdir()) / "bye-schlachthof-tiles"

# Keep in step with SLAUGHTERHOUSE in src/lib/geo.ts.
CENTRE = (48.12434, 11.5587)
HALF_WIDTH_METRES = 1200
HALF_HEIGHT_METRES = 900
ZOOM = 16
TILE = 256

USER_AGENT = "ByeSchlachthof/0.1 (Nachbarschaftsprojekt Muenchen; einmalige Kartenerstellung)"

# Duotone from the app's palette: OSM's black turns soft ink, its white the page canvas.
DARK = (96, 104, 100)
LIGHT = (247, 246, 241)


def world_pixel(lat: float, lon: float) -> tuple[float, float]:
    """Web Mercator position at ZOOM, in pixels from the top-left of the world."""
    scale = TILE * 2**ZOOM
    sin = math.sin(math.radians(lat))
    x = (lon + 180) / 360 * scale
    y = (0.5 - math.log((1 + sin) / (1 - sin)) / (4 * math.pi)) * scale
    return x, y


def metres_per_pixel(lat: float) -> float:
    return 156_543.033_92 * math.cos(math.radians(lat)) / 2**ZOOM


def tile(x: int, y: int) -> Image.Image:
    CACHE.mkdir(exist_ok=True)
    cached = CACHE / f"{ZOOM}-{x}-{y}.png"
    if not cached.exists():
        request = urllib.request.Request(
            f"https://tile.openstreetmap.org/{ZOOM}/{x}/{y}.png",
            headers={"User-Agent": USER_AGENT},
        )
        with urllib.request.urlopen(request, timeout=20) as response:
            cached.write_bytes(response.read())
        time.sleep(0.4)
    return Image.open(io.BytesIO(cached.read_bytes())).convert("RGB")


def main() -> None:
    centre_x, centre_y = world_pixel(*CENTRE)
    per_pixel = metres_per_pixel(CENTRE[0])
    width = round(2 * HALF_WIDTH_METRES / per_pixel)
    height = round(2 * HALF_HEIGHT_METRES / per_pixel)
    left = round(centre_x - width / 2)
    top = round(centre_y - height / 2)

    first_x, last_x = left // TILE, (left + width - 1) // TILE
    first_y, last_y = top // TILE, (top + height - 1) // TILE
    mosaic = Image.new(
        "RGB", ((last_x - first_x + 1) * TILE, (last_y - first_y + 1) * TILE)
    )
    for x in range(first_x, last_x + 1):
        for y in range(first_y, last_y + 1):
            mosaic.paste(tile(x, y), ((x - first_x) * TILE, (y - first_y) * TILE))

    offset_x, offset_y = left - first_x * TILE, top - first_y * TILE
    cropped = mosaic.crop((offset_x, offset_y, offset_x + width, offset_y + height))
    muted = ImageOps.colorize(ImageOps.grayscale(cropped), black=DARK, white=LIGHT)

    TARGET.mkdir(parents=True, exist_ok=True)
    muted.save(TARGET / "schlachthofviertel.webp", quality=72, method=6)
    small = muted.resize((width // 2, height // 2), Image.Resampling.LANCZOS)
    small.save(TARGET / "schlachthofviertel-klein.webp", quality=72, method=6)

    FRAME_FILE.write_text(
        json.dumps(
            {
                "zoom": ZOOM,
                "left": left,
                "top": top,
                "width": width,
                "height": height,
                "metresPerPixel": round(per_pixel, 4),
            },
            indent=2,
        )
        + "\n"
    )
    tiles = (last_x - first_x + 1) * (last_y - first_y + 1)
    print(f"{tiles} tiles → {width}×{height} px, frame written to {FRAME_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
