#!/usr/bin/env python3
"""Unit tests for tools/sim/playtest2-digest.py (OD-044 board digest).

Locks the board-consumable contract codemasterdd's playtest2-board-sync.sh
raw-fetches: real metrics -> full per-pillar subset; absent/malformed ->
graceful no-op (no file, exit 0); bootstrap-empty -> honest nulls (never
fabricated). Mirrors the unittest style of test_playtest_2_analyzer.py.
"""

from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

# tools/sim/playtest2-digest.py is hyphenated -> load via importlib.
_DIGEST = (
    Path(__file__).resolve().parent.parent / "sim" / "playtest2-digest.py"
)
_spec = importlib.util.spec_from_file_location("playtest2_digest", _DIGEST)
pd = importlib.util.module_from_spec(_spec)
sys.modules["playtest2_digest"] = pd
_spec.loader.exec_module(pd)


FULL_METRICS = {
    "summary": {"total_sessions": 42, "total_events": 900},
    "p3_promotions": {"total_promotions": 37},
    "p4_psicologico": {
        "layer_completeness": {
            "mbti": True,
            "ennea": True,
            "conviction": True,
            "sentience": True,
        }
    },
    "p6_fairness": {"rewind_sessions_pct": 12.5},
    "od024_interoception": {"firing_rate_pct": 88.2},
    "od026_atlas": {
        "skiv_pulse_events": 9,
        "biome_focus_events": {"caverna": 3, "foresta": 1},
    },
    "performance": {
        "command_latency_p95_ms": 87.0,
        "command_latency_verdict": "PASS",
    },
}


class BuildDigestTests(unittest.TestCase):
    def test_full_metrics_yield_full_per_pillar_subset(self):
        d = pd.build_digest(FULL_METRICS, run_id=123, min_sample=30)
        self.assertEqual(d["sample_size"], 42)
        self.assertEqual(d["run_id"], "123")
        self.assertEqual(d["verdict"], "green")  # 42 >= 30
        p = d["pillars"]
        self.assertEqual(p["p3"]["verdict"], "green")  # 37 >= 30
        self.assertEqual(p["p3"]["key_metric"], 37)
        self.assertEqual(p["p4"]["verdict"], "green")
        self.assertEqual(p["p6"]["rewind_pct"], 12.5)
        self.assertEqual(p["od024"]["firing_pct"], 88.2)
        self.assertEqual(p["od026"]["skiv_pulse"], 9)
        self.assertEqual(p["od026"]["biome_focus"], 2)  # distinct biomes
        self.assertEqual(p["performance"]["p95_ms"], 87.0)
        self.assertEqual(p["performance"]["verdict"], "PASS")

    def test_bootstrap_empty_metrics_emit_honest_nulls(self):
        d = pd.build_digest(
            {"summary": {"total_sessions": 0}}, run_id=None, min_sample=30
        )
        self.assertIsNone(d["run_id"])
        self.assertEqual(d["sample_size"], 0)
        self.assertEqual(d["verdict"], "red")
        p = d["pillars"]
        self.assertIsNone(p["p3"]["key_metric"])  # never fabricated
        self.assertIsNone(p["p4"]["4layer_completeness"])
        self.assertIsNone(p["p6"]["rewind_pct"])
        self.assertIsNone(p["od024"]["firing_pct"])
        self.assertIsNone(p["performance"]["p95_ms"])

    def test_perf_abort_dominates_overall_verdict(self):
        m = dict(FULL_METRICS)
        m["performance"] = {
            "command_latency_p95_ms": 999.0,
            "command_latency_verdict": "ABORT",
        }
        d = pd.build_digest(m, run_id=1, min_sample=30)
        self.assertEqual(d["verdict"], "regression")

    def test_partial_sample_yields_partial_verdict(self):
        m = dict(FULL_METRICS)
        m["summary"] = {"total_sessions": 15}
        m["p3_promotions"] = {"total_promotions": 15}
        d = pd.build_digest(m, run_id=1, min_sample=30)
        self.assertEqual(d["verdict"], "partial")  # 10 <= 15 < 30
        self.assertEqual(d["pillars"]["p3"]["verdict"], "partial")


class MainCliTests(unittest.TestCase):
    def _run(self, metrics_path, out_path):
        argv = sys.argv
        sys.argv = [
            "playtest2-digest.py",
            "--metrics",
            str(metrics_path),
            "--out",
            str(out_path),
        ]
        try:
            return pd.main()
        finally:
            sys.argv = argv

    def test_absent_metrics_graceful_no_op_no_file(self):
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / "playtest2-latest.json"
            rc = self._run(Path(td) / "missing.json", out)
            self.assertEqual(rc, 0)
            self.assertFalse(out.exists())  # no file -> no-spam PR

    def test_malformed_metrics_graceful_no_op_no_file(self):
        with tempfile.TemporaryDirectory() as td:
            bad = Path(td) / "bad.json"
            bad.write_text("{not valid", encoding="utf-8")
            out = Path(td) / "playtest2-latest.json"
            rc = self._run(bad, out)
            self.assertEqual(rc, 0)
            self.assertFalse(out.exists())

    def test_valid_metrics_writes_parseable_digest(self):
        with tempfile.TemporaryDirectory() as td:
            src = Path(td) / "metrics.json"
            src.write_text(json.dumps(FULL_METRICS), encoding="utf-8")
            out = Path(td) / "playtest2-latest.json"
            rc = self._run(src, out)
            self.assertEqual(rc, 0)
            self.assertTrue(out.exists())
            loaded = json.loads(out.read_text(encoding="utf-8"))
            self.assertEqual(loaded["_schema"], "playtest2-latest/1")
            self.assertEqual(loaded["pillars"]["p3"]["key_metric"], 37)


if __name__ == "__main__":
    unittest.main()
