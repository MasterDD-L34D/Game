"""Tests for tools/py/restricted_play.py — multi-policy Restricted Play harness."""

from __future__ import annotations

import random

import pytest


pytest.importorskip("tools.py.restricted_play", reason="PYTHONPATH=tools/py required")

from tools.py.restricted_play import (  # noqa: E402
    HUMAN_WR_GREEDY_WEIGHT,
    HUMAN_WR_UTILITY_WEIGHT,
    VALID_POLICIES,
    estimate_human_wr,
    format_markdown,
    plan_greedy,
    plan_random,
    plan_utility,
    run_one,
)


def _state(player_pos=(0, 0), enemies: list[dict] | None = None):
    return {
        "grid": {"width": 10, "height": 10},
        "units": [
            {
                "id": "p1",
                "controlled_by": "player",
                "hp": 10,
                "ap_remaining": 2,
                "attack_range": 1,
                "position": {"x": player_pos[0], "y": player_pos[1]},
            },
            *(enemies or []),
        ],
    }


def test_valid_policies_contract():
    assert VALID_POLICIES == ("random", "greedy", "utility")
    assert len(VALID_POLICIES) == 3


def test_human_wr_weights_sum_to_one():
    """Contract: weights must be complementary (0.55 + 0.45 = 1)."""
    assert HUMAN_WR_GREEDY_WEIGHT + HUMAN_WR_UTILITY_WEIGHT == pytest.approx(1.0)


def test_greedy_attacks_in_range():
    """Greedy: attack closest enemy if in range."""
    enemies = [{"id": "e1", "controlled_by": "sistema", "hp": 5, "position": {"x": 1, "y": 0}}]
    state = _state(player_pos=(0, 0), enemies=enemies)
    intents = plan_greedy(state, random.Random(42))
    assert len(intents) == 1
    assert intents[0]["action"]["type"] == "attack"
    assert intents[0]["action"]["target_id"] == "e1"


def test_greedy_moves_if_out_of_range():
    """Greedy: move toward target if out of range + AP >=2."""
    enemies = [{"id": "e1", "controlled_by": "sistema", "hp": 5, "position": {"x": 5, "y": 5}}]
    state = _state(player_pos=(0, 0), enemies=enemies)
    intents = plan_greedy(state, random.Random(42))
    assert len(intents) == 1
    assert intents[0]["action"]["type"] == "move"


def test_utility_prefers_highest_hp():
    """Utility: prefer higher HP target over lower HP (tank-first)."""
    enemies = [
        {"id": "e_min", "controlled_by": "sistema", "hp": 3, "position": {"x": 1, "y": 0}},
        {"id": "e_boss", "controlled_by": "sistema", "hp": 40, "position": {"x": 1, "y": 0}},
    ]
    state = _state(player_pos=(0, 0), enemies=enemies)
    intents = plan_utility(state, random.Random(42))
    # Both in range (manhattan dist 1); utility picks boss (hp 40 > hp 3)
    attack_intents = [i for i in intents if i["action"]["type"] == "attack"]
    assert len(attack_intents) == 1
    assert attack_intents[0]["action"]["target_id"] == "e_boss"


def test_random_deterministic_with_seed():
    """Random: same seed = same intent sequence."""
    enemies = [{"id": "e1", "controlled_by": "sistema", "hp": 5, "position": {"x": 3, "y": 3}}]
    state = _state(enemies=enemies)
    i1 = plan_random(state, random.Random(42))
    i2 = plan_random(state, random.Random(42))
    assert i1 == i2


def test_empty_state_returns_no_intents():
    """Edge case: no enemies → no intents (avoid crash)."""
    state = _state(enemies=[])
    assert plan_greedy(state, random.Random(42)) == []
    assert plan_random(state, random.Random(42)) == []
    assert plan_utility(state, random.Random(42)) == []


def test_no_players_returns_no_intents():
    """Edge case: no players → no intents."""
    enemies = [{"id": "e1", "controlled_by": "sistema", "hp": 5, "position": {"x": 0, "y": 0}}]
    state = {"grid": {"width": 10, "height": 10}, "units": enemies}
    assert plan_greedy(state, random.Random(42)) == []


def test_estimate_human_wr_basic():
    """Triangulation formula: greedy×0.55 + utility×0.45."""
    results = {
        "random": {"win_rate": 5.0},
        "greedy": {"win_rate": 20.0},
        "utility": {"win_rate": 40.0},
    }
    est = estimate_human_wr(results)
    assert est["band"] == [5.0, 40.0]
    assert est["band_width_pp"] == 35.0
    # 20 × 0.55 + 40 × 0.45 = 11 + 18 = 29
    assert est["human_wr_estimate"] == 29.0
    assert est["skill_dominated"] is True  # band_width >= 20pp
    assert est["luck_dominated"] is False


