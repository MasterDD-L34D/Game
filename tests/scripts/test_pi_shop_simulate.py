"""Tests for tools/py/pi_shop_simulate.py — PI shop Monte Carlo harness."""

from __future__ import annotations

import random
from pathlib import Path

import pytest


pytest.importorskip("tools.py.pi_shop_simulate", reason="PYTHONPATH=tools/py required")

from tools.py.pi_shop_simulate import (  # noqa: E402
    DEFAULT_CAPS,
    DEFAULT_TIER_BUDGETS,
    POWER_RANK,
    VALID_STRATEGIES,
    Purchase,
    execute_strategy,
    format_markdown,
    parse_pi_shop,
    run_simulation,
    sample_tier,
    spend_cheapest,
    spend_power,
    spend_random,
)


SAMPLE_COSTS = {
    "trait_T1": 3,
    "trait_T2": 6,
    "trait_T3": 10,
    "job_ability": 4,
    "ultimate_slot": 6,
    "cap_pt": 2,
    "guardia_situazionale": 2,
    "starter_bioma": 1,
    "sigillo_forma": 2,
    "modulo_tattico": 3,
}
SAMPLE_CAPS = {"cap_pt": 1, "starter_bioma": 1}


# ─────────────────────────────────────────────────────────
# parse_pi_shop
# ─────────────────────────────────────────────────────────


def test_parse_pi_shop_real_yaml():
    """Real `data/packs.yaml` parses costs + caps + budgets correctly."""
    data = parse_pi_shop(Path("data/packs.yaml"))
    assert data["costs"]["trait_T1"] == 3
    assert data["costs"]["trait_T3"] == 10
    assert data["caps"]["cap_pt"] == 1
    assert data["caps"]["starter_bioma"] == 1
    assert data["budgets"]["baseline"] == 7
    assert data["budgets"]["veteran"] == 9
    assert data["budgets"]["elite"] == 11


# ─────────────────────────────────────────────────────────
# spend_cheapest
# ─────────────────────────────────────────────────────────


def test_cheapest_picks_lowest_cost_first():
    """Cheapest: starter_bioma (1) chosen first if available + cap not exceeded."""
    p = spend_cheapest(SAMPLE_COSTS, budget=7, caps=SAMPLE_CAPS)
    # First pick = starter_bioma (1 PI), then cap_pt (2 PI), exhaust caps,
    # then guardia_situazionale (2) + sigillo_forma (2) = 7 total.
    assert "starter_bioma" in p.items
    assert "cap_pt" in p.items
    assert p.spent == 7
    assert p.remaining == 0


def test_cheapest_respects_caps():
    """starter_bioma cap=1 → cannot buy 7× starter even with budget 7."""
    p = spend_cheapest(SAMPLE_COSTS, budget=7, caps=SAMPLE_CAPS)
    assert p.items.count("starter_bioma") == 1
    assert p.items.count("cap_pt") == 1


def test_cheapest_zero_budget_buys_nothing():
    p = spend_cheapest(SAMPLE_COSTS, budget=0, caps=SAMPLE_CAPS)
    assert p.items == []
    assert p.spent == 0
    assert p.remaining == 0


def test_cheapest_under_min_cost_leaves_residual():
    """Budget < cheapest item (smallest = 1) → all stockpiled."""
    expensive_costs = {"x": 5}
    p = spend_cheapest(expensive_costs, budget=3, caps={})
    assert p.items == []
    assert p.remaining == 3


# ─────────────────────────────────────────────────────────
# spend_power
# ─────────────────────────────────────────────────────────


def test_power_picks_highest_tier_first():
    """Power: budget 11 → trait_T3 (10) first, then starter_bioma (1)."""
    p = spend_power(SAMPLE_COSTS, budget=11, caps=SAMPLE_CAPS)
    assert p.items[0] == "trait_T3"
    assert p.spent == 11
    assert p.remaining == 0


def test_power_falls_back_to_lower_when_no_budget():
    """Power: budget 7 → trait_T2 (6) > job_ability (4) by power, residual 1 → starter_bioma."""
    p = spend_power(SAMPLE_COSTS, budget=7, caps=SAMPLE_CAPS)
    assert p.items[0] == "trait_T2"
    assert "starter_bioma" in p.items
    assert p.spent == 7


def test_power_respects_caps_same_as_cheapest():
    p = spend_power(SAMPLE_COSTS, budget=11, caps=SAMPLE_CAPS)
    assert p.items.count("starter_bioma") <= 1
    assert p.items.count("cap_pt") <= 1


# ─────────────────────────────────────────────────────────
# spend_random
# ─────────────────────────────────────────────────────────


def test_random_deterministic_with_seed():
    p1 = spend_random(SAMPLE_COSTS, 7, SAMPLE_CAPS, random.Random(42))
    p2 = spend_random(SAMPLE_COSTS, 7, SAMPLE_CAPS, random.Random(42))
    assert p1.items == p2.items
    assert p1.spent == p2.spent


def test_random_does_not_exceed_budget():
    p = spend_random(SAMPLE_COSTS, 7, SAMPLE_CAPS, random.Random(42))
    assert p.spent <= 7
    assert p.remaining == 7 - p.spent


