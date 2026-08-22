# -*- coding: utf-8 -*-
"""Mirror tests: mechanics_sim.js formulas vs STW_GAME module_death_stabilizer."""
from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path

STW = Path(r"D:\STW_GAME")
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(STW))

from game_core import module_death_stabilizer as mds  # noqa: E402

DETOX = "survival_detox_lattice"
KINETIC = "combat_kinetic_driver"
AEGIS = "defense_aegis_mesh"

SHARD_BASE_BY_RARITY = {
    "common": 2,
    "uncommon": 3,
    "rare": 4,
    "epic": 7,
    "legendary": 10,
    "mythic": 15,
}
RARITY_RANK = {
    "common": 0,
    "uncommon": 1,
    "rare": 2,
    "epic": 3,
    "legendary": 4,
    "mythic": 5,
}

ITEMS_STUB = {
    DETOX: {"id": DETOX, "name": "Detox", "rarity": "rare", "type": "module"},
    KINETIC: {"id": KINETIC, "name": "Kinetic", "rarity": "epic", "type": "module"},
    AEGIS: {"id": AEGIS, "name": "Aegis", "rarity": "legendary", "type": "module"},
    mds.SHARDS_ITEM_ID: {
        "id": mds.SHARDS_ITEM_ID,
        "name": "Shards",
        "type": "material",
    },
}


def _catalog_from_items(items: dict) -> dict:
    return {
        "modules_by_id": {
            k: v for k, v in items.items() if (v or {}).get("type") == "module"
        },
        "items": items,
    }


