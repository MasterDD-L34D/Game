#!/usr/bin/env python3
"""MAP-Elites lightweight — Quality-Diversity archive for balance illumination.

Closes balance-illuminator P1 — MAP-Elites lightweight implementation
(~6h estimate). Pattern: Mouret & Clune 2015, applied to balance per
Fontaine et al. 2019 (Hearthstone deck illumination).

Where SPRT (PR #1758) decides "is build A in band X-Y?", MAP-Elites
asks the broader question: "WHICH builds are viable, and where do they
sit in the design space?". Surfaces exploits + boring optima
simultaneously, by design.

Generic engine + concrete balance use case in the same module:
- `MapElitesArchive`: behaviour-space → best-fitness solution mapping
- `run_map_elites`: evolution loop (random elite → mutate → evaluate)
- Balance helpers: `build_random_solution`, `mutate_build`, `synthetic_fitness`

Mock fitness for unit tests + CLI smoke; HTTP fitness wired via
`restricted_play.run_one` (see `build_http_evaluator`).

## Usage

    # Synthetic (CI-safe, no backend)
    PYTHONPATH=. python3 tools/py/map_elites.py \\
        --iterations 1000 --bins 4 --seed 42 \\
        --out-md docs/balance/2026-04-25-map-elites-archive.md

    # HTTP-backed fitness (needs backend at $MAP_ELITES_HOST or --host)
    PYTHONPATH=. python3 tools/py/map_elites.py \\
        --iterations 200 --bins 3 --seed 7 \\
        --fitness http --scenario enc_tutorial_06_hardcore \\
        --policy greedy --n-runs 3 --role player \\
        --out-md docs/balance/$(date +%F)-map-elites-archive-http.md

## Non-goals

- CMA-ME / CMA-MEGA gradient variants (Fontaine 2020+)
- Multi-objective fitness (Pareto MAP-Elites)
- Session-state clone API (needed for MCTS smart policy, separate P0)

## References

- Mouret & Clune 2015 — "Illuminating search spaces by mapping elites"
  https://arxiv.org/abs/1504.04909
- Fontaine et al. 2019 — "Mapping Hearthstone Deck Spaces" (FDG)
  https://arxiv.org/abs/1904.10656
- Cully 2021 survey — "Quality-Diversity Optimization"
  https://arxiv.org/abs/2012.04322
- Agent: .claude/agents/balance-illuminator.md
"""

from __future__ import annotations

import argparse
import json
import os
import random
import statistics
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable, Optional, Sequence


# ─────────────────────────────────────────────────────────
# Generic MAP-Elites archive
# ─────────────────────────────────────────────────────────


@dataclass
class FeatureDim:
    """One axis of the behaviour space."""

    name: str
    low: float
    high: float


@dataclass
class Cell:
    solution: dict
    fitness: float
    behavior: tuple[float, ...]


class MapElitesArchive:
    """Behaviour-space grid storing the best-fitness solution per cell.

    Behaviour vectors are bucketed into `bins_per_dim ** len(feature_dims)`
    cells. `add()` returns True iff the new solution is accepted (cell empty
    or strictly higher fitness than the current elite).
    """

    def __init__(self, feature_dims: Sequence[FeatureDim], bins_per_dim: int):
        if not feature_dims:
            raise ValueError("feature_dims must be non-empty")
        if bins_per_dim < 1:
            raise ValueError("bins_per_dim must be >= 1")
        for d in feature_dims:
            if d.low >= d.high:
                raise ValueError(f"dim {d.name}: low ({d.low}) must be < high ({d.high})")
        self.dims = list(feature_dims)
        self.bins = bins_per_dim
        self.archive: dict[tuple[int, ...], Cell] = {}

    def total_cells(self) -> int:
        return self.bins ** len(self.dims)

    def cell_for(self, behavior: Sequence[float]) -> tuple[int, ...]:
        if len(behavior) != len(self.dims):
            raise ValueError(
                f"behavior length {len(behavior)} != dims {len(self.dims)}"
            )
        idx = []
        for value, dim in zip(behavior, self.dims):
            clamped = max(dim.low, min(dim.high, float(value)))
            normalized = (clamped - dim.low) / (dim.high - dim.low)
            bin_i = int(normalized * self.bins)
            if bin_i >= self.bins:
                bin_i = self.bins - 1
            idx.append(bin_i)
        return tuple(idx)

    def add(self, solution: dict, fitness: float, behavior: Sequence[float]) -> bool:
        cell = self.cell_for(behavior)
        existing = self.archive.get(cell)
        if existing is None or existing.fitness < fitness:
            self.archive[cell] = Cell(
                solution=dict(solution),
                fitness=float(fitness),
                behavior=tuple(behavior),
            )
            return True
        return False

    def coverage(self) -> float:
        return len(self.archive) / self.total_cells()

    def stats(self) -> dict:
        if not self.archive:
            return {
                "count": 0,
                "total_cells": self.total_cells(),
                "coverage": 0.0,
                "fitness_max": None,
                "fitness_avg": None,
                "fitness_min": None,
            }
        fits = [c.fitness for c in self.archive.values()]
        return {
            "count": len(self.archive),
            "total_cells": self.total_cells(),
            "coverage": round(self.coverage(), 4),
            "fitness_max": round(max(fits), 4),
            "fitness_avg": round(statistics.mean(fits), 4),
            "fitness_min": round(min(fits), 4),
        }


