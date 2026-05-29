#!/usr/bin/env python3
"""Canonical AI-driven playtest suite runner (TKT-PLAYTEST-SUITE, 2026-05-29).

Single-command orchestrator that reproduces the ratified balance state "every
time": reads the machine-readable manifest (docs/playtest/canonical-suite.yaml),
runs each canonical balance-oracle scenario at N=40 (ratify gate, L-069) via
tools/py/calibrate_parallel.py, checks each WR against its ratified target band,
and writes a dated combined report under docs/playtest/.

Method SoT: docs/process/CANONICAL-AI-PLAYTEST.md (sec 6 "comando canonico").

Reproducibility contract (CANONICAL-AI-PLAYTEST.md sec 3), enforced here +
inside calibrate_parallel.start_shard:
  - host 127.0.0.1 (NOT localhost: Windows IPv6 ::1 stall ~2s/call)
  - LOBBY_WS_ENABLED=false per shard (port collision, L-071)
  - DAMAGE_CURVES_PATH set so client + backend read the same staging file
    (else scenario_overrides are a silent client-side no-op, L-069/OD-032)

--dry-run parses the manifest and prints the execution plan with NO backend
(backend-free smoke gate; anti-pattern #9: dry-run != live smoke -> always
follow with a live N>=10 run before trusting it).

Usage:
  python tools/py/playtest_canonical.py --dry-run
  python tools/py/playtest_canonical.py --n 40                 # full suite
  python tools/py/playtest_canonical.py --scenario hardcore_06 --n 10  # one
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
TOOLS_PY = REPO_ROOT / "tools" / "py"
CALIBRATE_PARALLEL = TOOLS_PY / "calibrate_parallel.py"
DEFAULT_MANIFEST = REPO_ROOT / "docs" / "playtest" / "canonical-suite.yaml"

sys.path.insert(0, str(TOOLS_PY))
import calibrate_parallel  # noqa: E402  (SoT for scenario_id -> parallel key)

# scenario_id (manifest) -> calibrate_parallel scenario key. Inverted from the
# parallel runner's own SCENARIO_MAP so the mapping has one source of truth.
_ID_TO_KEY = {cfg["scenario_id"]: key for key, cfg in calibrate_parallel.SCENARIO_MAP.items()}


# ---------------------------------------------------------------------------
# Pure helpers (unit-tested, backend-free)
# ---------------------------------------------------------------------------

def load_manifest(path):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def oracle_scenarios(manifest):
    """Balance-oracle scenarios only (the designed-winnable tutorial ladder is
    NOT a difficulty target -- excluded)."""
    return [s for s in manifest.get("scenarios", []) if s.get("role") == "balance_oracle"]


def resolve_parallel_key(scenario_id):
    """Manifest scenario id -> calibrate_parallel --scenario key, or None."""
    return _ID_TO_KEY.get(scenario_id)


def wr_from_runs(runs):
    """Win rate (fraction) computed directly from runs -- unit-consistent across
    the hc06 (fraction) / hc07 (percent) aggregate quirk. None if no runs."""
    ok = [r for r in runs if isinstance(r, dict) and "outcome" in r]
    if not ok:
        return None
    return sum(1 for r in ok if r.get("outcome") == "victory") / len(ok)


def in_band(wr, band):
    if wr is None or not band or len(band) != 2:
        return False
    return band[0] <= wr <= band[1]


def build_plan(manifest, n, shards, base_port, only=None):
    """Backend-free execution plan (used by --dry-run + the live runner)."""
    scenarios = []
    for s in oracle_scenarios(manifest):
        key = resolve_parallel_key(s["id"])
        if key is None:
            continue
        if only and key != only:
            continue
        scenarios.append({
            "id": s["id"],
            "parallel_key": key,
            "target_band": s.get("target_band"),
            "ratified_knob": s.get("ratified_knob"),
            "n": n,
            "ports": [base_port + i for i in range(shards)],
        })
    repro = dict(manifest.get("repro", {}))
    return {
        "n": n,
        "shards": shards,
        "base_port": base_port,
        "ladder_role": "ratify" if n >= 40 else ("probe" if n <= 10 else "interim"),
        "scenarios": scenarios,
        "repro": repro,
        "composite_metric": manifest.get("composite_metric"),
    }


# ---------------------------------------------------------------------------
# Live execution (calibrate_parallel subprocess) + report
# ---------------------------------------------------------------------------

def _resolve_curves_path(manifest):
    cfg = manifest.get("repro", {}).get("config_source") or "data/core/balance/damage_curves.yaml"
    p = REPO_ROOT / cfg
    return str(p)


def run_scenario(parallel_key, n, shards, base_port, work_dir, label, curves_path):
    """Run one scenario via calibrate_parallel.py, read the merged JSON, return
    a result row. Honors the repro contract via DAMAGE_CURVES_PATH env."""
    work_dir = Path(work_dir)
    work_dir.mkdir(parents=True, exist_ok=True)
    cmd = [
        sys.executable, "-u", str(CALIBRATE_PARALLEL),
        "--scenario", parallel_key, "--n", str(n),
        "--shards", str(shards), "--base-port", str(base_port),
        "--out-dir", str(work_dir), "--label", label,
    ]
    env = dict(os.environ)
    if curves_path:
        env["DAMAGE_CURVES_PATH"] = curves_path
    print(f"\n[suite] >>> {parallel_key} N={n} shards={shards} base_port={base_port}", flush=True)
    proc = subprocess.run(cmd, env=env, cwd=str(REPO_ROOT))
    merged = work_dir / f"parallel-{parallel_key}-{label}-merged.json"
    if proc.returncode != 0 or not merged.exists():
        return {
            "parallel_key": parallel_key, "status": "failed",
            "returncode": proc.returncode, "merged_path": str(merged),
        }
    data = json.loads(merged.read_text(encoding="utf-8"))
    runs = data.get("runs", [])
    return {
        "parallel_key": parallel_key,
        "status": "ok",
        "n_runs": len(runs),
        "win_rate": wr_from_runs(runs),
        "merged_path": str(merged),
        "elapsed_sec": data.get("parallel_elapsed_sec"),
    }


def build_report(plan, results, label, manifest_path):
    rows = []
    all_in_band = True
    by_key = {r["parallel_key"]: r for r in results}
    for sc in plan["scenarios"]:
        r = by_key.get(sc["parallel_key"], {})
        wr = r.get("win_rate")
        band = sc["target_band"]
        ib = in_band(wr, band) if r.get("status") == "ok" else None
        if ib is not True:
            all_in_band = False
        rows.append({
            "id": sc["id"],
            "parallel_key": sc["parallel_key"],
            "target_band": band,
            "ratified_knob": sc["ratified_knob"],
            "status": r.get("status", "missing"),
            "n_runs": r.get("n_runs"),
            "win_rate": wr,
            "in_band": ib,
            "elapsed_sec": r.get("elapsed_sec"),
            "merged_path": r.get("merged_path"),
        })
    return {
        "suite": "canonical-ai-playtest",
        "label": label,
        "manifest": str(manifest_path),
        "n": plan["n"],
        "ladder_role": plan["ladder_role"],
        "all_in_band": all_in_band,
        "repro": plan["repro"],
        "scenarios": rows,
    }


def _fmt_pct(x):
    return "n/a" if x is None else f"{x * 100:.1f}%"


def _fmt_band(b):
    return "n/a" if not b else f"[{b[0] * 100:.0f}%, {b[1] * 100:.0f}%]"


def write_report(report, out_dir, label):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = out_dir / f"{label}-canonical-suite.json"
    md_path = out_dir / f"{label}-canonical-suite.md"
    json_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    lines = [
        f"# Canonical AI-driven playtest suite -- {label}",
        "",
        f"Manifest: `{report['manifest']}`  |  N={report['n']} ({report['ladder_role']})  "
        f"|  all_in_band: **{report['all_in_band']}**",
        "",
        "| scenario | key | band | WR (N) | in-band | knob |",
        "|---|---|---|---|---|---|",
    ]
    for s in report["scenarios"]:
        ib = {True: "YES", False: "NO", None: "?"}[s["in_band"]]
        knob = json.dumps(s["ratified_knob"]) if s["ratified_knob"] else "-"
        lines.append(
            f"| {s['id']} | {s['parallel_key']} | {_fmt_band(s['target_band'])} | "
            f"{_fmt_pct(s['win_rate'])} ({s['n_runs']}) | {ib} | `{knob}` |"
        )
    lines += [
        "",
        "Method SoT: `docs/process/CANONICAL-AI-PLAYTEST.md`. "
        "Repro: host 127.0.0.1, LOBBY_WS_ENABLED=false, DAMAGE_CURVES_PATH pinned.",
        "",
    ]
    md_path.write_text("\n".join(lines), encoding="utf-8")
    return {"json": str(json_path), "md": str(md_path)}


def print_plan(plan, manifest_path):
    print("=== DRY-RUN: canonical AI-driven playtest suite plan ===", flush=True)
    print(f"manifest: {manifest_path}", flush=True)
    print(f"N per scenario: {plan['n']} (ladder role: {plan['ladder_role']})  "
          f"shards: {plan['shards']}  base_port: {plan['base_port']}", flush=True)
    repro = plan["repro"]
    print("repro contract:", flush=True)
    print(f"  host={repro.get('host')}  lobby_ws_enabled={repro.get('lobby_ws_enabled')}  "
          f"damage_curves_path_required={repro.get('damage_curves_path_required')}", flush=True)
    print(f"  config_source={repro.get('config_source')}", flush=True)
    print(f"scenarios ({len(plan['scenarios'])}):", flush=True)
    for s in plan["scenarios"]:
        band = _fmt_band(s["target_band"])
        print(f"  - {s['id']} -> --scenario {s['parallel_key']} N={s['n']} "
              f"band={band} ports={s['ports']} knob={json.dumps(s['ratified_knob'])}", flush=True)
    if not plan["scenarios"]:
        print("  (none -- check manifest roles / scenario filter)", flush=True)
    print("=== no backend touched (dry run) ===", flush=True)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--manifest", default=str(DEFAULT_MANIFEST))
    p.add_argument("--n", type=int, default=40, help="Runs per scenario (default 40 = ratify gate).")
    p.add_argument("--shards", type=int, default=4)
    p.add_argument("--base-port", type=int, default=3341)
    p.add_argument("--scenario", default=None,
                   help="Run only this calibrate_parallel key (e.g. hardcore_06).")
    p.add_argument("--out-dir", default="docs/playtest", help="Where the combined report is written.")
    p.add_argument("--label", default=None, help="Report label (default today's date).")
    p.add_argument("--dry-run", action="store_true",
                   help="Parse manifest + print plan, NO backend (backend-free smoke).")
    args = p.parse_args()

    manifest = load_manifest(args.manifest)
    plan = build_plan(manifest, args.n, args.shards, args.base_port, only=args.scenario)

    if args.dry_run:
        print_plan(plan, args.manifest)
        return 0

    if not plan["scenarios"]:
        print("[suite] no scenarios resolved (check manifest / --scenario filter)", file=sys.stderr, flush=True)
        return 2

    label = args.label or time.strftime("%Y-%m-%d")
    curves_path = _resolve_curves_path(manifest)
    work_dir = Path(REPO_ROOT) / args.out_dir / f"_canonical-work-{label}"

    print(f"[suite] canonical run: {len(plan['scenarios'])} scenario(s) N={args.n} "
          f"label={label} curves={curves_path}", flush=True)
    results = []
    for sc in plan["scenarios"]:
        results.append(run_scenario(
            sc["parallel_key"], args.n, args.shards, args.base_port,
            work_dir, label, curves_path,
        ))

    report = build_report(plan, results, label, args.manifest)
    paths = write_report(report, Path(REPO_ROOT) / args.out_dir, label)

    print("\n=== CANONICAL SUITE REPORT ===", flush=True)
    for s in report["scenarios"]:
        print(f"  {s['parallel_key']:12s} WR={_fmt_pct(s['win_rate'])} "
              f"band={_fmt_band(s['target_band'])} in_band={s['in_band']} status={s['status']}", flush=True)
    print(f"  all_in_band={report['all_in_band']}", flush=True)
    print(f"report: {paths['md']}", flush=True)
    # Non-zero exit when a touched scenario regressed out of band (CI gate-able).
    return 0 if report["all_in_band"] else 1


if __name__ == "__main__":
    sys.exit(main())
