#!/usr/bin/env python3
"""Parallel batch calibration orchestrator -- Method C (L-069 follow-up).

Spawns N backend shards (different ports) + runs batch_calibrate_*.py
on each shard simultaneously. Aggregates into single N-equivalent result.

Speedup: N=40 ~36min serial -> N=40 ~9-10min @ 4 shards (4x parallel).

Pattern: distributed CI sharding. Each shard backend has independent
cache + state. Backend YAML loaded once per shard at boot, so knob
change requires shard restart (same constraint as serial).

Usage:
  # Default: hardcore_06 N=40 split over 4 shards on ports 3341-3344
  python tools/py/calibrate_parallel.py --scenario hardcore_06 --n 40

  # Custom shard count + base port
  python tools/py/calibrate_parallel.py --scenario hardcore_07 --n 40 \\
      --shards 4 --base-port 3341

  # No shard start (assume already-running)
  python tools/py/calibrate_parallel.py --scenario hardcore_06 --n 40 \\
      --hosts http://localhost:3341 http://localhost:3342

Refs:
- docs/research/2026-05-20-calibration-knob-patterns-industry.md
- docs/museum/cards/calibration-n-sample-authority-2026-05-20.md
- Memory feedback_n_sample_authority.md
"""

import argparse
import json
import os
import shutil
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TOOLS_PY = REPO_ROOT / "tools" / "py"
BACKEND_INDEX = REPO_ROOT / "apps" / "backend" / "index.js"

