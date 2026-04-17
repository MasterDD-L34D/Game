"""Test parser CLI master_dm.py (Fase 3). Standalone unittest (no pytest)."""

import sys
import pathlib
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "tools" / "py"))
from master_dm import parse_line  # noqa: E402


class TestMasterDmParser(unittest.TestCase):
    def test_move_atk_combo(self):
        intents = parse_line("p_scout: move [3,2] atk e_nomad_1")
        self.assertEqual(len(intents), 2)
        self.assertEqual(intents[0]["actor_id"], "p_scout")
        self.assertEqual(intents[0]["action"]["type"], "move")
        self.assertEqual(intents[0]["action"]["position"], {"x": 3, "y": 2})
        self.assertEqual(intents[1]["action"]["type"], "attack")
        self.assertEqual(intents[1]["action"]["target_id"], "e_nomad_1")

    def test_atk_only(self):
        intents = parse_line("p_tank: atk e_hunter")
        self.assertEqual(len(intents), 1)
        self.assertEqual(intents[0]["action"], {"type": "attack", "target_id": "e_hunter"})

    def test_move_only(self):
        intents = parse_line("p_scout: move [4,2]")
        self.assertEqual(len(intents), 1)
        self.assertEqual(intents[0]["action"]["type"], "move")
        self.assertEqual(intents[0]["action"]["position"], {"x": 4, "y": 2})

    def test_ability_with_target(self):
        intents = parse_line("p_scout: ability dash_strike target=e_nomad_1")
        self.assertEqual(len(intents), 1)
        self.assertEqual(intents[0]["action"]["ability_id"], "dash_strike")
        self.assertEqual(intents[0]["action"]["target_id"], "e_nomad_1")

    def test_ability_self(self):
        intents = parse_line("p_tank: ability fortify")
        self.assertEqual(len(intents), 1)
        self.assertEqual(intents[0]["action"]["type"], "ability")
        self.assertEqual(intents[0]["action"]["ability_id"], "fortify")
        self.assertNotIn("target_id", intents[0]["action"])

    def test_ability_with_position(self):
        intents = parse_line("p_scout: ability dash_strike target=e_nomad_1 pos=[2,2]")
        self.assertEqual(len(intents), 1)
        self.assertEqual(intents[0]["action"]["position"], {"x": 2, "y": 2})

    def test_skip(self):
        intents = parse_line("p_tank: skip")
        self.assertEqual(len(intents), 1)
        self.assertEqual(intents[0]["action"], {"type": "skip"})

    def test_empty_line(self):
        self.assertEqual(parse_line(""), [])
        self.assertEqual(parse_line("   "), [])

    def test_invalid_syntax(self):
        with self.assertRaises(ValueError):
            parse_line("p_scout: vai a nord")

    def test_negative_coords(self):
        intents = parse_line("p_scout: move [-1,2]")
        self.assertEqual(intents[0]["action"]["position"], {"x": -1, "y": 2})


if __name__ == "__main__":
    unittest.main()
