#!/usr/bin/env python3
"""Calibration drift verify wrapper -- N=10 probe -> N=40 ratify auto-escalation.

Origin: lesson L-069 2026-05-20 session. N=10 alone insufficient per pillar
upgrade (CI95 WR +/-30pp spans band ceiling). N=40 = authoritative +/-15pp.

Pattern: probe direction N=10 first, escalate N=40 if direction promising.
Cuts compounding noise multi-iter N=10 chains (anti-pattern).

Reuse: tools/py/batch_calibrate_hardcore06.py + hardcore07.py underlying.

Refs:
- docs/museum/cards/calibration-n-sample-authority-2026-05-20.md
- CLAUDE.md anti-pattern catalogue #10
- Memory feedback_n_sample_authority.md

Usage:
  python tools/py/calibrate_drift_verify.py --scenario hardcore_06 \\
      --host http://localhost:3334 --out docs/playtest/drift-verify-<date>.json
  python tools/py/calibrate_drift_verify.py --scenario hardcore_07 \\
      --target-band 30-50

Flow:
  1. Run N=10 probe (~6-9min)
  2. Direction check:
     - in-band + CI95 lower >= floor -> ratify N=40 (~24min)
     - OOB-high -> flag tighten direction, suggest N=40
     - OOB-low -> flag loosen direction, suggest N=40
     - RED (>20pp out) -> no escalate, return blocker verdict
  3. Compose unified report with both samples + CI95 delta
"""

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TOOLS_PY = REPO_ROOT / "tools" / "py"

SCENARIO_MAP = {
    "hardcore_06": {
        "script": "batch_calibrate_hardcore06.py",
        "target_band": (0.15, 0.25),
        "scenario_id": "enc_tutorial_06_hardcore",
        "args_extra": ["--encounter-class", "hardcore"],
    },
    "hardcore_07": {
        "script": "batch_calibrate_hardcore07.py",
        "target_band": (0.30, 0.50),
        "scenario_id": "enc_tutorial_07_hardcore_pod_rush",
        "args_extra": [],
    },
}


def run_batch(script_path, host, n, out_path, jsonl_path, log_path, extra_args=None):
    """Run batch_calibrate_*.py wrapper. Captures full stdout."""
    cmd = [
        sys.executable, "-u", str(script_path),
        "--host", host,
        "--n", str(n),
        "--out", str(out_path),
        "--jsonl", str(jsonl_path),
    ]
    if extra_args:
        cmd.extend(extra_args)
    print(f"[drift-verify] launching: {' '.join(cmd)}", flush=True)
    t0 = time.time()
    with open(log_path, "w", encoding="utf-8") as logf:
        proc = subprocess.run(cmd, stdout=logf, stderr=subprocess.STDOUT, check=False)
    elapsed = time.time() - t0
    print(f"[drift-verify] batch N={n} elapsed {elapsed:.1f}s exit={proc.returncode}", flush=True)
    return proc.returncode == 0, elapsed


def parse_batch_result(json_path):
    """Extract win_rate + CI95 + verdict from batch output."""
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    agg = data.get("aggregate") or data.get("summary") or {}
    wr_raw = agg.get("win_rate")
    if wr_raw is None:
        return None
    wr = float(wr_raw)
    if wr > 1.0:
        wr = wr / 100.0
    return {
        "win_rate": wr,
        "win_rate_pct": wr * 100,
        "win_rate_ci95": agg.get("win_rate_ci95"),
        "defeat_rate": agg.get("defeat_rate"),
        "timeout_rate": agg.get("timeout_rate"),
        "verdict": agg.get("verdict"),
        "verdict_reasons": agg.get("verdict_reasons"),
        "in_band": agg.get("in_band"),
        "n": agg.get("N") or agg.get("n"),
        "elapsed_sec": agg.get("elapsed_sec") or agg.get("elapsed_s"),
    }


def assess_direction(result, target_band):
    """Return (direction, escalate_reason)."""
    if result is None:
        return "ERROR", "Batch result unparseable"
    wr = result["win_rate"]
    floor, ceiling = target_band
    distance_floor = wr - floor
    distance_ceiling = wr - ceiling
    if floor <= wr <= ceiling:
        return "IN_BAND", f"WR {wr*100:.1f}% within target [{floor*100:.0f}-{ceiling*100:.0f}]"
    if wr > ceiling:
        delta = (wr - ceiling) * 100
        return ("OOB_HIGH_MARGINAL" if delta < 15 else "OOB_HIGH_FAR",
                f"WR {wr*100:.1f}% above ceiling by {delta:.1f}pp")
    delta = (floor - wr) * 100
    return ("OOB_LOW_MARGINAL" if delta < 15 else "OOB_LOW_FAR",
            f"WR {wr*100:.1f}% below floor by {delta:.1f}pp")


