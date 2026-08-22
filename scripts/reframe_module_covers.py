# -*- coding: utf-8 -*-
"""Reframe original module cover art: smaller in frame, less bulky on cards."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
COVERS = ROOT / "assets" / "covers"

# Module occupies ~62% of canvas — reads as armor-slot insert, not a huge slab.
SCALE = 0.62
BG = (11, 18, 32)


def reframe_one(src: Path, scale: float = SCALE) -> None:
    img = Image.open(src).convert("RGB")
    w, h = img.size
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    small = img.resize((nw, nh), Image.Resampling.LANCZOS)
    out = Image.new("RGB", (w, h), BG)
    x, y = (w - nw) // 2, (h - nh) // 2
    out.paste(small, (x, y))
    # Soft vignette so edges melt into card background
    vig = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(vig)
    draw.ellipse((-w * 0.08, -h * 0.12, w * 1.08, h * 1.12), fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(radius=min(w, h) // 12))
    dark = Image.new("RGB", (w, h), BG)
    out = Image.composite(out, dark, vig)
    out.save(src, "PNG", optimize=True)
    print(f"reframed {src.name} ({w}x{h}, scale={scale})")


def main() -> None:
    files = sorted(COVERS.glob("*.png"))
    if not files:
        raise SystemExit(f"no PNG in {COVERS}")
    for path in files:
        reframe_one(path)
    print(f"done: {len(files)} covers")


if __name__ == "__main__":
    main()
