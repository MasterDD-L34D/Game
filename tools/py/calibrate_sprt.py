#!/usr/bin/env python3
"""SPRT-inspired early-stop calibration wrapper -- Method B (L-069 follow-up).

Wilson 95% CI-based sequential decision rule. Stops batch early when
WR confidence interval entirely above/below/inside target band.

Inspired by Stockfish SPRT (chess engine match testing pattern).

Decision rule per run sample:
  - CI95 entirely above ceiling -> STOP "OOB-high" (confident overshoot)
  - CI95 entirely below floor   -> STOP "OOB-low" (confident undershoot)
  - CI95 entirely inside band   -> STOP "IN-BAND" (confident match)
  - CI95 spans boundary         -> CONTINUE (more runs needed)

Saves time when signal clear: N=10 strong outcome stops there, marginal
signal continues to N=40-80.

Pattern: streaming JSONL consumer + subprocess control. No edit to
existing batch_calibrate_*.py (preserves semantics).

Usage:
  # Hardcore_06 with SPRT early-stop, max N=80
  python tools/py/calibrate_sprt.py --scenario hardcore_06 \\
      --host http://localhost:3340 --max-n 80 --min-n 10

  # Override target band
  python tools/py/calibrate_sprt.py --scenario hardcore_07 \\
      --host http://localhost:3334 --target-band 30-50 --max-n 60

Refs:
- Stockfish SPRT pattern (chess engine match testing)
- docs/research/2026-05-20-calibration-knob-patterns-industry.md
- docs/museum/cards/calibration-n-sample-authority-2026-05-20.md
- Memory feedback_n_sample_authority.md
"""

import argparse
import json
import math
import os
import signal
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TOOLS_PY = REPO_ROOT / "tools" / "py"

SCENARIO_MAP = {
    "hardcore_06": {
        "script": "batch_calibrate_hardcore06.py",
        "target_band": (0.15, 0.30),
        "scenario_id": "enc_tutorial_06_hardcore",
        "extra_args": ["--encounter-class", "hardcore"],
    },
    "hardcore_07": {
        "script": "batch_calibrate_hardcore07.py",
        "target_band": (0.30, 0.50),
        "scenario_id": "enc_tutorial_07_hardcore_pod_rush",
        "extra_args": [],
    },
}


