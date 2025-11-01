from __future__ import annotations

import csv
import json
from datetime import date
from pathlib import Path
import sys
from typing import Iterable, List, Mapping

import yaml

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

SCRIPTS_DIR = PROJECT_ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from scripts.analytics import etl_squadsync  # noqa: E402


LOG_ROOT = PROJECT_ROOT / "logs" / "playtests"
LOG_GLOB = "2025-11-*/session-metrics.yaml"


def _derive_rows_from_summary(date_str: str, squad: str, payload: Mapping[str, Mapping[str, float]]):
    risk = payload.get("risk", {})
    cohesion = payload.get("cohesion", {})
    score = float(cohesion.get("score", 0.0))
    variance = float(cohesion.get("variance", 0.0))
    weighted_index = float(risk.get("weighted_index", 0.0))
    low_hp_ratio = float(risk.get("time_low_hp_turns", 0.0))

    return {
        "date": date_str,
        "squad": squad.capitalize(),
        "active_members": int(round(score * 10)),
        "standups": int(round((1.0 - variance) * 10)),
        "deployments": int(round((1.0 - weighted_index) * 10)),
        "incidents": int(round(low_hp_ratio * 10)),
    }


def _derive_rows_from_session(date_str: str, session: Mapping[str, object]):
    squad = str(session.get("id", "")).strip().capitalize() or "Unknown"
    metrics: Mapping[str, Mapping[str, object]] = session.get("metrics", {})  # type: ignore[assignment]
    roster = session.get("roster", []) or []

    cohesion = metrics.get("cohesion", {}) if isinstance(metrics, Mapping) else {}
    setup = metrics.get("setup", {}) if isinstance(metrics, Mapping) else {}
    explore = metrics.get("explore", {}) if isinstance(metrics, Mapping) else {}
    risk = metrics.get("risk", {}) if isinstance(metrics, Mapping) else {}
    hud_alerts = metrics.get("hud_alerts", []) if isinstance(metrics, Mapping) else []

    optional_objectives = int(explore.get("optional_objectives_cleared", 0)) if isinstance(explore, Mapping) else 0
    overwatch_turns = int(setup.get("overwatch_turns", 0)) if isinstance(setup, Mapping) else 0
    trap_value = int(setup.get("trap_value", 0)) if isinstance(setup, Mapping) else 0
    support_actions = int(cohesion.get("support_actions", 0)) if isinstance(cohesion, Mapping) else 0
    one_vs_many = int(risk.get("one_vs_many_engagements", 0)) if isinstance(risk, Mapping) else 0
    hud_events = len(hud_alerts) if isinstance(hud_alerts, list) else 0

    deployments = optional_objectives + max(trap_value, overwatch_turns // 2)
    incidents = one_vs_many + hud_events

    return {
        "date": date_str,
        "squad": squad,
        "active_members": len(roster),
        "standups": support_actions,
        "deployments": deployments,
        "incidents": incidents,
    }


def _load_rows_from_logs() -> List[Mapping[str, int | str]]:
    rows: List[Mapping[str, int | str]] = []
    for path in sorted(LOG_ROOT.glob(LOG_GLOB)):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        date_str = path.parent.name.split("-vc", 1)[0]
        if not isinstance(data, Mapping):
            continue
        if "sessions" in data and isinstance(data["sessions"], list):
            for session in data["sessions"]:
                if isinstance(session, Mapping):
                    rows.append(_derive_rows_from_session(date_str, session))
        elif "squads" in data and isinstance(data["squads"], Mapping):
            for squad, payload in data["squads"].items():
                if isinstance(payload, Mapping):
                    rows.append(_derive_rows_from_summary(date_str, str(squad), payload))
    return rows


LOG_ROWS = _load_rows_from_logs()


@pytest.fixture()
def mock_csv(tmp_path: Path) -> Path:
    csv_path = tmp_path / "squadsync.csv"
    headers = ["date", "squad", "active_members", "standups", "deployments", "incidents"]
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers)
        writer.writeheader()
        writer.writerows(LOG_ROWS)
    return csv_path


