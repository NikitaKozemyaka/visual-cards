# -*- coding: utf-8 -*-
"""Module sprite pipeline: isolated item art -> full-bleed cover 1536x1024.

Scenes (landscape with operator) live in assets/module_scenes/ — separate asset.
Sprites drop into assets/covers/_sprites/{id}.png, then:
  python scripts/generate_module_sprites.py
writes assets/covers/{id}.png for the catalog.

Style reference: original module pixel art (c33f304) — compact armor-slot insert.
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
STW = Path(r"D:\STW_GAME")
COVERS = ROOT / "assets" / "covers"
SPRITES = COVERS / "_sprites"
SCENES = ROOT / "assets" / "module_scenes"
# Legacy module art for style reference (cursor workspace cache or git c33f304 covers)
STYLE_REF = Path(r"C:\Users\Tema\.cursor\projects\d-STW-GAME\assets")

TARGET_W, TARGET_H = 1536, 1024
SPRITE_HEIGHT_RATIO = 0.62  # module sprite height vs canvas (compact but hero)

RARITY_GLOW = {
    "common": (143, 163, 184),
    "uncommon": (99, 211, 167),
    "rare": (94, 184, 255),
    "epic": (176, 124, 255),
    "legendary": (209, 160, 62),
    "mythic": (255, 120, 180),
}

# id -> (rarity, short sprite description for image gen)
MODULE_SPRITE_SPEC: dict[str, tuple[str, str]] = {
    "survival_vital_weave": (
        "uncommon",
        "green neural life-weave implant chip, bio-circuit glow, compact armor slot module",
    ),
    "survival_detox_lattice": (
        "uncommon",
        "cyan detox filter lattice module, nitrogen purge ports, small armor insert",
    ),
    "combat_crit_matrix": (
        "rare",
        "red crit matrix combat module, crosshair core, compact chest-slot insert",
    ),
    "combat_kinetic_driver": (
        "epic",
        "orange kinetic overcharge driver module, capacitor ridges, shoulder-slot size",
    ),
    "economy_relic_hunter": (
        "rare",
        "gold relic hunter PGM scanner module, artifact sensor, belt-kit size insert",
    ),
    "economy_salvage_link": (
        "uncommon",
        "amber ferro-sensor salvage link module, magnet coil, scavenger armor insert",
    ),
    "mobility_vector_thruster": (
        "rare",
        "blue vector thruster module, micro jet nozzles, leg-armor slot insert",
    ),
    "mobility_load_anchor": (
        "uncommon",
        "teal grav load-anchor module, stabilizer fins, backpack-frame insert",
    ),
    "defense_guard_bastion": (
        "epic",
        "steel guard bastion module, shield plating, bracer armor insert",
    ),
    "defense_aegis_mesh": (
        "rare",
        "blue aegis mesh shield module, hex energy grid, forearm slot insert",
    ),
    "tactical_recon_lens": (
        "rare",
        "purple tactical recon lens module, optics stack, helmet-side insert",
    ),
    "tactical_stasis_anchor": (
        "legendary",
        "legendary purple stasis anchor module, crystal anchor core, chest slot insert",
    ),
    "tactical_entangle_node": (
        "epic",
        "violet quantum entangle node module, swirl core, wrist armor insert",
    ),
    "tactical_stasis_tuner": (
        "rare",
        "indigo stasis tuner module, distance dial ring, gauntlet insert",
    ),
}

SPRITE_PROMPT = (
    "Pixel art game sprite, isolated armor module item ONLY, {detail}. "
    "Palm-sized compact cybernetic insert for power armor slot, 3/4 isometric view, "
    "detailed worn metal and emissive glow. "
    "NO landscape background, NO character, NO text, NO UI. "
    "Plain very dark navy background. "
    "Module is the only subject, compact NOT a huge slab, "
    "similar rendering style and mood to the reference module artwork."
)


def style_reference(module_id: str) -> Path | None:
    for base in (STYLE_REF, COVERS):
        p = base / f"{module_id}.png"
        if p.is_file():
            return p
    return None


def build_sprite_prompt(module_id: str) -> str:
    rarity, detail = MODULE_SPRITE_SPEC[module_id]
    _ = rarity
    return SPRITE_PROMPT.format(detail=detail)


def _gradient_bg(w: int, h: int, glow: tuple[int, int, int]) -> Image.Image:
    base = Image.new("RGB", (w, h), (8, 14, 24))
    px = base.load()
    cx, cy = w // 2, h // 2
    max_r = (w * w + h * h) ** 0.5 / 2
    for y in range(h):
        for x in range(w):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            t = max(0.0, 1.0 - d / max_r)
            r = int(8 + glow[0] * t * 0.22)
            g = int(14 + glow[1] * t * 0.22)
            b = int(24 + glow[2] * t * 0.22)
            px[x, y] = (min(255, r), min(255, g), min(255, b))
    return base


def pack_sprite_cover(sprite_path: Path, module_id: str, dst: Path) -> None:
    """Composite sprite onto full-bleed 1536x1024 cover (no letterbox)."""
    rarity, _ = MODULE_SPRITE_SPEC[module_id]
    glow = RARITY_GLOW.get(rarity, RARITY_GLOW["common"])
    bg = _gradient_bg(TARGET_W, TARGET_H, glow)

    sprite = Image.open(sprite_path).convert("RGBA")
    # Trim near-uniform dark borders
    bbox = sprite.getbbox()
    if bbox:
        sprite = sprite.crop(bbox)

    sw, sh = sprite.size
    target_h = int(TARGET_H * SPRITE_HEIGHT_RATIO)
    scale = target_h / sh
    target_w = int(sw * scale)
    if target_w > TARGET_W * 0.85:
        scale = (TARGET_W * 0.85) / sw
        target_w = int(sw * scale)
        target_h = int(sh * scale)
    else:
        target_h = int(sh * scale)

    sprite = sprite.resize((target_w, target_h), Image.Resampling.LANCZOS)
    x = (TARGET_W - target_w) // 2
    y = (TARGET_H - target_h) // 2
    bg.paste(sprite, (x, y), sprite)

    # Soft vignette (keeps full-bleed, darkens corners only)
    vig = Image.new("L", (TARGET_W, TARGET_H), 0)
    draw = ImageDraw.Draw(vig)
    draw.ellipse(
        (-TARGET_W * 0.05, -TARGET_H * 0.08, TARGET_W * 1.05, TARGET_H * 1.08),
        fill=255,
    )
    vig = vig.filter(ImageFilter.GaussianBlur(radius=48))
    dark = Image.new("RGB", (TARGET_W, TARGET_H), (6, 10, 18))
    bg = Image.composite(bg, dark, vig)

    dst.parent.mkdir(parents=True, exist_ok=True)
    bg.save(dst, "PNG", optimize=True)


def export_specs() -> None:
    rows = []
    for mid, (rarity, detail) in MODULE_SPRITE_SPEC.items():
        ref = style_reference(mid)
        rows.append(
            {
                "id": mid,
                "rarity": rarity,
                "detail": detail,
                "prompt": build_sprite_prompt(mid),
                "style_ref": str(ref) if ref else None,
                "scene_asset": f"assets/module_scenes/{mid}.png",
            }
        )
    out = ROOT / "scripts" / "module_sprite_specs.json"
    out.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {out}")


def main() -> None:
    SPRITES.mkdir(parents=True, exist_ok=True)
    missing = []
    for mid in MODULE_SPRITE_SPEC:
        src = SPRITES / f"{mid}.png"
        dst = COVERS / f"{mid}.png"
        if not src.is_file():
            missing.append(mid)
            continue
        pack_sprite_cover(src, mid, dst)
        print(f"cover {mid} <- {src.name} ({TARGET_W}x{TARGET_H})")
    if missing:
        print(f"missing sprites: {', '.join(missing)}")
    else:
        print(f"done: {len(MODULE_SPRITE_SPEC)} covers")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--export-specs":
        export_specs()
    else:
        main()