# ─────────────────────────────────────────────────────────
# Evolution loop
# ─────────────────────────────────────────────────────────


def run_map_elites(
    initial_solutions: list[dict],
    mutator: Callable[[dict, random.Random], dict],
    evaluator: Callable[[dict], tuple[float, Sequence[float]]],
    feature_dims: Sequence[FeatureDim],
    bins_per_dim: int,
    iterations: int,
    seed: int = 1000,
) -> tuple[MapElitesArchive, list[dict]]:
    """Run MAP-Elites: seed → evolve.

    Returns (archive, history) where history[i] = {iter, fitness, accepted, coverage}.
    """
    if iterations < 0:
        raise ValueError("iterations must be >= 0")
    rng = random.Random(seed)
    archive = MapElitesArchive(feature_dims, bins_per_dim)

    # Seed phase: evaluate initial solutions.
    for sol in initial_solutions:
        f, b = evaluator(sol)
        archive.add(sol, f, b)

    history: list[dict] = []
    for i in range(iterations):
        if not archive.archive:
            # No seed survived → can't evolve.
            break
        cell_keys = list(archive.archive.keys())
        elite_cell = cell_keys[rng.randrange(len(cell_keys))]
        elite = archive.archive[elite_cell]
        new_sol = mutator(elite.solution, rng)
        f, b = evaluator(new_sol)
        accepted = archive.add(new_sol, f, b)
        history.append(
            {
                "iter": i + 1,
                "fitness": round(f, 4),
                "accepted": accepted,
                "coverage": round(archive.coverage(), 4),
            }
        )

    return archive, history


# ─────────────────────────────────────────────────────────
# Balance-specific helpers (concrete use case)
# ─────────────────────────────────────────────────────────


ARCHETYPES = ("tank", "skirmisher", "support")
ARCHETYPE_INDEX = {a: i for i, a in enumerate(ARCHETYPES)}


def build_random_solution(rng: random.Random) -> dict:
    """Random tactical-build solution for the balance use case."""
    return {
        "hp": rng.randint(8, 16),
        "mod": rng.randint(1, 5),
        "dc": rng.randint(10, 16),
        "mbti_t": round(rng.random(), 3),
        "mbti_n": round(rng.random(), 3),
        "archetype": rng.choice(ARCHETYPES),
    }


def mutate_build(sol: dict, rng: random.Random, rate: float = 0.3) -> dict:
    """Per-field mutation with probability `rate`. Bounded to schema."""
    new = dict(sol)
    if rng.random() < rate:
        new["hp"] = max(8, min(16, int(new["hp"]) + rng.choice([-1, 1])))
    if rng.random() < rate:
        new["mod"] = max(1, min(5, int(new["mod"]) + rng.choice([-1, 1])))
    if rng.random() < rate:
        new["dc"] = max(10, min(16, int(new["dc"]) + rng.choice([-1, 1])))
    if rng.random() < rate:
        new["mbti_t"] = round(max(0.0, min(1.0, float(new["mbti_t"]) + rng.uniform(-0.2, 0.2))), 3)
    if rng.random() < rate:
        new["mbti_n"] = round(max(0.0, min(1.0, float(new["mbti_n"]) + rng.uniform(-0.2, 0.2))), 3)
    if rng.random() < rate:
        new["archetype"] = rng.choice(ARCHETYPES)
    return new


