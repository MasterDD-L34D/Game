#!/usr/bin/env python3
"""Static HTML report for the HUD canary dashboard.

Renders the widgets described in tools/feedback/hud_canary_dashboard.yaml
into a single self-contained HTML file (default: logs/qa/hud_canary_report.html).

Data sources (same as the daily QA job config/jobs/hud_canary.yaml):
- logs/playtests/*/hud_alert_log.json  -> KPI cards + recent alerts table
- analytics/squadsync/canary.json      -> adaptive spike callout (optional)
- data/feedback/intake.jsonl           -> follow-up tracker table (optional)

Aggregation logic and thresholds are REUSED from scripts/qa/hud_smart_alerts.py
via import: no threshold literals are duplicated here. Missing sources render
an honest empty-state instead of failing.
"""

from __future__ import annotations

import argparse
import html
import importlib.util
import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Sequence

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ROOT = REPO_ROOT / "logs" / "playtests"
DEFAULT_OUTPUT = REPO_ROOT / "logs" / "qa" / "hud_canary_report.html"
DEFAULT_DASHBOARD_CONFIG = REPO_ROOT / "tools" / "feedback" / "hud_canary_dashboard.yaml"
HUD_SMART_ALERTS_PATH = REPO_ROOT / "scripts" / "qa" / "hud_smart_alerts.py"

RECENT_ALERTS_LIMIT = 20


def _load_hud_smart_alerts():
    """Import scripts/qa/hud_smart_alerts.py (not a package, load by path)."""
    spec = importlib.util.spec_from_file_location("hud_smart_alerts", HUD_SMART_ALERTS_PATH)
    if spec is None or spec.loader is None:
        raise SystemExit(f"Cannot load aggregation module: {HUD_SMART_ALERTS_PATH}")
    module = importlib.util.module_from_spec(spec)
    sys.modules.setdefault("hud_smart_alerts", module)
    spec.loader.exec_module(module)
    return module


hud_smart_alerts = _load_hud_smart_alerts()


@dataclass
class OverallKpis:
    sessions: int = 0
    sessions_failing: int = 0
    total_raised: int = 0
    total_acknowledged: int = 0
    filter_events: int = 0
    overlay_displayed: int = 0
    overlay_dismissed: int = 0
    issues: int = 0

    @property
    def ack_rate(self) -> Optional[float]:
        if self.total_raised == 0:
            return None
        return self.total_acknowledged / self.total_raised

    @property
    def filter_ratio(self) -> Optional[float]:
        if self.total_raised == 0:
            return None
        return self.filter_events / self.total_raised


def analyse_all(root: Path) -> List["hud_smart_alerts.LogMetrics"]:
    """Analyse every hud_alert_log.json under root using the QA aggregator."""
    return [hud_smart_alerts.analyse_log(path) for path in hud_smart_alerts.iter_logs(root)]


def aggregate_overall(metrics_list: Sequence["hud_smart_alerts.LogMetrics"]) -> OverallKpis:
    overall = OverallKpis(sessions=len(metrics_list))
    for metrics in metrics_list:
        overall.total_raised += metrics.total_raised
        overall.total_acknowledged += metrics.total_acknowledged_alerts
        overall.filter_events += metrics.filter_events
        overall.overlay_displayed += metrics.overlay_displayed
        overall.overlay_dismissed += metrics.overlay_dismissed
        overall.issues += len(metrics.issues)
        if metrics.issues:
            overall.sessions_failing += 1
    return overall


def collect_recent_alerts(root: Path, limit: int = RECENT_ALERTS_LIMIT) -> List[dict]:
    """Flatten alert events across sessions, newest first."""
    rows: List[dict] = []
    for path in hud_smart_alerts.iter_logs(root):
        session = path.parent.name
        for entry in hud_smart_alerts.load_log(path):
            if not isinstance(entry, dict):
                continue
            status = entry.get("status")
            if status not in ("raised", "acknowledged", "cleared", "filtered"):
                continue
            recipients = entry.get("ackRecipients")
            if isinstance(recipients, list):
                detail = ", ".join(str(r) for r in recipients if r)
            else:
                detail = str(recipients or "")
            if status == "filtered":
                detail = str(entry.get("filterName") or "")
            rows.append(
                {
                    "session": session,
                    "timestamp": str(entry.get("timestamp") or ""),
                    "alert_id": str(entry.get("alertId") or ""),
                    "status": str(status),
                    "mission": str(entry.get("missionId") or ""),
                    "detail": detail,
                }
            )
    rows.sort(key=lambda row: row["timestamp"], reverse=True)
    return rows[:limit]