def should_escalate(direction):
    """N=40 ratify worthwhile?"""
    return direction in ("IN_BAND", "OOB_HIGH_MARGINAL", "OOB_LOW_MARGINAL")


def assess_vs_prior(probe_wr, prior_wr, target_band):
    """L-072 direction-test: did the knob move WR TOWARD or AWAY from target
    band relative to the PRIOR baseline?

    Catches knob INVERSION (es. 3A iter1 hardcore_07 enemy_count -1: prior 60%
    OOB-high, probe 70% = MORE OOB-high = AWAY = wrong direction, reverse delta).
    Plain band-classification (assess_direction) sees "OOB-high" both times and
    misses that the knob made it WORSE.

    Args:
        probe_wr: float [0,1] N=10 probe win rate
        prior_wr: float [0,1] prior-knob baseline win rate
        target_band: (floor, ceiling)

    Returns:
        (verdict, reason) where verdict in {TOWARD, AWAY, NEUTRAL, IN_BAND_HOLD}
    """
    floor, ceiling = target_band
    center = (floor + ceiling) / 2
    # If probe already in band, knob landed regardless of prior direction.
    if floor <= probe_wr <= ceiling:
        return ("IN_BAND_HOLD",
                f"probe WR {probe_wr*100:.1f}% in band [{floor*100:.0f}-{ceiling*100:.0f}] "
                f"(prior {prior_wr*100:.1f}%)")
    prior_dist = abs(prior_wr - center)
    probe_dist = abs(probe_wr - center)
    delta_dist = (prior_dist - probe_dist) * 100  # positive = closer to center
    if abs(delta_dist) < 2.5:  # within noise floor of N=10
        return ("NEUTRAL",
                f"probe WR {probe_wr*100:.1f}% ~ prior {prior_wr*100:.1f}% "
                f"(dist-to-center delta {delta_dist:+.1f}pp < noise)")
    if delta_dist > 0:
        return ("TOWARD",
                f"probe WR {probe_wr*100:.1f}% moved TOWARD band vs prior "
                f"{prior_wr*100:.1f}% (closer to center by {delta_dist:.1f}pp)")
    return ("AWAY",
            f"probe WR {probe_wr*100:.1f}% moved AWAY from band vs prior "
            f"{prior_wr*100:.1f}% (farther by {-delta_dist:.1f}pp) -- REVERSE knob delta")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--scenario", choices=list(SCENARIO_MAP.keys()), required=True)
    p.add_argument("--host", default="http://127.0.0.1:3334")  # IP not "localhost" (Windows IPv6 ~2s/call stall)
    p.add_argument("--out-dir", default="docs/playtest")
    p.add_argument("--probe-n", type=int, default=10, help="N=10 default")
    p.add_argument("--ratify-n", type=int, default=40, help="N=40 default")
    p.add_argument("--target-band", help="Override target band as 'floor-ceiling' percent, e.g. '30-50'")
    p.add_argument("--no-escalate", action="store_true", help="Probe only, never ratify")
    p.add_argument("--prior-baseline", type=float, default=None,
                   help="L-072: prior-knob WR percent (es. 60 for hardcore_07 pre-change). "
                        "If probe moves AWAY from target vs prior, ABORT escalate + "
                        "suggest reverse delta (catches knob inversion like 3A iter1).")
    p.add_argument("--label", help="Suffix per output filenames (default: timestamp)")
    args = p.parse_args()

    cfg = SCENARIO_MAP[args.scenario]
    if args.target_band:
        try:
            floor_pct, ceil_pct = args.target_band.split("-")
            target = (float(floor_pct) / 100, float(ceil_pct) / 100)
        except Exception:
            print(f"[drift-verify] --target-band parse error '{args.target_band}', use 30-50 format", file=sys.stderr)
            return 2
    else:
        target = cfg["target_band"]

    script_path = TOOLS_PY / cfg["script"]
    if not script_path.exists():
        print(f"[drift-verify] missing batch script: {script_path}", file=sys.stderr)
        return 2

    label = args.label or time.strftime("%Y-%m-%d-%H%M%S")
    out_dir = REPO_ROOT / args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    base = out_dir / f"drift-verify-{args.scenario}-{label}"

    probe_json = Path(f"{base}-probe-n{args.probe_n}.json")
    probe_jsonl = Path(f"{base}-probe-n{args.probe_n}.jsonl")
    probe_log = Path(f"{base}-probe-n{args.probe_n}.log")

    print(f"[drift-verify] === PHASE 1 PROBE N={args.probe_n} ===")
    ok, probe_elapsed = run_batch(
        script_path, args.host, args.probe_n,
        probe_json, probe_jsonl, probe_log,
        extra_args=cfg["args_extra"],
    )
    if not ok:
        print(f"[drift-verify] probe FAILED, see {probe_log}", file=sys.stderr)
        return 3
    probe_result = parse_batch_result(probe_json)
    direction, reason = assess_direction(probe_result, target)
    print(f"[drift-verify] PROBE direction={direction} -- {reason}")

    # L-072 prior-baseline direction-test: catch knob inversion before N=40.
    prior_verdict = None
    prior_reason = None
    if args.prior_baseline is not None and probe_result is not None:
        prior_wr = args.prior_baseline / 100.0
        prior_verdict, prior_reason = assess_vs_prior(probe_result["win_rate"], prior_wr, target)
        print(f"[drift-verify] PRIOR-TEST (L-072) {prior_verdict} -- {prior_reason}")
        if prior_verdict == "AWAY":
            print(f"[drift-verify] ABORT escalate: knob moved AWAY from target. "
                  f"Reverse delta sign + re-probe. (N=40 ratify would waste budget.)",
                  file=sys.stderr)
            # Write probe-only report with abort verdict.
            abort_report = {
                "scenario": args.scenario,
                "scenario_id": cfg["scenario_id"],
                "target_band": list(target),
                "probe": probe_result,
                "probe_direction": direction,
                "probe_reason": reason,
                "prior_baseline_wr": prior_wr,
                "prior_test_verdict": prior_verdict,
                "prior_test_reason": prior_reason,
                "escalated": False,
                "abort_reason": "L-072 knob moved AWAY from target vs prior baseline",
                "probe_elapsed_sec": probe_elapsed,
                "host": args.host,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "lesson_ref": "CLAUDE.md anti-pattern #18 (L-072 direction-test)",
            }
            abort_path = Path(f"{base}-ABORT-l072.json")
            with open(abort_path, "w", encoding="utf-8") as f:
                json.dump(abort_report, f, indent=2, ensure_ascii=False)
            print(f"[drift-verify] abort report: {abort_path}")
            return 7  # distinct exit: L-072 inversion abort

    if args.no_escalate or not should_escalate(direction):
        if not should_escalate(direction):
            print(f"[drift-verify] direction={direction} insufficient signal for N=40 escalate")
            print(f"[drift-verify] suggested: adjust knob, re-probe N={args.probe_n}")
        ratify_result = None
        ratify_elapsed = 0
    else:
        ratify_json = Path(f"{base}-ratify-n{args.ratify_n}.json")
        ratify_jsonl = Path(f"{base}-ratify-n{args.ratify_n}.jsonl")
        ratify_log = Path(f"{base}-ratify-n{args.ratify_n}.log")
        print(f"[drift-verify] === PHASE 2 RATIFY N={args.ratify_n} ===")
        ok2, ratify_elapsed = run_batch(
            script_path, args.host, args.ratify_n,
            ratify_json, ratify_jsonl, ratify_log,
            extra_args=cfg["args_extra"],
        )
        if not ok2:
            print(f"[drift-verify] ratify FAILED, see {ratify_log}", file=sys.stderr)
            return 4
        ratify_result = parse_batch_result(ratify_json)
        ratify_direction, ratify_reason = assess_direction(ratify_result, target)
        print(f"[drift-verify] RATIFY direction={ratify_direction} — {ratify_reason}")

    report = {
        "scenario": args.scenario,
        "scenario_id": cfg["scenario_id"],
        "target_band": list(target),
        "probe": probe_result,
        "probe_direction": direction,
        "probe_reason": reason,
        "prior_baseline_wr": (args.prior_baseline / 100.0) if args.prior_baseline is not None else None,
        "prior_test_verdict": prior_verdict,
        "prior_test_reason": prior_reason,
        "probe_elapsed_sec": probe_elapsed,
        "ratify": ratify_result,
        "ratify_elapsed_sec": ratify_elapsed,
        "total_elapsed_sec": probe_elapsed + ratify_elapsed,
        "host": args.host,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "lesson_ref": "docs/museum/cards/calibration-n-sample-authority-2026-05-20.md",
    }
    report_path = Path(f"{base}-report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"[drift-verify] report saved: {report_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
