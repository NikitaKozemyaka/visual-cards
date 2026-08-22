# -*- coding: utf-8
"""Archive location-style scene PNGs (operator + environment) for reuse.

Copies from Cursor workspace assets *_gen.png into assets/module_scenes/{id}.png.
Run once after scene generation batch.
"""
from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCENES = ROOT / "assets" / "module_scenes"
SOURCE = Path(r"C:\Users\Tema\.cursor\projects\d-STW-GAME\assets")

IDS = [
    "survival_vital_weave",
    "survival_detox_lattice",
    "combat_crit_matrix",
    "combat_kinetic_driver",
    "economy_relic_hunter",
    "economy_salvage_link",
    "mobility_vector_thruster",
    "mobility_load_anchor",
    "defense_guard_bastion",
    "defense_aegis_mesh",
    "tactical_recon_lens",
    "tactical_stasis_anchor",
    "tactical_entangle_node",
    "tactical_stasis_tuner",
]


def main() -> None:
    SCENES.mkdir(parents=True, exist_ok=True)
    for mid in IDS:
        src = SOURCE / f"{mid}_gen.png"
        dst = SCENES / f"{mid}.png"
        if not src.is_file():
            print(f"skip missing {src.name}")
            continue
        shutil.copy2(src, dst)
        print(f"archived {dst.relative_to(ROOT)}")
    print("done")


if __name__ == "__main__":
    main()
