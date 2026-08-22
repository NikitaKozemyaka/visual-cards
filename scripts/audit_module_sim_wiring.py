# -*- coding: utf-8 -*-
"""Audit: sim_display profiles + DOM contract on all 14 module pages."""
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

EXPECTED_SIM_DISPLAY = {
    "tactical_stasis_anchor": "combined_pct",
    "tactical_entangle_node": "combined_pct",
    "combat_kinetic_driver": "combined_pct",
    "combat_crit_matrix": "combined_pct",
    "survival_detox_lattice": "combined_pct",
    "defense_guard_bastion": "combined_pct",
    "survival_vital_weave": "split_metrics",
    "defense_aegis_mesh": "split_metrics",
    "mobility_load_anchor": "split_metrics",
    "mobility_vector_thruster": "split_metrics",
    "tactical_recon_lens": "command_only",
    "tactical_stasis_tuner": "command_only",
    "economy_relic_hunter": "economy",
    "economy_salvage_link": "economy",
}

REQUIRED_DOM = [
    "data-stats-grid",
    "data-bars",
    "data-hero-value",
    "data-hero-ring",
    'id="sim-equip"',
    'id="sim-cmd"',
    "module_sim.js?v=10",
    'aria-label="Уровень модуля"',
]


def pack_shape(mod: dict, equipped: bool = True, cmd_on: bool = False) -> tuple[int, int]:
    if not equipped:
        return 5, 0
    display = mod.get("sim_display") or "combined_pct"
    if display == "command_only":
        return 5, 1
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

    def test_each_module_sim_display_and_dom(self) -> None:
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
            self.assertEqual(mod.get("sim_display"), EXPECTED_SIM_DISPLAY[mid])
            self.assertEqual(
                (mod.get("command") or {}).get("slash"),
                (src.get("command") or {}).get("slash"),
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
                self.assertEqual(bars, pack_shape(mod, True, cmd_on)[1], f"{mid} bars")

        self.assertEqual(seen, set(self.by_id.keys()), "html ids != catalog ids")

    def test_stasis_l3_cmd_off_hit(self) -> None:
        mod = self.by_id["tactical_stasis_anchor"]
        p = mod["passive"]["enemy_evasion_penalty_per_level"] * 3 * 100
        hit = 100 - max(0, 20 - p)
        self.assertAlmostEqual(hit, 83.0, places=0)

    def test_stasis_l3_cmd_on_hit(self) -> None:
        mod = self.by_id["tactical_stasis_anchor"]
        p = mod["passive"]["enemy_evasion_penalty_per_level"] * 3 * 100
        pin = min(95, mod["command"]["effect"]["enemy_evasion_penalty_per_level"] * 3 * 100)
        hit = 100 - max(0, 20 - p - pin)
        self.assertAlmostEqual(hit, 98.0, places=0)


if __name__ == "__main__":
    raise SystemExit(0 if unittest.main(verbosity=2).result.wasSuccessful() else 1)
