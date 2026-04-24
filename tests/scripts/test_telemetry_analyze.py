"""Tests for tools/py/telemetry_analyze.py — stdlib-only aggregation pipeline."""

from __future__ import annotations

import json
from pathlib import Path

import pytest


pytest.importorskip("tools.py.telemetry_analyze", reason="PYTHONPATH=tools/py required")

from tools.py.telemetry_analyze import (  # noqa: E402
    FUNNEL_STAGES,
    KNOWN_EVENT_TYPES,
    Aggregates,
    TelemetryEvent,
    aggregate,
    format_json,
    format_markdown,
    read_events,
)


def _write_jsonl(path: Path, events: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [json.dumps(ev) for ev in events]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


@pytest.fixture
def tmp_logs(tmp_path: Path) -> Path:
    """Create a tmp logs dir with 2 telemetry files."""
    logs = tmp_path / "logs"
    logs.mkdir()
    _write_jsonl(
        logs / "telemetry_20260426.jsonl",
        [
            {
                "ts": "2026-04-26T10:00:00Z",
                "session_id": "s1",
                "player_id": "p1",
                "type": "session_start",
                "payload": {"scenario_id": "enc_tutorial_01"},
            },
            {
                "ts": "2026-04-26T10:05:00Z",
                "session_id": "s1",
                "player_id": "p1",
                "type": "ability_use",
                "payload": {"ability": "dash_strike"},
            },
            {
                "ts": "2026-04-26T10:05:10Z",
                "session_id": "s1",
                "player_id": "p1",
                "type": "damage_dealt",
                "payload": {"damage": 3},
            },
            {
                "ts": "2026-04-26T10:30:00Z",
                "session_id": "s1",
                "player_id": "p1",
                "type": "session_end",
                "payload": {"scenario_id": "enc_tutorial_01", "outcome": "victory"},
            },
            {
                "ts": "2026-04-26T11:00:00Z",
                "session_id": "s2",
                "player_id": "p2",
                "type": "session_start",
                "payload": {"scenario_id": "enc_tutorial_01"},
            },
            {
                "ts": "2026-04-26T11:15:00Z",
                "session_id": "s2",
                "player_id": "p2",
                "type": "session_end",
                "payload": {"scenario_id": "enc_tutorial_01", "outcome": "defeat"},
            },
        ],
    )
    return logs


def test_telemetry_event_from_json_ok():
    line = '{"ts":"2026-04-26T10:00:00Z","session_id":"s1","type":"ability_use","payload":{}}'
    ev = TelemetryEvent.from_json(line)
    assert ev is not None
    assert ev.type == "ability_use"
    assert ev.session_id == "s1"


def test_telemetry_event_from_json_malformed():
    assert TelemetryEvent.from_json("not a json") is None
    assert TelemetryEvent.from_json('"just a string"') is None
    assert TelemetryEvent.from_json("[1,2,3]") is None


def test_aggregate_basic_counts(tmp_logs: Path):
    agg = aggregate(read_events(tmp_logs))
    assert agg.total_events == 6
    assert agg.session_count() == 2
    assert agg.malformed_lines == 0
    assert agg.type_counts["session_start"] == 2
    assert agg.type_counts["session_end"] == 2


def test_aggregate_malformed_lines_counted(tmp_path: Path):
    logs = tmp_path / "logs"
    logs.mkdir()
    good = '{"ts":"2026-04-26T10:00:00Z","session_id":"s1","type":"session_start"}'
    bad1 = "not a json line"
    bad2 = '{"broken": true'
    (logs / "telemetry_20260426.jsonl").write_text(
        "\n".join([good, bad1, bad2, good]) + "\n", encoding="utf-8"
    )
    agg = aggregate(read_events(logs))
    assert agg.total_events == 2
    assert agg.malformed_lines == 2


def test_funnel_counts(tmp_logs: Path):
    agg = aggregate(read_events(tmp_logs))
    funnel = agg.funnel_counts()
    assert funnel["session_start"] == 2
    assert funnel["ability_use"] == 1
    assert funnel["damage_dealt"] == 1
    assert funnel["session_end"] == 2


def test_scenario_outcomes(tmp_logs: Path):
    agg = aggregate(read_events(tmp_logs))
    outcomes = agg.scenario_outcomes()
    assert "enc_tutorial_01" in outcomes
    assert outcomes["enc_tutorial_01"]["victory"] == 1
    assert outcomes["enc_tutorial_01"]["defeat"] == 1


def test_session_durations(tmp_logs: Path):
    agg = aggregate(read_events(tmp_logs))
    durations = agg.session_durations_minutes()
    assert len(durations) == 2
    assert durations[0] == 30.0
    assert durations[1] == 15.0


def test_read_events_empty_dir(tmp_path: Path):
    agg = aggregate(read_events(tmp_path))
    assert agg.total_events == 0
    assert agg.session_count() == 0


def test_read_events_missing_dir(tmp_path: Path):
    agg = aggregate(read_events(tmp_path / "does-not-exist"))
    assert agg.total_events == 0


def test_unknown_event_types(tmp_path: Path):
    logs = tmp_path / "logs"
    logs.mkdir()
    _write_jsonl(
        logs / "telemetry_20260426.jsonl",
        [
            {"ts": "2026-04-26T10:00:00Z", "session_id": "s1", "type": "mystery_event"},
            {"ts": "2026-04-26T10:00:01Z", "session_id": "s1", "type": "session_start"},
        ],
    )
    agg = aggregate(read_events(logs))
    assert "mystery_event" in agg.unknown_types
    assert "session_start" not in agg.unknown_types


def test_date_filter(tmp_path: Path):
    logs = tmp_path / "logs"
    logs.mkdir()
    _write_jsonl(
        logs / "telemetry_20260425.jsonl",
        [{"ts": "2026-04-25T10:00:00Z", "session_id": "s-old", "type": "session_start"}],
    )
    _write_jsonl(
        logs / "telemetry_20260426.jsonl",
        [{"ts": "2026-04-26T10:00:00Z", "session_id": "s-new", "type": "session_start"}],
    )
    agg = aggregate(read_events(logs, date_filter="20260426"))
    assert agg.total_events == 1
    assert "s-new" in agg.sessions


def test_format_markdown_smoke(tmp_logs: Path):
    agg = aggregate(read_events(tmp_logs))
    md = format_markdown(agg, date_range="20260426")
    assert md.startswith("---\n")
    assert "# Telemetry Analysis" in md
    assert "Event type distribution" in md
    assert "Funnel" in md
    assert "Scenario outcomes" in md


def test_format_json_smoke(tmp_logs: Path):
    agg = aggregate(read_events(tmp_logs))
    data = format_json(agg)
    assert data["total_events"] == 6
    assert data["sessions"] == 2
    assert "session_start" in data["type_counts"]
    assert data["funnel"]["session_start"] == 2
    assert "enc_tutorial_01" in data["scenario_outcomes"]


def test_funnel_stages_ordered():
    """Contract: funnel stages in semantically sensible order."""
    assert FUNNEL_STAGES[0] == "session_start"
    assert FUNNEL_STAGES[-1] == "session_end"


def test_known_event_types_nonempty():
    """Guard: schema never drops to empty (breakage sentinel)."""
    assert "session_start" in KNOWN_EVENT_TYPES
    assert "session_end" in KNOWN_EVENT_TYPES
    assert len(KNOWN_EVENT_TYPES) >= 10
