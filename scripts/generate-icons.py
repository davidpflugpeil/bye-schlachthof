"""
Generates every icon size from the coat of arms (assets/coat-of-arms.png).

  python3 scripts/generate-icons.py

The white margin outside the shield is made transparent; the white area
inside the shield is preserved.
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "coat-of-arms.png"
TARGET = ROOT / "public"

BACKGROUND = (245, 244, 239)  # --color-canvas
FLOOD_THRESHOLD = 28


def make_transparent(image: Image.Image) -> Image.Image:
    """Turn white outside the shield transparent, keep white inside."""
    rgb = image.convert("RGB")
    marked = rgb.copy()

    width, height = rgb.size
    for corner in ((0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)):
        ImageDraw.floodfill(marked, corner, (255, 0, 255), thresh=FLOOD_THRESHOLD)

    difference = ImageChops.difference(marked, rgb).convert("L")
    alpha = difference.point(lambda value: 0 if value > 12 else 255)

    result = rgb.convert("RGBA")
    result.putalpha(alpha)
    return result


def save_compact(image: Image.Image, path: Path) -> None:
    """Flat artwork as a palette image — considerably smaller files."""
    if image.mode == "RGBA":
        image.quantize(colors=64, method=Image.FASTOCTREE).save(path, optimize=True)
    else:
        image.quantize(colors=64, method=Image.MEDIANCUT).save(path, optimize=True)


def crop_to_content(image: Image.Image) -> Image.Image:
    box = image.getbbox()
    return image.crop(box) if box else image


def square(image: Image.Image, edge: int, margin: float, background=None) -> Image.Image:
    """Centre the artwork on a square canvas with a proportional margin."""
    usable = int(edge * (1 - 2 * margin))
    copy = image.copy()
    copy.thumbnail((usable, usable), Image.LANCZOS)

    canvas = Image.new("RGBA", (edge, edge), (*background, 255) if background else (0, 0, 0, 0))
    canvas.paste(
        copy,
        ((edge - copy.width) // 2, (edge - copy.height) // 2),
        copy,
    )
    return canvas


def main() -> None:
    original = Image.open(SOURCE)
    arms = crop_to_content(make_transparent(original))
    print(f"Cut out and cropped: {arms.width}×{arms.height}")

    # Source for the header — next/image derives the display sizes from it.
    header_source = arms.copy()
    header_source.thumbnail((256, 256), Image.LANCZOS)
    save_compact(header_source, TARGET / "coat-of-arms-header.png")
    print(f"public/coat-of-arms-header.png  {header_source.width}×{header_source.height}")

    # Square icons with transparency
    for edge in (32, 64, 192, 512):
        save_compact(square(arms, edge, margin=0.03), TARGET / f"icon-{edge}.png")
        print(f"public/icon-{edge}.png")

    # iOS home screen: opaque, so the system does not add a black backdrop
    apple = square(arms, 180, margin=0.08, background=BACKGROUND).convert("RGB")
    save_compact(apple, TARGET / "apple-icon.png")
    print("public/apple-icon.png  180×180 (opaque)")

    # Android icon with a safe area for circular masks
    save_compact(
        square(arms, 512, margin=0.19, background=BACKGROUND),
        TARGET / "icon-maskable-512.png",
    )
    print("public/icon-maskable-512.png  512×512 (opaque, safe area)")


if __name__ == "__main__":
    main()