def load_dashboard_config(path: Path) -> dict:
    if not path.is_file():
        return {}
    try:
        import yaml
    except ImportError:
        return {}
    with path.open(encoding="utf-8") as fp:
        data = yaml.safe_load(fp)
    return data if isinstance(data, dict) else {}


def _widget(config: dict, widget_id: str) -> dict:
    for widget in (config.get("dashboard") or {}).get("widgets") or []:
        if isinstance(widget, dict) and widget.get("id") == widget_id:
            return widget
    return {}


def load_adaptive_spikes(path: Path) -> Optional[List[dict]]:
    """analytics/squadsync/canary.json -- optional, dict or list of dicts."""
    if not path.is_file():
        return None
    try:
        with path.open(encoding="utf-8") as fp:
            data = json.load(fp)
    except (OSError, json.JSONDecodeError):
        return None
    if isinstance(data, dict):
        return [data]
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    return None


def load_followups(path: Path) -> Optional[List[dict]]:
    """data/feedback/intake.jsonl -- optional, one JSON object per line."""
    if not path.is_file():
        return None
    rows: List[dict] = []
    with path.open(encoding="utf-8") as fp:
        for line in fp:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(entry, dict):
                rows.append(entry)
    return rows


def _fmt_pct(value: Optional[float]) -> str:
    return "n/a" if value is None else f"{value:.1%}"


def _kpi_status(value: Optional[float], threshold: float, higher_is_better: bool) -> str:
    if value is None:
        return "na"
    if higher_is_better:
        return "ok" if value >= threshold else "fail"
    return "ok" if value <= threshold else "fail"


def render_ack_trend_svg(metrics_list: Sequence["hud_smart_alerts.LogMetrics"], threshold: float) -> str:
    """Inline SVG bar chart of per-session ack rate (no external assets)."""
    if not metrics_list:
        return "<svg width=\"0\" height=\"0\"></svg>"
    bar_w, gap, height, label_h = 34, 10, 120, 58
    width = len(metrics_list) * (bar_w + gap) + gap
    parts = [
        f"<svg width=\"{width}\" height=\"{height + label_h}\" "
        f"viewBox=\"0 0 {width} {height + label_h}\" xmlns=\"http://www.w3.org/2000/svg\" "
        f"role=\"img\" aria-label=\"Ack rate per session\">"
    ]
    threshold_y = height - round(threshold * height)
    for index, metrics in enumerate(metrics_list):
        rate = metrics.ack_rate
        bar_h = max(2, round(rate * height))
        x = gap + index * (bar_w + gap)
        y = height - bar_h
        color = "#2e7d32" if rate >= threshold else "#c62828"
        session = html.escape(metrics.path.parent.name)
        parts.append(
            f"<rect class=\"bar\" x=\"{x}\" y=\"{y}\" width=\"{bar_w}\" height=\"{bar_h}\" "
            f"fill=\"{color}\"><title>{session}: {rate:.1%}</title></rect>"
        )
        parts.append(
            f"<text x=\"{x + bar_w // 2}\" y=\"{height + 12}\" font-size=\"9\" fill=\"#555\" "
            f"text-anchor=\"end\" transform=\"rotate(-45 {x + bar_w // 2} {height + 12})\">{session}</text>"
        )
    parts.append(
        f"<line x1=\"0\" y1=\"{threshold_y}\" x2=\"{width}\" y2=\"{threshold_y}\" "
        f"stroke=\"#e65100\" stroke-dasharray=\"4 3\" stroke-width=\"1.5\">"
        f"<title>threshold {threshold:.0%}</title></line>"
    )
    parts.append("</svg>")
    return "".join(parts)


def _kpi_card(title: str, value: str, subtitle: str, status: str) -> str:
    return (
        f"<div class=\"card {status}\"><div class=\"card-title\">{html.escape(title)}</div>"
        f"<div class=\"card-value\">{html.escape(value)}</div>"
        f"<div class=\"card-sub\">{html.escape(subtitle)}</div></div>"
    )


def _table(headers: Sequence[str], rows: Sequence[Sequence[str]], empty_message: str) -> str:
    if not rows:
        return f"<p class=\"empty\">{html.escape(empty_message)}</p>"
    head = "".join(f"<th>{html.escape(h)}</th>" for h in headers)
    body = "".join(
        "<tr>" + "".join(f"<td>{html.escape(str(cell))}</td>" for cell in row) + "</tr>"
        for row in rows
    )
    return f"<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>"


