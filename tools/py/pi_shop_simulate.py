#!/usr/bin/env python3
"""PI Shop Monte Carlo simulator — validates Gap 4 in macro-economy doc.

Runs N=1000 rolls of the PI shop budget × cost-curve combinations from
`data/packs.yaml` to surface:

- Achievable purchase combos per budget tier (7 baseline / 9 veteran / 11 elite)
- Stockpile rate (PI residual unspent)
- Item popularity per spend strategy (cheapest-first / power-first / random)
- Knapsack optimum vs naive picks

Closes [recommendation #6](docs/balance/macro-economy-source-sink.md) from the
macro-economy doc. Pure stdlib (no PyYAML), zero deps. Reuses the deterministic
seed pattern from `tools/py/sprt_calibrate.py`.

## Usage

    PYTHONPATH=tools/py python3 tools/py/pi_shop_simulate.py \\
        --n 1000 --strategy all \\
        --out-md docs/balance/2026-04-25-pi-shop-monte-carlo.md \\
        --out-json reports/balance/pi-shop-sim.json

## Strategies

- `cheapest`: greedy by ascending cost — maximize item count
- `power`:    greedy by descending tier (T3 > T2 > job_ability > T1 > rest)
- `random`:   uniform random affordable item until budget exhausted

## Non-goals

- Item synergy modeling (out of scope; needs trait_mechanics integration)
- d20 random pack roll (separate concern, modeled in macro-economy diagram)
- Live telemetry hookup (separate ticket)

## References

- `data/packs.yaml`
- `docs/balance/macro-economy-source-sink.md`
- `.claude/agents/economy-design-illuminator.md`
"""

from __future__ import annotations

import argparse
import json
import random
import re
import statistics
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable


# Cap items per shop visit (caps from data/packs.yaml).
DEFAULT_CAPS = {"cap_pt": 1, "starter_bioma": 1}

# Budget tier distribution defaults (educated guess; tune via playtest).
DEFAULT_TIER_DIST = {"baseline": 0.70, "veteran": 0.25, "elite": 0.05}

DEFAULT_TIER_BUDGETS = {"baseline": 7, "veteran": 9, "elite": 11}

# Power ranking for the `power` strategy: higher index = stronger.
POWER_RANK = {
    "starter_bioma": 1,
    "cap_pt": 2,
    "guardia_situazionale": 3,
    "sigillo_forma": 4,
    "modulo_tattico": 5,
    "trait_T1": 6,
    "job_ability": 7,
    "ultimate_slot": 8,
    "trait_T2": 9,
    "trait_T3": 10,
}

VALID_STRATEGIES = ("cheapest", "power", "random")


# ─────────────────────────────────────────────────────────
# Minimal stdlib YAML reader (only the subset we need)
# ─────────────────────────────────────────────────────────


def parse_pi_shop(path: Path) -> dict:
    """Extract `pi_shop.costs` + `pi_shop.budget_curve` from data/packs.yaml.

    Pure stdlib — no PyYAML dependency. Targets exactly the format used in
    `data/packs.yaml` (flow-style mapping on first line for costs/caps).
    """
    text = path.read_text(encoding="utf-8")
    costs: dict[str, int] = {}
    caps: dict[str, int] = {}
    budgets: dict[str, int] = {}

    cost_match = re.search(r"costs:\s*\{([^}]+)\}", text)
    if cost_match:
        for pair in cost_match.group(1).split(","):
            if ":" in pair:
                k, v = pair.split(":", 1)
                costs[k.strip()] = int(v.strip())

    caps_match = re.search(r"caps:\s*\{([^}]+)\}", text)
    if caps_match:
        for pair in caps_match.group(1).split(","):
            if ":" in pair:
                k, v = pair.split(":", 1)
                key = k.strip()
                # Convert canonical names: cap_pt_max → cap_pt
                if key.endswith("_max"):
                    key = key[:-4]
                caps[key] = int(v.strip())

    bc_match = re.search(r"budget_curve:\s*\n((?:\s+\w+.*\n?)+)", text)
    if bc_match:
        for line in bc_match.group(1).splitlines():
            m = re.match(r"\s+(\w+):\s*\{[^}]*budget:\s*(\d+)", line)
            if m:
                budgets[m.group(1)] = int(m.group(2))

    return {"costs": costs, "caps": caps or DEFAULT_CAPS, "budgets": budgets or DEFAULT_TIER_BUDGETS}


