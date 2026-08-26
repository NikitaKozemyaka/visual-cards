# -*- coding: utf-8 -*-
"""Smoke: b64 embed on mechanics pages + mechanics_sim.js cache bust."""
from __future__ import annotations

import base64
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MECH = ROOT / "mechanics"

SECTION_RE = re.compile(
    r'data-mechanics-id="([^"]+)"[^>]*data-stw-mechanics-b64="([^"]+)"',
    re.DOTALL,
)
SIM_JS_RE = re.compile(r"mechanics_sim\.js\?v=(\d+)")


class TestMechanicsSimEmbed(unittest.TestCase):
    def test_stabilizer_page_has_b64_and_v(self) -> None:
        path = MECH / "stabilizer.html"
        self.assertTrue(path.is_file(), "run build_mechanics_cards.py first")
        text = path.read_text(encoding="utf-8")
        m = SECTION_RE.search(text)
        self.assertIsNotNone(m, "missing data-stw-mechanics-b64 on section")
        mid, b64 = m.group(1), m.group(2)
        self.assertEqual(mid, "death_stabilizer")
        raw = base64.b64decode(b64).decode("utf-8")
        data = json.loads(raw)
        self.assertIn("demo_modules", data)
        self.assertGreaterEqual(len(data["demo_modules"]), 14)
        self.assertEqual(len(data.get("default_slots") or []), 3)
        v = SIM_JS_RE.search(text)
        self.assertIsNotNone(v, "mechanics_sim.js cache bust missing")
        self.assertEqual(v.group(1), "4")

    def test_group_search_page_has_b64_and_party_scale(self) -> None:
        path = MECH / "group_search.html"
        self.assertTrue(path.is_file(), "run build_mechanics_cards.py first")
        text = path.read_text(encoding="utf-8")
        m = SECTION_RE.search(text)
        self.assertIsNotNone(m, "missing data-stw-mechanics-b64 on section")
        mid, b64 = m.group(1), m.group(2)
        self.assertEqual(mid, "group_search_party_scale")
        raw = base64.b64decode(b64).decode("utf-8")
        data = json.loads(raw)
        scale = data.get("party_scale") or {}
        self.assertIn("hp_pct_per_level_sum", scale)
        self.assertIn("damage_pct_per_level_sum", scale)
        self.assertEqual(data.get("default_levels"), [40, 30])
        self.assertIn("party-slots", text)
        v = SIM_JS_RE.search(text)
        self.assertIsNotNone(v)
        self.assertEqual(v.group(1), "4")

    def test_catalog_page_lists_both(self) -> None:
        path = MECH / "index.html"
        self.assertTrue(path.is_file())
        text = path.read_text(encoding="utf-8")
        self.assertIn("stabilizer.html", text)
        self.assertIn("group_search.html", text)
        self.assertIn("Механики", text)


if __name__ == "__main__":
    raise SystemExit(0 if unittest.main(verbosity=2).result.wasSuccessful() else 1)