SCENARIO_MAP = {
    "hardcore_06": {
        "script": "batch_calibrate_hardcore06.py",
        "target_band": (0.15, 0.25),
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


def health_check(host, timeout=2):
    try:
        with urllib.request.urlopen(f"{host}/api/health", timeout=timeout) as r:
            return r.status == 200
    except Exception:
        return False


def wait_healthy(host, max_wait=60):
    """Poll /api/health until 200 or timeout. Returns wait_sec or None on fail."""
    t0 = time.time()
    while time.time() - t0 < max_wait:
        if health_check(host):
            return time.time() - t0
        time.sleep(1)
    return None


def start_shard(port, log_dir):
    """Spawn `PORT=<port> node apps/backend/index.js`. Returns Popen handle.

    LOBBY_WS_ENABLED=false: WS lobby default port is 3341 (apps/backend/index.js:50).
    Without disable, shards on 3341+ collide with WS upgrade middleware -> /api/health
    returns 426 Upgrade Required instead of 200. Batch calibration doesn't use WS,
    so safe to disable. Discovery 2026-05-20 smoke L-071.
    """
    log_path = log_dir / f"shard-{port}.log"
    env = dict(os.environ)
    env["PORT"] = str(port)
    env["LOBBY_WS_ENABLED"] = "false"  # avoid HTTP/WS port collision per-shard
    # Inherit other env (DATABASE_URL etc).
    print(f"[shard-{port}] starting backend, log={log_path}", flush=True)
    f = open(log_path, "w", encoding="utf-8")
    proc = subprocess.Popen(
        ["node", str(BACKEND_INDEX)],
        stdout=f,
        stderr=subprocess.STDOUT,
        env=env,
        cwd=str(REPO_ROOT),
    )
    return proc, f


def stop_shard(proc, fh, port):
    """Gracefully terminate shard backend. Force-kill if needed."""
    if proc is None:
        return
    try:
        if os.name == "nt":
            proc.terminate()
        else:
            proc.send_signal(signal.SIGTERM)
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        print(f"[shard-{port}] SIGTERM timeout, killing", flush=True)
        proc.kill()
        proc.wait(timeout=5)
    except Exception as e:
        print(f"[shard-{port}] stop error: {e}", flush=True)
    finally:
        try:
            fh.close()
        except Exception:
            pass


def run_shard_batch(host, scenario_cfg, n, out_path, jsonl_path, log_path):
    """Subprocess wrapper -- launch batch_calibrate_*.py against one shard."""
    script_path = TOOLS_PY / scenario_cfg["script"]
    cmd = [
        sys.executable, "-u", str(script_path),
        "--host", host,
        "--n", str(n),
        "--out", str(out_path),
        "--jsonl", str(jsonl_path),
        "--skip-health",
    ] + scenario_cfg["extra_args"]
    print(f"[parallel] launch shard host={host} N={n}", flush=True)
    f = open(log_path, "w", encoding="utf-8")
    proc = subprocess.Popen(cmd, stdout=f, stderr=subprocess.STDOUT, cwd=str(REPO_ROOT))
    return proc, f


def distribute_n(total_n, shards):
    """Split N evenly across shards. Remainder distributed first shards."""
    base = total_n // shards
    rem = total_n % shards
    return [base + (1 if i < rem else 0) for i in range(shards)]


def merge_jsonl(jsonl_paths):
    """Merge per-shard JSONL into single list of run dicts."""
    runs = []
    for p in jsonl_paths:
        if not p.exists():
            continue
        with open(p, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    runs.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    # Renumber run indices.
    for i, r in enumerate(runs):
        r["run"] = i
    return runs


def aggregate_merged(runs, scenario):
    """Import + reuse batch script aggregate fn for consistency."""
    cfg = SCENARIO_MAP[scenario]
    script_module = cfg["script"].replace(".py", "")
    # Dynamic import.
    sys.path.insert(0, str(TOOLS_PY))
    mod = __import__(script_module)
    if hasattr(mod, "aggregate"):
        return mod.aggregate(runs, encounter_class="hardcore")
    if hasattr(mod, "summarise"):
        return mod.summarise(runs)
    return {"error": f"no aggregate fn in {script_module}"}


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--scenario", choices=list(SCENARIO_MAP.keys()), required=True)
    p.add_argument("--n", type=int, required=True, help="Total N (split across shards)")
    p.add_argument("--shards", type=int, default=4)
    p.add_argument("--base-port", type=int, default=3341,
                   help="First shard port. Subsequent +1. Default 3341 (avoid 3334/3340 conflict).")
    p.add_argument("--hosts", nargs="+", default=None,
                   help="Use existing hosts (skip shard start). Must match --shards count.")
    p.add_argument("--out-dir", default="docs/playtest")
    p.add_argument("--label", default=None, help="Suffix for output files")
    p.add_argument("--keep-shards", action="store_true",
                   help="Don't stop shards on exit (for reuse).")
    args = p.parse_args()

    cfg = SCENARIO_MAP[args.scenario]
    label = args.label or time.strftime("%Y-%m-%d-%H%M%S")
    out_dir = REPO_ROOT / args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    base = out_dir / f"parallel-{args.scenario}-{label}"

    # Determine hosts.
    if args.hosts:
        if len(args.hosts) != args.shards:
            print(f"[parallel] --hosts count {len(args.hosts)} != --shards {args.shards}", file=sys.stderr)
            return 2
        hosts = args.hosts
        shard_procs = []
        shard_fhs = []
        owned_shards = False
    else:
        owned_shards = True
        ports = [args.base_port + i for i in range(args.shards)]
        hosts = [f"http://localhost:{port}" for port in ports]

        # Sanity: ensure ports not already taken.
        for h in hosts:
            if health_check(h, timeout=1):
                print(f"[parallel] port already serving: {h}. Use --hosts to reuse OR pick different --base-port.", file=sys.stderr)
                return 3

        # Start shards.
        log_dir = out_dir / f"parallel-{args.scenario}-{label}-shards"
        log_dir.mkdir(parents=True, exist_ok=True)
        shard_procs = []
        shard_fhs = []
        for port in ports:
            proc, fh = start_shard(port, log_dir)
            shard_procs.append(proc)
            shard_fhs.append(fh)

        # Wait healthy.
        print(f"[parallel] waiting {len(hosts)} shards healthy (max 60s each)...", flush=True)
        for h in hosts:
            wait = wait_healthy(h, max_wait=60)
            if wait is None:
                print(f"[parallel] shard {h} NOT HEALTHY after 60s, aborting", file=sys.stderr)
                for proc, fh, port in zip(shard_procs, shard_fhs, ports):
                    stop_shard(proc, fh, port)
                return 4
            print(f"[parallel] {h} ready ~{wait:.1f}s", flush=True)

    # Distribute runs.
    n_per_shard = distribute_n(args.n, args.shards)
    print(f"[parallel] N={args.n} distributed: {n_per_shard}", flush=True)

    # Launch batches parallel.
    batch_procs = []
    batch_fhs = []
    out_paths = []
    jsonl_paths = []
    for i, (host, n) in enumerate(zip(hosts, n_per_shard)):
        if n == 0:
            continue
        out_p = Path(f"{base}-shard{i}.json")
        jsonl_p = Path(f"{base}-shard{i}.jsonl")
        log_p = Path(f"{base}-shard{i}.log")
        out_paths.append(out_p)
        jsonl_paths.append(jsonl_p)
        proc, fh = run_shard_batch(host, cfg, n, out_p, jsonl_p, log_p)
        batch_procs.append((proc, fh, host, n, log_p))

    t0 = time.time()
    print(f"[parallel] {len(batch_procs)} batches running...", flush=True)

    # Wait all batches.
    for proc, fh, host, n, log_p in batch_procs:
        rc = proc.wait()
        try:
            fh.close()
        except Exception:
            pass
        elapsed = time.time() - t0
        status = "OK" if rc == 0 else f"FAIL rc={rc}"
        print(f"[parallel] shard {host} done N={n} {status} elapsed={elapsed:.1f}s", flush=True)

    total_elapsed = time.time() - t0
    print(f"[parallel] all shards done in {total_elapsed:.1f}s", flush=True)

    # Merge + aggregate.
    runs = merge_jsonl(jsonl_paths)
    print(f"[parallel] merged {len(runs)} runs from {len(jsonl_paths)} JSONLs", flush=True)
    agg = aggregate_merged(runs, args.scenario)

    # Write unified report.
    final = {
        "scenario": args.scenario,
        "scenario_id": cfg["scenario_id"],
        "target_band": list(cfg["target_band"]),
        "total_n": args.n,
        "shards": args.shards,
        "n_per_shard": n_per_shard,
        "hosts": hosts,
        "parallel_elapsed_sec": total_elapsed,
        "serial_estimated_sec": total_elapsed * args.shards,
        "speedup_x": args.shards,
        "method": "C-parallel-shards",
        "method_ref": "docs/research/2026-05-20-calibration-knob-patterns-industry.md",
        "aggregate": agg,
        "runs": runs,
    }
    out_path = Path(f"{base}-merged.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(final, f, indent=2, ensure_ascii=False)
    print(f"[parallel] merged report: {out_path}", flush=True)

    # Cleanup shards.
    if owned_shards and not args.keep_shards:
        ports = [args.base_port + i for i in range(args.shards)]
        for proc, fh, port in zip(shard_procs, shard_fhs, ports):
            stop_shard(proc, fh, port)
        print(f"[parallel] {len(shard_procs)} shards stopped", flush=True)

    return 0


if __name__ == "__main__":
    sys.exit(main())