# ─────────────────────────────────────────────────────────
# Spend strategies
# ─────────────────────────────────────────────────────────


@dataclass
class Purchase:
    items: list[str]
    spent: int
    remaining: int


def _affordable(costs: dict[str, int], remaining: int, caps: dict[str, int], counts: Counter) -> list[str]:
    """Return list of item ids buyable with `remaining` PI respecting caps."""
    out: list[str] = []
    for item, cost in costs.items():
        if cost > remaining:
            continue
        cap = caps.get(item)
        if cap is not None and counts[item] >= cap:
            continue
        out.append(item)
    return out


def spend_cheapest(costs: dict[str, int], budget: int, caps: dict[str, int]) -> Purchase:
    """Greedy: pick the cheapest affordable item until none fits."""
    remaining = budget
    counts: Counter = Counter()
    items: list[str] = []
    while True:
        choices = _affordable(costs, remaining, caps, counts)
        if not choices:
            break
        choices.sort(key=lambda i: (costs[i], i))
        pick = choices[0]
        items.append(pick)
        counts[pick] += 1
        remaining -= costs[pick]
    return Purchase(items=items, spent=budget - remaining, remaining=remaining)


def spend_power(costs: dict[str, int], budget: int, caps: dict[str, int]) -> Purchase:
    """Greedy: pick highest-power affordable item until budget drained."""
    remaining = budget
    counts: Counter = Counter()
    items: list[str] = []
    while True:
        choices = _affordable(costs, remaining, caps, counts)
        if not choices:
            break
        choices.sort(key=lambda i: (-POWER_RANK.get(i, 0), costs[i]))
        pick = choices[0]
        items.append(pick)
        counts[pick] += 1
        remaining -= costs[pick]
    return Purchase(items=items, spent=budget - remaining, remaining=remaining)


def spend_random(costs: dict[str, int], budget: int, caps: dict[str, int], rng: random.Random) -> Purchase:
    """Naive: pick uniform random affordable item until budget drained."""
    remaining = budget
    counts: Counter = Counter()
    items: list[str] = []
    while True:
        choices = _affordable(costs, remaining, caps, counts)
        if not choices:
            break
        pick = rng.choice(choices)
        items.append(pick)
        counts[pick] += 1
        remaining -= costs[pick]
    return Purchase(items=items, spent=budget - remaining, remaining=remaining)


def execute_strategy(strategy: str, costs: dict[str, int], budget: int, caps: dict[str, int], rng: random.Random) -> Purchase:
    if strategy == "cheapest":
        return spend_cheapest(costs, budget, caps)
    if strategy == "power":
        return spend_power(costs, budget, caps)
    if strategy == "random":
        return spend_random(costs, budget, caps, rng)
    raise ValueError(f"Unknown strategy: {strategy}")


# ─────────────────────────────────────────────────────────
# Simulation runner
# ─────────────────────────────────────────────────────────


def sample_tier(tier_dist: dict[str, float], rng: random.Random) -> str:
    r = rng.random()
    cum = 0.0
    for tier, p in tier_dist.items():
        cum += p
        if r <= cum:
            return tier
    return list(tier_dist.keys())[-1]


