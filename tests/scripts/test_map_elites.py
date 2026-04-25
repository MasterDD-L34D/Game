"""Tests for tools/py/map_elites.py — Quality-Diversity archive."""

from __future__ import annotations

import random

import pytest


pytest.importorskip("tools.py.map_elites", reason="PYTHONPATH=tools/py required")

from tools.py.map_elites import (  # noqa: E402
    ARCHETYPES,
    ARCHETYPE_INDEX,
    BALANCE_FEATURE_DIMS,
    Cell,
    FeatureDim,
    MapElitesArchive,
    apply_build_to_unit,
    archive_to_dict,
    build_http_evaluator,
    build_random_solution,
    format_markdown,
    mutate_build,
    run_map_elites,
    synthetic_fitness,
)


# ─────────────────────────────────────────────────────────
# FeatureDim + MapElitesArchive
# ─────────────────────────────────────────────────────────


def test_feature_dim_dataclass_shape():
    d = FeatureDim("x", 0.0, 1.0)
    assert d.name == "x"
    assert d.low == 0.0
    assert d.high == 1.0


def test_archive_total_cells():
    arc = MapElitesArchive([FeatureDim("a", 0, 1), FeatureDim("b", 0, 1)], bins_per_dim=4)
    assert arc.total_cells() == 16  # 4^2


def test_archive_validation_empty_dims():
    with pytest.raises(ValueError, match="non-empty"):
        MapElitesArchive([], bins_per_dim=4)


def test_archive_validation_bad_bins():
    with pytest.raises(ValueError, match="bins_per_dim"):
        MapElitesArchive([FeatureDim("a", 0, 1)], bins_per_dim=0)


def test_archive_validation_bad_dim_range():
    with pytest.raises(ValueError, match="low"):
        MapElitesArchive([FeatureDim("a", 1, 0)], bins_per_dim=4)


def test_cell_for_basic():
    arc = MapElitesArchive([FeatureDim("a", 0, 1)], bins_per_dim=4)
    # 0..0.25 → bin 0, 0.25..0.5 → bin 1, etc.
    assert arc.cell_for([0.1]) == (0,)
    assert arc.cell_for([0.3]) == (1,)
    assert arc.cell_for([0.6]) == (2,)
    assert arc.cell_for([0.9]) == (3,)


def test_cell_for_clamps_out_of_range():
    arc = MapElitesArchive([FeatureDim("a", 0, 1)], bins_per_dim=4)
    assert arc.cell_for([-1.0]) == (0,)
    assert arc.cell_for([2.0]) == (3,)


def test_cell_for_high_value_lands_in_top_bin():
    """Value exactly at high should land in last bin (not overflow)."""
    arc = MapElitesArchive([FeatureDim("a", 0, 1)], bins_per_dim=4)
    assert arc.cell_for([1.0]) == (3,)


def test_cell_for_dim_count_mismatch():
    arc = MapElitesArchive([FeatureDim("a", 0, 1)], bins_per_dim=4)
    with pytest.raises(ValueError, match="behavior length"):
        arc.cell_for([0.5, 0.5])


def test_archive_add_accepts_first():
    arc = MapElitesArchive([FeatureDim("a", 0, 1)], bins_per_dim=4)
    assert arc.add({"x": 1}, fitness=0.5, behavior=[0.5]) is True
    assert len(arc.archive) == 1


def test_archive_add_replaces_when_better():
    arc = MapElitesArchive([FeatureDim("a", 0, 1)], bins_per_dim=4)
    arc.add({"x": 1}, 0.5, [0.5])
    assert arc.add({"x": 2}, 0.7, [0.5]) is True
    assert arc.archive[(2,)].solution == {"x": 2}
    assert arc.archive[(2,)].fitness == 0.7


def test_archive_add_rejects_when_worse_or_equal():
    arc = MapElitesArchive([FeatureDim("a", 0, 1)], bins_per_dim=4)
    arc.add({"x": 1}, 0.5, [0.5])
    assert arc.add({"x": 2}, 0.3, [0.5]) is False
    assert arc.add({"x": 3}, 0.5, [0.5]) is False  # equal → reject (strict >)
    assert arc.archive[(2,)].solution == {"x": 1}


