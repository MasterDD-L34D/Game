"""M7-#2 Phase D: unit tests per load_target_bands + verdict_for.

Verify mini-YAML parser legge correttamente data/core/balance/damage_curves.yaml
senza dipendere da PyYAML, e che verdict_for classifica GREEN/AMBER/RED
in linea con ADR-2026-04-20.
"""

import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "py"))

import pytest

from batch_calibrate_hardcore06 import (
    load_target_bands,
    verdict_for,
    load_turn_limit_defeat,
    detect_outcome,
)


def test_load_all_classes():
    """Tutte le 5 class note devono ritornare 3 bands each."""
    expected = {"tutorial", "tutorial_advanced", "standard", "hardcore", "boss"}
    for cls in expected:
        bands = load_target_bands(cls)
        assert bands is not None, f"class {cls} missing from YAML"
        assert set(bands.keys()) == {"win_rate", "defeat_rate", "timeout_rate"}
        for k, v in bands.items():
            assert isinstance(v, list) and len(v) == 2
            lo, hi = v
            assert 0.0 <= lo <= hi <= 1.0, f"{cls}.{k}={v} invalid range"


def test_load_missing_class_returns_none():
    assert load_target_bands("nonexistent") is None
    assert load_target_bands("") is None


def test_hardcore_bands_match_adr():
    """ADR-2026-04-20 §class table: hardcore win 15-25%, defeat 40-55%, timeout 15-25%."""
    b = load_target_bands("hardcore")
    assert b["win_rate"] == [0.15, 0.25]
    assert b["defeat_rate"] == [0.40, 0.55]
    assert b["timeout_rate"] == [0.15, 0.25]


def test_boss_bands_match_adr():
    """Boss win 5-15% (most punishing tier)."""
    b = load_target_bands("boss")
    assert b["win_rate"] == [0.05, 0.15]
    assert b["defeat_rate"] == [0.55, 0.70]


def test_verdict_green_when_in_band():
    b = load_target_bands("hardcore")
    v, _ = verdict_for(0.20, 0.50, 0.20, b)
    assert v == "GREEN"


def test_verdict_amber_within_5pp():
    """±5pp tolerance da band edge."""
    b = load_target_bands("hardcore")
    # win_rate 0.28 is 3pp sopra hi (0.25) → AMBER
    v, reasons = verdict_for(0.28, 0.50, 0.20, b)
    assert v == "AMBER"
    assert any("win_rate" in r for r in reasons)


def test_verdict_red_when_far():
    b = load_target_bands("hardcore")
    # win_rate 0.95 is 70pp sopra hi → RED
    v, _ = verdict_for(0.95, 0.03, 0.02, b)
    assert v == "RED"


def test_verdict_unknown_when_no_bands():
    v, reasons = verdict_for(0.5, 0.3, 0.1, None)
    assert v == "UNKNOWN"
    assert "no bands" in reasons[0].lower()


def test_verdict_tutorial_band_permissive():
    """Tutorial win 60-80% — sanity case player dominates."""
    b = load_target_bands("tutorial")
    v, _ = verdict_for(0.70, 0.15, 0.07, b)
    assert v == "GREEN"


# M9 P6 tests — turn_limit_defeat force decision pressure


def test_turn_limit_defeat_class_values():
    assert load_turn_limit_defeat("tutorial") is None
    assert load_turn_limit_defeat("tutorial_advanced") is None
    assert load_turn_limit_defeat("standard") == 30
    assert load_turn_limit_defeat("hardcore") == 25
    assert load_turn_limit_defeat("boss") == 20


def test_turn_limit_defeat_missing_class_returns_none():
    assert load_turn_limit_defeat("nonexistent") is None


def test_detect_outcome_legacy_mode_preserves_behavior():
    """turn_limit None = legacy (timeout reaches MAX_ROUNDS naturally)."""
    state_alive = {
        "units": [
            {"controlled_by": "player", "hp": 10},
            {"controlled_by": "sistema", "hp": 5},
        ],
        "turn": 40,
    }
    assert detect_outcome(state_alive, None) is None


def test_detect_outcome_turn_limit_triggers_defeat():
    """turn >= limit + both alive = defeat (M9 P6)."""
    state = {
        "units": [
            {"controlled_by": "player", "hp": 10},
            {"controlled_by": "sistema", "hp": 5},
        ],
        "turn": 25,
    }
    assert detect_outcome(state, 25) == "defeat"


def test_detect_outcome_turn_limit_not_yet_reached():
    """turn < limit + both alive = in progress (None)."""
    state = {
        "units": [
            {"controlled_by": "player", "hp": 10},
            {"controlled_by": "sistema", "hp": 5},
        ],
        "turn": 24,
    }
    assert detect_outcome(state, 25) is None


def test_detect_outcome_player_wipe_priority_over_turn_limit():
    """Player wipe = defeat anche a turn < limit (priority)."""
    state = {
        "units": [
            {"controlled_by": "player", "hp": 0},
            {"controlled_by": "sistema", "hp": 5},
        ],
        "turn": 10,
    }
    assert detect_outcome(state, 25) == "defeat"


def test_detect_outcome_victory_priority_over_turn_limit():
    """Sistema wipe = victory anche oltre limit."""
    state = {
        "units": [
            {"controlled_by": "player", "hp": 10},
            {"controlled_by": "sistema", "hp": 0},
        ],
        "turn": 30,
    }
    assert detect_outcome(state, 25) == "victory"


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
