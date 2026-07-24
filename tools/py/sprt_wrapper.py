#!/usr/bin/env python3
"""Stockfish SPRT calibration wrapper — Tier E quick win.

Source: docs/research/2026-04-26-tier-e-extraction-matrix.md #1 Stockfish SPRT.
Pattern: Sequential Probability Ratio Test per accept/reject patch tuning con
confidenza statistica. Stop early on significance reached → meno run sprecati.

H0: win_rate <= baseline (no improvement)
H1: win_rate >= baseline + delta (real improvement)

alpha (false positive) = 0.05
beta (false negative) = 0.05

Decision boundaries (log-likelihood ratio LLR):
    upper = log((1 - beta) / alpha)
    lower = log(beta / (1 - alpha))

LLR(n_wins, n_total) = sum log(p1/p0) for wins + log((1-p1)/(1-p0)) for losses
where p0 = baseline, p1 = baseline + delta

Usage:
    python tools/py/sprt_wrapper.py \\
        --baseline 0.30 --delta 0.10 --alpha 0.05 --beta 0.05 \\
        --max-runs 50 \\
        --batch-cmd "python tools/py/batch_calibrate_hardcore07.py --json --quiet"
        # batch-cmd output JSON con {wins:N, losses:N} aggregato per run

Output: JSON con { decision: 'accept'|'reject'|'continue', llr, runs, wins, losses }
"""

import argparse
import json
import math
import subprocess
import sys
from pathlib import Path


def llr_threshold(alpha: float, beta: float) -> tuple[float, float]:
    """Compute SPRT decision thresholds."""
    upper = math.log((1.0 - beta) / alpha)
    lower = math.log(beta / (1.0 - alpha))
    return lower, upper


def llr_increment(win: bool, p0: float, p1: float) -> float:
    """Single-trial LLR contribution."""
    if win:
        return math.log(p1 / p0) if p0 > 0 else 0.0
    return math.log((1.0 - p1) / (1.0 - p0)) if p0 < 1 else 0.0


def run_batch(cmd: str) -> tuple[int, int]:
    """Execute batch-cmd, parse JSON {wins, losses}. Return (wins, losses)."""
    try:
        out = subprocess.check_output(cmd, shell=True, text=True, timeout=600)
        data = json.loads(out.strip().split("\n")[-1])  # last line = JSON
        wins = int(data.get("wins", 0))
        losses = int(data.get("losses", 0))
        return wins, losses
    except (subprocess.CalledProcessError, json.JSONDecodeError, ValueError) as e:
        print(f"WARN: batch-cmd failed ({e}) — assume 0 wins, 1 loss", file=sys.stderr)
        return 0, 1


def sprt(
    baseline: float,
    delta: float,
    alpha: float = 0.05,
    beta: float = 0.05,
    max_runs: int = 50,
    batch_cmd: str | None = None,
    fixture_results: list[bool] | None = None,
) -> dict:
    """Run SPRT loop. Stops on accept/reject/max-runs."""
    p0 = baseline
    p1 = baseline + delta
    lower, upper = llr_threshold(alpha, beta)
    llr = 0.0
    runs = 0
    wins = 0
    losses = 0

    while runs < max_runs:
        if fixture_results is not None:
            if runs >= len(fixture_results):
                break
            run_wins = 1 if fixture_results[runs] else 0
            run_losses = 1 - run_wins
        elif batch_cmd:
            run_wins, run_losses = run_batch(batch_cmd)
        else:
            print("ERROR: provide --batch-cmd or fixture_results", file=sys.stderr)
            return {"decision": "error", "reason": "no input"}

        wins += run_wins
        losses += run_losses
        for _ in range(run_wins):
            llr += llr_increment(True, p0, p1)
        for _ in range(run_losses):
            llr += llr_increment(False, p0, p1)

        runs += 1
        if llr >= upper:
            return {
                "decision": "accept",
                "reason": "H1 confirmed (improvement statistically significant)",
                "llr": round(llr, 3),
                "runs": runs,
                "wins": wins,
                "losses": losses,
                "win_rate": round(wins / max(1, wins + losses), 3),
                "thresholds": {"lower": round(lower, 3), "upper": round(upper, 3)},
            }
        if llr <= lower:
            return {
                "decision": "reject",
                "reason": "H0 confirmed (no statistically significant improvement)",
                "llr": round(llr, 3),
                "runs": runs,
                "wins": wins,
                "losses": losses,
                "win_rate": round(wins / max(1, wins + losses), 3),
                "thresholds": {"lower": round(lower, 3), "upper": round(upper, 3)},
            }

    return {
        "decision": "continue",
        "reason": f"max_runs={max_runs} reached without significance",
        "llr": round(llr, 3),
        "runs": runs,
        "wins": wins,
        "losses": losses,
        "win_rate": round(wins / max(1, wins + losses), 3),
        "thresholds": {"lower": round(lower, 3), "upper": round(upper, 3)},
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--baseline", type=float, required=True, help="H0 baseline win rate (0..1)")
    ap.add_argument("--delta", type=float, required=True, help="H1 - H0 expected improvement")
    ap.add_argument("--alpha", type=float, default=0.05)
    ap.add_argument("--beta", type=float, default=0.05)
    ap.add_argument("--max-runs", type=int, default=50)
    ap.add_argument("--batch-cmd", help="Shell cmd that prints JSON {wins, losses} per run")
    ap.add_argument("--smoke", action="store_true", help="Self-test with deterministic fixture")
    args = ap.parse_args()

    if args.smoke:
        # Smoke test: 30 trials, 60% win rate vs baseline 30% delta 10% → should accept H1
        fixture = [True] * 18 + [False] * 12
        result = sprt(
            baseline=args.baseline,
            delta=args.delta,
            alpha=args.alpha,
            beta=args.beta,
            max_runs=args.max_runs,
            fixture_results=fixture,
        )
    else:
        if not args.batch_cmd:
            print("ERROR: --batch-cmd required when --smoke not set", file=sys.stderr)
            return 1
        result = sprt(
            baseline=args.baseline,
            delta=args.delta,
            alpha=args.alpha,
            beta=args.beta,
            max_runs=args.max_runs,
            batch_cmd=args.batch_cmd,
        )

    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if result.get("decision") in ("accept", "continue") else 1


if __name__ == "__main__":
    sys.exit(main())
