#!/usr/bin/env python3
"""SPRT sequential calibration — Wald 1945 + Stockfish Fishtest pattern.

Replaces fixed N=30 batch calibration with adaptive sequential testing.
Stops as soon as the win-rate verdict is statistically conclusive, saving
compute on obviously-balanced or obviously-broken builds.

Applies P0 finding from balance-illuminator agent
(`.claude/agents/balance-illuminator.md` lines 42-69). stdlib-only
(policy compliance: no new deps).

## Two modes

1. **Single-sided** (`SprtBinary`): is win-rate close to `p1` rather than `p0`?
   Stockfish use case: "is build A better than build B?".
2. **In-band** (`SprtBand`): is win-rate inside `[p_low, p_high]`?
   Balance use case: "does scenario hit target win-rate band?".

## Usage

    # CLI: stream restricted_play runs, stop early when verdict reached.
    PYTHONPATH=tools/py python3 tools/py/sprt_calibrate.py \\
        --scenario enc_tutorial_06_hardcore --policy greedy \\
        --target-low 0.30 --target-high 0.50 \\
        --n-max 30 --out-md docs/playtest/2026-04-25-sprt-hardcore06.md

    # Library:
    from sprt_calibrate import SprtBand
    sprt = SprtBand(p_low=0.30, p_high=0.50)
    for outcome in stream:
        if sprt.update(outcome) != "continue":
            break

## Non-goals

- GSPRT pentanomial (binary only — our scenarios are win/loss, no draws).
- MCTS smart policy (separate harness, see balance-illuminator P0 #2).
- MAP-Elites archive (separate harness, P1).

## References

- Wald 1945 — Sequential Tests of Statistical Hypotheses
- Fishtest Mathematics: https://official-stockfish.github.io/docs/fishtest-wiki/Fishtest-Mathematics.html
- Chessprogramming SPRT: https://www.chessprogramming.org/Sequential_Probability_Ratio_Test
- Agent: `.claude/agents/balance-illuminator.md`
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Iterable


DEFAULT_HOST = "http://localhost:3334"
DEFAULT_ALPHA = 0.05
DEFAULT_BETA = 0.05
DEFAULT_DELTA = 0.05
DEFAULT_N_MAX = 30


# ─────────────────────────────────────────────────────────
# Core SPRT
# ─────────────────────────────────────────────────────────


@dataclass
class SprtBinary:
    """Wald 1945 SPRT for Bernoulli outcomes.

    H0: p = p0  vs  H1: p = p1

    After each binary outcome, update log-likelihood ratio (LLR).
    Stop conditions:
        LLR >= upper_bound  → accept H1
        LLR <= lower_bound  → accept H0
    where upper = log((1-β)/α), lower = log(β/(1-α)).
    """

    p0: float
    p1: float
    alpha: float = DEFAULT_ALPHA
    beta: float = DEFAULT_BETA

    n: int = 0
    wins: int = 0
    llr: float = 0.0
    upper_bound: float = field(init=False)
    lower_bound: float = field(init=False)

    def __post_init__(self) -> None:
        if not 0 < self.p0 < 1:
            raise ValueError(f"p0 must be in (0, 1); got {self.p0}")
        if not 0 < self.p1 < 1:
            raise ValueError(f"p1 must be in (0, 1); got {self.p1}")
        if self.p0 == self.p1:
            raise ValueError("p0 and p1 must differ")
        if not 0 < self.alpha < 0.5:
            raise ValueError(f"alpha must be in (0, 0.5); got {self.alpha}")
        if not 0 < self.beta < 0.5:
            raise ValueError(f"beta must be in (0, 0.5); got {self.beta}")
        self.upper_bound = math.log((1 - self.beta) / self.alpha)
        self.lower_bound = math.log(self.beta / (1 - self.alpha))

    def update(self, outcome: bool) -> str:
        """Add one Bernoulli outcome. Returns verdict: 'H0'|'H1'|'continue'."""
        self.n += 1
        if outcome:
            self.wins += 1
            self.llr += math.log(self.p1 / self.p0)
        else:
            self.llr += math.log((1 - self.p1) / (1 - self.p0))
        return self.verdict()

    def verdict(self) -> str:
        if self.llr >= self.upper_bound:
            return "H1"
        if self.llr <= self.lower_bound:
            return "H0"
        return "continue"

    @property
    def win_rate(self) -> float:
        return self.wins / self.n if self.n else 0.0


@dataclass
class SprtBand:
    """In-band test: WR ∈ [p_low, p_high]. Runs two SPRTs in parallel.

    Verdicts:
        'in_band' : both lower and upper bound tests confirmed (WR inside)
        'below'   : lower-bound test rejected (WR < p_low)
        'above'   : upper-bound test rejected (WR > p_high)
        'continue': inconclusive — keep sampling

    delta = guard band around each threshold (separation between p0 and p1
    in each sub-test). Larger delta → fewer samples but coarser resolution.
    """

    p_low: float
    p_high: float
    delta: float = DEFAULT_DELTA
    alpha: float = DEFAULT_ALPHA
    beta: float = DEFAULT_BETA

    test_low: SprtBinary = field(init=False)
    test_high: SprtBinary = field(init=False)
    last_verdict: str = field(default="continue", init=False)

    def __post_init__(self) -> None:
        if not 0 < self.p_low < self.p_high < 1:
            raise ValueError(
                f"Require 0 < p_low < p_high < 1; got [{self.p_low}, {self.p_high}]"
            )
        if not 0 < self.delta < 0.5:
            raise ValueError(f"delta must be in (0, 0.5); got {self.delta}")
        # Test A: H0 (p ≤ p_low) vs H1 (p ≥ p_low). p1 > p0.
        self.test_low = SprtBinary(
            p0=max(0.01, self.p_low - self.delta),
            p1=min(0.99, self.p_low + self.delta),
            alpha=self.alpha,
            beta=self.beta,
        )
        # Test B: H0 (p ≥ p_high) vs H1 (p ≤ p_high). p1 < p0 → wins push LLR
        # negative; H0 accepted = "WR > p_high" (above band).
        self.test_high = SprtBinary(
            p0=min(0.99, self.p_high + self.delta),
            p1=max(0.01, self.p_high - self.delta),
            alpha=self.alpha,
            beta=self.beta,
        )

    def update(self, outcome: bool) -> str:
        v_low = self.test_low.update(outcome)
        v_high = self.test_high.update(outcome)
        self.last_verdict = self._compose(v_low, v_high)
        return self.last_verdict

    @staticmethod
    def _compose(v_low: str, v_high: str) -> str:
        # Lower test rejected → WR is below p_low.
        if v_low == "H0":
            return "below"
        # Upper test rejected → WR is above p_high.
        if v_high == "H0":
            return "above"
        # Both passed → WR confidently inside band.
        if v_low == "H1" and v_high == "H1":
            return "in_band"
        return "continue"

    @property
    def n(self) -> int:
        return self.test_low.n

    @property
    def wins(self) -> int:
        return self.test_low.wins

    @property
    def win_rate(self) -> float:
        return self.test_low.win_rate


def stream_sprt(outcomes: Iterable[bool], sprt: SprtBinary | SprtBand) -> str:
    """Drain `outcomes` into `sprt` until verdict ≠ 'continue' or stream ends."""
    for outcome in outcomes:
        verdict = sprt.update(outcome)
        if verdict != "continue":
            return verdict
    return sprt.last_verdict if isinstance(sprt, SprtBand) else sprt.verdict()


# ─────────────────────────────────────────────────────────
# Sample size estimator (Wald approximation)
# ─────────────────────────────────────────────────────────


def expected_samples(p0: float, p1: float, alpha: float = DEFAULT_ALPHA, beta: float = DEFAULT_BETA) -> dict:
    """Wald's expected stopping time for SPRT (approximation).

    E[N|H0] ≈ (β log((1-β)/α) + (1-β) log(β/(1-α))) / E[Z|H0]
    where E[Z|H0] = p0 log(p1/p0) + (1-p0) log((1-p1)/(1-p0)).
    Returns averaged worst-case estimate (max of E[N|H0], E[N|H1]).
    """
    if not 0 < p0 < 1 or not 0 < p1 < 1 or p0 == p1:
        raise ValueError("invalid p0/p1")
    a = math.log((1 - beta) / alpha)
    b = math.log(beta / (1 - alpha))
    z0 = p0 * math.log(p1 / p0) + (1 - p0) * math.log((1 - p1) / (1 - p0))
    z1 = p1 * math.log(p1 / p0) + (1 - p1) * math.log((1 - p1) / (1 - p0))
    e_n_h0 = (beta * a + (1 - beta) * b) / z0 if z0 != 0 else float("inf")
    e_n_h1 = ((1 - alpha) * a + alpha * b) / z1 if z1 != 0 else float("inf")
    return {
        "e_n_h0": round(abs(e_n_h0), 1),
        "e_n_h1": round(abs(e_n_h1), 1),
        "worst_case": round(max(abs(e_n_h0), abs(e_n_h1)), 1),
    }


# ─────────────────────────────────────────────────────────
# CLI integration with restricted_play
# ─────────────────────────────────────────────────────────


def _import_restricted_play():
    """Lazy import — keeps unit tests free of HTTP plumbing."""
    try:
        from tools.py import restricted_play  # type: ignore
    except ImportError:
        try:
            import restricted_play  # type: ignore
        except ImportError as exc:
            raise RuntimeError(
                "restricted_play not on PYTHONPATH (run with PYTHONPATH=tools/py)"
            ) from exc
    return restricted_play


def run_against_server(
    host: str,
    scenario_id: str,
    policy: str,
    sprt: SprtBinary | SprtBand,
    n_max: int,
    seed_base: int = 1000,
    on_run=None,
) -> dict:
    """Stream `run_one` outcomes into SPRT until verdict or n_max reached."""
    rp = _import_restricted_play()
    if policy not in rp.VALID_POLICIES:
        raise ValueError(f"policy must be one of {rp.VALID_POLICIES}; got {policy}")
    runs = []
    verdict = "continue"
    for i in range(n_max):
        r = rp.run_one(host, scenario_id, policy, seed=seed_base + i)
        r.run = i + 1
        runs.append(r)
        if r.outcome == "error":
            continue
        outcome = r.outcome == "victory"
        verdict = sprt.update(outcome)
        if on_run:
            on_run(i + 1, r, verdict)
        if verdict != "continue":
            break
    return {
        "verdict": verdict,
        "n": sprt.n,
        "wins": sprt.wins,
        "win_rate": round(sprt.win_rate * 100, 1),
        "stopped_early": verdict != "continue" and len(runs) < n_max,
        "runs": [
            {"run": r.run, "outcome": r.outcome, "rounds": r.rounds, "kd": r.kd}
            for r in runs
        ],
    }


# ─────────────────────────────────────────────────────────
# Markdown report
# ─────────────────────────────────────────────────────────


def format_markdown(
    scenario_id: str,
    policy: str,
    p_low: float,
    p_high: float,
    result: dict,
    expected: dict,
) -> str:
    today = datetime.now().date().isoformat()
    lines: list[str] = []
    lines.append("---")
    lines.append(f"title: SPRT calibration — {scenario_id} ({today})")
    lines.append("workstream: combat")
    lines.append("category: playtest")
    lines.append("doc_status: active")
    lines.append("doc_owner: claude-code")
    lines.append(f"last_verified: '{today}'")
    lines.append("source_of_truth: false")
    lines.append("language: it")
    lines.append("review_cycle_days: 30")
    lines.append("tags:")
    lines.append("  - sprt")
    lines.append("  - calibration")
    lines.append("  - balance")
    lines.append("  - generated")
    lines.append("---")
    lines.append("")
    lines.append(f"# SPRT calibration — `{scenario_id}` ({policy})")
    lines.append("")
    lines.append(
        f"Target band: **[{p_low * 100:.1f}%, {p_high * 100:.1f}%]**. "
        "Pattern Wald 1945 + Stockfish Fishtest. Stops early on verdict."
    )
    lines.append("")
    lines.append("## Result")
    lines.append("")
    verdict = result.get("verdict", "?")
    badge = {
        "in_band": "✅ **in_band**",
        "below": "🔻 **below** (too hard, increase player power)",
        "above": "🔺 **above** (too easy, increase enemy pressure)",
        "continue": "⏳ **continue** (inconclusive at n_max)",
    }.get(verdict, verdict)
    lines.append(f"- Verdict: {badge}")
    lines.append(
        f"- Observed WR: **{result.get('win_rate', 0):.1f}%** "
        f"(n={result.get('n', 0)}, wins={result.get('wins', 0)})"
    )
    lines.append(
        f"- Stopped early: {'yes' if result.get('stopped_early') else 'no'}"
    )
    lines.append("")
    lines.append("## Sample-size budget (Wald)")
    lines.append("")
    lines.append(f"- Expected N under H0: ~{expected.get('e_n_h0', '?')}")
    lines.append(f"- Expected N under H1: ~{expected.get('e_n_h1', '?')}")
    lines.append(f"- Worst-case N: ~{expected.get('worst_case', '?')}")
    lines.append("")
    lines.append("## Per-run trace")
    lines.append("")
    lines.append("| # | outcome | rounds | KD |")
    lines.append("| ---: | --- | ---: | ---: |")
    for r in result.get("runs", []):
        lines.append(
            f"| {r['run']} | {r['outcome']} | {r['rounds']} | {r['kd']:.2f} |"
        )
    lines.append("")
    lines.append("## Sources")
    lines.append("")
    lines.append("- Wald 1945 — Sequential Tests of Statistical Hypotheses")
    lines.append(
        "- [Fishtest Mathematics](https://official-stockfish.github.io/docs/fishtest-wiki/Fishtest-Mathematics.html)"
    )
    lines.append(
        "- [Chessprogramming SPRT](https://www.chessprogramming.org/Sequential_Probability_Ratio_Test)"
    )
    lines.append("- Agent: `.claude/agents/balance-illuminator.md`")
    lines.append("")
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────
# CLI entry point
# ─────────────────────────────────────────────────────────


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--scenario", required=True, help="Scenario id")
    parser.add_argument("--policy", default="greedy", help="Policy: random|greedy|utility")
    parser.add_argument("--target-low", type=float, required=True, help="Lower band (e.g. 0.30)")
    parser.add_argument("--target-high", type=float, required=True, help="Upper band (e.g. 0.50)")
    parser.add_argument("--delta", type=float, default=DEFAULT_DELTA)
    parser.add_argument("--alpha", type=float, default=DEFAULT_ALPHA)
    parser.add_argument("--beta", type=float, default=DEFAULT_BETA)
    parser.add_argument("--n-max", type=int, default=DEFAULT_N_MAX, help="Hard cap on samples")
    parser.add_argument("--seed-base", type=int, default=1000)
    parser.add_argument("--host", default=os.environ.get("REST_PLAY_HOST", DEFAULT_HOST))
    parser.add_argument("--out-md", default=None)
    parser.add_argument("--out-json", default=None)
    args = parser.parse_args(argv)

    sprt = SprtBand(
        p_low=args.target_low,
        p_high=args.target_high,
        delta=args.delta,
        alpha=args.alpha,
        beta=args.beta,
    )

    print(
        f"SPRT band [{args.target_low:.2f}, {args.target_high:.2f}] "
        f"α={args.alpha} β={args.beta} δ={args.delta} n_max={args.n_max}"
    )
    expected = expected_samples(
        sprt.test_low.p0, sprt.test_low.p1, args.alpha, args.beta
    )
    print(
        f"Wald estimate: E[N|H0]≈{expected['e_n_h0']} "
        f"E[N|H1]≈{expected['e_n_h1']} worst≈{expected['worst_case']}"
    )

    def on_run(idx, r, verdict):
        print(
            f"  run {idx}: {r.outcome} (rounds={r.rounds}, kd={r.kd}) "
            f"→ wr={sprt.win_rate * 100:.1f}% verdict={verdict}",
            flush=True,
        )

    t0 = time.time()
    result = run_against_server(
        host=args.host,
        scenario_id=args.scenario,
        policy=args.policy,
        sprt=sprt,
        n_max=args.n_max,
        seed_base=args.seed_base,
        on_run=on_run,
    )
    elapsed = round(time.time() - t0, 1)
    result["elapsed_s"] = elapsed

    print("\n=== SUMMARY ===")
    print(json.dumps({**result, "expected": expected}, indent=2, default=str))

    if args.out_md:
        md = format_markdown(
            args.scenario, args.policy, args.target_low, args.target_high, result, expected
        )
        out_path = Path(args.out_md)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(md, encoding="utf-8")
        print(f"Markdown saved: {out_path}")

    if args.out_json:
        out_path = Path(args.out_json)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(
            json.dumps({**result, "expected": expected}, indent=2, default=str),
            encoding="utf-8",
        )
        print(f"JSON saved: {out_path}")

    return 0 if result.get("verdict") != "continue" else 1


if __name__ == "__main__":
    sys.exit(main())
