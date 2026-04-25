"""Migrate skiv_saga.json diary[] entries to data/derived/unit_diaries/skiv.jsonl.

F-03 archaeologist findings closure: saga had 8 hardcoded diary entries that
were SoT pre-monitor. Now monitor cron auto-populates, but historic entries
were never bridged. This script seeds them once.

Idempotent: skips entries already present in skiv.jsonl by ts+event_type match.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

THIS = Path(__file__).resolve()
ROOT = THIS.parent.parent.parent
SAGA = ROOT / "data" / "derived" / "skiv_saga.json"
DIARY = ROOT / "data" / "derived" / "unit_diaries" / "skiv.jsonl"


def load_existing_keys() -> set:
    """Build dedup key set from existing diary entries."""
    keys = set()
    if not DIARY.exists():
        return keys
    with DIARY.open("r", encoding="utf-8") as f:
        for line in f:
            try:
                e = json.loads(line)
                keys.add(f"{e.get('ts')}::{e.get('event_type')}")
            except (json.JSONDecodeError, ValueError):
                continue
    return keys


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
    except Exception:
        pass
    if not SAGA.exists():
        print(f"[migration] saga not found: {SAGA}")
        return 1
    with SAGA.open("r", encoding="utf-8") as f:
        saga = json.load(f)
    diary_seed = saga.get("diary") or saga.get("diary_entries") or []
    if not diary_seed:
        print(f"[migration] no diary entries in saga, nothing to migrate")
        return 0

    DIARY.parent.mkdir(parents=True, exist_ok=True)
    existing = load_existing_keys()
    migrated = 0
    skipped = 0
    with DIARY.open("a", encoding="utf-8") as f:
        for entry in diary_seed:
            key = f"{entry.get('ts')}::{entry.get('event_type')}"
            if key in existing:
                skipped += 1
                continue
            stamped = {
                "ts": entry.get("ts"),
                "unit_id": "skiv",
                "event_type": entry.get("event_type"),
                "turn": entry.get("turn", 0),
                "encounter_id": entry.get("encounter_id"),
                "payload": entry.get("payload") or {},
                "source": "saga_seed_migration",
            }
            f.write(json.dumps(stamped, ensure_ascii=False) + "\n")
            migrated += 1
    print(f"[migration] migrated={migrated} skipped={skipped} (idempotent)")
    print(f"[migration] target: {DIARY.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
