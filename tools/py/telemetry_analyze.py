#!/usr/bin/env python3
"""Telemetry aggregation pipeline — stdlib-only (no DuckDB dep).

Reads `logs/telemetry_YYYYMMDD.jsonl` files from POST /api/session/telemetry
and produces aggregated report (Markdown + JSON).

Applies P0 findings from telemetry-viz-illuminator agent smoke test
(docs/qa/2026-04-26-telemetry-viz-illuminator-smoke.md):

    - Event count distribution per type (Tufte small multiples basis)
    - Session count + duration histograms (retention input)
    - Funnel analysis: session_start → ability_use → damage_dealt → session_end
    - Per-scenario win rate (if session_end.payload.outcome present)

Usage:
    PYTHONPATH=tools/py python3 tools/py/telemetry_analyze.py \\
        --logs-dir logs --out-md docs/analytics/2026-04-26-telemetry-report.md

Non-goals (deferred):
    - Real-time streaming (Grafana/OTEL stack)
    - Spatial heatmap (deck.gl HexagonLayer, post N=100+)
    - Sankey multi-transition viz (needs Google Charts / D3)
    - DuckDB SQL queries (policy: no new deps without approval)

Ref agent: .claude/agents/telemetry-viz-illuminator.md
Ref schema (raw event): apps/backend/routes/session.js:1891 (ts,session_id,player_id,type,payload)
"""

from __future__ import annotations

import argparse
import json
import os
import statistics
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Iterable


# Event type enum — sync with apps/backend/routes/session.js telemetry schema.
KNOWN_EVENT_TYPES = frozenset(
    {
        "session_start",
        "turn_end",
        "ability_use",
        "damage_taken",
        "damage_dealt",
        "reward_offer",
        "reward_accept",
        "reward_skip",
        "sg_earn",
        "pack_roll",
        "mbti_projection",
        "session_end",
        # Tutorial funnel events (server-side auto-log in /session/start + /end):
        "tutorial_start",
        "tutorial_complete",
        # M16+ coop events (optional, tolerated):
        "lobby_join",
        "char_create",
        "world_setup",
        "combat_start",
        "combat_end",
        "debrief",
    }
)

# Funnel stages (ordered). Each stage = required event type.
# Completion rate = N(stage_i_reached) / N(stage_0_reached).
FUNNEL_STAGES = (
    "session_start",
    "ability_use",
    "damage_dealt",
    "session_end",
)

# Tutorial-specific funnel: onboarding drop-off analysis per scenario.
# Server-side auto-log: tutorial_start on /session/start (scenario matches
# ^enc_tutorial_\d+), tutorial_complete on /session/end with outcome.
TUTORIAL_FUNNEL_STAGES = (
    "tutorial_start",
    "tutorial_complete",
)


@dataclass
class TelemetryEvent:
    """Single event from JSONL log."""

    ts: str
    session_id: str | None
    player_id: str | None
    type: str
    payload: dict | None = None

    @classmethod
    def from_json(cls, line: str) -> "TelemetryEvent | None":
        """Parse one JSONL line; return None on malformed input."""
        try:
            obj = json.loads(line)
        except (json.JSONDecodeError, ValueError):
            return None
        if not isinstance(obj, dict):
            return None
        return cls(
            ts=str(obj.get("ts", "")),
            session_id=obj.get("session_id"),
            player_id=obj.get("player_id"),
            type=str(obj.get("type", "unknown")),
            payload=obj.get("payload") if isinstance(obj.get("payload"), dict) else None,
        )


