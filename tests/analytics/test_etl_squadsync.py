from __future__ import annotations

import csv
import json
from datetime import date
from pathlib import Path
import sys
from typing import Iterable

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

SCRIPTS_DIR = PROJECT_ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from scripts.analytics import etl_squadsync  # noqa: E402


MOCK_ROWS = [
    {
        "date": "2023-10-24",
        "squad": "Atlas",
        "active_members": 8,
        "standups": 2,
        "deployments": 1,
        "incidents": 0,
    },
    {
        "date": "2023-10-25",
        "squad": "Atlas",
        "active_members": 7,
        "standups": 1,
        "deployments": 0,
        "incidents": 1,
    },
    {
        "date": "2023-10-31",
        "squad": "Atlas",
        "active_members": 9,
        "standups": 2,
        "deployments": 2,
        "incidents": 0,
    },
    {
        "date": "2023-11-05",
        "squad": "Atlas",
        "active_members": 8,
        "standups": 2,
        "deployments": 3,
        "incidents": 1,
    },
    {
        "date": "2023-10-24",
        "squad": "Helios",
        "active_members": 6,
        "standups": 1,
        "deployments": 0,
        "incidents": 2,
    },
    {
        "date": "2023-10-27",
        "squad": "Helios",
        "active_members": 7,
        "standups": 1,
        "deployments": 1,
        "incidents": 1,
    },
    {
        "date": "2023-10-30",
        "squad": "Helios",
        "active_members": 5,
        "standups": 1,
        "deployments": 1,
        "incidents": 0,
    },
    {
        "date": "2023-11-05",
        "squad": "Helios",
        "active_members": 6,
        "standups": 1,
        "deployments": 2,
        "incidents": 1,
    },
]


@pytest.fixture()
def mock_csv(tmp_path: Path) -> Path:
    csv_path = tmp_path / "squadsync.csv"
    headers = ["date", "squad", "active_members", "standups", "deployments", "incidents"]
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers)
        writer.writeheader()
        writer.writerows(MOCK_ROWS)
    return csv_path


def test_load_records_from_csv(mock_csv: Path) -> None:
    records = etl_squadsync.load_records(mock_csv)
    assert len(records) == len(MOCK_ROWS)
    first = records[0]
    assert first.squad == "Atlas"
    assert first.deployments == 1
    assert first.date.isoformat() == "2023-10-24"


def build_report(records: Iterable[etl_squadsync.SquadSyncRecord]):
    return etl_squadsync.build_squadsync_report(records)


def test_build_report_summary(mock_csv: Path) -> None:
    records = etl_squadsync.load_records(mock_csv)
    report = build_report(records)

    assert report["range"] == {"start": "2023-10-24", "end": "2023-11-05", "days": 13}
    assert report["totals"]["deployments"] == 10
    assert report["totals"]["incidents"] == 6
    assert report["totals"]["averageActiveMembers"] == 7.0
    assert report["totals"]["averageEngagement"] == 0.614

    atlas = next(s for s in report["squads"] if s["name"] == "Atlas")
    assert atlas["summary"] == {
        "daysCovered": 4,
        "averageActiveMembers": 8.0,
        "totalDeployments": 6,
        "totalStandups": 7,
        "totalIncidents": 2,
        "engagementScore": 0.744,
    }
    assert atlas["daily"][0] == {
        "date": "2023-10-24",
        "activeMembers": 8,
        "standups": 2,
        "deployments": 1,
        "incidents": 0,
        "engagement": 0.744,
    }

    helios = next(s for s in report["squads"] if s["name"] == "Helios")
    assert helios["summary"]["engagementScore"] == 0.483
    assert helios["daily"][-1]["engagement"] == 0.583


def test_report_range_filter(mock_csv: Path) -> None:
    records = etl_squadsync.load_records(mock_csv)
    report = etl_squadsync.build_squadsync_report(
        records,
        start=date(2023, 10, 30),
        end=date(2023, 11, 2),
    )

    assert report["range"] == {"start": "2023-10-30", "end": "2023-11-02", "days": 4}
    assert report["totals"]["deployments"] == 3
    assert report["totals"]["averageEngagement"] == 0.764

    atlas = next(s for s in report["squads"] if s["name"] == "Atlas")
    assert atlas["summary"] == {
        "daysCovered": 1,
        "averageActiveMembers": 9.0,
        "totalDeployments": 2,
        "totalStandups": 2,
        "totalIncidents": 0,
        "engagementScore": 1.0,
    }

    helios = next(s for s in report["squads"] if s["name"] == "Helios")
    assert helios["summary"]["averageActiveMembers"] == 5.0
    assert helios["summary"]["engagementScore"] == 0.528


def test_write_report(tmp_path: Path, mock_csv: Path) -> None:
    records = etl_squadsync.load_records(mock_csv)
    report = build_report(records)

    output = tmp_path / "report.json"
    etl_squadsync.write_report(report, output)

    assert output.exists()
    saved = json.loads(output.read_text(encoding="utf-8"))
    assert saved["totals"]["deployments"] == 10
