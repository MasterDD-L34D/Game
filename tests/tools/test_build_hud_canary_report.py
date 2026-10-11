"""Tests for tools/feedback/build_hud_canary_report.py.

The report builder must reuse the aggregation logic and thresholds from
scripts/qa/hud_smart_alerts.py (no duplicated threshold literals) and render
a static HTML report with honest empty-states for missing sources.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = ROOT / "tools" / "feedback" / "build_hud_canary_report.py"
ALERTS_PATH = ROOT / "scripts" / "qa" / "hud_smart_alerts.py"

# Load module via importlib (script not on sys.path).
spec = importlib.util.spec_from_file_location("build_hud_canary_report", SCRIPT_PATH)
mod = importlib.util.module_from_spec(spec)
sys.modules["build_hud_canary_report"] = mod
spec.loader.exec_module(mod)


def _write_log(root: Path, session: str, entries: list) -> Path:
    log_dir = root / session
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / "hud_alert_log.json"
    log_path.write_text(json.dumps(entries), encoding="utf-8")
    return log_path


def _raised(alert_id: str, ts: str) -> dict:
    return {
        "alertId": alert_id,
        "status": "raised",
        "missionId": "M-01",
        "timestamp": ts,
        "ackCount": 0,
        "ackRecipients": [],
    }


def _acked(alert_id: str, ts: str) -> dict:
    return {
        "alertId": alert_id,
        "status": "acknowledged",
        "missionId": "M-01",
        "timestamp": ts,
        "ackRecipient": "HUD",
        "ackRecipients": ["HUD"],
        "ackCount": 1,
    }


def _filtered(alert_id: str, ts: str) -> dict:
    return {
        "alertId": alert_id,
        "status": "filtered",
        "missionId": "M-01",
        "timestamp": ts,
        "filterName": "stabilityBuffer",
        "filterCount": 1,
    }


def _build_corpus(root: Path) -> None:
    _write_log(
        root,
        "2025-01-01",
        [
            _raised("a1", "2025-01-01T10:00:00Z"),
            _acked("a1", "2025-01-01T10:01:00Z"),
            _raised("a2", "2025-01-01T10:02:00Z"),
            _acked("a2", "2025-01-01T10:03:00Z"),
        ],
    )
    _write_log(
        root,
        "2025-01-02",
        [
            _raised("b1", "2025-01-02T09:00:00Z"),
            _acked("b1", "2025-01-02T09:01:00Z"),
            _raised("b2", "2025-01-02T09:02:00Z"),
            _filtered("b3", "2025-01-02T09:03:00Z"),
        ],
    )


def test_thresholds_reused_from_hud_smart_alerts():
    """Thresholds must come from the canonical QA module, not local literals."""
    alerts_spec = importlib.util.spec_from_file_location("_hsa_ref", ALERTS_PATH)
    alerts_mod = importlib.util.module_from_spec(alerts_spec)
    sys.modules["_hsa_ref"] = alerts_mod
    alerts_spec.loader.exec_module(alerts_mod)
    assert mod.hud_smart_alerts.ACK_RATE_THRESHOLD == alerts_mod.ACK_RATE_THRESHOLD
    assert mod.hud_smart_alerts.MAX_FILTER_RATIO == alerts_mod.MAX_FILTER_RATIO


def test_aggregate_overall(tmp_path):
    _build_corpus(tmp_path)
    metrics_list = mod.analyse_all(tmp_path)
    assert len(metrics_list) == 2
    overall = mod.aggregate_overall(metrics_list)
    assert overall.total_raised == 4
    assert overall.total_acknowledged == 3
    assert overall.ack_rate == 0.75
    assert overall.filter_events == 1
    assert overall.filter_ratio == 0.25
    assert overall.sessions == 2
    assert overall.sessions_failing == 1  # session 2 ack_rate 0.5 < threshold


def test_aggregate_overall_empty():
    overall = mod.aggregate_overall([])
    assert overall.sessions == 0
    assert overall.ack_rate is None
    assert overall.filter_ratio is None


def test_collect_recent_alerts_sorted_and_limited(tmp_path):
    _build_corpus(tmp_path)
    rows = mod.collect_recent_alerts(tmp_path, limit=3)
    assert len(rows) == 3
    timestamps = [row["timestamp"] for row in rows]
    assert timestamps == sorted(timestamps, reverse=True)
    assert rows[0]["session"] == "2025-01-02"
    assert rows[0]["status"] == "filtered"


def test_render_html_kpis_and_empty_sources(tmp_path):
    _build_corpus(tmp_path)
    metrics_list = mod.analyse_all(tmp_path)
    overall = mod.aggregate_overall(metrics_list)
    recent = mod.collect_recent_alerts(tmp_path, limit=10)
    html_out = mod.render_html(
        overall=overall,
        metrics_list=metrics_list,
        recent_alerts=recent,
        adaptive_spikes=None,
        followups=None,
        config=mod.load_dashboard_config(mod.DEFAULT_DASHBOARD_CONFIG),
        root=tmp_path,
    )
    assert html_out.startswith("<!DOCTYPE html>")
    assert "75.0%" in html_out  # overall ack rate
    assert "25.0%" in html_out  # overall filter ratio
    assert "80%" in html_out  # ack threshold from config
    assert "25%" in html_out  # filter threshold from config
    # Honest empty-states for sources missing on this machine.
    assert "canary.json" in html_out
    assert "intake.jsonl" in html_out
    # Trend chart rendered inline (one bar per session, no CDN).
    assert html_out.count("<rect class=\"bar\"") == 2
    assert "cdn" not in html_out.lower()


def test_render_html_empty_corpus(tmp_path):
    overall = mod.aggregate_overall([])
    html_out = mod.render_html(
        overall=overall,
        metrics_list=[],
        recent_alerts=[],
        adaptive_spikes=None,
        followups=None,
        config={},
        root=tmp_path,
    )
    assert "No hud_alert_log.json" in html_out
    assert "n/a" in html_out


def test_main_writes_report(tmp_path):
    _build_corpus(tmp_path / "playtests")
    output = tmp_path / "out" / "hud_canary_report.html"
    rc = mod.main(
        [
            "--root",
            str(tmp_path / "playtests"),
            "--output",
            str(output),
        ]
    )
    assert rc == 0
    content = output.read_text(encoding="utf-8")
    assert "75.0%" in content


def test_main_empty_root_is_honest_not_fatal(tmp_path):
    root = tmp_path / "playtests"
    root.mkdir()
    output = tmp_path / "out" / "hud_canary_report.html"
    rc = mod.main(["--root", str(root), "--output", str(output)])
    assert rc == 0
    content = output.read_text(encoding="utf-8")
    assert "No hud_alert_log.json" in content