def test_random_respects_caps_across_runs():
    """Property: any seed → caps never exceeded."""
    for seed in range(20):
        p = spend_random(SAMPLE_COSTS, 11, SAMPLE_CAPS, random.Random(seed))
        assert p.items.count("starter_bioma") <= 1
        assert p.items.count("cap_pt") <= 1


# ─────────────────────────────────────────────────────────
# execute_strategy
# ─────────────────────────────────────────────────────────


def test_execute_strategy_dispatch():
    """Dispatch routes correctly to each spend_*."""
    rng = random.Random(0)
    p_c = execute_strategy("cheapest", SAMPLE_COSTS, 7, SAMPLE_CAPS, rng)
    p_p = execute_strategy("power", SAMPLE_COSTS, 7, SAMPLE_CAPS, rng)
    p_r = execute_strategy("random", SAMPLE_COSTS, 7, SAMPLE_CAPS, rng)
    assert p_c.spent <= 7
    assert p_p.spent <= 7
    assert p_r.spent <= 7


def test_execute_strategy_invalid_raises():
    with pytest.raises(ValueError, match="Unknown strategy"):
        execute_strategy("bogus", SAMPLE_COSTS, 7, SAMPLE_CAPS, random.Random(0))


# ─────────────────────────────────────────────────────────
# sample_tier
# ─────────────────────────────────────────────────────────


def test_sample_tier_returns_valid_tier():
    dist = {"baseline": 0.5, "veteran": 0.5}
    rng = random.Random(0)
    sampled = [sample_tier(dist, rng) for _ in range(100)]
    assert all(s in dist for s in sampled)


def test_sample_tier_distribution_approximates():
    """100 samples from 70/30 split → roughly 65-75% baseline."""
    dist = {"baseline": 0.7, "veteran": 0.3}
    rng = random.Random(42)
    samples = [sample_tier(dist, rng) for _ in range(1000)]
    baseline_count = samples.count("baseline")
    assert 650 < baseline_count < 750  # ~70% with tolerance


# ─────────────────────────────────────────────────────────
# run_simulation
# ─────────────────────────────────────────────────────────


def test_run_simulation_basic():
    r = run_simulation(SAMPLE_COSTS, SAMPLE_CAPS, DEFAULT_TIER_BUDGETS, "cheapest", n=100, seed=42)
    assert r["strategy"] == "cheapest"
    assert r["n"] == 100
    assert r["items_per_run"]["n"] == 100
    assert r["items_per_run"]["avg"] > 0
    assert "trait_T1" in r["item_popularity"] or "starter_bioma" in r["item_popularity"]


def test_run_simulation_invalid_strategy():
    with pytest.raises(ValueError, match="strategy"):
        run_simulation(SAMPLE_COSTS, SAMPLE_CAPS, DEFAULT_TIER_BUDGETS, "bogus", n=10)


def test_run_simulation_zero_n_invalid():
    with pytest.raises(ValueError, match="positive"):
        run_simulation(SAMPLE_COSTS, SAMPLE_CAPS, DEFAULT_TIER_BUDGETS, "cheapest", n=0)


def test_run_simulation_deterministic_with_seed():
    r1 = run_simulation(SAMPLE_COSTS, SAMPLE_CAPS, DEFAULT_TIER_BUDGETS, "random", n=50, seed=7)
    r2 = run_simulation(SAMPLE_COSTS, SAMPLE_CAPS, DEFAULT_TIER_BUDGETS, "random", n=50, seed=7)
    assert r1["item_popularity"] == r2["item_popularity"]
    assert r1["items_per_run"] == r2["items_per_run"]


def test_run_simulation_per_tier_breakdown():
    r = run_simulation(SAMPLE_COSTS, SAMPLE_CAPS, DEFAULT_TIER_BUDGETS, "power", n=200, seed=1)
    # All three tiers should have at least one observation.
    for tier in ("baseline", "veteran", "elite"):
        assert tier in r["by_tier"]


# ─────────────────────────────────────────────────────────
# format_markdown
# ─────────────────────────────────────────────────────────


def test_format_markdown_smoke():
    results = {
        s: run_simulation(SAMPLE_COSTS, SAMPLE_CAPS, DEFAULT_TIER_BUDGETS, s, n=50, seed=7)
        for s in VALID_STRATEGIES
    }
    md = format_markdown(results, SAMPLE_COSTS, DEFAULT_TIER_BUDGETS, n=50)
    assert md.startswith("---\n")
    assert "doc_owner: claude-code" in md
    assert "PI Shop Monte Carlo" in md
    assert "## Strategy comparison" in md
    assert "| `cheapest` |" in md
    assert "| `power` |" in md
    assert "| `random` |" in md
    assert "## Item popularity" in md
    assert "## Per-tier breakdown" in md


# ─────────────────────────────────────────────────────────
# Constants contract
# ─────────────────────────────────────────────────────────


def test_default_caps_match_yaml():
    """Test contract: cap defaults align with data/packs.yaml caps."""
    yaml_data = parse_pi_shop(Path("data/packs.yaml"))
    for k, v in yaml_data["caps"].items():
        assert DEFAULT_CAPS[k] == v


def test_power_rank_covers_all_default_costs():
    """Every item in the cost matrix should have a power rank."""
    for item in SAMPLE_COSTS:
        assert item in POWER_RANK


def test_purchase_dataclass_shape():
    p = Purchase(items=["x"], spent=3, remaining=4)
    assert p.items == ["x"]
    assert p.spent + p.remaining == 7
