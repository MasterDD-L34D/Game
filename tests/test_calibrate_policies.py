"""Unit tests for tools/py/calibrate_policies.py -- Restricted-Play policies.

Backend-free. Validates the multi-policy player intent generators used by the
triangulation harness (TKT-PLAYTEST-TRIANGULATE, Jaffe 2012 AIIDE):
  - intent legality (player actor, valid action type, in-bounds move)
  - random policy reproducibility under a seeded RNG
  - lookahead2 secures an adjacent killable target
  - utility prefers the lowest-HP target over a full-HP one
  - band math (WR band + human estimate)
"""

from __future__ import annotations

import random
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools" / "py"))

from calibrate_policies import (  # noqa: E402
    POLICIES,
    compute_band,
    pick_intents,
)


def _state():
    """p1 adjacent to a low-HP enemy (e1), p2 near; e2 far + full HP."""
    return {
        "grid": {"width": 6, "height": 6},
        "units": [
            {"id": "p1", "controlled_by": "player", "hp": 10, "max_hp": 10,
             "position": {"x": 0, "y": 0}, "ap_remaining": 2, "attack_range": 1},
            {"id": "p2", "controlled_by": "player", "hp": 10, "max_hp": 10,
             "position": {"x": 2, "y": 0}, "ap_remaining": 2, "attack_range": 1},
            {"id": "e1", "controlled_by": "sistema", "hp": 2, "max_hp": 10,
             "position": {"x": 0, "y": 1}},
            {"id": "e2", "controlled_by": "sistema", "hp": 10, "max_hp": 10,
             "position": {"x": 5, "y": 5}},
        ],
    }


def _ctx():
    return {
        "channel_for": lambda tid: "psionico" if tid == "e1" else "fisico",
        "enemy_priority": lambda e: 0,
        "attack_range_default": 1,
    }


def _assert_legal(intents, state):
    players = {u["id"] for u in state["units"] if u["controlled_by"] == "player"}
    gw = state["grid"]["width"]
    gh = state["grid"]["height"]
    for it in intents:
        assert it["actor_id"] in players, "intent actor must be a player unit"
        act = it["action"]
        assert act["type"] in ("attack", "move", "skip"), act["type"]
        if act["type"] == "move":
            p = act["position"]
            assert 0 <= p["x"] < gw and 0 <= p["y"] < gh, "move in bounds"
        if act["type"] == "attack":
            assert "target_id" in act and "channel" in act


def test_policies_constant_has_four():
    assert set(POLICIES) == {"random", "greedy", "lookahead2", "utility"}


def test_pick_intents_rejects_unknown_policy():
    with pytest.raises(ValueError):
        pick_intents("nonsense", _state(), _ctx(), random.Random(0))


def test_pick_intents_greedy_not_handled_here():
    # greedy stays in each script (back-compat); the shared module refuses it.
    with pytest.raises(ValueError):
        pick_intents("greedy", _state(), _ctx(), random.Random(0))


def test_random_policy_is_legal_and_reproducible():
    a = pick_intents("random", _state(), _ctx(), random.Random(123))
    b = pick_intents("random", _state(), _ctx(), random.Random(123))
    assert a == b, "same seed -> identical random intents"
    _assert_legal(a, _state())


def test_random_policy_diverges_on_different_seed():
    a = pick_intents("random", _state(), _ctx(), random.Random(1))
    b = pick_intents("random", _state(), _ctx(), random.Random(999))
    # Not a hard guarantee per-call, but across the 2-unit action space these
    # seeds differ; this guards against a constant (non-random) generator.
    assert a != b


def test_lookahead2_secures_adjacent_kill():
    intents = pick_intents("lookahead2", _state(), _ctx(), None)
    p1 = [it for it in intents if it["actor_id"] == "p1"]
    assert p1, "p1 should act"
    atk = [it for it in p1 if it["action"]["type"] == "attack"]
    assert atk, "p1 adjacent to killable e1 must attack"
    assert atk[0]["action"]["target_id"] == "e1"
    assert atk[0]["action"]["channel"] == "psionico", "uses ctx channel_for"


def test_utility_prefers_low_hp_target():
    intents = pick_intents("utility", _state(), _ctx(), None)
    p1_atk = [
        it for it in intents
        if it["actor_id"] == "p1" and it["action"]["type"] == "attack"
    ]
    assert p1_atk, "p1 in range of e1 should attack"
    assert p1_atk[0]["action"]["target_id"] == "e1", "lowest-HP target preferred"


def test_utility_is_deterministic():
    assert pick_intents("utility", _state(), _ctx(), None) == pick_intents(
        "utility", _state(), _ctx(), None
    )


def test_compute_band():
    per_policy_runs = {
        "random": [{"outcome": "defeat"}, {"outcome": "defeat"}, {"outcome": "victory"}, {"outcome": "defeat"}],
        "greedy": [{"outcome": "victory"}, {"outcome": "victory"}, {"outcome": "defeat"}, {"outcome": "defeat"}],
        "lookahead2": [{"outcome": "victory"}, {"outcome": "victory"}, {"outcome": "victory"}, {"outcome": "defeat"}],
        "utility": [{"outcome": "victory"}, {"outcome": "victory"}, {"outcome": "victory"}, {"outcome": "victory"}],
    }
    band = compute_band(per_policy_runs)
    assert band["policy_win_rate"]["random"] == pytest.approx(0.25)
    assert band["policy_win_rate"]["greedy"] == pytest.approx(0.50)
    assert band["policy_win_rate"]["lookahead2"] == pytest.approx(0.75)
    assert band["policy_win_rate"]["utility"] == pytest.approx(1.0)
    assert band["band"] == [pytest.approx(0.25), pytest.approx(1.0)]
    # human estimate = greedy*0.55 + lookahead2*0.45 = 0.275 + 0.3375 = 0.6125
    assert band["human_wr_est"] == pytest.approx(0.6125)


def test_compute_band_handles_missing_policy():
    band = compute_band({"random": [{"outcome": "defeat"}], "greedy": [{"outcome": "victory"}]})
    assert band["band"] == [pytest.approx(0.0), pytest.approx(1.0)]
    # human est None when lookahead2 absent
    assert band["human_wr_est"] is None
