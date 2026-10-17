#!/usr/bin/env python3
"""Unit tests for tools/py/analyze_telemetry.py (session-array repoint).

Synthetic corpus: two session_*.json array files (one win with post-#3176
vc_mbti/vc_ennea populated, one wipe with vc fields null) + one
session_seed_*.json that MUST be excluded from every glob + one
telemetry_*.jsonl for the reward_skip_rate query.

DuckDB-backed assertions are skipped when duckdb is not installed; the
loader / fallback / not-implemented paths are always tested.
"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

# Ensure tool path importable.
sys.path.insert(0, str(Path(__file__).parent))

from analyze_telemetry import (  # noqa: E402
    NOT_IMPLEMENTED,
    QUERIES,
    format_table,
    has_duckdb,
    list_session_files,
    run_query,
    run_query_fallback,
)

WIN_SESSION = [
    {
        "action_type": "session_start",
        "turn": 0,
        "scenario_id": "enc_test_a",
        "units_count": 4,
    },
    {
        "action_type": "move",
        "turn": 1,
        "actor_id": "p_scout",
        "actor_species": "dune_stalker",
        "actor_job": "skirmisher",
    },
    {
        "action_type": "attack",
        "turn": 2,
        "actor_id": "p_scout",
        "damage_dealt": 4,
    },
    {
        "action_type": "kill",
        "turn": 2,
        "actor_id": "p_scout",
        "actor_species": "dune_stalker",
        "actor_job": "skirmisher",
        "target_id": "e_nomad_1",
    },
    {
        "action_type": "assist",
        "turn": 2,
        "actor_id": "p_tank",
        "actor_species": "mud_sentinel",
        "actor_job": "warden",
        "killer_id": "p_scout",
    },
    {
        "action_type": "session_end",
        "turn": 9,
        "outcome": "win",
        "scenario_id": "enc_test_a",
        "vc_mbti": {"avg_axes": {"T_F": 0.5}, "types": {"ESTJ": 5}},
        "vc_ennea": {"triggered": {"Stoico(9)": 4, "Architetto(5)": 2}},
    },
]

WIPE_SESSION = [
    {"action_type": "session_start", "turn": 0, "scenario_id": "enc_test_b"},
    {"action_type": "kill", "turn": 3, "actor_id": "e_boss"},
    {
        "action_type": "session_end",
        "turn": 4,
        "outcome": "wipe",
        "scenario_id": "enc_test_b",
        "vc_mbti": None,
        "vc_ennea": None,
    },
]

TELEMETRY_LINES = [
    {"ts": "2099-01-01T00:00:00Z", "type": "reward_offer", "payload": {}},
    {"ts": "2099-01-01T00:00:01Z", "type": "reward_offer", "payload": {}},
    {"ts": "2099-01-01T00:00:02Z", "type": "reward_skip", "payload": {}},
]


class AnalyzeTelemetryTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        cls.logs_dir = Path(cls._tmp.name)
        (cls.logs_dir / "session_20990101_000001.json").write_text(
            json.dumps(WIN_SESSION), encoding="utf-8"
        )
        (cls.logs_dir / "session_20990101_000002.json").write_text(
            json.dumps(WIPE_SESSION), encoding="utf-8"
        )
        # Seed corpus file: MUST be excluded from analysis globs.
        (cls.logs_dir / "session_seed_tutorial.json").write_text(
            json.dumps([{"action_type": "session_start"}]), encoding="utf-8"
        )
        # Corrupted file (trailing junk after the array, as seen in the real
        # corpus: interleaved writes). Must be skipped, not fatal.
        (cls.logs_dir / "session_20990101_000003.json").write_text(
            json.dumps(
                [{"action_type": "session_end", "outcome": "win", "turn": 1}]
            )
            + "\n{}\n  },",
            encoding="utf-8",
        )
        (cls.logs_dir / "telemetry_20990101.jsonl").write_text(
            "\n".join(json.dumps(x) for x in TELEMETRY_LINES) + "\n",
            encoding="utf-8",
        )

    @classmethod
    def tearDownClass(cls):
        cls._tmp.cleanup()

    # --- loader / glob -------------------------------------------------
    def test_list_session_files_excludes_seed(self):
        names = [p.name for p in list_session_files(self.logs_dir)]
        self.assertEqual(
            names,
            [
                "session_20990101_000001.json",
                "session_20990101_000002.json",
                "session_20990101_000003.json",
            ],
        )

    # --- not-implemented queries (honest data-gap) ---------------------
    def test_retention_not_implemented(self):
        result = run_query("retention_d1d7", self.logs_dir)
        self.assertTrue(result.get("not_implemented"))
        self.assertIn("player", result["reason"].lower())

    def test_not_implemented_queries_still_listed_in_cli_choices(self):
        for name in NOT_IMPLEMENTED:
            self.assertNotIn(name, QUERIES)

    # --- fallback (no duckdb) ------------------------------------------
    def test_fallback_counts_session_arrays(self):
        result = run_query_fallback("win_rate", self.logs_dir)
        self.assertEqual(result["files_processed"], 2)
        self.assertEqual(result["files_skipped"], 1)
        self.assertEqual(result["event_counts"]["session_end"], 2)
        self.assertEqual(result["event_counts"]["kill"], 2)
        self.assertEqual(result["outcome_counts"], {"win": 1, "wipe": 1})

    def test_format_table_handles_not_implemented(self):
        out = format_table(run_query("retention_d1d7", self.logs_dir))
        self.assertIn("NOT IMPLEMENTED", out)

    # --- duckdb-backed queries ------------------------------------------
    @unittest.skipUnless(has_duckdb(), "duckdb not installed")
    def test_win_rate_outcomes(self):
        result = run_query("win_rate", self.logs_dir)
        rows = {r[0]: r[1] for r in result["rows"]}
        self.assertEqual(rows, {"win": 1, "wipe": 1})

    @unittest.skipUnless(has_duckdb(), "duckdb not installed")
    def test_funnel_counts_per_turn(self):
        result = run_query("funnel", self.logs_dir)
        cols = result["columns"]
        by_turn = {r[cols.index("turn")]: r for r in result["rows"]}
        self.assertEqual(by_turn[2][cols.index("kills")], 1)
        self.assertEqual(by_turn[2][cols.index("assists")], 1)
        self.assertEqual(by_turn[1][cols.index("moves")], 1)

    @unittest.skipUnless(has_duckdb(), "duckdb not installed")
    def test_kill_heatmap_joins_scenario(self):
        result = run_query("kill_heatmap", self.logs_dir)
        rows = {r[0]: r[1] for r in result["rows"]}
        self.assertEqual(rows, {"enc_test_a": 1, "enc_test_b": 1})

    @unittest.skipUnless(has_duckdb(), "duckdb not installed")
    def test_biome_difficulty_per_scenario(self):
        result = run_query("biome_difficulty", self.logs_dir)
        cols = result["columns"]
        rows = {r[cols.index("scenario")]: r for r in result["rows"]}
        self.assertEqual(rows["enc_test_a"][cols.index("win_pct")], 100.0)
        self.assertEqual(rows["enc_test_b"][cols.index("win_pct")], 0.0)

    @unittest.skipUnless(has_duckdb(), "duckdb not installed")
    def test_mbti_distribution_reads_types_and_notes_coverage(self):
        result = run_query("mbti_distribution", self.logs_dir)
        cols = result["columns"]
        rows = {r[cols.index("mbti_type")]: r for r in result["rows"]}
        self.assertEqual(rows["ESTJ"][cols.index("units")], 5)
        self.assertIn("1/2", result["note"])  # 1 of 2 session_end has vc_mbti

    @unittest.skipUnless(has_duckdb(), "duckdb not installed")
    def test_archetype_pickrate_reads_triggered(self):
        result = run_query("archetype_pickrate", self.logs_dir)
        cols = result["columns"]
        rows = {r[cols.index("archetype")]: r for r in result["rows"]}
        self.assertEqual(rows["Stoico(9)"][cols.index("triggered_units")], 4)
        self.assertEqual(rows["Architetto(5)"][cols.index("triggered_units")], 2)
        self.assertIn("note", result)

    @unittest.skipUnless(has_duckdb(), "duckdb not installed")
    def test_kill_chain_assists_real_actor_data(self):
        result = run_query("kill_chain_assists", self.logs_dir)
        cols = result["columns"]
        rows = {r[cols.index("unit")]: r for r in result["rows"]}
        self.assertEqual(rows["p_scout"][cols.index("kills")], 1)
        self.assertEqual(rows["p_tank"][cols.index("assists")], 1)

    @unittest.skipUnless(has_duckdb(), "duckdb not installed")
    def test_corrupt_file_excluded_and_reported(self):
        result = run_query("win_rate", self.logs_dir)
        self.assertNotIn("error", result)
        self.assertEqual(
            result.get("skipped_files"), ["session_20990101_000003.json"]
        )
        # The corrupt file's events must NOT leak into results.
        total_sessions = sum(r[1] for r in result["rows"])
        self.assertEqual(total_sessions, 2)

    @unittest.skipUnless(has_duckdb(), "duckdb not installed")
    def test_reward_skip_rate_from_telemetry_jsonl(self):
        result = run_query("reward_skip_rate", self.logs_dir)
        cols = result["columns"]
        row = result["rows"][0]
        self.assertEqual(row[cols.index("offers")], 2)
        self.assertEqual(row[cols.index("skips")], 1)


if __name__ == "__main__":
    unittest.main()