def test_archive_coverage_empty():
    arc = MapElitesArchive([FeatureDim("a", 0, 1)], bins_per_dim=4)
    assert arc.coverage() == 0.0


def test_archive_coverage_full():
    arc = MapElitesArchive([FeatureDim("a", 0, 1)], bins_per_dim=4)
    for v in [0.1, 0.3, 0.6, 0.9]:
        arc.add({"x": v}, 0.5, [v])
    assert arc.coverage() == 1.0


def test_archive_stats_empty():
    arc = MapElitesArchive([FeatureDim("a", 0, 1)], bins_per_dim=4)
    s = arc.stats()
    assert s["count"] == 0
    assert s["fitness_max"] is None
    assert s["coverage"] == 0.0


def test_archive_stats_populated():
    arc = MapElitesArchive([FeatureDim("a", 0, 1)], bins_per_dim=4)
    arc.add({"x": 1}, 0.3, [0.1])
    arc.add({"x": 2}, 0.7, [0.5])
    s = arc.stats()
    assert s["count"] == 2
    assert s["fitness_max"] == 0.7
    assert s["fitness_min"] == 0.3
    assert s["fitness_avg"] == 0.5


# ─────────────────────────────────────────────────────────
# run_map_elites
# ─────────────────────────────────────────────────────────


def test_run_map_elites_basic():
    rng = random.Random(0)
    initial = [build_random_solution(rng) for _ in range(5)]
    archive, history = run_map_elites(
        initial_solutions=initial,
        mutator=mutate_build,
        evaluator=synthetic_fitness,
        feature_dims=BALANCE_FEATURE_DIMS,
        bins_per_dim=4,
        iterations=100,
        seed=42,
    )
    assert archive.total_cells() == 64  # 4^3
    assert len(history) == 100
    assert all("iter" in h and "fitness" in h and "accepted" in h for h in history)


def test_run_map_elites_deterministic_with_seed():
    rng = random.Random(0)
    initial = [build_random_solution(rng) for _ in range(5)]
    a1, _ = run_map_elites(initial, mutate_build, synthetic_fitness, BALANCE_FEATURE_DIMS, 4, 50, seed=7)
    a2, _ = run_map_elites(initial, mutate_build, synthetic_fitness, BALANCE_FEATURE_DIMS, 4, 50, seed=7)
    assert a1.stats() == a2.stats()
    # Same cell keys, same fitness per cell.
    assert set(a1.archive.keys()) == set(a2.archive.keys())
    for k in a1.archive:
        assert a1.archive[k].fitness == a2.archive[k].fitness


def test_run_map_elites_zero_iterations_only_seeds():
    rng = random.Random(0)
    initial = [build_random_solution(rng) for _ in range(5)]
    archive, history = run_map_elites(
        initial, mutate_build, synthetic_fitness, BALANCE_FEATURE_DIMS, 4, iterations=0, seed=1
    )
    assert history == []
    assert len(archive.archive) > 0  # seeds populated


def test_run_map_elites_negative_iterations_raises():
    with pytest.raises(ValueError, match="iterations"):
        run_map_elites([], mutate_build, synthetic_fitness, BALANCE_FEATURE_DIMS, 4, -1)


def test_run_map_elites_no_seeds_no_evolution():
    """Empty initial pool → can't evolve (nothing to mutate)."""
    archive, history = run_map_elites(
        initial_solutions=[],
        mutator=mutate_build,
        evaluator=synthetic_fitness,
        feature_dims=BALANCE_FEATURE_DIMS,
        bins_per_dim=4,
        iterations=10,
        seed=1,
    )
    assert history == []
    assert len(archive.archive) == 0


def test_run_map_elites_coverage_grows_with_iterations():
    """More iterations → broader coverage (in expectation)."""
    rng = random.Random(0)
    initial = [build_random_solution(rng) for _ in range(5)]
    a_short, _ = run_map_elites(initial, mutate_build, synthetic_fitness, BALANCE_FEATURE_DIMS, 4, 20, seed=1)
    a_long, _ = run_map_elites(initial, mutate_build, synthetic_fitness, BALANCE_FEATURE_DIMS, 4, 500, seed=1)
    assert a_long.coverage() >= a_short.coverage()