def test_estimate_human_wr_luck_dominated():
    """Narrow band (< 10pp) = luck-dominated."""
    results = {
        "random": {"win_rate": 20.0},
        "greedy": {"win_rate": 25.0},
        "utility": {"win_rate": 28.0},
    }
    est = estimate_human_wr(results)
    assert est["band_width_pp"] == 8.0
    assert est["luck_dominated"] is True
    assert est["skill_dominated"] is False


def test_estimate_human_wr_mixed():
    """Medium band (10-20pp) = mixed."""
    results = {
        "random": {"win_rate": 10.0},
        "greedy": {"win_rate": 20.0},
        "utility": {"win_rate": 25.0},
    }
    est = estimate_human_wr(results)
    assert est["band_width_pp"] == 15.0
    assert est["skill_dominated"] is False
    assert est["luck_dominated"] is False


def test_format_markdown_smoke():
    """Markdown output contains frontmatter + tables + triangulation."""
    results = {
        "random": {"n": 10, "win_rate": 5.0, "defeat_rate": 90.0, "timeout_rate": 5.0, "rounds_avg": 20, "kd_avg": 0.5},
        "greedy": {"n": 10, "win_rate": 20.0, "defeat_rate": 70.0, "timeout_rate": 10.0, "rounds_avg": 18, "kd_avg": 1.2},
        "utility": {"n": 10, "win_rate": 40.0, "defeat_rate": 50.0, "timeout_rate": 10.0, "rounds_avg": 16, "kd_avg": 2.0},
    }
    band = estimate_human_wr(results)
    md = format_markdown("enc_tutorial_06_hardcore", results, band, n=10)
    assert md.startswith("---\n")
    assert "# Restricted Play Triangulation" in md
    assert "enc_tutorial_06_hardcore" in md
    assert "| `random` |" in md
    assert "| `greedy` |" in md
    assert "| `utility` |" in md
    assert "Band" in md
    assert "Human WR estimate" in md
    assert "Jaffe" in md


def test_estimate_human_wr_error_on_no_data():
    """Empty results → error key."""
    assert estimate_human_wr({})["error"] == "no valid WR data"


# ─────────────────────────────────────────────────────────
# run_one unit_override plumbing (no real HTTP)
# ─────────────────────────────────────────────────────────


def test_run_one_unit_override_rewrites_units_before_session_start(monkeypatch):
    """Hook must be applied to each unit before POST /api/session/start."""
    from tools.py import restricted_play as rp

    scenario_units = [
        {"id": "p1", "controlled_by": "player", "hp": 10, "position": {"x": 0, "y": 0}},
        {"id": "e1", "controlled_by": "sistema", "hp": 5, "position": {"x": 2, "y": 2}},
    ]

    monkeypatch.setattr(
        rp, "http_get", lambda url: (200, {"units": scenario_units, "recommended_modulation": "solo"})
    )

    posts: list[tuple[str, dict]] = []

    def fake_post(url, payload):
        posts.append((url, payload))
        if url.endswith("/api/session/start"):
            # After first post, enemy dead → victory next state.
            return 200, {
                "session_id": "sid-test",
                "state": {
                    "units": payload["units"],
                    "grid": {"width": 5, "height": 5},
                },
            }
        if url.endswith("/api/session/round/execute"):
            return 200, {
                "state": {
                    "units": [u for u in payload.get("session_id", []) if False]
                    + [{"id": "p1", "controlled_by": "player", "hp": 10, "position": {"x": 0, "y": 0}}],
                    "grid": {"width": 5, "height": 5},
                }
            }
        return 200, {}

    monkeypatch.setattr(rp, "http_post", fake_post)

    def override(u):
        if u["controlled_by"] == "player":
            return {**u, "hp": 99, "tag": "hero"}
        return u

    result = rp.run_one(
        "http://backend", "enc_test", policy="greedy", seed=1, unit_override=override
    )
    start_payload = next(p for url, p in posts if url.endswith("/api/session/start"))
    assert start_payload["units"][0]["hp"] == 99  # override applied to player
    assert start_payload["units"][0]["tag"] == "hero"
    assert start_payload["units"][1]["hp"] == 5  # enemy untouched
    assert result.outcome in ("victory", "defeat", "timeout")


def test_run_one_without_unit_override_passes_units_through(monkeypatch):
    """Baseline — no hook = no rewrite."""
    from tools.py import restricted_play as rp

    scenario_units = [
        {"id": "p1", "controlled_by": "player", "hp": 7, "position": {"x": 0, "y": 0}},
    ]
    monkeypatch.setattr(rp, "http_get", lambda url: (200, {"units": scenario_units}))
    posts: list[tuple[str, dict]] = []

    def fake_post(url, payload):
        posts.append((url, payload))
        if url.endswith("/api/session/start"):
            return 200, {"session_id": "s", "state": {"units": payload["units"], "grid": {"width": 5, "height": 5}}}
        return 200, {}

    monkeypatch.setattr(rp, "http_post", fake_post)

    rp.run_one("http://backend", "enc", policy="greedy", seed=1)
    start_payload = next(p for url, p in posts if url.endswith("/api/session/start"))
    assert start_payload["units"][0]["hp"] == 7  # untouched
