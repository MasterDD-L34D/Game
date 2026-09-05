#!/usr/bin/env python3
"""Unit tests for tools/py/build_ermes_report.py (ERMES static HTML report).

Pins the non-trivial logic: band classification read FROM
data/core/balance/ermes_bucket_thresholds.yaml (no hardcoded bands),
extinction-risk highlight threshold, HTML escaping of data, and the
honest empty-state path. See the multi-biome report schema v1.0.0 emitted
by prototypes/ermes_lab/outputs/latest_eco_pressure_report.json.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from build_ermes_report import (  # noqa: E402
    build_html,
    classify_eco_band,
    load_thresholds,
)

ROOT = Path(__file__).resolve().parents[2]
THRESHOLDS = load_thresholds(ROOT / "data" / "core" / "balance" / "ermes_bucket_thresholds.yaml")


# --- Group 1: band classification is read from the yaml, not hardcoded --------

def test_low_band_from_yaml():
    band = classify_eco_band(0.164, THRESHOLDS)
    assert band["band"] == "low"
    assert band["delta_mod"] == -1
    # diegetic label sourced verbatim from yaml narrative_it
    assert band["label"] == "Bioma calmo."


def test_med_band_from_yaml():
    band = classify_eco_band(0.449, THRESHOLDS)
    assert band["band"] == "med"
    assert band["delta_mod"] == 0
    assert band["label"] == "Bioma in equilibrio."


def test_high_band_from_yaml():
    band = classify_eco_band(0.876, THRESHOLDS)
    assert band["band"] == "high"
    assert band["delta_mod"] == 1
    assert band["label"] == "Bioma in tensione."


def test_boundaries_half_open():
    # [lo, hi): 0.33 belongs to med, 0.66 belongs to high
    assert classify_eco_band(0.33, THRESHOLDS)["band"] == "med"
    assert classify_eco_band(0.66, THRESHOLDS)["band"] == "high"
    assert classify_eco_band(0.0, THRESHOLDS)["band"] == "low"


def test_top_boundary_inclusive():
    # score == 1.0 must not fall through the half-open top edge
    assert classify_eco_band(1.0, THRESHOLDS)["band"] == "high"


def test_missing_score_soft_fails():
    band = classify_eco_band(None, THRESHOLDS)
    assert band["band"] == "unknown"
    assert band["delta_mod"] is None


# --- Group 2: HTML rendering against a real-shaped report ---------------------

REPORT = {
    "schema": "ermes_eco_pressure_report",
    "schema_version": "1.0.0",
    "generated_at": "2026-07-01T23:23:35.700496+00:00",
    "biomes": {
        "savana": {
            "eco_pressure_score": 0.449,
            "encounter_bias": {"ambush": 0.133, "scavenger": 0.117},
            "mutation_bias": {"heat_resistance": 0.032, "burst_mobility": 0.098},
            "extinction_risk": {"dune_stalker": 1.0, "safe_moth": 0.041},
            "debrief_notes": ["Il bioma <e> relativamente stabile."],
        },
    },
}


def test_html_has_biome_and_band_label():
    html = build_html(REPORT, THRESHOLDS, "in.json")
    assert "savana" in html
    assert "Bioma in equilibrio." in html
    assert "1.0.0" in html  # schema version in footer
    assert "2026-07-01T23:23:35.700496+00:00" in html  # generated_at


def test_html_highlights_extinction_at_or_above_half():
    html = build_html(REPORT, THRESHOLDS, "in.json")
    # high-risk species carries the highlight class, low-risk one does not
    assert "risk-high" in html
    assert "dune_stalker" in html
    assert "safe_moth" in html


def test_html_escapes_data():
    html = build_html(REPORT, THRESHOLDS, "in.json")
    # the raw "<e>" from the debrief note must be escaped
    assert "&lt;e&gt;" in html
    assert "<e>" not in html


def test_empty_state_is_honest():
    html = build_html({"schema_version": "1.0.0", "biomes": {}}, THRESHOLDS, "in.json")
    assert "Nessun bioma" in html
