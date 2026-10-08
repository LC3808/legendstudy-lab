#!/usr/bin/env python3
"""Derive every LAB brand asset from the Owner-approved canonical artwork.

The Owner-supplied master is the single authority: orange rounded-square background,
white notebook outline, WHITE pencil body. This script never redraws anything — it only

  * makes the area outside the rounded silhouette transparent, so the icon keeps its
    rounded shape in a browser tab (Chrome does not apply an iOS-style mask), and
  * resamples that artwork down to the sizes each surface needs.

The master itself lives in the APP repository as
assets/brand/source/legendstudy_app_icon_master.png, and this repo keeps the same file at
assets/brand/source/ so a build never depends on another checkout. CANONICAL_SHA256 pins
the Owner-confirmed artwork: if the file ever changes, this script refuses to run rather
than quietly shipping a different mark.

Usage: python3 scripts/build-brand-assets.py [master.png] [--allow-other-master]
"""
import hashlib
import sys
import struct
import os

from PIL import Image, ImageDraw

CANONICAL_SHA256 = "e37afa18ceaf9e27ab275c1cb460b512697baa3d745689ed741c871ce079abfe"
DEFAULT_MASTER = "assets/brand/source/legendstudy_app_icon_master.png"
MASTER = next((a for a in sys.argv[1:] if not a.startswith("--")), DEFAULT_MASTER)


def assert_canonical(path: str) -> None:
    digest = hashlib.sha256(open(path, "rb").read()).hexdigest()
    if digest == CANONICAL_SHA256:
        print(f"  master sha256 {digest[:16]}... matches the canonical artwork")
        return
    if "--allow-other-master" in sys.argv:
        print(f"  WARNING: {path} is not the canonical master ({digest[:16]}...)")
        return
    raise SystemExit(
        f"refusing to build: {path} has sha256 {digest},\n"
        f"expected {CANONICAL_SHA256} (the Owner-confirmed canonical artwork).\n"
        "Pass --allow-other-master only if the Owner has replaced the master.")

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
    assert_canonical(MASTER)
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