@dataclass
class Aggregates:
    """Computed aggregates over a set of events."""

    total_events: int = 0
    malformed_lines: int = 0
    type_counts: Counter = field(default_factory=Counter)
    sessions: dict[str, list[TelemetryEvent]] = field(default_factory=lambda: defaultdict(list))
    unknown_types: Counter = field(default_factory=Counter)

    def session_count(self) -> int:
        return len(self.sessions)

    def funnel_counts(self) -> dict[str, int]:
        """Count sessions that reached each funnel stage."""
        counts: dict[str, int] = dict.fromkeys(FUNNEL_STAGES, 0)
        for events in self.sessions.values():
            reached = {ev.type for ev in events}
            for stage in FUNNEL_STAGES:
                if stage in reached:
                    counts[stage] += 1
        return counts

    def scenario_outcomes(self) -> dict[str, Counter]:
        """Collect session_end outcomes per scenario_id in payload."""
        out: dict[str, Counter] = defaultdict(Counter)
        for events in self.sessions.values():
            for ev in events:
                if ev.type != "session_end":
                    continue
                payload = ev.payload or {}
                scenario = str(payload.get("scenario_id") or payload.get("scenario") or "unknown")
                outcome = str(payload.get("outcome") or "unknown")
                out[scenario][outcome] += 1
        return out

    def tutorial_funnel(self) -> dict[str, dict]:
        """Per-scenario tutorial funnel: start → complete + outcome breakdown.

        Uses `tutorial_start` + `tutorial_complete` events (server-side auto-log).
        Returns per-scenario dict: {started, completed, completion_rate, outcomes}.
        """
        by_scenario: dict[str, dict] = defaultdict(
            lambda: {"started": 0, "completed": 0, "outcomes": Counter()}
        )
        # First pass: count starts.
        for events in self.sessions.values():
            for ev in events:
                payload = ev.payload or {}
                scenario = str(payload.get("scenario_id") or "unknown")
                if ev.type == "tutorial_start":
                    by_scenario[scenario]["started"] += 1
                elif ev.type == "tutorial_complete":
                    by_scenario[scenario]["completed"] += 1
                    outcome = str(payload.get("outcome") or "unknown")
                    by_scenario[scenario]["outcomes"][outcome] += 1
        # Second pass: compute completion_rate.
        result: dict[str, dict] = {}
        for scenario, data in by_scenario.items():
            started = data["started"] or 0
            completed = data["completed"] or 0
            rate = round(100 * completed / started, 1) if started else 0.0
            result[scenario] = {
                "started": started,
                "completed": completed,
                "completion_rate_pct": rate,
                "outcomes": dict(data["outcomes"]),
            }
        return result

    def session_durations_minutes(self) -> list[float]:
        """Duration in minutes between first and last event per session."""
        durations: list[float] = []
        for events in self.sessions.values():
            if len(events) < 2:
                continue
            timestamps = [_parse_ts(ev.ts) for ev in events if ev.ts]
            timestamps = [t for t in timestamps if t is not None]
            if len(timestamps) < 2:
                continue
            delta = (max(timestamps) - min(timestamps)).total_seconds() / 60.0
            durations.append(round(delta, 2))
        return durations


def _parse_ts(ts: str) -> datetime | None:
    """Parse ISO 8601 timestamp; tolerant of trailing Z."""
    if not ts:
        return None
    normalized = ts.replace("Z", "+00:00") if ts.endswith("Z") else ts
    try:
        return datetime.fromisoformat(normalized)
    except (ValueError, TypeError):
        return None


