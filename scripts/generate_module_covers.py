# -*- coding: utf-8 -*-
"""Generate compact armor-slot module cover PNGs (640x400, 16:10)."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "covers"

W, H = 640, 400

RARITY = {
    "common": ("#8fa3b8", "#5a6d82"),
    "uncommon": ("#63d3a7", "#2a8f6a"),
    "rare": ("#5eb8ff", "#2a6db8"),
    "epic": ("#b07cff", "#6b3db8"),
    "legendary": ("#d1a03e", "#9a6a18"),
}

ARCH = {
    "survival": "#63d3a7",
    "combat": "#ff6b6b",
    "economy": "#f0b429",
    "mobility": "#5eb8ff",
    "defense": "#8fa3b8",
    "tactical": "#b07cff",
}

# id, rarity, archetype, accent hex override (optional)
MODULES = [
    ("survival_vital_weave", "uncommon", "survival", "#4ade80"),
    ("survival_detox_lattice", "uncommon", "survival", "#22d3ee"),
    ("combat_crit_matrix", "rare", "combat", "#f87171"),
    ("combat_kinetic_driver", "epic", "combat", "#fb923c"),
    ("economy_relic_hunter", "rare", "economy", "#fbbf24"),
    ("economy_salvage_link", "uncommon", "economy", "#f59e0b"),
    ("mobility_vector_thruster", "rare", "mobility", "#38bdf8"),
    ("mobility_load_anchor", "uncommon", "mobility", "#2dd4bf"),
    ("defense_guard_bastion", "epic", "defense", "#94a3b8"),
    ("defense_aegis_mesh", "rare", "defense", "#60a5fa"),
    ("tactical_recon_lens", "rare", "tactical", "#a78bfa"),
    ("tactical_stasis_anchor", "legendary", "tactical", "#c084fc"),
    ("tactical_entangle_node", "epic", "tactical", "#e879f9"),
    ("tactical_stasis_tuner", "rare", "tactical", "#818cf8"),
]


def _hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def _lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def _bg() -> Image.Image:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    px = img.load()
    c0 = (8, 14, 24)
    c1 = (14, 22, 36)
    for y in range(H):
        t = y / max(H - 1, 1)
        for x in range(W):
            u = x / max(W - 1, 1)
            r = _lerp(c0[0], c1[0], t * 0.7 + u * 0.3)
            g = _lerp(c0[1], c1[1], t * 0.7 + u * 0.3)
            b = _lerp(c0[2], c1[2], t * 0.7 + u * 0.3)
            px[x, y] = (r, g, b, 255)
    return img


def _slot_hint(draw: ImageDraw.ImageDraw, cx: int, cy: int) -> None:
    """Faint armor socket recess behind the module."""
    w, h = 190, 96
    x0, y0 = cx - w // 2, cy - h // 2
    draw.rounded_rectangle(
        (x0, y0, x0 + w, y0 + h),
        radius=14,
        outline=(255, 255, 255, 12),
        width=1,
        fill=(255, 255, 255, 4),
    )
    for i in range(5):
        px = x0 + 20 + i * 32
        draw.rounded_rectangle(
            (px, y0 + h - 6, px + 18, y0 + h + 2),
            radius=2,
            fill=(255, 255, 255, 10),
        )


def _chip_body(
    draw: ImageDraw.ImageDraw,
    cx: int,
    cy: int,
    accent: tuple[int, int, int],
    rarity_glow: tuple[int, int, int],
) -> tuple[int, int, int, int]:
    """Compact insert: ~140x44 px — thin armor-slot puck."""
    bw, bh = 140, 44
    x0, y0 = cx - bw // 2, cy - bh // 2
    x1, y1 = x0 + bw, y0 + bh
    metal = (32, 42, 58)
    metal_hi = (52, 64, 82)
    # outer glow ring
    draw.rounded_rectangle(
        (x0 - 6, y0 - 6, x1 + 6, y1 + 6),
        radius=16,
        outline=(*rarity_glow, 70),
        width=2,
    )
    # chassis shadow
    draw.rounded_rectangle(
        (x0 + 2, y0 + 3, x1 + 2, y1 + 3),
        radius=11,
        fill=(12, 18, 28, 220),
    )
    # chassis
    draw.rounded_rectangle(
        (x0, y0, x1, y1),
        radius=11,
        fill=(*metal, 255),
        outline=(255, 255, 255, 28),
        width=1,
    )
    # top bevel
    draw.rounded_rectangle(
        (x0 + 3, y0 + 3, x1 - 3, y0 + 11),
        radius=5,
        fill=(*metal_hi, 200),
    )
    # slot pins (left edge — inserts into armor)
    for i in range(4):
        py = y0 + 11 + i * 8
        draw.rectangle((x0 - 5, py, x0 - 1, py + 4), fill=(160, 172, 188, 220))
    # screw heads
    for sx in (x0 + 10, x1 - 10):
        draw.ellipse((sx - 2, y0 + 6, sx + 2, y0 + 10), fill=(90, 100, 118, 255))
    # core window
    cw, ch = 46, 28
    cx0 = x0 + bw - cw - 10
    cy0 = cy - ch // 2
    draw.rounded_rectangle(
        (cx0, cy0, cx0 + cw, cy0 + ch),
        radius=7,
        fill=(8, 12, 20, 255),
        outline=(*accent, 220),
        width=2,
    )
    return cx0, cy0, cx0 + cw, cy0 + ch


def _draw_motif(
    draw: ImageDraw.ImageDraw,
    mid: str,
    core: tuple[int, int, int, int],
    accent: tuple[int, int, int],
) -> None:
    x0, y0, x1, y1 = core
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    a = (*accent, 255)

    if mid == "survival_vital_weave":
        draw.line([(cx - 14, cy), (cx - 4, cy - 8), (cx + 6, cy + 10), (cx + 16, cy - 4)], fill=a, width=2)
    elif mid == "survival_detox_lattice":
        for i in range(-2, 3):
            draw.line([(x0 + 8, cy + i * 6), (x1 - 8, cy + i * 6)], fill=(*accent, 80), width=1)
        draw.ellipse((cx - 8, cy - 8, cx + 8, cy + 8), outline=a, width=2)
    elif mid == "combat_crit_matrix":
        draw.line([(cx, y0 + 6), (cx, y1 - 6)], fill=a, width=2)
        draw.line([(x0 + 8, cy), (x1 - 8, cy)], fill=a, width=2)
        draw.ellipse((cx - 5, cy - 5, cx + 5, cy + 5), fill=a)
    elif mid == "combat_kinetic_driver":
        draw.polygon([(cx - 12, cy + 8), (cx + 14, cy), (cx - 12, cy - 8)], outline=a, fill=(*accent, 60))
    elif mid == "economy_relic_hunter":
        draw.arc((cx - 12, cy - 12, cx + 12, cy + 12), 200, 340, fill=a, width=2)
        draw.line([(cx, cy - 12), (cx, cy + 12)], fill=a, width=2)
    elif mid == "economy_salvage_link":
        draw.arc((cx - 10, cy - 14, cx + 10, cy + 2), 0, 180, fill=a, width=3)
        draw.rectangle((cx - 10, cy + 2, cx + 10, cy + 8), fill=a)
    elif mid == "mobility_vector_thruster":
        draw.polygon([(cx - 14, cy), (cx - 2, cy - 6), (cx - 2, cy + 6)], fill=a)
        draw.polygon([(cx + 2, cy - 4), (cx + 14, cy), (cx + 2, cy + 4)], fill=(*accent, 120))
    elif mid == "mobility_load_anchor":
        for i in range(3):
            draw.rounded_rectangle(
                (x0 + 10 + i * 14, cy - 8, x0 + 20 + i * 14, cy + 8),
                radius=2,
                outline=a,
                width=1,
            )
    elif mid == "defense_guard_bastion":
        draw.polygon(
            [(cx, y0 + 5), (x1 - 8, cy + 10), (cx, y1 - 5), (x0 + 8, cy + 10)],
            outline=a,
            fill=(*accent, 40),
        )
    elif mid == "defense_aegis_mesh":
        for row in range(3):
            for col in range(4):
                hx = x0 + 10 + col * 11 + (row % 2) * 5
                hy = y0 + 8 + row * 10
                draw.polygon([(hx, hy), (hx + 8, hy), (hx + 4, hy + 7)], outline=a, fill=(*accent, 30))
    elif mid == "tactical_recon_lens":
        draw.ellipse((cx - 11, cy - 11, cx + 11, cy + 11), outline=a, width=2)
        draw.ellipse((cx - 4, cy - 4, cx + 4, cy + 4), fill=a)
    elif mid == "tactical_stasis_anchor":
        draw.line([(cx, cy - 12), (cx, cy + 6)], fill=a, width=2)
        draw.arc((cx - 10, cy + 2, cx + 10, cy + 14), 0, 180, fill=a, width=2)
        draw.line([(cx - 12, cy + 10), (cx + 12, cy + 10)], fill=a, width=2)
    elif mid == "tactical_entangle_node":
        for ang in range(0, 360, 60):
            rad = math.radians(ang)
            ex = cx + int(12 * math.cos(rad))
            ey = cy + int(12 * math.sin(rad))
            draw.line([(cx, cy), (ex, ey)], fill=(*accent, 100), width=1)
        draw.ellipse((cx - 6, cy - 6, cx + 6, cy + 6), fill=a)
    elif mid == "tactical_stasis_tuner":
        draw.ellipse((cx - 12, cy - 12, cx + 12, cy + 12), outline=a, width=2)
        draw.line([(cx, cy), (cx + 8, cy - 6)], fill=a, width=2)
    else:
        draw.ellipse((cx - 6, cy - 6, cx + 6, cy + 6), fill=a)

    # label strip on chip left (archetype stripe)
    draw.rounded_rectangle(
        (core[0] - 44, core[1] + 3, core[0] - 6, core[3] - 3),
        radius=3,
        fill=(*accent, 45),
    )


def render_module(mid: str, rarity: str, archetype: str, accent_hex: str) -> Image.Image:
    accent = _hex_rgb(accent_hex or ARCH.get(archetype, "#5eb8ff"))
    glow = _hex_rgb(RARITY.get(rarity, RARITY["common"])[0])
    cx, cy = W // 2, H // 2 + 8

    base = _bg()
    glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow_layer)
    gdraw.ellipse(
        (cx - 120, cy - 80, cx + 120, cy + 80),
        fill=(*glow, 28),
    )
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(24))
    base = Image.alpha_composite(base, glow_layer)

    draw = ImageDraw.Draw(base)
    _slot_hint(draw, cx, cy)
    core = _chip_body(draw, cx, cy, accent, glow)
    _draw_motif(draw, mid, core, accent)

    # subtle vignette
    vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vdraw = ImageDraw.Draw(vig)
    vdraw.rectangle((0, 0, W, H), fill=(0, 0, 0, 0))
    for i in range(40):
        a = int(i * 1.8)
        vdraw.rectangle((i, i, W - i, H - i), outline=(0, 0, 0, a))
    base = Image.alpha_composite(base, vig)
    return base.convert("RGB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for mid, rarity, arch, accent in MODULES:
        img = render_module(mid, rarity, arch, accent)
        path = OUT / f"{mid}.png"
        img.save(path, "PNG", optimize=True)
        print(f"wrote {path.name} ({img.size[0]}x{img.size[1]})")
    print(f"done: {len(MODULES)} covers -> {OUT}")


if __name__ == "__main__":
    main()