def synthetic_fitness(sol: dict) -> tuple[float, tuple[float, float, float]]:
    """Mock fitness for CI-safe testing + initial illumination.

    Higher fitness when build is closer to "ideal balance" baseline:
    - hp ~ 12, mod ~ 3, dc ~ 13.
    Behaviour vector = (mbti_t, mbti_n, archetype_index/2 ∈ [0, 1]).

    Replace with real run_one(...) HTTP fitness for production use.
    """
    ideal_hp, ideal_mod, ideal_dc = 12, 3, 13
    hp_err = abs(int(sol["hp"]) - ideal_hp) / 8
    mod_err = abs(int(sol["mod"]) - ideal_mod) / 4
    dc_err = abs(int(sol["dc"]) - ideal_dc) / 6
    fitness = max(0.0, 1.0 - (hp_err + mod_err + dc_err) / 3)
    behavior = (
        float(sol["mbti_t"]),
        float(sol["mbti_n"]),
        ARCHETYPE_INDEX[sol["archetype"]] / max(1, len(ARCHETYPES) - 1),
    )
    return fitness, behavior


BALANCE_FEATURE_DIMS = [
    FeatureDim("mbti_t", 0.0, 1.0),
    FeatureDim("mbti_n", 0.0, 1.0),
    FeatureDim("archetype_idx", 0.0, 1.0),
]


DEFAULT_HTTP_HOST = os.environ.get("MAP_ELITES_HOST", "http://localhost:3334")


def apply_build_to_unit(unit: dict, build: dict) -> dict:
    """Inject build stats (hp/mod/dc/mbti/archetype) into a unit dict.

    Only keys meaningful to the combat resolver are overridden; caller-controlled
    fields (id, controlled_by, position, …) are preserved.
    """
    out = dict(unit)
    out["hp"] = int(build["hp"])
    out["hp_max"] = int(build["hp"])
    out["mod"] = int(build["mod"])
    out["attack_mod"] = int(build["mod"])
    out["dc"] = int(build["dc"])
    out["defense_dc"] = int(build["dc"])
    out["archetype"] = build["archetype"]
    out["mbti"] = {"t": float(build["mbti_t"]), "n": float(build["mbti_n"])}
    return out


def build_http_evaluator(
    host: str,
    scenario_id: str,
    policy: str,
    n_runs: int,
    role: str = "player",
    seed_base: int = 2000,
    run_one_fn: Optional[Callable] = None,
) -> Callable[[dict], tuple[float, tuple[float, float, float]]]:
    """Return an evaluator that computes fitness via live HTTP sessions.

    Each call: inject the build into every unit with `controlled_by == role`,
    run `n_runs` sessions with the given policy, return (win_rate, behavior)
    where behavior = (mbti_t, mbti_n, archetype_idx / 2).

    `run_one_fn` allows test injection; defaults to `restricted_play.run_one`.
    """
    if role not in {"player", "sistema"}:
        raise ValueError(f"role must be 'player' or 'sistema', got {role!r}")
    if n_runs < 1:
        raise ValueError("n_runs must be >= 1")

    if run_one_fn is None:
        from restricted_play import run_one as run_one_fn  # lazy import

    def _evaluator(solution: dict) -> tuple[float, tuple[float, float, float]]:
        def _override(unit: dict) -> dict:
            if unit.get("controlled_by") == role:
                return apply_build_to_unit(unit, solution)
            return unit

        wins = 0
        for i in range(n_runs):
            result = run_one_fn(
                host, scenario_id, policy, seed=seed_base + i, unit_override=_override
            )
            if getattr(result, "outcome", None) == "victory":
                wins += 1
        fitness = wins / n_runs
        behavior = (
            float(solution["mbti_t"]),
            float(solution["mbti_n"]),
            ARCHETYPE_INDEX[solution["archetype"]] / max(1, len(ARCHETYPES) - 1),
        )
        return fitness, behavior

    return _evaluator


# ─────────────────────────────────────────────────────────
# Markdown report
# ─────────────────────────────────────────────────────────


