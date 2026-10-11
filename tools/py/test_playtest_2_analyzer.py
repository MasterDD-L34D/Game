#!/usr/bin/env python3
"""Unit tests for tools/py/playtest_2_analyzer.py.

Validates per-pillar aggregation functions + report build end-to-end on
synthetic telemetry fixture.
"""

from __future__ import annotations

import json
import sys
import unittest
from collections import defaultdict
from pathlib import Path

# Ensure tool path importable.
sys.path.insert(0, str(Path(__file__).parent))

from playtest_2_analyzer import (  # noqa: E402
    aggregate_session_summary,
    analyze_od024_interoception,
    analyze_od026_atlas,
    analyze_p3_promotions,
    analyze_p4_psicologico,
    analyze_p6_fairness,
    analyze_performance,
    build_report,
    load_events,
)

FIXTURE_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "tests"
    / "fixtures"
    / "playtest-2-synthetic-telemetry.jsonl"
)


class LoadEventsTests(unittest.TestCase):
    def test_skips_comments_and_blanks(self) -> None:
        events = load_events(FIXTURE_PATH)
        # Fixture has 26 data lines (no blanks/comments counted).
        self.assertGreater(len(events), 20)
        self.assertTrue(all(isinstance(e, dict) for e in events))


class SessionSummaryTests(unittest.TestCase):
    def test_groups_by_session_id(self) -> None:
        events = load_events(FIXTURE_PATH)
        summary = aggregate_session_summary(events)
        self.assertEqual(summary["total_sessions"], 6)
        self.assertEqual(summary["total_events"], len(events))


class P3PromotionsTests(unittest.TestCase):
    def setUp(self) -> None:
        events = load_events(FIXTURE_PATH)
        self.summary = aggregate_session_summary(events)

    def test_aggregates_promotion_tier(self) -> None:
        result = analyze_p3_promotions(self.summary["sessions"])
        self.assertEqual(result["total_promotions"], 6)
        # Fixture has 1 elite (guerriero) + 1 captain (custode) + 1 elite (espl)
        # + 1 master (tess) + 1 veteran (guerr) + 1 elite (cust) = 3 elite, 1 master
        self.assertEqual(result["elite_count"], 3)
        self.assertEqual(result["master_count"], 1)
        self.assertEqual(result["phase_b3_reached"], 4)

    def test_job_tier_breakdown(self) -> None:
        result = analyze_p3_promotions(self.summary["sessions"])
        # Verify Phase B3 job_archetype_bias signal: distinct Jobs at elite/master.
        breakdown = result["job_tier_breakdown"]
        # guerriero appears at both veteran + elite tier
        self.assertIn(("guerriero", "elite"), breakdown)
        self.assertIn(("guerriero", "veteran"), breakdown)
        self.assertIn(("tessitore", "master"), breakdown)
        self.assertIn(("custode", "elite"), breakdown)


class P4PsicologicoTests(unittest.TestCase):
    def setUp(self) -> None:
        events = load_events(FIXTURE_PATH)
        self.summary = aggregate_session_summary(events)

    def test_4_layer_completeness(self) -> None:
        result = analyze_p4_psicologico(self.summary["sessions"])
        completeness = result["layer_completeness"]
        self.assertTrue(completeness["mbti"], "MBTI layer must be present")
        self.assertTrue(completeness["ennea"], "Ennea layer must be present")
        self.assertTrue(completeness["conviction"], "Conviction layer (D2-A)")
        self.assertTrue(
            completeness["sentience"], "Sentience layer (Phase B3 OD-024)"
        )

    def test_mbti_distribution_unique_types(self) -> None:
        result = analyze_p4_psicologico(self.summary["sessions"])
        # Fixture has 6 unique MBTI types: ENTJ/ISFJ/ENFP/INTJ/ESTP/ISFJ
        self.assertGreaterEqual(len(result["mbti_distribution"]), 5)

    def test_sentience_distribution_t0_t6_subset(self) -> None:
        result = analyze_p4_psicologico(self.summary["sessions"])
        tiers = set(result["sentience_distribution"].keys())
        valid_tiers = {f"T{i}" for i in range(7)}
        self.assertTrue(tiers.issubset(valid_tiers), f"Got invalid tiers: {tiers}")

    def test_conviction_aggregates_mean_stdev(self) -> None:
        result = analyze_p4_psicologico(self.summary["sessions"])
        for axis in ("utility", "liberty", "morality"):
            self.assertIn(axis, result["conviction_distribution"])
            stats = result["conviction_distribution"][axis]
            self.assertIsNotNone(stats.get("mean"))
            # Mean should be in plausible 0..100 range
            self.assertGreaterEqual(stats["mean"], 0)
            self.assertLessEqual(stats["mean"], 100)


