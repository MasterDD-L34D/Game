"""Unit test for Sprint 5 §I sparkline dashboard.

Source: docs/research/2026-04-26-tier-e-extraction-matrix.md (Tufte).
"""

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = ROOT / "tools" / "py" / "sparkline_dashboard.py"

# Load module via importlib (script not on sys.path).
spec = importlib.util.spec_from_file_location("sparkline_dashboard", SCRIPT_PATH)
mod = importlib.util.module_from_spec(spec)
sys.modules["sparkline_dashboard"] = mod
spec.loader.exec_module(mod)


def test_render_sparkline_svg_returns_valid_svg():
    svg = mod.render_sparkline_svg([1, 2, 3, 4, 5])
    assert svg.startswith("<svg")
    assert svg.endswith("</svg>")
    assert "polyline" in svg


def test_render_sparkline_svg_handles_empty():
    svg = mod.render_sparkline_svg([])
    assert "empty" in svg
    assert svg.startswith("<svg")


def test_render_bar_sparkline_handles_empty():
    svg = mod.render_bar_sparkline([])
    assert svg.startswith("<svg")


def test_render_bar_sparkline_renders_bars():
    svg = mod.render_bar_sparkline([10, 20, 5, 30])
    assert svg.count("<rect") == 4


def test_aggregate_metrics_empty_events():
    m = mod.aggregate_metrics([])
    assert m["total_sessions"] == 0
    assert m["win_rate_pct"] == 0.0
    assert m["skip_rate_pct"] == 0.0
    assert isinstance(m["funnel"], dict)


def test_aggregate_metrics_session_complete():
    events = [
        {"type": "session_start", "ts": "2026-04-27T10:00:00Z"},
        {"type": "kill", "ts": "2026-04-27T10:01:00Z"},
        {"type": "kill", "ts": "2026-04-27T10:02:00Z"},
        {
            "type": "session_complete",
            "ts": "2026-04-27T10:03:00Z",
            "payload": {"outcome": "victory", "duration_s": 180},
        },
    ]
    m = mod.aggregate_metrics(events)
    assert m["total_sessions"] == 1
    assert m["win_rate_pct"] == 100.0
    assert m["kills_series"] == [2]
    assert m["duration_series"] == [180]


def test_aggregate_metrics_max_sessions_window():
    events = []
    for i in range(150):
        events.append({"type": "session_start", "ts": f"2026-04-27T10:{i:02d}:00Z"})
        events.append(
            {
                "type": "session_complete",
                "ts": f"2026-04-27T10:{i:02d}:30Z",
                "payload": {"outcome": "victory" if i % 2 == 0 else "defeat", "duration_s": 60},
            }
        )
    m = mod.aggregate_metrics(events, max_sessions=50)
    assert m["total_sessions"] == 50


def test_render_html_produces_valid_dashboard():
    metrics = mod.aggregate_metrics([])
    html = mod.render_html(metrics, "2026-04-27T12:00:00Z")
    assert "<!DOCTYPE html>" in html
    assert "Sparkline Dashboard" in html
    assert "Win Rate" in html
    assert "Tutorial Funnel" in html
