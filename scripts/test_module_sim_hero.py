# -*- coding: utf-8 -*-
"""Smoke: b64 embed + sim_display + hero regression (L3, cmd off/on) + charge rounds."""
from __future__ import annotations

import base64
import json
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULES = ROOT / "modules"
DATA = json.loads((ROOT / "data" / "modules.json").read_text(encoding="utf-8"))

SECTION_RE = re.compile(
    r'<section[^>]*data-module-id="([^"]+)"[^>]*data-stw-module-b64="([^"]+)"',
    re.DOTALL,
)
SIM_JS_RE = re.compile(r"module_sim\.js\?v=(\d+)")


def _pct(n: float, digits: int = 0) -> str:
    v = round(n, digits)
    if digits == 0:
        return f"{v:.0f}%"
    return f"{v:g}%" if v % 1 else f"{v:.0f}%"


def charge_duration_rounds(effect: dict, level: int) -> int:
    """Match STW _combat_charge_duration_rounds / module_sim chargeDurationRounds."""
    per = int(effect.get("duration_rounds_per_level") or 3)
    cap = int(effect.get("duration_rounds_cap") or 27)
    lvl = max(1, int(level or 1))
    return min(max(1, cap), max(1, per * lvl))


def hero_stasis(mod: dict, level: int, dodge: int, cmd_on: bool) -> str:
    p = float(mod["passive"]["enemy_evasion_penalty_per_level"]) * level * 100
    c = mod["command"]["effect"]
    pin = (
        min(95, float(c["enemy_evasion_penalty_per_level"]) * level * 100)
        if cmd_on
        else 0
    )
    hit = 100 - max(0, dodge - p - pin)
    return _pct(hit, 0)


def hero_vital_weave(mod: dict, level: int, cmd_on: bool) -> str:
    hp = mod["passive"]["max_health_per_level"] * level
    c = mod["command"]["effect"]
    heal = (c["heal_pct_base"] + c["heal_pct_per_level"] * (level - 1)) * 100
    if cmd_on:
        return _pct(heal, 0)
    return f"+{hp}"


def hero_relic_hunter(mod: dict, level: int, cmd_on: bool) -> str:
    p = mod["passive"]
    pf = p.get("rare_find_bonus_per_level", 0) * level * 100
    if cmd_on:
        return "+1 к редкости"
    return f"+{_pct(pf, 1).replace('%', '')}%" if pf else "—"


def hero_kinetic(mod: dict, level: int, cmd_on: bool) -> str:
    pass_d = mod["passive"]["damage_pct_per_level"] * level * 100
    c = mod["command"]["effect"]
    cmd_d = (c["damage_mult_base"] + c["damage_mult_per_level"] * (level - 1)) * 100
    total = pass_d + (cmd_d if cmd_on else 0)
    return f"+{total:g}%"


def hero_entangle(mod: dict, level: int, cmd_on: bool) -> str:
    pass_e = mod["passive"]["entangler_per_level"] * level * 100
    c = mod["command"]["effect"]
    cmd_e = (c["entangle_bonus_base"] + c["entangle_bonus_per_level"] * (level - 1)) * 100
    total = pass_e + (cmd_e if cmd_on else 0)
    return f"+{total:g}%"


class TestModuleSimEmbed(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.by_id = {m["id"]: m for m in DATA["modules"]}

    def test_all_module_pages_have_b64_and_v11(self) -> None:
        html_files = sorted(p for p in MODULES.glob("*.html") if p.name != "index.html")
        self.assertGreaterEqual(len(html_files), 14, "expected 14 module pages")
        for path in html_files:
            text = path.read_text(encoding="utf-8")
            m = SECTION_RE.search(text)
            self.assertIsNotNone(m, f"{path.name}: missing data-stw-module-b64 on section")
            mid, b64 = m.group(1), m.group(2)
            raw = base64.b64decode(b64).decode("utf-8")
            mod = json.loads(raw)
            self.assertEqual(mod["id"], mid, f"{path.name}: id mismatch")
            self.assertIn("sim_display", mod, f"{path.name}: sim_display missing")
            v = SIM_JS_RE.search(text)
            self.assertIsNotNone(v, f"{path.name}: module_sim.js cache bust missing")
            self.assertEqual(v.group(1), "11", f"{path.name}: expected module_sim.js?v=11")

    def test_stasis_hero_regression(self) -> None:
        mod = self.by_id["tactical_stasis_anchor"]
        self.assertEqual(hero_stasis(mod, 3, 20, False), "83%")
        self.assertEqual(hero_stasis(mod, 3, 20, True), "98%")

    def test_split_economy_hero_regression(self) -> None:
        vital = self.by_id["survival_vital_weave"]
        self.assertEqual(hero_vital_weave(vital, 3, False), "+30")
        self.assertEqual(hero_vital_weave(vital, 3, True), "29%")

        relic = self.by_id["economy_relic_hunter"]
        self.assertIn("3.6", hero_relic_hunter(relic, 3, False))
        self.assertEqual(hero_relic_hunter(relic, 3, True), "+1 к редкости")

    def test_combined_pct_hero_regression_v52(self) -> None:
        kinetic = self.by_id["combat_kinetic_driver"]
        # v5.2: pass 2%/L, cmd 25%+4%*(L-1) → L3 off 6%, on 39%
        self.assertIn("6", hero_kinetic(kinetic, 3, False))
        self.assertIn("39", hero_kinetic(kinetic, 3, True))

        ent = self.by_id["tactical_entangle_node"]
        # v5.2: pass 1.2%/L, cmd 18%+1.5%*(L-1) → L3 off 3.6%, on 24.6%
        self.assertIn("3.6", hero_entangle(ent, 3, False))
        self.assertIn("24.6", hero_entangle(ent, 3, True))

    def test_timed_charge_rounds_l3_l9(self) -> None:
        timed_ids = (
            "combat_kinetic_driver",
            "combat_crit_matrix",
            "defense_aegis_mesh",
            "defense_guard_bastion",
            "tactical_entangle_node",
            "tactical_stasis_anchor",
        )
        for mid in timed_ids:
            effect = self.by_id[mid]["command"]["effect"]
            self.assertIn(
                "duration_rounds_per_level",
                effect,
                f"{mid}: missing duration_rounds_per_level after rebuild",
            )
            self.assertEqual(charge_duration_rounds(effect, 1), 3, mid)
            self.assertEqual(charge_duration_rounds(effect, 3), 9, mid)
            self.assertEqual(charge_duration_rounds(effect, 9), 27, mid)
            self.assertNotIn(
                "duration_rounds_base",
                effect,
                f"{mid}: legacy duration_rounds_base should be gone",
            )


if __name__ == "__main__":
    raise SystemExit(0 if unittest.main(verbosity=2).result.wasSuccessful() else 1)