def wilson_ci(wins, n, z=1.96):
    """Wilson 95% confidence interval for binomial proportion.

    More accurate than normal approximation, especially for small N and
    proportions near 0 or 1. Standard for SPRT-style early stopping.

    Returns (lo, hi) as floats in [0, 1].
    """
    if n == 0:
        return (0.0, 1.0)
    p = wins / n
    denom = 1 + z * z / n
    center = (p + z * z / (2 * n)) / denom
    margin = (z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / denom
    return (max(0.0, center - margin), min(1.0, center + margin))


def assess_band(ci_lo, ci_hi, floor, ceiling):
    """Return decision label given Wilson CI vs target band.

    Decisions: 'IN_BAND', 'OOB_HIGH', 'OOB_LOW', 'CONTINUE'
    """
    if ci_lo >= floor and ci_hi <= ceiling:
        return "IN_BAND"
    if ci_lo > ceiling:
        return "OOB_HIGH"
    if ci_hi < floor:
        return "OOB_LOW"
    return "CONTINUE"


def parse_jsonl_outcomes(jsonl_path):
    """Stream-read JSONL + return list of outcome strings."""
    outcomes = []
    if not jsonl_path.exists():
        return outcomes
    try:
        with open(jsonl_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    d = json.loads(line)
                    if "outcome" in d:
                        outcomes.append(d["outcome"])
                except json.JSONDecodeError:
                    pass
    except OSError:
        pass
    return outcomes


def health_check(host, timeout=2):
    try:
        with urllib.request.urlopen(f"{host}/api/health", timeout=timeout) as r:
            return r.status == 200
    except Exception:
        return False


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--scenario", choices=list(SCENARIO_MAP.keys()), required=True)
    p.add_argument("--host", default="http://127.0.0.1:3334")  # IP not "localhost" (Windows IPv6 ~2s/call stall)
    p.add_argument("--max-n", type=int, default=80, help="Hard ceiling N")
    p.add_argument("--min-n", type=int, default=10,
                   help="Minimum N before considering early-stop (default 10)")
    p.add_argument("--check-every", type=int, default=5,
                   help="Re-evaluate decision every N runs after min-n (default 5)")
    p.add_argument("--target-band",
                   help="Override target band as 'floor-ceiling' percent, e.g. '15-25'")
    p.add_argument("--out-dir", default="docs/playtest")
    p.add_argument("--label", default=None)
    args = p.parse_args()

    cfg = SCENARIO_MAP[args.scenario]
    if args.target_band:
        try:
            floor_pct, ceil_pct = args.target_band.split("-")
            target = (float(floor_pct) / 100, float(ceil_pct) / 100)
        except Exception:
            print(f"[sprt] --target-band parse error '{args.target_band}'", file=sys.stderr)
            return 2
    else:
        target = cfg["target_band"]
    floor, ceiling = target

    if not health_check(args.host):
        print(f"[sprt] backend not healthy at {args.host}/api/health", file=sys.stderr)
        return 3

    label = args.label or time.strftime("%Y-%m-%d-%H%M%S")
    out_dir = REPO_ROOT / args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    base = out_dir / f"sprt-{args.scenario}-{label}"

    script_path = TOOLS_PY / cfg["script"]
    out_path = Path(f"{base}.json")
    jsonl_path = Path(f"{base}.jsonl")
    log_path = Path(f"{base}.log")
    # Ensure empty JSONL (avoid stale resume from previous label collision).
    if jsonl_path.exists():
        jsonl_path.unlink()

    # Launch batch with max-n. We'll early-stop by killing subprocess.
    cmd = [
        sys.executable, "-u", str(script_path),
        "--host", args.host,
        "--n", str(args.max_n),
        "--out", str(out_path),
        "--jsonl", str(jsonl_path),
        "--skip-health",
    ] + cfg["extra_args"]
    print(f"[sprt] launch: {' '.join(cmd)}", flush=True)
    print(f"[sprt] target band: [{floor*100:.0f}%, {ceiling*100:.0f}%]", flush=True)
    print(f"[sprt] min_n={args.min_n} max_n={args.max_n} check_every={args.check_every}", flush=True)

    log_fh = open(log_path, "w", encoding="utf-8")
    t0 = time.time()
    proc = subprocess.Popen(cmd, stdout=log_fh, stderr=subprocess.STDOUT, cwd=str(REPO_ROOT))

    decision = "MAX_N_REACHED"
    decision_n = args.max_n
    decision_wr = None
    decision_ci = (None, None)
    last_n_checked = -1  # bug fix: only re-eval when N changes (no print spam)

    # Codex PR #2354 fix: track if subprocess exited with non-zero (failure).
    # Without this, batch error states emit misleading decision/CI verdicts
    # based on empty/partial JSONL data instead of surfacing hard failure.
    subprocess_failed = False
    try:
        while True:
            # Check if process exited.
            if proc.poll() is not None:
                # Subprocess finished — distinguish normal completion vs error.
                rc = proc.returncode
                if rc != 0:
                    subprocess_failed = True
                    decision = "BATCH_SUBPROCESS_ERROR"
                    print(
                        f"[sprt] FAIL — subprocess exit code={rc} (non-zero). Decision invalid.",
                        file=sys.stderr,
                        flush=True,
                    )
                outcomes = parse_jsonl_outcomes(jsonl_path)
                if outcomes and not subprocess_failed:
                    n = len(outcomes)
                    wins = sum(1 for o in outcomes if o == "victory")
                    wr = wins / n
                    lo, hi = wilson_ci(wins, n)
                    decision = assess_band(lo, hi, floor, ceiling)
                    decision_n = n
                    decision_wr = wr
                    decision_ci = (lo, hi)
                elif outcomes:
                    # Failure path — record partial data for forensic but mark invalid.
                    decision_n = len(outcomes)
                    decision_wr = sum(1 for o in outcomes if o == "victory") / decision_n
                print(f"[sprt] subprocess exit code={rc}, completed N={decision_n}", flush=True)
                break

            outcomes = parse_jsonl_outcomes(jsonl_path)
            n = len(outcomes)
            # Only re-evaluate when N advances + reaches a check-every boundary.
            if (
                n != last_n_checked
                and n >= args.min_n
                and (n - args.min_n) % args.check_every == 0
            ):
                last_n_checked = n
                wins = sum(1 for o in outcomes if o == "victory")
                wr = wins / n
                lo, hi = wilson_ci(wins, n)
                d = assess_band(lo, hi, floor, ceiling)
                print(f"[sprt] N={n:3d} WR={wr*100:5.1f}% CI95=[{lo*100:5.1f}, {hi*100:5.1f}] -> {d}",
                      flush=True)
                if d != "CONTINUE":
                    decision = d
                    decision_n = n
                    decision_wr = wr
                    decision_ci = (lo, hi)
                    print(f"[sprt] EARLY-STOP @ N={n}: {d} (saves {args.max_n - n} runs)", flush=True)
                    if os.name == "nt":
                        proc.terminate()
                    else:
                        proc.send_signal(signal.SIGTERM)
                    try:
                        proc.wait(timeout=15)
                    except subprocess.TimeoutExpired:
                        proc.kill()
                    break

            time.sleep(2)
    finally:
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
        try:
            log_fh.close()
        except Exception:
            pass

    elapsed = time.time() - t0
    outcomes = parse_jsonl_outcomes(jsonl_path)
    n_final = len(outcomes)
    if n_final > 0:
        wins = sum(1 for o in outcomes if o == "victory")
        defeats = sum(1 for o in outcomes if o == "defeat")
        timeouts = sum(1 for o in outcomes if o == "timeout")
        wr = wins / n_final
        lo, hi = wilson_ci(wins, n_final)
    else:
        wins = defeats = timeouts = 0
        wr = 0.0
        lo, hi = (0.0, 1.0)

    report = {
        "scenario": args.scenario,
        "scenario_id": cfg["scenario_id"],
        "target_band": list(target),
        "method": "B-sprt-early-stop",
        "method_ref": "docs/research/2026-05-20-calibration-knob-patterns-industry.md",
        "decision": decision,
        "decision_n": decision_n,
        "decision_wr": decision_wr,
        "decision_ci95": list(decision_ci),
        "final_n": n_final,
        "final_wr": wr,
        "final_ci95": [lo, hi],
        "wins": wins,
        "defeats": defeats,
        "timeouts": timeouts,
        "max_n_configured": args.max_n,
        "min_n_configured": args.min_n,
        "check_every": args.check_every,
        "elapsed_sec": elapsed,
        "host": args.host,
        "saved_runs_vs_max": args.max_n - n_final,
        # Codex PR #2354 fix: surface batch failure to caller (no false confidence).
        "subprocess_failed": subprocess_failed,
        "subprocess_returncode": proc.returncode if proc.poll() is not None else None,
    }
    report_path = Path(f"{base}-report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"[sprt] decision={decision} N_final={n_final} WR={wr*100:.1f}% CI95=[{lo*100:.1f},{hi*100:.1f}]",
          flush=True)
    print(f"[sprt] elapsed={elapsed:.1f}s saved={args.max_n - n_final} runs", flush=True)
    print(f"[sprt] report: {report_path}", flush=True)
    # Codex PR #2354 fix: exit non-zero on batch subprocess failure so callers
    # (CI, wrapper scripts) can detect via exit code instead of parsing report.
    return 6 if subprocess_failed else 0


if __name__ == "__main__":
    sys.exit(main())