# ─────────────────────────────────────────────────────────
# Balance helpers
# ─────────────────────────────────────────────────────────


def test_archetypes_index_consistent():
    assert tuple(ARCHETYPES) == tuple(ARCHETYPE_INDEX.keys())
    for i, a in enumerate(ARCHETYPES):
        assert ARCHETYPE_INDEX[a] == i


def test_build_random_solution_shape():
    rng = random.Random(0)
    sol = build_random_solution(rng)
    assert "hp" in sol and 8 <= sol["hp"] <= 16
    assert "mod" in sol and 1 <= sol["mod"] <= 5
    assert "dc" in sol and 10 <= sol["dc"] <= 16
    assert 0 <= sol["mbti_t"] <= 1
    assert 0 <= sol["mbti_n"] <= 1
    assert sol["archetype"] in ARCHETYPES


def test_build_random_solution_deterministic():
    s1 = build_random_solution(random.Random(7))
    s2 = build_random_solution(random.Random(7))
    assert s1 == s2


def test_mutate_build_respects_bounds():
    rng = random.Random(0)
    sol = {"hp": 16, "mod": 5, "dc": 16, "mbti_t": 1.0, "mbti_n": 1.0, "archetype": "tank"}
    for seed in range(50):
        new = mutate_build(sol, random.Random(seed), rate=1.0)
        assert 8 <= new["hp"] <= 16
        assert 1 <= new["mod"] <= 5
        assert 10 <= new["dc"] <= 16
        assert 0 <= new["mbti_t"] <= 1
        assert 0 <= new["mbti_n"] <= 1
        assert new["archetype"] in ARCHETYPES


def test_mutate_build_preserves_unmodified_fields():
    rng = random.Random(0)
    sol = {"hp": 12, "mod": 3, "dc": 13, "mbti_t": 0.5, "mbti_n": 0.5, "archetype": "tank"}
    # rate=0 → no mutation → same dict
    new = mutate_build(sol, rng, rate=0.0)
    assert new == sol


def test_synthetic_fitness_at_ideal():
    """Ideal build (hp=12, mod=3, dc=13) → fitness 1.0."""
    sol = {"hp": 12, "mod": 3, "dc": 13, "mbti_t": 0.5, "mbti_n": 0.5, "archetype": "tank"}
    f, b = synthetic_fitness(sol)
    assert f == pytest.approx(1.0)
    assert b == (0.5, 0.5, 0.0)


def test_synthetic_fitness_far_from_ideal_lower():
    sol_ideal = {"hp": 12, "mod": 3, "dc": 13, "mbti_t": 0.5, "mbti_n": 0.5, "archetype": "tank"}
    sol_off = {"hp": 8, "mod": 1, "dc": 16, "mbti_t": 0.5, "mbti_n": 0.5, "archetype": "tank"}
    f_ideal, _ = synthetic_fitness(sol_ideal)
    f_off, _ = synthetic_fitness(sol_off)
    assert f_off < f_ideal


def test_synthetic_fitness_clamped_non_negative():
    """Worst-case build → fitness >= 0 (clamped)."""
    sol = {"hp": 8, "mod": 5, "dc": 16, "mbti_t": 0.5, "mbti_n": 0.5, "archetype": "tank"}
    f, _ = synthetic_fitness(sol)
    assert f >= 0


def test_synthetic_fitness_behavior_archetype_normalized():
    """Behavior 3rd dim ∈ [0, 1] across all archetypes."""
    for arch in ARCHETYPES:
        sol = {"hp": 12, "mod": 3, "dc": 13, "mbti_t": 0.5, "mbti_n": 0.5, "archetype": arch}
        _, b = synthetic_fitness(sol)
        assert 0 <= b[2] <= 1


# ─────────────────────────────────────────────────────────
# Markdown + JSON output
# ─────────────────────────────────────────────────────────


def test_archive_to_dict_shape():
    rng = random.Random(0)
    initial = [build_random_solution(rng) for _ in range(3)]
    archive, _ = run_map_elites(initial, mutate_build, synthetic_fitness, BALANCE_FEATURE_DIMS, 4, 10, seed=1)
    d = archive_to_dict(archive)
    assert "dims" in d and len(d["dims"]) == 3
    assert "bins" in d and d["bins"] == 4
    assert "stats" in d and "count" in d["stats"]
    assert "cells" in d and isinstance(d["cells"], list)