def format_markdown(
    archive: MapElitesArchive,
    history: list[dict],
    iterations: int,
    fitness_mode: str = "synthetic",
) -> str:
    today = datetime.now().date().isoformat()
    stats = archive.stats()
    lines: list[str] = []
    lines.append("---")
    lines.append(f"title: MAP-Elites Balance Archive ({today})")
    lines.append("doc_status: active")
    lines.append("doc_owner: claude-code")
    lines.append("workstream: dataset-pack")
    lines.append(f"last_verified: '{today}'")
    lines.append("source_of_truth: false")
    lines.append("language: it")
    lines.append("review_cycle_days: 30")
    lines.append("tags:")
    lines.append("  - balance")
    lines.append("  - map-elites")
    lines.append("  - quality-diversity")
    lines.append("  - generated")
    lines.append("---")
    lines.append("")
    lines.append("# MAP-Elites Balance Archive")
    lines.append("")
    lines.append(
        "Quality-Diversity illumination of the build design space. Closes "
        "[balance-illuminator P1](.claude/agents/balance-illuminator.md). "
        "Pattern: Mouret & Clune 2015 + Fontaine 2019 (FDG)."
    )
    lines.append("")
    lines.append("## Run config")
    lines.append("")
    lines.append(f"- Iterations: **{iterations}**")
    lines.append(f"- Feature dims: {[d.name for d in archive.dims]}")
    lines.append(f"- Bins per dim: **{archive.bins}** (total cells: {archive.total_cells()})")
    if fitness_mode == "http":
        lines.append("- Fitness: **http** (live backend via `restricted_play.run_one`)")
    else:
        lines.append(
            "- Fitness: synthetic (mock — production should wire `restricted_play.run_one`)"
        )
    lines.append("")
    lines.append("## Archive stats")
    lines.append("")
    lines.append(f"- Cells filled: **{stats['count']}** / {stats['total_cells']}")
    lines.append(f"- Coverage: **{stats['coverage'] * 100:.1f}%**")
    if stats["fitness_max"] is not None:
        lines.append(f"- Fitness max: {stats['fitness_max']:.4f}")
        lines.append(f"- Fitness avg: {stats['fitness_avg']:.4f}")
        lines.append(f"- Fitness min: {stats['fitness_min']:.4f}")
    lines.append("")
    lines.append("## Top 10 elites")
    lines.append("")
    lines.append("| Cell | Fitness | hp | mod | dc | mbti_t | mbti_n | archetype |")
    lines.append("| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |")
    cells_sorted = sorted(
        archive.archive.items(), key=lambda kv: -kv[1].fitness
    )[:10]
    for cell_idx, cell in cells_sorted:
        s = cell.solution
        lines.append(
            f"| {cell_idx} | {cell.fitness:.4f} | "
            f"{s.get('hp')} | {s.get('mod')} | {s.get('dc')} | "
            f"{s.get('mbti_t')} | {s.get('mbti_n')} | `{s.get('archetype')}` |"
        )
    lines.append("")
    lines.append("## Convergence trajectory")
    lines.append("")
    lines.append("| Iter | Fitness | Accepted | Coverage |")
    lines.append("| ---: | ---: | :---: | ---: |")
    sample_steps = [0, len(history) // 4, len(history) // 2, 3 * len(history) // 4, len(history) - 1]
    sample_steps = [s for s in sample_steps if 0 <= s < len(history)]
    for s in sample_steps:
        h = history[s]
        lines.append(
            f"| {h['iter']} | {h['fitness']:.4f} | "
            f"{'✅' if h['accepted'] else '—'} | {h['coverage'] * 100:.1f}% |"
        )
    lines.append("")
    lines.append("## How to read")
    lines.append("")
    lines.append(
        "- **Coverage** = breadth of viable design space discovered. Low (<30%)"
        " means the engine struggled to find diverse builds; high (>70%) means"
        " the design space is broad and the fitness function permissive."
    )
    lines.append(
        "- **Fitness max** = single best build found. Compare to fitness avg:"
        " large gap = some cells dominate, small gap = uniform competence."
    )
    lines.append(
        "- **Convergence trajectory** = acceptance rate over iterations. Drops"
        " naturally as the archive fills (most mutations no longer beat the elite)."
    )
    lines.append("")
    lines.append("## Limits + next steps")
    lines.append("")
    lines.append(
        "- **Synthetic fitness only**: replace `synthetic_fitness` with a wrapper"
        " around `restricted_play.run_one` to evaluate against the real combat"
        " engine (~+2h, separate PR). Until then, this is design-space sketching,"
        " not balance verdict."
    )
    lines.append(
        "- **Single-objective**: extend to Pareto MAP-Elites (Cully 2021) to"
        " trade off fitness vs diversity vs novelty."
    )
    lines.append(
        "- **Variance**: re-run with multiple seeds and aggregate coverage to"
        " distinguish algorithm-stable patterns from RNG luck."
    )
    lines.append("")
    lines.append("## Sources")
    lines.append("")
    lines.append(
        "- [Mouret & Clune 2015 — Illuminating search spaces](https://arxiv.org/abs/1504.04909)"
    )
    lines.append(
        "- [Fontaine et al. 2019 — Mapping Hearthstone Deck Spaces](https://arxiv.org/abs/1904.10656)"
    )
    lines.append(
        "- [Cully 2021 — Quality-Diversity Optimization survey](https://arxiv.org/abs/2012.04322)"
    )
    lines.append("- Agent: `.claude/agents/balance-illuminator.md`")
    lines.append("")
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────


def archive_to_dict(archive: MapElitesArchive) -> dict:
    return {
        "dims": [{"name": d.name, "low": d.low, "high": d.high} for d in archive.dims],
        "bins": archive.bins,
        "stats": archive.stats(),
        "cells": [
            {
                "cell": list(idx),
                "fitness": cell.fitness,
                "behavior": list(cell.behavior),
                "solution": cell.solution,
            }
            for idx, cell in archive.archive.items()
        ],
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--iterations", type=int, default=1000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--bins", type=int, default=4, help="Bins per feature dim")
    parser.add_argument("--initial", type=int, default=10, help="Initial random solutions")
    parser.add_argument("--out-md", default=None)
    parser.add_argument("--out-json", default=None)
    parser.add_argument(
        "--fitness",
        choices=("synthetic", "http"),
        default="synthetic",
        help="synthetic = CI-safe mock; http = live backend via restricted_play.run_one",
    )
    parser.add_argument("--host", default=DEFAULT_HTTP_HOST, help="Backend base URL (http only)")
    parser.add_argument(
        "--scenario", default=None, help="Scenario id (required for --fitness http)"
    )
    parser.add_argument("--policy", default="greedy", choices=("random", "greedy", "utility"))
    parser.add_argument(
        "--n-runs", type=int, default=3, help="Sessions per solution eval (http only)"
    )
    parser.add_argument("--role", default="player", choices=("player", "sistema"))
    args = parser.parse_args(argv)

    if args.fitness == "http" and not args.scenario:
        parser.error("--fitness http requires --scenario")

    rng = random.Random(args.seed)
    initial_solutions = [build_random_solution(rng) for _ in range(args.initial)]

    if args.fitness == "http":
        evaluator = build_http_evaluator(
            host=args.host,
            scenario_id=args.scenario,
            policy=args.policy,
            n_runs=args.n_runs,
            role=args.role,
            seed_base=args.seed + 1000,
        )
        print(
            f"MAP-Elites[http]: iterations={args.iterations} bins={args.bins} "
            f"seed={args.seed} scenario={args.scenario} policy={args.policy} "
            f"n_runs={args.n_runs} role={args.role}"
        )
    else:
        evaluator = synthetic_fitness
        print(
            f"MAP-Elites[synthetic]: iterations={args.iterations} bins={args.bins} "
            f"seed={args.seed} initial={args.initial}"
        )

    archive, history = run_map_elites(
        initial_solutions=initial_solutions,
        mutator=mutate_build,
        evaluator=evaluator,
        feature_dims=BALANCE_FEATURE_DIMS,
        bins_per_dim=args.bins,
        iterations=args.iterations,
        seed=args.seed,
    )

    stats = archive.stats()
    print(
        f"  cells={stats['count']}/{stats['total_cells']} "
        f"coverage={stats['coverage'] * 100:.1f}% "
        f"fitness max={stats['fitness_max']} avg={stats['fitness_avg']}"
    )

    if args.out_md:
        out_path = Path(args.out_md)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(
            format_markdown(archive, history, args.iterations, fitness_mode=args.fitness),
            encoding="utf-8",
        )
        print(f"Markdown saved: {out_path}")

    if args.out_json:
        out_path = Path(args.out_json)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(archive_to_dict(archive), indent=2), encoding="utf-8")
        print(f"JSON saved: {out_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
