#!/usr/bin/env python3
"""Derive every LAB brand asset from the Owner-approved canonical artwork.

The Owner-supplied master is the single authority: orange rounded-square background,
white notebook outline, WHITE pencil body. This script never redraws anything — it only

  * makes the area outside the rounded silhouette transparent, so the icon keeps its
    rounded shape in a browser tab (Chrome does not apply an iOS-style mask), and
  * resamples that artwork down to the sizes each surface needs.

Usage: python3 scripts/build-brand-assets.py <master.png>
"""
import sys
import struct

from PIL import Image, ImageDraw

MASTER = sys.argv[1] if len(sys.argv) > 1 else "/home/ubuntu/upload/favicon.png"

# Inside the artwork nothing may change; the threshold only separates the flat
# background outside the rounded square from the icon itself.
BG_THRESHOLD = 60


def cut_out_background(image: Image.Image) -> Image.Image:
    """Flood the flat background outside the rounded square to transparent."""
    image = image.convert("RGBA")
    # The white pencil and notebook are enclosed by orange, so a fill started in the
    # corners can never reach them.
    ImageDraw.floodfill(image, (0, 0), (0, 0, 0, 0), thresh=BG_THRESHOLD)
    return image


def main() -> None:
    master = cut_out_background(Image.open(MASTER))
    print(f"  master {MASTER} -> {master.size} with a transparent surround")

    targets = [
        # The header shows the mark at 32-64px, so it must not ship a 1MB file.
        # 256 covers a 64px display at 4x DPR; the browser icon is the larger one.
        ("public/brand/legendstudy-app-icon.png", 256),   # header mark
        ("src/app/icon.png", 512),                        # modern browser icon
        ("src/app/apple-icon.png", 180),                  # iOS home screen
    ]
    for path, size in targets:
        master.resize((size, size), Image.LANCZOS).save(path, optimize=True)
        print(f"  wrote {path} ({size}x{size})")

    # A multi-size .ico so small tabs get a real 16px bitmap instead of a downscale
    # of a big one. The white pencil has to stay legible in every entry.
    write_ico(master, "src/app/favicon.ico", (16, 32, 48, 64))
    print("  wrote src/app/favicon.ico (16/32/48/64)")


def write_ico(master: Image.Image, path: str, sizes) -> None:
    """Write one PNG-compressed entry per size.

    Pillow's ICO writer emits a single entry here, so the container is built by hand.
    Every browser that matters reads PNG entries, and each size is resampled from the
    master rather than from the previous size.
    """
    import io as _io

    blobs = []
    for size in sizes:
        buf = _io.BytesIO()
        master.resize((size, size), Image.LANCZOS).save(buf, format="PNG", optimize=True)
        blobs.append((size, buf.getvalue()))

    header = struct.pack("<HHH", 0, 1, len(blobs))
    offset = len(header) + 16 * len(blobs)
    entries, data = b"", b""
    for size, blob in blobs:
        dim = 0 if size >= 256 else size
        entries += struct.pack("<BBBBHHII", dim, dim, 0, 0, 1, 32, len(blob), offset)
        data += blob
        offset += len(blob)
    with open(path, "wb") as fh:
        fh.write(header + entries + data)


if __name__ == "__main__":
    main()