def test_format_markdown_smoke():
    rng = random.Random(0)
    initial = [build_random_solution(rng) for _ in range(5)]
    archive, history = run_map_elites(
        initial, mutate_build, synthetic_fitness, BALANCE_FEATURE_DIMS, 4, 100, seed=1
    )
    md = format_markdown(archive, history, iterations=100)
    assert md.startswith("---\n")
    assert "doc_owner: claude-code" in md
    assert "MAP-Elites Balance Archive" in md
    assert "## Run config" in md
    assert "## Archive stats" in md
    assert "## Top 10 elites" in md
    assert "## Convergence trajectory" in md
    assert "## Sources" in md
    assert "Mouret" in md


def test_format_markdown_empty_archive():
    """Empty archive → markdown still well-formed (no crashes on None stats)."""
    archive = MapElitesArchive(BALANCE_FEATURE_DIMS, bins_per_dim=4)
    md = format_markdown(archive, history=[], iterations=0)
    assert md.startswith("---\n")
    assert "Cells filled: **0**" in md


# ─────────────────────────────────────────────────────────
# Constants contract
# ─────────────────────────────────────────────────────────


def test_balance_feature_dims_normalized():
    """All balance dims should be in [0, 1] for stability with synthetic fitness."""
    for d in BALANCE_FEATURE_DIMS:
        assert d.low == 0.0
        assert d.high == 1.0


def test_archetypes_count():
    assert len(ARCHETYPES) == 3


# ─────────────────────────────────────────────────────────
# HTTP fitness wrapper (build_http_evaluator + apply_build_to_unit)
# ─────────────────────────────────────────────────────────


def _sample_build():
    return {
        "hp": 14,
        "mod": 3,
        "dc": 13,
        "mbti_t": 0.7,
        "mbti_n": 0.2,
        "archetype": "tank",
    }


class _FakeRun:
    """Minimal stand-in for restricted_play.RunResult."""

    def __init__(self, outcome: str):
        self.outcome = outcome


def test_apply_build_to_unit_overrides_combat_keys():
    unit = {"id": "u1", "controlled_by": "player", "position": {"x": 1, "y": 2}, "hp": 1}
    out = apply_build_to_unit(unit, _sample_build())
    assert out["hp"] == 14
    assert out["hp_max"] == 14
    assert out["mod"] == 3
    assert out["attack_mod"] == 3
    assert out["dc"] == 13
    assert out["defense_dc"] == 13
    assert out["archetype"] == "tank"
    assert out["mbti"] == {"t": 0.7, "n": 0.2}


def test_apply_build_to_unit_preserves_identity_fields():
    unit = {"id": "u1", "controlled_by": "player", "position": {"x": 1, "y": 2}, "team": "A"}
    out = apply_build_to_unit(unit, _sample_build())
    assert out["id"] == "u1"
    assert out["controlled_by"] == "player"
    assert out["position"] == {"x": 1, "y": 2}
    assert out["team"] == "A"


def test_apply_build_to_unit_returns_new_dict():
    unit = {"id": "u1", "hp": 1}
    out = apply_build_to_unit(unit, _sample_build())
    assert unit is not out
    assert unit["hp"] == 1  # source not mutated


def test_build_http_evaluator_rejects_invalid_role():
    with pytest.raises(ValueError, match="role must be"):
        build_http_evaluator("http://x", "enc", "greedy", n_runs=1, role="nobody")


def test_build_http_evaluator_rejects_zero_runs():
    with pytest.raises(ValueError, match="n_runs"):
        build_http_evaluator("http://x", "enc", "greedy", n_runs=0)