def py_shards_for_module(module_id: str, level: int, catalog: dict) -> int:
    """Mirror mechanics_sim.js shardsForModule."""
    lvl = max(1, int(level or 1))
    meta = (catalog.get("modules_by_id") or {}).get(module_id) or {}
    rarity = str(meta.get("rarity") or "common").lower()
    if rarity not in RARITY_RANK:
        rarity = "common"
    base = SHARD_BASE_BY_RARITY[rarity]
    return max(0, base + (lvl - 1) // 2)


def py_pick_save_index(slots: list, catalog: dict) -> int | None:
    """Mirror mechanics_sim.js pickSaveIndex."""
    best = None
    best_key = None
    for i, slot in enumerate(slots):
        if not slot or not slot.get("id"):
            continue
        mid = slot["id"]
        meta = (catalog.get("modules_by_id") or {}).get(mid) or {}
        rarity = str(meta.get("rarity") or "common").lower()
        rank = RARITY_RANK.get(rarity, 0)
        lvl = max(1, int(slot.get("level") or 1))
        key = rank * 10000 + lvl * 100 + (100 - i)
        if best_key is None or key > best_key:
            best_key = key
            best = i
    return best


def py_simulate_death(*, armed: bool, slots: list, catalog: dict) -> dict:
    """Mirror mechanics_sim.js simulateDeath."""
    report = {
        "stabilizer_armed": armed,
        "stabilizer_consumed": False,
        "stabilizer_burned_empty": False,
        "saved_module_id": None,
        "saved_module_level": None,
        "lost_modules": [],
        "lost_module_levels": [],
        "shards_gained": 0,
    }
    active = []
    for i, s in enumerate(slots):
        if s and s.get("id"):
            active.append(
                {"index": i, "id": s["id"], "level": max(1, int(s.get("level") or 1))}
            )
    if not active:
        if armed:
            report["stabilizer_consumed"] = True
            report["stabilizer_burned_empty"] = True
        return report

    keep_index = None
    if armed:
        keep_index = py_pick_save_index(
            [{"id": a["id"], "level": a["level"]} for a in active], catalog
        )
        if keep_index is not None:
            kept = active[keep_index]
            report["saved_module_id"] = kept["id"]
            report["saved_module_level"] = kept["level"]
        report["stabilizer_consumed"] = True

    for j, a in enumerate(active):
        if armed and j == keep_index:
            continue
        report["lost_modules"].append(a["id"])
        report["lost_module_levels"].append(a["level"])
        report["shards_gained"] += py_shards_for_module(a["id"], a["level"], catalog)
    return report


class TestShardFormulaMirror(unittest.TestCase):
    def setUp(self) -> None:
        self.catalog = _catalog_from_items(ITEMS_STUB)

    def test_legendary_l9(self) -> None:
        py_val = py_shards_for_module(AEGIS, 9, self.catalog)
        canon = mds.shards_for_destroyed_module(AEGIS, 9, items=ITEMS_STUB)
        self.assertEqual(py_val, 14)
        self.assertEqual(canon, 14)

    def test_epic_l1(self) -> None:
        py_val = py_shards_for_module(KINETIC, 1, self.catalog)
        canon = mds.shards_for_destroyed_module(KINETIC, 1, items=ITEMS_STUB)
        self.assertEqual(py_val, 7)
        self.assertEqual(canon, 7)


class TestPickSaveMirror(unittest.TestCase):
    def setUp(self) -> None:
        self.catalog = _catalog_from_items(ITEMS_STUB)

    def test_rarity_then_level_then_index(self) -> None:
        slots = [
            {"id": DETOX, "level": 9},
            {"id": KINETIC, "level": 9},
            {"id": AEGIS, "level": 2},
        ]
        armor = {
            "installed_modules": [DETOX, KINETIC, AEGIS],
            "installed_module_levels": [9, 9, 2],
        }
        self.assertEqual(py_pick_save_index(slots, self.catalog), 2)
        self.assertEqual(mds.pick_module_save_index(armor, items=ITEMS_STUB), 2)

    def test_same_rarity_higher_level(self) -> None:
        slots = [
            {"id": KINETIC, "level": 3},
            {"id": KINETIC, "level": 8},
        ]
        armor = {
            "installed_modules": [KINETIC, KINETIC],
            "installed_module_levels": [3, 8],
        }
        items = {KINETIC: {"rarity": "epic"}}
        cat = _catalog_from_items(items)
        self.assertEqual(py_pick_save_index(slots, cat), 1)
        self.assertEqual(mds.pick_module_save_index(armor, items=items), 1)


class TestSimulateDeathMirror(unittest.TestCase):
    def setUp(self) -> None:
        self.catalog = _catalog_from_items(ITEMS_STUB)

    def test_default_preset_17_shards(self) -> None:
        slots = [
            {"id": DETOX, "level": 5},
            {"id": KINETIC, "level": 9},
            {"id": AEGIS, "level": 3},
        ]
        report = py_simulate_death(armed=True, slots=slots, catalog=self.catalog)
        self.assertEqual(report["saved_module_id"], AEGIS)
        self.assertEqual(report["saved_module_level"], 3)
        self.assertEqual(set(report["lost_modules"]), {DETOX, KINETIC})
        self.assertEqual(report["shards_gained"], 17)

    def test_unarmed_all_lost(self) -> None:
        slots = [
            {"id": DETOX, "level": 5},
            {"id": KINETIC, "level": 9},
        ]
        report = py_simulate_death(armed=False, slots=slots, catalog=self.catalog)
        self.assertIsNone(report["saved_module_id"])
        expected = mds.shards_for_destroyed_module(DETOX, 5, items=ITEMS_STUB)
        expected += mds.shards_for_destroyed_module(KINETIC, 9, items=ITEMS_STUB)
        self.assertEqual(report["shards_gained"], expected)
        self.assertEqual(set(report["lost_modules"]), {DETOX, KINETIC})

    def test_armed_empty_burns(self) -> None:
        report = py_simulate_death(armed=True, slots=[], catalog=self.catalog)
        self.assertTrue(report["stabilizer_burned_empty"])
        self.assertEqual(report["shards_gained"], 0)

    def test_armed_matches_apply_salvage_shards(self) -> None:
        player = {
            "equipped_armor": "a1",
            mds.ARMED_KEY: True,
            "inventory": {},
            "item_instances": {
                "a1": {
                    "item_id": "scrap_armor",
                    "installed_modules": [DETOX, KINETIC, AEGIS],
                    "installed_module_levels": [9, 4, 3],
                }
            },
        }

        def _upd(p, iid, amt):
            p.setdefault("inventory", {})
            p["inventory"][iid] = p["inventory"].get(iid, 0) + amt

        canon = mds.apply_module_death_salvage(
            player, items=ITEMS_STUB, update_inventory=_upd
        )
        slots = [
            {"id": DETOX, "level": 9},
            {"id": KINETIC, "level": 4},
            {"id": AEGIS, "level": 3},
        ]
        mirror = py_simulate_death(armed=True, slots=slots, catalog=self.catalog)
        self.assertEqual(mirror["saved_module_id"], canon["saved_module_id"])
        self.assertEqual(mirror["shards_gained"], canon["shards_gained"])
        self.assertEqual(set(mirror["lost_modules"]), set(canon["lost_modules"]))


if __name__ == "__main__":
    raise SystemExit(0 if unittest.main(verbosity=2).result.wasSuccessful() else 1)
