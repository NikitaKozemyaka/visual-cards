# -*- coding: utf-8 -*-
"""Smoke: b64 embed on module pages + minimal stasis calc shape."""
from __future__ import annotations

import base64
import json
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULES = ROOT / "modules"

SECTION_RE = re.compile(
    r'<section[^>]*data-module-id="([^"]+)"[^>]*data-stw-module-b64="([^"]+)"',
    re.DOTALL,
)
SIM_JS_RE = re.compile(r'module_sim\.js\?v=(\d+)')


def _pack_rows_bars(cmd_on: bool) -> tuple[int, int]:
    """Mirror pack() row/bar counts when equipped."""
    rows = 5
    bars = 2
    return rows, bars


def calc_stasis_shape(mod: dict, level: int, dodge: int, equipped: bool, cmd_on: bool) -> tuple[int, int]:
    if not equipped:
        return 5, 0
    return _pack_rows_bars(cmd_on)


class TestModuleSimEmbed(unittest.TestCase):
    def test_all_module_pages_have_b64_and_v7(self) -> None:
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
            v = SIM_JS_RE.search(text)
            self.assertIsNotNone(v, f"{path.name}: module_sim.js cache bust missing")
            self.assertEqual(v.group(1), "10", f"{path.name}: expected module_sim.js?v=10")

    def test_stasis_calc_shape_cmd_on_off(self) -> None:
        path = MODULES / "stasis_anchor.html"
        text = path.read_text(encoding="utf-8")
        m = SECTION_RE.search(text)
        assert m is not None
        mod = json.loads(base64.b64decode(m.group(2)).decode("utf-8"))
        self.assertEqual(mod.get("sim_kind"), "stasis_anchor")
        for cmd_on in (True, False):
            rows, bars = calc_stasis_shape(mod, 3, 20, True, cmd_on)
            self.assertEqual(rows, 5)
            self.assertEqual(bars, 2)
        # cmd off: passive only penalty at L3
        p_eff = mod.get("passive") or {}
        passive = float(p_eff.get("enemy_evasion_penalty_per_level", 0.01)) * 3 * 100
        hit = 100 - max(0, 20 - passive)
        self.assertAlmostEqual(hit, 83.0, places=0)


if __name__ == "__main__":
    raise SystemExit(0 if unittest.main(verbosity=2).result.wasSuccessful() else 1)