def test_build_http_evaluator_computes_winrate_fitness():
    """Fitness = (wins / n_runs); 3 victories out of 4 → 0.75."""
    outcomes = iter(["victory", "victory", "defeat", "victory"])
    calls = []

    def fake_run_one(host, scenario_id, policy, seed, unit_override=None):
        calls.append({"host": host, "scenario": scenario_id, "policy": policy, "seed": seed})
        return _FakeRun(next(outcomes))

    evaluator = build_http_evaluator(
        host="http://backend",
        scenario_id="enc_test",
        policy="greedy",
        n_runs=4,
        seed_base=500,
        run_one_fn=fake_run_one,
    )
    fitness, behavior = evaluator(_sample_build())
    assert fitness == 0.75
    assert behavior == (0.7, 0.2, ARCHETYPE_INDEX["tank"] / (len(ARCHETYPES) - 1))
    assert len(calls) == 4
    assert [c["seed"] for c in calls] == [500, 501, 502, 503]
    assert all(c["host"] == "http://backend" and c["policy"] == "greedy" for c in calls)


def test_build_http_evaluator_override_applies_only_to_matching_role():
    """Override hook mutates only units with controlled_by == role."""
    scenario_units = [
        {"id": "p1", "controlled_by": "player", "hp": 10, "mod": 1, "dc": 10, "archetype": "base"},
        {"id": "e1", "controlled_by": "sistema", "hp": 5, "mod": 2, "dc": 11, "archetype": "wolf"},
    ]
    captured_overrides = []

    def fake_run_one(host, scenario_id, policy, seed, unit_override=None):
        assert unit_override is not None
        rewritten = [unit_override(dict(u)) for u in scenario_units]
        captured_overrides.append(rewritten)
        return _FakeRun("defeat")

    evaluator = build_http_evaluator(
        host="http://x", scenario_id="s", policy="greedy", n_runs=1, role="player",
        run_one_fn=fake_run_one,
    )
    fitness, _ = evaluator(_sample_build())
    assert fitness == 0.0  # no victory
    player_after, enemy_after = captured_overrides[0]
    assert player_after["hp"] == 14 and player_after["archetype"] == "tank"
    assert enemy_after["hp"] == 5 and enemy_after["archetype"] == "wolf"  # untouched


def test_build_http_evaluator_role_sistema():
    """Flip the role to override enemy stats instead of player."""
    scenario_units = [
        {"id": "p1", "controlled_by": "player", "hp": 10, "archetype": "base"},
        {"id": "e1", "controlled_by": "sistema", "hp": 5, "archetype": "wolf"},
    ]
    captured = []

    def fake_run_one(host, scenario_id, policy, seed, unit_override=None):
        captured.append([unit_override(dict(u)) for u in scenario_units])
        return _FakeRun("victory")

    evaluator = build_http_evaluator(
        host="http://x", scenario_id="s", policy="greedy", n_runs=2, role="sistema",
        run_one_fn=fake_run_one,
    )
    fitness, _ = evaluator(_sample_build())
    assert fitness == 1.0  # all victories
    assert captured[0][0]["hp"] == 10  # player untouched
    assert captured[0][1]["hp"] == 14 and captured[0][1]["archetype"] == "tank"


def test_build_http_evaluator_behavior_vector_stable():
    """Behavior depends only on solution axes, not on win/loss."""

    def loser(*_a, **_kw):
        return _FakeRun("defeat")

    def winner(*_a, **_kw):
        return _FakeRun("victory")

    sol = {"hp": 10, "mod": 2, "dc": 12, "mbti_t": 0.3, "mbti_n": 0.9, "archetype": "skirmisher"}
    _, b1 = build_http_evaluator("h", "s", "greedy", 1, run_one_fn=loser)(sol)
    _, b2 = build_http_evaluator("h", "s", "greedy", 1, run_one_fn=winner)(sol)
    assert b1 == b2
    assert b1 == (0.3, 0.9, ARCHETYPE_INDEX["skirmisher"] / (len(ARCHETYPES) - 1))


def test_build_http_evaluator_n_runs_one_binary_fitness():
    """n_runs=1 collapses fitness to 0 or 1 exactly."""
    sol = _sample_build()
    ev_win = build_http_evaluator("h", "s", "greedy", 1, run_one_fn=lambda *a, **kw: _FakeRun("victory"))
    ev_lose = build_http_evaluator("h", "s", "greedy", 1, run_one_fn=lambda *a, **kw: _FakeRun("timeout"))
    assert ev_win(sol)[0] == 1.0
    assert ev_lose(sol)[0] == 0.0