def read_events(logs_dir: Path, date_filter: str | None = None) -> Iterable[TelemetryEvent]:
    """Yield events from all telemetry_*.jsonl files in logs_dir.

    Malformed lines are skipped silently (counted in Aggregates.malformed_lines via
    aggregate()).

    Args:
        logs_dir: directory containing telemetry_*.jsonl files.
        date_filter: optional YYYYMMDD; restricts to matching filename.
    """
    if not logs_dir.is_dir():
        return
    pattern = f"telemetry_{date_filter}.jsonl" if date_filter else "telemetry_*.jsonl"
    for path in sorted(logs_dir.glob(pattern)):
        try:
            with path.open("r", encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    ev = TelemetryEvent.from_json(line)
                    if ev is not None:
                        yield ev
                    else:
                        # Signal malformed to caller via sentinel. Use special
                        # field in payload so aggregate can count it.
                        yield TelemetryEvent(
                            ts="",
                            session_id=None,
                            player_id=None,
                            type="__malformed__",
                        )
        except OSError:
            continue


def aggregate(events: Iterable[TelemetryEvent]) -> Aggregates:
    """Consume events stream and return Aggregates."""
    agg = Aggregates()
    for ev in events:
        if ev.type == "__malformed__":
            agg.malformed_lines += 1
            continue
        agg.total_events += 1
        agg.type_counts[ev.type] += 1
        if ev.type not in KNOWN_EVENT_TYPES:
            agg.unknown_types[ev.type] += 1
        if ev.session_id:
            agg.sessions[ev.session_id].append(ev)
    return agg


def format_markdown(agg: Aggregates, *, date_range: str | None = None) -> str:
    """Produce Markdown report from Aggregates (frontmatter + tables)."""
    today = datetime.now().date().isoformat()
    lines: list[str] = []
    lines.append("---")
    lines.append(f"title: Telemetry Analysis — {date_range or 'all logs'} ({today})")
    lines.append("workstream: ops-qa")
    lines.append("category: analytics")
    lines.append("doc_status: active")
    lines.append("doc_owner: claude-code")
    lines.append(f"last_verified: '{today}'")
    lines.append("source_of_truth: false")
    lines.append("language: it")
    lines.append("review_cycle_days: 30")
    lines.append("tags:")
    lines.append("  - telemetry")
    lines.append("  - analytics")
    lines.append("  - generated")
    lines.append("---")
    lines.append("")
    lines.append(f"# Telemetry Analysis — {date_range or 'all logs'}")
    lines.append("")
    lines.append("Report generato da `tools/py/telemetry_analyze.py` (stdlib-only).")
    lines.append("")

    lines.append("## Summary")
    lines.append("")
    lines.append(f"- **Total events**: {agg.total_events}")
    lines.append(f"- **Sessions**: {agg.session_count()}")
    lines.append(f"- **Malformed lines skipped**: {agg.malformed_lines}")
    lines.append(f"- **Unknown event types**: {len(agg.unknown_types)}")
    lines.append("")

    lines.append("## Event type distribution")
    lines.append("")
    lines.append("| Type | Count | % |")
    lines.append("| --- | ---: | ---: |")
    total = max(agg.total_events, 1)
    for t, n in agg.type_counts.most_common():
        lines.append(f"| `{t}` | {n} | {100 * n / total:.1f}% |")
    lines.append("")

    funnel = agg.funnel_counts()
    lines.append("## Funnel (sessions reaching each stage)")
    lines.append("")
    lines.append("| Stage | Sessions | % of stage 0 |")
    lines.append("| --- | ---: | ---: |")
    stage_0 = max(funnel.get(FUNNEL_STAGES[0], 0), 1)
    for stage in FUNNEL_STAGES:
        n = funnel.get(stage, 0)
        pct = 100 * n / stage_0
        lines.append(f"| `{stage}` | {n} | {pct:.1f}% |")
    lines.append("")

    durations = agg.session_durations_minutes()
    if durations:
        lines.append("## Session duration (minutes)")
        lines.append("")
        lines.append(f"- N = {len(durations)}")
        lines.append(f"- Mean = {statistics.mean(durations):.2f}")
        lines.append(f"- Median = {statistics.median(durations):.2f}")
        if len(durations) > 1:
            lines.append(f"- Stdev = {statistics.stdev(durations):.2f}")
        lines.append(f"- Min / Max = {min(durations):.2f} / {max(durations):.2f}")
        lines.append("")

    tutorial = agg.tutorial_funnel()
    if tutorial:
        lines.append("## Tutorial funnel (onboarding drop-off)")
        lines.append("")
        lines.append("Per-scenario: tutorial_start → tutorial_complete + outcome breakdown.")
        lines.append("")
        lines.append("| Scenario | Started | Completed | Completion % | Victory | Defeat | Other |")
        lines.append("| --- | ---: | ---: | ---: | ---: | ---: | ---: |")
        for scenario, data in sorted(tutorial.items()):
            started = data.get("started", 0)
            completed = data.get("completed", 0)
            rate = data.get("completion_rate_pct", 0.0)
            outs = data.get("outcomes", {})
            victory = outs.get("win", 0) + outs.get("victory", 0)
            defeat = outs.get("wipe", 0) + outs.get("defeat", 0)
            other = sum(outs.values()) - victory - defeat
            lines.append(
                f"| `{scenario}` | {started} | {completed} | {rate:.1f}% | {victory} | {defeat} | {other} |"
            )
        lines.append("")

    outcomes = agg.scenario_outcomes()
    if outcomes:
        lines.append("## Scenario outcomes")
        lines.append("")
        lines.append("| Scenario | Total | Victory | Defeat | Timeout | Other | Win rate |")
        lines.append("| --- | ---: | ---: | ---: | ---: | ---: | ---: |")
        for scenario, counter in sorted(outcomes.items()):
            total_scenario = sum(counter.values())
            victory = counter.get("victory", 0)
            defeat = counter.get("defeat", 0)
            timeout = counter.get("timeout", 0)
            other = total_scenario - victory - defeat - timeout
            wr = 100 * victory / total_scenario if total_scenario else 0.0
            lines.append(
                f"| `{scenario}` | {total_scenario} | {victory} | {defeat} | {timeout} | {other} | {wr:.1f}% |"
            )
        lines.append("")

    if agg.unknown_types:
        lines.append("## Unknown event types (schema drift warning)")
        lines.append("")
        lines.append("Types non in KNOWN_EVENT_TYPES. Schema drift o telemetry extension:")
        lines.append("")
        for t, n in agg.unknown_types.most_common():
            lines.append(f"- `{t}` — {n} occorrenze")
        lines.append("")

    lines.append("## Sources")
    lines.append("")
    lines.append("- Raw events: `logs/telemetry_*.jsonl` (POST /api/session/telemetry)")
    lines.append("- Pipeline: `tools/py/telemetry_analyze.py`")
    lines.append("- Agent: `.claude/agents/telemetry-viz-illuminator.md`")
    lines.append("")
    return "\n".join(lines)


def format_json(agg: Aggregates) -> dict:
    """Produce JSON summary of Aggregates for machine consumption."""
    return {
        "total_events": agg.total_events,
        "sessions": agg.session_count(),
        "malformed_lines": agg.malformed_lines,
        "type_counts": dict(agg.type_counts),
        "funnel": agg.funnel_counts(),
        "tutorial_funnel": agg.tutorial_funnel(),
        "durations_min": agg.session_durations_minutes(),
        "scenario_outcomes": {k: dict(v) for k, v in agg.scenario_outcomes().items()},
        "unknown_types": dict(agg.unknown_types),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--logs-dir", default="logs", help="Directory con telemetry_*.jsonl (default: logs)"
    )
    parser.add_argument(
        "--date", default=None, help="Filtro YYYYMMDD (default: tutti i file disponibili)"
    )
    parser.add_argument(
        "--out-md", default=None, help="Path markdown report output (default: stdout)"
    )
    parser.add_argument(
        "--out-json", default=None, help="Path JSON summary output (default: no JSON)"
    )
    args = parser.parse_args(argv)

    logs_dir = Path(args.logs_dir)
    events = read_events(logs_dir, date_filter=args.date)
    agg = aggregate(events)

    md = format_markdown(agg, date_range=args.date)
    if args.out_md:
        out_path = Path(args.out_md)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(md, encoding="utf-8")
        print(f"Markdown saved: {out_path}")
    else:
        print(md)

    if args.out_json:
        json_path = Path(args.out_json)
        json_path.parent.mkdir(parents=True, exist_ok=True)
        json_path.write_text(json.dumps(format_json(agg), indent=2), encoding="utf-8")
        print(f"JSON saved: {json_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