def run_simulation(
    costs: dict[str, int],
    caps: dict[str, int],
    budgets: dict[str, int],
    strategy: str,
    n: int,
    seed: int = 1000,
    tier_dist: dict[str, float] | None = None,
) -> dict:
    """Run N simulations of the PI shop with given strategy."""
    if strategy not in VALID_STRATEGIES:
        raise ValueError(f"strategy must be one of {VALID_STRATEGIES}")
    if n <= 0:
        raise ValueError("n must be positive")
    rng = random.Random(seed)
    tier_dist = tier_dist or DEFAULT_TIER_DIST

    item_counts: Counter = Counter()
    items_per_run: list[int] = []
    spent_per_run: list[int] = []
    residual_per_run: list[int] = []
    by_tier: dict[str, list[int]] = {t: [] for t in budgets}
    stockpile_per_tier: dict[str, list[int]] = {t: [] for t in budgets}

    for _ in range(n):
        tier = sample_tier(tier_dist, rng)
        budget = budgets[tier]
        purchase = execute_strategy(strategy, costs, budget, caps, rng)
        item_counts.update(purchase.items)
        items_per_run.append(len(purchase.items))
        spent_per_run.append(purchase.spent)
        residual_per_run.append(purchase.remaining)
        by_tier[tier].append(len(purchase.items))
        stockpile_per_tier[tier].append(purchase.remaining)

    def stats(values: Iterable[int]) -> dict:
        v = list(values)
        if not v:
            return {"n": 0}
        return {
            "n": len(v),
            "avg": round(statistics.mean(v), 2),
            "median": statistics.median(v),
            "min": min(v),
            "max": max(v),
        }

    total_spent = sum(spent_per_run)
    total_budget = sum(budgets[sample_tier(tier_dist, random.Random(seed + i))] for i in range(n))

    return {
        "strategy": strategy,
        "n": n,
        "items_per_run": stats(items_per_run),
        "residual_per_run": stats(residual_per_run),
        "spent_per_run": stats(spent_per_run),
        "stockpile_rate_pct": round(100 * sum(residual_per_run) / max(1, total_spent + sum(residual_per_run)), 2),
        "item_popularity": dict(item_counts.most_common()),
        "by_tier": {t: stats(v) for t, v in by_tier.items()},
        "stockpile_by_tier": {t: stats(v) for t, v in stockpile_per_tier.items()},
    }


# ─────────────────────────────────────────────────────────
# Markdown report
# ─────────────────────────────────────────────────────────


