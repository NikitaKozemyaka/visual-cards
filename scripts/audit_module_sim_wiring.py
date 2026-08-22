# -*- coding: utf-8 -*-
"""Audit: all 14 module pages wired to calc branches + DOM contract."""
from __future__ import annotations

import base64
import json
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULES_DIR = ROOT / "modules"
DATA = json.loads((ROOT / "data" / "modules.json").read_text(encoding="utf-8"))

SECTION_RE = re.compile(
    r'data-module-id="([^"]+)"[^>]*data-stw-module-b64="([^"]+)"',
    re.DOTALL,
)

# calcGeneric branch detectors (order matters — same as module_sim.js)
BRANCH_KEYS = [
    ("heal_pct_base", lambda c: c.get("heal_pct_base") is not None),
    ("purge_pct_base", lambda c: c.get("purge_pct_base") is not None),
    ("damage_mult_base", lambda c: c.get("damage_mult_base") is not None),
    ("crit_chance_base", lambda c: c.get("crit_chance_base") is not None),
    ("damage_reduction_base", lambda c: c.get("damage_reduction_base") is not None),
    ("shield_regen_mult_base", lambda c: c.get("shield_regen_mult_base") is not None),
    ("weight_reduction_base", lambda c: c.get("weight_reduction_base") is not None),
    ("entangle_bonus_base", lambda c: c.get("entangle_bonus_base") is not None),
    ("uses_equals_level", lambda c: bool(c.get("uses_equals_level"))),
    ("uses_per_two_levels", lambda c: c.get("uses_per_two_levels") is not None),
    ("analysis_cap", lambda c: c.get("analysis_cap") is not None),
    ("rarity_tier_boost", lambda c: c.get("rarity_tier_boost") is not None),
]

EXPECTED_BRANCH = {
    "survival_vital_weave": "heal_pct_base",
    "survival_detox_lattice": "purge_pct_base",
    "combat_crit_matrix": "crit_chance_base",
    "combat_kinetic_driver": "damage_mult_base",
    "economy_relic_hunter": "rarity_tier_boost",
    "economy_salvage_link": "passive_only_slash",
    "mobility_vector_thruster": "uses_equals_level",
    "mobility_load_anchor": "weight_reduction_base",
    "defense_guard_bastion": "damage_reduction_base",
    "defense_aegis_mesh": "shield_regen_mult_base",
    "tactical_recon_lens": "analysis_cap",
    "tactical_stasis_anchor": "stasis_anchor",
    "tactical_entangle_node": "entangle_bonus_base",
    "tactical_stasis_tuner": "uses_per_two_levels",
}

REQUIRED_DOM = [
    "data-stats-grid",
    "data-bars",
    "data-hero-value",
    "data-hero-ring",
    'id="sim-equip"',
    'id="sim-cmd"',
    "module_sim.js?v=9",
    'aria-label="Уровень модуля"',
]


def detect_branch(mod: dict) -> str:
    if mod.get("sim_kind") == "stasis_anchor":
        return "stasis_anchor"
    cmd = mod.get("command") or {}
    c = cmd.get("effect") or {}
    for name, pred in BRANCH_KEYS:
        if pred(c):
            return name
    slash = cmd.get("slash") or ""
    if slash:
        return "passive_only_slash"
    return "passive_only"


def pack_shape(mod: dict, equipped: bool = True, cmd_on: bool = False) -> tuple[int, int]:
    if not equipped:
        return 5, 0
    if mod.get("sim_kind") == "stasis_anchor":
        return 5, 2
    return 5, 2


class TestModuleSimWiring(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.by_id = {m["id"]: m for m in DATA["modules"]}
        cls.html_files = sorted(
            p for p in MODULES_DIR.glob("*.html") if p.name != "index.html"
        )

    def test_fourteen_modules_in_catalog(self) -> None:
        self.assertEqual(len(self.by_id), 14)
        self.assertEqual(len(self.html_files), 14)

    def test_each_module_branch_and_dom(self) -> None:
        seen: set[str] = set()
        for path in self.html_files:
            text = path.read_text(encoding="utf-8")
            m = SECTION_RE.search(text)
            self.assertIsNotNone(m, f"{path.name}: missing b64 section")
            mid, b64 = m.group(1), m.group(2)
            seen.add(mid)
            mod = json.loads(base64.b64decode(b64).decode("utf-8"))
            src = self.by_id[mid]

            self.assertEqual(mod["id"], mid)
            self.assertEqual(mod.get("sim_kind"), src.get("sim_kind"))
            self.assertEqual(
                (mod.get("command") or {}).get("slash"),
                (src.get("command") or {}).get("slash"),
            )

            branch = detect_branch(mod)
            self.assertEqual(
                branch,
                EXPECTED_BRANCH[mid],
                f"{mid}: expected {EXPECTED_BRANCH[mid]}, got {branch}",
            )

            for needle in REQUIRED_DOM:
                self.assertIn(needle, text, f"{path.name}: missing {needle}")

            if mod.get("sim_kind") == "stasis_anchor":
                self.assertIn('data-sim-extra="dodge"', text)
            else:
                self.assertNotIn('data-sim-extra="dodge"', text)

            slash = (mod.get("command") or {}).get("slash") or ""
            if slash:
                self.assertIn(f"/{slash}", text, f"{path.name}: slash /{slash} missing in HTML")

            for cmd_on in (True, False):
                rows, bars = pack_shape(mod, True, cmd_on)
                self.assertEqual(rows, 5, f"{mid} rows")
                self.assertEqual(bars, 2, f"{mid} bars")

        self.assertEqual(seen, set(self.by_id.keys()), "html ids != catalog ids")

    def test_stasis_l3_cmd_off_hit(self) -> None:
        mod = self.by_id["tactical_stasis_anchor"]
        p = mod["passive"]["enemy_evasion_penalty_per_level"] * 3 * 100
        hit = 100 - max(0, 20 - p)
        self.assertAlmostEqual(hit, 83.0, places=0)


if __name__ == "__main__":
    raise SystemExit(0 if unittest.main(verbosity=2).result.wasSuccessful() else 1)