class P6FairnessTests(unittest.TestCase):
    def setUp(self) -> None:
        events = load_events(FIXTURE_PATH)
        self.summary = aggregate_session_summary(events)

    def test_pressure_tier_counts(self) -> None:
        result = analyze_p6_fairness(self.summary["sessions"])
        # Fixture has tiers 1,2,3,4 represented
        tiers = result["pressure_distribution"]
        self.assertTrue(set(tiers.keys()).issubset({"1", "2", "3", "4"}))

    def test_rewind_event_count(self) -> None:
        result = analyze_p6_fairness(self.summary["sessions"])
        self.assertEqual(result["rewind_events"], 2)
        # 2 rewinds across 6 sessions = 33.3%
        self.assertAlmostEqual(result["rewind_sessions_pct"], 33.33, places=1)


class OD024InteroceptionTests(unittest.TestCase):
    def test_all_4_traits_fire(self) -> None:
        events = load_events(FIXTURE_PATH)
        result = analyze_od024_interoception(events)
        firings = result["firings_by_trait"]
        self.assertIn("proprioception_balance", firings)
        self.assertIn("vestibular_advantage", firings)
        self.assertIn("nociception_reactive", firings)
        self.assertIn("thermoception_resist", firings)

    def test_firing_rate_computed(self) -> None:
        events = load_events(FIXTURE_PATH)
        result = analyze_od024_interoception(events)
        self.assertGreater(result["firing_rate_pct"], 0)
        self.assertLessEqual(result["firing_rate_pct"], 100)


class OD026AtlasTests(unittest.TestCase):
    def test_pulse_event_count(self) -> None:
        events = load_events(FIXTURE_PATH)
        result = analyze_od026_atlas(events)
        self.assertEqual(result["skiv_pulse_events"], 3)

    def test_revealed_biomes_captured(self) -> None:
        events = load_events(FIXTURE_PATH)
        result = analyze_od026_atlas(events)
        self.assertIn("caverna", result["revealed_biomes"])
        self.assertIn("foresta_temperata", result["revealed_biomes"])
        self.assertIn("atollo_obsidiana", result["revealed_biomes"])


class PerformanceTests(unittest.TestCase):
    def test_p95_computed_with_verdict_gate(self) -> None:
        events = load_events(FIXTURE_PATH)
        result = analyze_performance(events)
        self.assertGreater(result["samples"], 0)
        self.assertIsNotNone(result["command_latency_p50_ms"])
        self.assertIsNotNone(result["command_latency_p95_ms"])
        self.assertIn(result["command_latency_verdict"], ("PASS", "CONDITIONAL", "ABORT"))

    def test_no_latency_data_returns_na(self) -> None:
        result = analyze_performance([])
        self.assertEqual(result["command_latency_verdict"], "n/a")


class ReportBuildTests(unittest.TestCase):
    def test_report_contains_all_8_sections(self) -> None:
        events = load_events(FIXTURE_PATH)
        summary = aggregate_session_summary(events)
        by_session = summary["sessions"]
        report = build_report(
            summary,
            analyze_p3_promotions(by_session),
            analyze_p4_psicologico(by_session),
            analyze_p6_fairness(by_session),
            analyze_od024_interoception(events),
            analyze_od026_atlas(events),
            analyze_performance(events),
            min_sample=30,
        )
        # 8 numbered sections required
        for n in range(1, 9):
            self.assertIn(f"## {n}.", report)
        self.assertIn("ai-station", report.lower())

    def test_report_partial_verdict_when_undersampled(self) -> None:
        # Synthetic fixture has 6 sessions < 30 → at most 🟡 1/3 verdict.
        events = load_events(FIXTURE_PATH)
        summary = aggregate_session_summary(events)
        by_session = summary["sessions"]
        report = build_report(
            summary,
            analyze_p3_promotions(by_session),
            analyze_p4_psicologico(by_session),
            analyze_p6_fairness(by_session),
            analyze_od024_interoception(events),
            analyze_od026_atlas(events),
            analyze_performance(events),
            min_sample=30,
        )
        # Should NOT claim 3/3 hard verified at 6 sessions
        self.assertNotIn("3/3 pillars hard verified", report)


class GracefulDegradationTests(unittest.TestCase):
    def test_empty_telemetry_no_crash(self) -> None:
        # Simulate empty event list — all aggregators must return Dict shape.
        empty: dict = defaultdict(list)
        p3 = analyze_p3_promotions(empty)
        self.assertEqual(p3["total_promotions"], 0)
        p4 = analyze_p4_psicologico(empty)
        self.assertEqual(p4["mbti_distribution"], {})
        p6 = analyze_p6_fairness(empty)
        self.assertEqual(p6["rewind_events"], 0)
        od024 = analyze_od024_interoception([])
        self.assertEqual(od024["total_firings"], 0)
        od026 = analyze_od026_atlas([])
        self.assertEqual(od026["skiv_pulse_events"], 0)


if __name__ == "__main__":
    unittest.main()
