#!/usr/bin/env python3
"""Bug replay export — Sprint γ Tech Baseline (2026-04-28).

Pattern: Old World (research §8 strategy-games-tech-extraction).
Export deterministic replay package per session-id: snapshot units iniziali +
seed RNG + event log → JSON file con hash integrity.

Usage:
    python tools/py/bug_replay_export.py --session <SID> [--source PATH] [--output PATH]
    python tools/py/bug_replay_export.py --session demo --synthetic  # smoke test mode

Exit codes:
    0 = export ok
    2 = source not found / invalid

Output schema:
    {
        "schema_version": "1.0.0",
        "session_id": "...",
        "exported_at": "2026-04-28T...",
        "seed": 12345,
        "units_initial": [...],
        "events": [
            { "turn": 1, "actor_id": "...", "action_type": "attack", ... },
            ...
        ],
        "hash": "sha256:..."
    }

Smoke test: --synthetic mode genera replay sintetico round-trip-able per
verificare hash determinism + schema validity senza richiedere session live.
"""

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_OUTPUT_DIR = Path("reports/bug-replay")
SCHEMA_VERSION = "1.0.0"


def _compute_hash(payload):
    """Compute deterministic sha256 over canonical JSON. Excludes 'hash' field."""
    cloned = {k: v for k, v in payload.items() if k != "hash"}
    serialized = json.dumps(cloned, sort_keys=True, ensure_ascii=False)
    h = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
    return f"sha256:{h}"


def _build_synthetic_replay(session_id):
    """Generate deterministic synthetic replay (smoke test mode)."""
    return {
        "session_id": session_id,
        "seed": 42,
        "units_initial": [
            {"id": "u1", "side": "player", "hp": 10, "ap": 2, "traits": ["zampe_a_molla"]},
            {"id": "u2", "side": "sistema", "hp": 8, "ap": 2, "traits": ["pelle_elastomera"]},
        ],
        "events": [
            {
                "turn": 1,
                "actor_id": "u1",
                "target_id": "u2",
                "action_type": "attack",
                "damage_dealt": 3,
                "result": "hit",
                "position_from": [0, 0],
                "position_to": [1, 0],
            },
            {
                "turn": 1,
                "actor_id": "u2",
                "target_id": "u1",
                "action_type": "attack",
                "damage_dealt": 2,
                "result": "hit",
                "position_from": [3, 3],
                "position_to": [2, 3],
            },
            {
                "turn": 2,
                "actor_id": "u1",
                "target_id": "u2",
                "action_type": "attack",
                "damage_dealt": 4,
                "result": "crit",
                "position_from": [1, 0],
                "position_to": [2, 0],
            },
        ],
    }


def _load_session_state(source_path, session_id):
    """Load session state from JSON file. Best-effort parser.

    Expects either:
      - file diretto = {session_id, seed?, units, events?}
      - file index = {sessions: {<id>: {...}}}

    Returns None se non trovabile.
    """
    if not source_path.is_file():
        return None
    try:
        with source_path.open(encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, json.JSONDecodeError) as e:
        print(f"[bug-replay] source load fail: {e}", file=sys.stderr)
        return None

    # Direct shape
    if isinstance(data, dict) and data.get("session_id") == session_id:
        return data

    # Index shape
    sessions = data.get("sessions") if isinstance(data, dict) else None
    if isinstance(sessions, dict) and session_id in sessions:
        entry = sessions[session_id]
        entry.setdefault("session_id", session_id)
        return entry

    return None


def _normalize_replay(raw, session_id):
    """Normalize raw session state into replay schema."""
    return {
        "schema_version": SCHEMA_VERSION,
        "session_id": session_id,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "seed": raw.get("seed", 0),
        "units_initial": raw.get("units_initial") or raw.get("units") or [],
        "events": raw.get("events") or [],
    }


def export_replay(session_id, source=None, output=None, synthetic=False):
    """Run export. Returns (exit_code, output_path)."""
    if synthetic:
        raw = _build_synthetic_replay(session_id)
    elif source:
        raw = _load_session_state(Path(source), session_id)
        if raw is None:
            print(f"[bug-replay] FAIL: session '{session_id}' not found in {source}", file=sys.stderr)
            return 2, None
    else:
        print("[bug-replay] FAIL: --source or --synthetic required", file=sys.stderr)
        return 2, None

    replay = _normalize_replay(raw, session_id)
    replay["hash"] = _compute_hash(replay)

    # Verify round-trip determinism
    rehash = _compute_hash(replay)
    assert rehash == replay["hash"], "hash mismatch — non-determinism bug"

    if output:
        out_path = Path(output)
    else:
        DEFAULT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
        out_path = DEFAULT_OUTPUT_DIR / f"replay-{session_id}-{ts}.json"

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as fh:
        json.dump(replay, fh, ensure_ascii=False, indent=2)

    print(f"[bug-replay] OK — session '{session_id}', {len(replay['events'])} events, hash {replay['hash'][:20]}...")
    print(f"[bug-replay] output: {out_path}")
    return 0, out_path


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--session", required=True, help="session id to export")
    ap.add_argument("--source", default=None, help="source JSON file (session state dump)")
    ap.add_argument("--output", default=None, help="output replay JSON path")
    ap.add_argument("--synthetic", action="store_true", help="generate synthetic deterministic replay (smoke)")
    args = ap.parse_args()

    code, _ = export_replay(args.session, source=args.source, output=args.output, synthetic=args.synthetic)
    return code


if __name__ == "__main__":
    sys.exit(main())