def test_load_records_from_csv(mock_csv: Path) -> None:
    records = etl_squadsync.load_records(mock_csv)
    assert len(records) == len(LOG_ROWS)
    first = records[0]
    assert first.squad == "Delta"
    assert first.deployments == 4
    assert first.date.isoformat() == "2025-11-01"


def build_report(records: Iterable[etl_squadsync.SquadSyncRecord]):
    return etl_squadsync.build_squadsync_report(records)


def test_build_report_summary(mock_csv: Path) -> None:
    records = etl_squadsync.load_records(mock_csv)
    report = build_report(records)

    assert report["range"] == {"start": "2025-11-01", "end": "2025-11-05", "days": 5}
    assert report["totals"]["deployments"] == 32
    assert report["totals"]["incidents"] == 16
    assert report["totals"]["averageActiveMembers"] == 6.0
    assert report["totals"]["averageEngagement"] == 0.645

    bravo = next(s for s in report["squads"] if s["name"] == "Bravo")
    assert bravo["summary"] == {
        "daysCovered": 1,
        "averageActiveMembers": 8.0,
        "totalDeployments": 5,
        "totalStandups": 10,
        "totalIncidents": 2,
        "engagementScore": 0.728,
    }
    assert bravo["daily"][0] == {
        "date": "2025-11-01",
        "activeMembers": 8,
        "standups": 10,
        "deployments": 5,
        "incidents": 2,
        "engagement": 0.728,
    }

    delta = next(s for s in report["squads"] if s["name"] == "Delta")
    assert delta["summary"]["engagementScore"] == 0.611
    assert delta["daily"][-1]["engagement"] == 0.535

    adaptive = report["adaptive"]
    assert adaptive["summary"]["total"] >= 3
    priorities = {entry["priority"] for entry in adaptive["responses"]}
    assert "CRITICAL" in priorities
    assert "WARNING" in priorities
    assert "INFO" in priorities
    first_response = adaptive["responses"][0]
    assert first_response["squad"] in {"Bravo", "Delta", "Echo"}
    assert first_response["range"]["start"] == report["range"]["start"]


def test_report_range_filter(mock_csv: Path) -> None:
    records = etl_squadsync.load_records(mock_csv)
    report = etl_squadsync.build_squadsync_report(
        records,
        start=date(2025, 11, 5),
        end=date(2025, 11, 5),
    )

    assert report["range"] == {"start": "2025-11-05", "end": "2025-11-05", "days": 1}
    assert report["totals"]["deployments"] == 19
    assert report["totals"]["averageEngagement"] == 0.874

    delta = next(s for s in report["squads"] if s["name"] == "Delta")
    assert delta["summary"] == {
        "daysCovered": 1,
        "averageActiveMembers": 3.0,
        "totalDeployments": 9,
        "totalStandups": 13,
        "totalIncidents": 4,
        "engagementScore": 0.848,
    }

    echo = next(s for s in report["squads"] if s["name"] == "Echo")
    assert echo["summary"]["averageActiveMembers"] == 3.0
    assert echo["summary"]["engagementScore"] == 0.9

    adaptive = report["adaptive"]
    assert adaptive["summary"]["total"] >= 1
    assert all(entry["range"]["start"] == report["range"]["start"] for entry in adaptive["responses"])


def test_write_report(tmp_path: Path, mock_csv: Path) -> None:
    records = etl_squadsync.load_records(mock_csv)
    report = build_report(records)

    output = tmp_path / "report.json"
    etl_squadsync.write_report(report, output)

    assert output.exists()
    saved = json.loads(output.read_text(encoding="utf-8"))
    assert saved["totals"]["deployments"] == 32
    assert "adaptive" in saved
    assert isinstance(saved["adaptive"]["responses"], list)
