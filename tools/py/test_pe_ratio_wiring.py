#!/usr/bin/env python3
"""PE_ratio PR2 wiring tests (hermetic, no backend). Covers the aggregate-form
pe_ratio mapping, the kd_ratio normalization, and the end-to-end contract that
objective.evaluate_metric can now compute the composite once aggregate() emits
kd_ratio + pe_ratio. The candidate SELECTION is the experiment's output; these
tests are candidate-agnostic (they assert mapping + consistency, not which won)."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))

import batch_calibrate_hardcore06 as bc  # noqa: E402
import objective  # noqa: E402
from pe_candidates import (  # noqa: E402
    SELECTED_CANDIDATE,
    attach_composite_terms,
    kd_normalize,
    pe_ratio_aggregate,
)

COMPOSITE = "0.50*win_rate + 0.25*kd_ratio + 0.25*pe_ratio"


def test_pe_ratio_aggregate_maps_each_candidate_to_its_key():
    agg = {"pressure_frac_ge75_avg": 0.7, "pressure_mean_avg": 60.0, "apex_reach_rate": 0.3}
    assert pe_ratio_aggregate(agg, "A_sustained_threat") == pytest.approx(0.7)
    assert pe_ratio_aggregate(agg, "B_time_avg") == pytest.approx(0.60)
    assert pe_ratio_aggregate(agg, "C_apex_reach") == pytest.approx(0.3)


def test_pe_ratio_aggregate_clamps_and_rejects_unknown():
    assert pe_ratio_aggregate({"pressure_mean_avg": 250.0}, "B_time_avg") == 1.0  # clamp >1
    assert pe_ratio_aggregate({}, "A_sustained_threat") == 0.0  # missing -> 0, not crash
    with pytest.raises(KeyError):
        pe_ratio_aggregate({}, "Z_nonexistent")


def test_kd_normalize_bounded_monotonic():
    assert kd_normalize(0.0) == 0.0
    assert kd_normalize(0.8) == pytest.approx(0.4444, abs=1e-3)
    assert kd_normalize(1e6) == pytest.approx(1.0, abs=1e-5)
    assert kd_normalize(None) is None
    assert kd_normalize(2.0) > kd_normalize(0.5)  # monotonic


def test_selected_candidate_is_a_known_candidate():
    # the ratified selection must resolve (guards a typo'd constant)
    assert SELECTED_CANDIDATE in {"A_sustained_threat", "B_time_avg", "C_apex_reach"}


def _run(outcome, *, rounds=10, players_dead=1, enemies_dead=5, pmean=80.0, frac=1.0, pmax=100.0):
    """A complete synthetic run record carrying every field aggregate() reads."""
    return {
        "outcome": outcome,
        "rounds": rounds,
        "players_dead": players_dead,
        "enemies_dead": enemies_dead,
        "ai_intent_tally": {"aggressive": 3},
        "player_action_tally": {"attack": 4},
        "trait_used_tally": {"echo": 1},
        "pressure_mean": pmean,
        "pressure_frac_ge75": frac,
        "pressure_pmax": pmax,
        "dmg_dealt_player": 100,
        "dmg_taken_player": 50,
        "boss_hp_remaining": 0 if outcome == "victory" else 12,
        "players_alive": 3 if outcome == "victory" else 0,
    }


def test_aggregate_emits_kd_ratio_and_pe_ratio_consistently():
    runs = [_run("victory", pmean=90.0, frac=1.0, pmax=100.0), _run("defeat", pmean=60.0, frac=0.4, pmax=80.0)]
    agg = bc.aggregate(runs)
    # both new composite terms present + 0..1
    assert "kd_ratio" in agg and 0.0 <= agg["kd_ratio"] <= 1.0
    assert "pe_ratio" in agg and 0.0 <= agg["pe_ratio"] <= 1.0
    # kd_ratio is the normalized kd_avg
    assert agg["kd_ratio"] == pytest.approx(kd_normalize(agg["kd_avg"]))
    # pe_ratio is the selected candidate read off the aggregate keys (consistency)
    assert agg["pe_ratio"] == pytest.approx(pe_ratio_aggregate(agg, SELECTED_CANDIDATE))


def test_attach_composite_terms_idempotent_and_graceful():
    # pressure-emitting aggregate -> both terms set from the data
    agg = {"kd_avg": 0.8, "pressure_mean_avg": 50.0, "pressure_frac_ge75_avg": 0.6, "apex_reach_rate": 0.4}
    attach_composite_terms(agg)
    assert agg["kd_ratio"] == pytest.approx(kd_normalize(0.8))
    assert agg["pe_ratio"] == pytest.approx(pe_ratio_aggregate(agg, SELECTED_CANDIDATE))
    # idempotent: a second call (or a pre-set value) is NOT overwritten
    agg["pe_ratio"] = 0.123
    attach_composite_terms(agg)
    assert agg["pe_ratio"] == 0.123
    # no-pressure scenario (e.g. hardcore_07): pe_ratio degrades to 0.0, never crashes
    bare = {"kd_avg": 1.0}
    attach_composite_terms(bare)
    assert bare["pe_ratio"] == 0.0 and bare["kd_ratio"] == pytest.approx(kd_normalize(1.0))
    # error dict is a no-op
    assert attach_composite_terms({"error": "no successful runs"}) == {"error": "no successful runs"}


def test_objective_composite_now_computable_no_keyerror():
    runs = [_run("victory"), _run("defeat")]
    agg = bc.aggregate(runs)
    # BEFORE PR2 this raised KeyError('pe_ratio'); now it evaluates to the weighted sum.
    score = objective.evaluate_metric(COMPOSITE, agg)
    expected = 0.50 * agg["win_rate"] + 0.25 * agg["kd_ratio"] + 0.25 * agg["pe_ratio"]
    assert score == pytest.approx(expected)
    assert 0.0 <= score <= 1.0