def render_html(
    *,
    overall: OverallKpis,
    metrics_list: Sequence["hud_smart_alerts.LogMetrics"],
    recent_alerts: Sequence[dict],
    adaptive_spikes: Optional[List[dict]],
    followups: Optional[List[dict]],
    config: dict,
    root: Path,
) -> str:
    ack_threshold = float(hud_smart_alerts.ACK_RATE_THRESHOLD)
    filter_threshold = float(hud_smart_alerts.MAX_FILTER_RATIO)
    ack_widget = _widget(config, "hud_ack_rate")
    ack_critical = float((ack_widget.get("thresholds") or {}).get("critical", ack_threshold))
    dashboard_name = str((config.get("dashboard") or {}).get("name") or "hud_canary_dashboard")
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    followups_open = None
    if followups is not None:
        followups_open = sum(
            1 for entry in followups if str(entry.get("status", "")).lower() not in ("closed", "done", "resolved")
        )

    cards = [
        _kpi_card(
            "Ack rate",
            _fmt_pct(overall.ack_rate),
            f"threshold >= {ack_threshold:.0%} (critical < {ack_critical:.0%})",
            _kpi_status(overall.ack_rate, ack_threshold, higher_is_better=True),
        ),
        _kpi_card(
            "Filter ratio",
            _fmt_pct(overall.filter_ratio),
            f"threshold <= {filter_threshold:.0%} (pooled; QA gate applies per-session)",
            _kpi_status(overall.filter_ratio, filter_threshold, higher_is_better=False),
        ),
        _kpi_card(
            "Adaptive spikes",
            "n/a" if adaptive_spikes is None else str(len(adaptive_spikes)),
            "source: analytics/squadsync/canary.json",
            "na" if adaptive_spikes is None else ("ok" if not adaptive_spikes else "warn"),
        ),
        _kpi_card(
            "Follow-ups open",
            "n/a" if followups_open is None else str(followups_open),
            "source: data/feedback/intake.jsonl",
            "na" if followups_open is None else ("ok" if followups_open == 0 else "warn"),
        ),
    ]

    session_rows = [
        [
            m.path.parent.name,
            str(m.total_raised),
            _fmt_pct(m.ack_rate),
            str(m.filter_events),
            _fmt_pct(m.filter_ratio),
            f"{m.overlay_displayed}/{m.overlay_dismissed}",
            "FAIL: " + "; ".join(m.issues) if m.issues else "OK",
        ]
        for m in metrics_list
    ]

    alert_rows = [
        [row["timestamp"], row["session"], row["alert_id"], row["status"], row["mission"], row["detail"]]
        for row in recent_alerts
    ]

    if adaptive_spikes is None:
        spikes_html = (
            "<p class=\"empty\">Source not present on this machine: "
            "analytics/squadsync/canary.json (SquadSync bridge not synced).</p>"
        )
    else:
        spikes_html = _table(
            ["Squad", "Priority", "Response time (m)", "Follow-ups open"],
            [
                [
                    str(item.get("squad", "")),
                    str(item.get("priority", "")),
                    str(item.get("response_time_minutes", "")),
                    str(item.get("followups_open", "")),
                ]
                for item in adaptive_spikes
            ],
            "No adaptive spike entries.",
        )

    if followups is None:
        followups_html = (
            "<p class=\"empty\">Source not present on this machine: "
            "data/feedback/intake.jsonl (feedback intake not collected).</p>"
        )
    else:
        followups_html = _table(
            ["ID", "Summary", "Severity", "Status", "Owner"],
            [
                [
                    str(entry.get("feedback_id", "")),
                    str(entry.get("summary", "")),
                    str(entry.get("severity", "")),
                    str(entry.get("status", "")),
                    str(entry.get("owner", "")),
                ]
                for entry in followups
            ],
            "No follow-up entries.",
        )

    if metrics_list:
        corpus_note = (
            f"{overall.sessions} sessions, {overall.total_raised} alerts raised, "
            f"{overall.issues} issue(s) across {overall.sessions_failing} failing session(s)."
        )
    else:
        corpus_note = f"No hud_alert_log.json found under {root} -- empty corpus, nothing to aggregate."

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>HUD Canary Report -- {html.escape(dashboard_name)}</title>
<style>
body {{ font-family: -apple-system, "Segoe UI", Arial, sans-serif; margin: 24px; color: #222; background: #fafafa; }}
h1 {{ font-size: 22px; margin-bottom: 4px; }}
h2 {{ font-size: 16px; margin-top: 28px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }}
.meta {{ color: #666; font-size: 12px; }}
.cards {{ display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; }}
.card {{ background: #fff; border: 1px solid #ddd; border-left: 5px solid #9e9e9e; border-radius: 6px; padding: 12px 16px; min-width: 180px; }}
.card.ok {{ border-left-color: #2e7d32; }}
.card.fail {{ border-left-color: #c62828; }}
.card.warn {{ border-left-color: #e65100; }}
.card.na {{ border-left-color: #9e9e9e; }}
.card-title {{ font-size: 12px; text-transform: uppercase; color: #666; }}
.card-value {{ font-size: 26px; font-weight: 600; margin: 4px 0; }}
.card-sub {{ font-size: 11px; color: #888; }}
table {{ border-collapse: collapse; width: 100%; background: #fff; font-size: 13px; }}
th, td {{ border: 1px solid #e0e0e0; padding: 6px 10px; text-align: left; }}
th {{ background: #f0f0f0; font-weight: 600; }}
tr:nth-child(even) td {{ background: #fafafa; }}
.empty {{ color: #888; font-style: italic; background: #fff; border: 1px dashed #ccc; padding: 10px 14px; border-radius: 6px; }}
</style>
</head>
<body>
<h1>HUD Canary Report</h1>
<p class="meta">Dashboard: {html.escape(dashboard_name)} | generated: {generated} | corpus: {html.escape(str(root))}</p>
<p class="meta">{html.escape(corpus_note)}</p>
<div class="cards">
{''.join(cards)}
</div>
<h2>Ack rate per session (threshold {ack_threshold:.0%})</h2>
{render_ack_trend_svg(metrics_list, ack_threshold) if metrics_list else '<p class="empty">No sessions to chart.</p>'}
<h2>Sessions</h2>
{_table(['Session', 'Raised', 'Ack rate', 'Filtered', 'Filter ratio', 'Overlay d/d', 'Status'], session_rows, f'No hud_alert_log.json found under {root}.')}
<h2>Recent alerts (last {RECENT_ALERTS_LIMIT})</h2>
{_table(['Timestamp', 'Session', 'Alert', 'Status', 'Mission', 'Detail'], alert_rows, 'No alert events.')}
<h2>Adaptive spike -- SquadSync</h2>
{spikes_html}
<h2>Follow-up tracker</h2>
{followups_html}
</body>
</html>
"""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Render the HUD canary dashboard to static HTML.")
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT, help="Playtest logs directory")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Output HTML path")
    parser.add_argument(
        "--config", type=Path, default=DEFAULT_DASHBOARD_CONFIG, help="Dashboard yaml config"
    )
    parser.add_argument(
        "--squadsync",
        type=Path,
        default=None,
        help="Override path for analytics/squadsync/canary.json",
    )
    parser.add_argument(
        "--intake",
        type=Path,
        default=None,
        help="Override path for data/feedback/intake.jsonl",
    )
    return parser


def _source_path(config: dict, widget_id: str, override: Optional[Path], fallback: str) -> Path:
    if override is not None:
        return override
    source = _widget(config, widget_id).get("source") or fallback
    return REPO_ROOT / source


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    config = load_dashboard_config(args.config)

    metrics_list: List["hud_smart_alerts.LogMetrics"] = []
    recent_alerts: List[dict] = []
    if args.root.is_dir():
        metrics_list = analyse_all(args.root)
        recent_alerts = collect_recent_alerts(args.root)
    overall = aggregate_overall(metrics_list)

    spikes_path = _source_path(config, "adaptive_spike_delta", args.squadsync, "analytics/squadsync/canary.json")
    intake_path = _source_path(config, "followup_tracker", args.intake, "data/feedback/intake.jsonl")

    report = render_html(
        overall=overall,
        metrics_list=metrics_list,
        recent_alerts=recent_alerts,
        adaptive_spikes=load_adaptive_spikes(spikes_path),
        followups=load_followups(intake_path),
        config=config,
        root=args.root,
    )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(report, encoding="utf-8")

    ack = _fmt_pct(overall.ack_rate)
    ratio = _fmt_pct(overall.filter_ratio)
    print(
        f"HUD canary report written to {args.output} "
        f"(sessions={overall.sessions} raised={overall.total_raised} "
        f"ack_rate={ack} filter_ratio={ratio} failing={overall.sessions_failing})"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
