#!/usr/bin/env python3
"""Aggregate batch-sim session logs (logs/session_*.json) into dashboard-ready JSON.

Source format: JSON ARRAY of combat events per file (action_type/session_end/outcome=win),
i.e. the format actually produced by POST /api/session routes -- NOT the newline-delimited
JSONL stream consumed by analyze_telemetry.py (type=session_complete/outcome=victory).
Complementary tools; see issue #3157 for the data-quality findings this surfaced.

Usage:
    python tools/py/aggregate_session_logs.py [--logs-glob GLOB] [--out PATH]

Defaults: --logs-glob logs/session_*.json, --out logs/reports/playtest_aggregates.json
(logs/ is gitignored; output is a generated artifact, do not commit).

Known data caveats (issue #3157, verified 2026-07-01):
- 'abandon' outcomes are mostly undeclared harness timeouts (F2)
- scenario_id is null in ~92.5% of sessions (F3) -> bucketed as 'unknown'
- ~13% of files lack session_end (F4) -> bucketed as 'truncated'
- species ids appear in both underscore and hyphen form (F1) -> NOT merged here,
  kept as-is so the split stays visible until fixed upstream
"""
import argparse
import glob
import json
import os
import sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    # [0-9] guard: match only timestamped batch logs (session_YYYYMMDD_HHMMSS.json),
    # NOT the deterministic seed fixtures scripts/seed-sessions.js writes as
    # session_seed_<name>.json (they would pollute KPIs + create bogus day buckets)
    ap.add_argument("--logs-glob", default=os.path.join(ROOT, "logs", "session_[0-9]*.json"))
    ap.add_argument("--out", default=os.path.join(ROOT, "logs", "reports", "playtest_aggregates.json"))
    args = ap.parse_args()

    files = sorted(glob.glob(args.logs_glob))
    if not files:
        print(f"no session files match {args.logs_glob}", file=sys.stderr)
        return 1

    kpi_events = 0
    outcomes_by_scenario = defaultdict(Counter)
    damage_by_species = defaultdict(lambda: [0, 0])  # species -> [total_dmg, n_events]
    damage_by_job = defaultdict(lambda: [0, 0])
    actions_by_turn = defaultdict(Counter)
    session_turns = []
    sessions_by_day = Counter()
    outcome_by_day = defaultdict(Counter)
    truncated = 0
    bad_files = 0

    for i, fp in enumerate(files):
        if i % 250 == 0:
            print(f"progress {i}/{len(files)}", flush=True)
        try:
            with open(fp, encoding="utf-8-sig") as fh:  # BOM-safe on Windows
                events = json.load(fh)
            if not isinstance(events, list):
                bad_files += 1
                continue
        except (json.JSONDecodeError, OSError):
            bad_files += 1
            continue

        kpi_events += len(events)
        base = os.path.basename(fp)  # session_YYYYMMDD_HHMMSS.json
        day = f"{base[8:12]}-{base[12:14]}-{base[14:16]}" if len(base) >= 16 else "unknown"
        sessions_by_day[day] += 1

        end = next((e for e in reversed(events) if e.get("action_type") == "session_end"), None)
        session_turns.append(max((e.get("turn") or 0 for e in events), default=0))

        if end is None:
            truncated += 1
            outcome = "truncated"
        else:
            outcome = end.get("outcome") or end.get("result") or "unknown"
        scenario = next((e.get("scenario_id") for e in events if e.get("scenario_id")), None) or "unknown"
        outcomes_by_scenario[scenario][outcome] += 1
        outcome_by_day[day][outcome] += 1

        for e in events:
            turn = e.get("turn") or 0
            if turn <= 30:  # cap funnel range, tail is noise
                actions_by_turn[turn][e.get("action_type") or "unknown"] += 1
            dmg = e.get("damage_dealt") or 0
            if dmg > 0:
                sp = e.get("actor_species")
                jb = e.get("actor_job")
                if sp:
                    damage_by_species[sp][0] += dmg
                    damage_by_species[sp][1] += 1
                if jb:
                    damage_by_job[jb][0] += dmg
                    damage_by_job[jb][1] += 1

    n_sessions = len(files) - bad_files
    all_outcomes = Counter()
    for c in outcomes_by_scenario.values():
        all_outcomes.update(c)

    # sanity gates -- fail loud instead of emitting a silently-wrong report
    assert n_sessions > 0, "no parsable sessions"
    assert sum(all_outcomes.values()) == n_sessions, "outcome total != session total"
    assert kpi_events > 0, "no events"

    completed = n_sessions - truncated
    wins = all_outcomes.get("win", 0)
    win_rate = round(100.0 * wins / completed, 1) if completed else 0.0
    hist = Counter(min(t, 30) for t in session_turns)

    out = {
        "generated_from": f"{len(files)} files ({bad_files} unparsable, {truncated} truncated)",
        "kpis": {
            "sessions": n_sessions,
            "events": kpi_events,
            "win_rate_pct": win_rate,
            "completed": completed,
            "avg_turns": round(sum(session_turns) / len(session_turns), 1),
        },
        "outcomes_total": dict(all_outcomes.most_common()),
        "outcomes_by_scenario": {s: dict(c) for s, c in outcomes_by_scenario.items()},
        "damage_by_species": {k: {"total": v[0], "events": v[1], "avg": round(v[0] / v[1], 1)}
                              for k, v in sorted(damage_by_species.items(), key=lambda x: -x[1][0])},
        "damage_by_job": {k: {"total": v[0], "events": v[1], "avg": round(v[0] / v[1], 1)}
                          for k, v in sorted(damage_by_job.items(), key=lambda x: -x[1][0])},
        "actions_by_turn": {str(t): dict(c) for t, c in sorted(actions_by_turn.items())},
        "turns_histogram": {str(k): v for k, v in sorted(hist.items())},
        "sessions_by_day": dict(sorted(sessions_by_day.items())),
        "outcome_by_day": {d: dict(c) for d, c in sorted(outcome_by_day.items())},
    }

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=1)
    print(f"OK -> {args.out}")
    print(f"sessions={n_sessions} events={kpi_events} win_rate={win_rate}% "
          f"truncated={truncated} bad={bad_files}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