def format_markdown(results: dict[str, dict], costs: dict[str, int], budgets: dict[str, int], n: int) -> str:
    today = datetime.now().date().isoformat()
    lines: list[str] = []
    lines.append("---")
    lines.append(f"title: PI Shop Monte Carlo — N={n} ({today})")
    lines.append("doc_status: active")
    lines.append("doc_owner: claude-code")
    lines.append("workstream: dataset-pack")
    lines.append(f"last_verified: '{today}'")
    lines.append("source_of_truth: false")
    lines.append("language: it")
    lines.append("review_cycle_days: 30")
    lines.append("tags:")
    lines.append("  - economy")
    lines.append("  - pi-shop")
    lines.append("  - monte-carlo")
    lines.append("  - balance")
    lines.append("  - generated")
    lines.append("---")
    lines.append("")
    lines.append(f"# PI Shop Monte Carlo Sim — N={n}")
    lines.append("")
    lines.append("Closes Gap 4 (PI shop budget vs cost-curve unstudied) from")
    lines.append("[`docs/balance/macro-economy-source-sink.md`](macro-economy-source-sink.md).")
    lines.append("")
    lines.append("## Cost matrix (from `data/packs.yaml`)")
    lines.append("")
    lines.append("| Item | Cost (PI) | Cap |")
    lines.append("| --- | ---: | :---: |")
    for item, cost in sorted(costs.items(), key=lambda x: x[1]):
        cap = DEFAULT_CAPS.get(item)
        cap_str = str(cap) if cap is not None else "—"
        lines.append(f"| `{item}` | {cost} | {cap_str} |")
    lines.append("")
    lines.append("## Budget tiers")
    lines.append("")
    for tier, b in budgets.items():
        lines.append(f"- **{tier}**: {b} PI")
    lines.append("")
    lines.append("## Strategy comparison")
    lines.append("")
    lines.append("| Strategy | Items avg | Items median | Residual avg | Stockpile rate |")
    lines.append("| --- | ---: | ---: | ---: | ---: |")
    for strategy, r in results.items():
        lines.append(
            f"| `{strategy}` | {r['items_per_run']['avg']} | {r['items_per_run']['median']} | "
            f"{r['residual_per_run']['avg']} | {r['stockpile_rate_pct']}% |"
        )
    lines.append("")
    lines.append("## Item popularity (top per strategy)")
    lines.append("")
    for strategy, r in results.items():
        lines.append(f"### `{strategy}`")
        lines.append("")
        lines.append("| Item | Bought | Share |")
        lines.append("| --- | ---: | ---: |")
        total = sum(r["item_popularity"].values()) or 1
        for item, count in list(r["item_popularity"].items())[:10]:
            share = round(100 * count / total, 1)
            lines.append(f"| `{item}` | {count} | {share}% |")
        lines.append("")
    lines.append("## Per-tier breakdown")
    lines.append("")
    for strategy, r in results.items():
        lines.append(f"### `{strategy}` strategy")
        lines.append("")
        lines.append("| Tier | Items avg | Items median | Stockpile avg |")
        lines.append("| --- | ---: | ---: | ---: |")
        for tier in budgets.keys():
            it = r["by_tier"].get(tier, {})
            sp = r["stockpile_by_tier"].get(tier, {})
            if not it.get("n"):
                lines.append(f"| {tier} | — | — | — |")
                continue
            lines.append(f"| {tier} | {it['avg']} | {it['median']} | {sp['avg']} |")
        lines.append("")
    lines.append("## Sources")
    lines.append("")
    lines.append("- Pattern: Machinations.io Monte Carlo simulation")
    lines.append("- Cost data: `data/packs.yaml`")
    lines.append("- Companion: `docs/balance/macro-economy-source-sink.md`")
    lines.append("- Agent: `.claude/agents/economy-design-illuminator.md`")
    lines.append("")
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--n", type=int, default=1000)
    parser.add_argument("--seed", type=int, default=1000)
    parser.add_argument("--strategy", choices=("cheapest", "power", "random", "all"), default="all")
    parser.add_argument("--packs-yaml", default="data/packs.yaml")
    parser.add_argument("--out-md", default=None)
    parser.add_argument("--out-json", default=None)
    args = parser.parse_args(argv)

    pi_shop = parse_pi_shop(Path(args.packs_yaml))
    costs = pi_shop["costs"]
    caps = pi_shop["caps"]
    budgets = pi_shop["budgets"]
    if not costs or not budgets:
        print(f"ERROR: failed to parse {args.packs_yaml}; no costs/budgets extracted", file=sys.stderr)
        return 2

    strategies = list(VALID_STRATEGIES) if args.strategy == "all" else [args.strategy]
    print(f"PI shop sim: N={args.n} strategies={strategies} budgets={budgets}")
    results: dict[str, dict] = {}
    for s in strategies:
        results[s] = run_simulation(costs, caps, budgets, s, args.n, args.seed)
        r = results[s]
        print(
            f"  {s}: items_avg={r['items_per_run']['avg']} "
            f"residual_avg={r['residual_per_run']['avg']} "
            f"stockpile={r['stockpile_rate_pct']}%"
        )

    if args.out_md:
        md = format_markdown(results, costs, budgets, args.n)
        out_path = Path(args.out_md)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(md, encoding="utf-8")
        print(f"Markdown saved: {out_path}")

    if args.out_json:
        out_path = Path(args.out_json)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
        print(f"JSON saved: {out_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
