"""Skiv saga sync — back-propagate monitor state into skiv_saga.json on phase change.

Saga JSON (data/derived/skiv_saga.json) è SoT human-curated. Monitor state
(data/derived/skiv_monitor/state.json) è auto-event-driven. Quando phase
cambia in monitor, sync alcuni campi back in saga (preserve intent: phase
+ aspect + xp_total + level), NON tocca campi puramente human (mbti_axes,
picked_perks, mutations array narrative).

Idempotent: skip if no phase change. Run after backfill or significant cron tick.

Usage:
    python tools/py/skiv_saga_sync.py [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

THIS = Path(__file__).resolve()
ROOT = THIS.parent.parent.parent
SAGA_PATH = ROOT / "data" / "derived" / "skiv_saga.json"
STATE_PATH = ROOT / "data" / "derived" / "skiv_monitor" / "state.json"

# Fields synced back from monitor state → saga (additive, non-destructive).
SAFE_SYNC_FIELDS = {
    "level": "progression.level",          # state.level → saga.progression.level
    "phase": "aspect.lifecycle_phase",     # state.lifecycle.phase_id → saga.aspect.lifecycle_phase
}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Skiv saga sync from monitor state")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
    except Exception:
        pass

    if not SAGA_PATH.exists() or not STATE_PATH.exists():
        print("[saga-sync] missing saga or state. Run backfill first.")
        return 1

    with SAGA_PATH.open("r", encoding="utf-8") as f:
        saga = json.load(f)
    with STATE_PATH.open("r", encoding="utf-8") as f:
        state = json.load(f)

    monitor_phase = (state.get("lifecycle") or {}).get("phase_id")
    saga_phase = (saga.get("aspect") or {}).get("lifecycle_phase")
    monitor_level = state.get("level")
    saga_level = (saga.get("progression") or {}).get("level")

    changed = []
    if monitor_phase and monitor_phase != saga_phase:
        saga.setdefault("aspect", {})["lifecycle_phase"] = monitor_phase
        changed.append(f"phase: {saga_phase} -> {monitor_phase}")
    if monitor_level and monitor_level != saga_level:
        saga.setdefault("progression", {})["level"] = monitor_level
        changed.append(f"level: {saga_level} -> {monitor_level}")

    if not changed:
        print("[saga-sync] no changes (already in sync)")
        return 0

    print(f"[saga-sync] {len(changed)} field(s) updated:")
    for c in changed:
        print(f"  - {c}")

    if args.dry_run:
        print("[saga-sync] dry-run, not writing")
        return 0

    saga["last_synced_at"] = state.get("last_updated", "")
    saga["last_synced_from"] = "skiv_monitor.state.json"
    with SAGA_PATH.open("w", encoding="utf-8") as f:
        json.dump(saga, f, ensure_ascii=False, indent=2)
    print(f"[saga-sync] wrote {SAGA_PATH.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
