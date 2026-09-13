#!/usr/bin/env python3
"""Tufte sparkline HTML dashboard — Sprint 5 §I (Tier E #14 telemetry-viz).

Source: docs/research/2026-04-26-tier-e-extraction-matrix.md (Tufte sparklines).
Pattern: piccoli grafici inline (text-density data visualization). Genera
single-page HTML con N sparkline (1 per metrica) + small multiples grid.

Genera dashboard read-only da telemetry JSONL files con encoding UTF-8 esplicito.
NO server: file:// statico apribile in browser.

Usage:
    python tools/py/sparkline_dashboard.py [--logs-dir DIR] [--out FILE]

Options:
    --logs-dir DIR       (default: logs/)
    --out FILE           (default: out/sparkline_dashboard.html)
    --max-sessions N     limit aggregate window (default 100)

Metriche supportate (auto-detected da event types):
    - session_complete  → win rate over time (line)
    - session_complete  → duration per session (bar)
    - kill              → kills per session (bar)
    - reward_offer/skip → skip rate over time (line)
    - tutorial_*        → funnel completion (bar)

Output: HTML file con 5+ sparkline embeds, accessibile in browser.
"""

import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_LOGS_DIR = ROOT / "logs"
DEFAULT_OUT = ROOT / "out" / "sparkline_dashboard.html"


def load_events(logs_dir: Path) -> list:
    """Read telemetry JSONL files, return list of events sorted by ts."""
    events = []
    for fpath in sorted(logs_dir.glob("telemetry_*.jsonl")):
        try:
            with fpath.open(encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        ev = json.loads(line)
                        events.append(ev)
                    except json.JSONDecodeError:
                        continue
        except OSError:
            continue
    # Sort by ts (string ISO) — None pushed to end.
    events.sort(key=lambda e: e.get("ts") or "")
    return events


def aggregate_metrics(events: list, max_sessions: int = 100) -> dict:
    """Compute time-series metrics for sparkline embedding."""
    sessions = []
    cur_session = None
    for ev in events:
        et = ev.get("type")
        if et == "session_start":
            cur_session = {"start_ts": ev.get("ts"), "kills": 0, "outcome": None, "duration_s": None}
        elif et == "kill" and cur_session:
            cur_session["kills"] += 1
        elif et == "session_complete":
            if cur_session is None:
                cur_session = {"start_ts": ev.get("ts"), "kills": 0}
            payload = ev.get("payload") or {}
            cur_session["outcome"] = payload.get("outcome")
            cur_session["duration_s"] = payload.get("duration_s")
            cur_session["end_ts"] = ev.get("ts")
            sessions.append(cur_session)
            cur_session = None
    sessions = sessions[-max_sessions:]

    win_series = [1 if s.get("outcome") == "victory" else 0 for s in sessions]
    duration_series = [int(s.get("duration_s") or 0) for s in sessions]
    kills_series = [int(s.get("kills") or 0) for s in sessions]

    # Reward skip rate windowed
    reward_offers = sum(1 for e in events if e.get("type") == "reward_offer")
    reward_skips = sum(1 for e in events if e.get("type") == "reward_skip")
    skip_rate_pct = round(100.0 * reward_skips / max(1, reward_offers), 1)

    # Tutorial funnel counts
    funnel_keys = [
        "tutorial_start",
        "tutorial_t02_complete",
        "tutorial_t03_complete",
        "tutorial_t04_complete",
        "tutorial_t05_complete",
    ]
    funnel = {k: sum(1 for e in events if e.get("type") == k) for k in funnel_keys}

    return {
        "total_sessions": len(sessions),
        "win_series": win_series,
        "duration_series": duration_series,
        "kills_series": kills_series,
        "reward_offers": reward_offers,
        "reward_skips": reward_skips,
        "skip_rate_pct": skip_rate_pct,
        "funnel": funnel,
        "win_rate_pct": round(100.0 * sum(win_series) / max(1, len(win_series)), 1),
        "avg_duration_s": (sum(duration_series) / max(1, len(duration_series))) if duration_series else 0,
        "avg_kills_per_session": (sum(kills_series) / max(1, len(kills_series))) if kills_series else 0,
    }


def render_sparkline_svg(values: list, width: int = 200, height: int = 32, color: str = "#7e57c2") -> str:
    """Render inline SVG sparkline (Tufte style: minimal axes, dense data)."""
    if not values:
        return f'<svg width="{width}" height="{height}" aria-label="empty"></svg>'
    n = len(values)
    vmin = min(values)
    vmax = max(values)
    span = (vmax - vmin) if vmax != vmin else 1
    # Build polyline points
    points = []
    for i, v in enumerate(values):
        x = round(i * (width - 4) / max(1, n - 1)) + 2
        y = round(height - 2 - (v - vmin) * (height - 4) / span)
        points.append(f"{x},{y}")
    poly = " ".join(points)
    last_x, last_y = points[-1].split(",")
    return (
        f'<svg width="{width}" height="{height}" role="img" aria-label="sparkline">'
        f'<polyline fill="none" stroke="{color}" stroke-width="1.5" points="{poly}"/>'
        f'<circle cx="{last_x}" cy="{last_y}" r="2.5" fill="{color}"/>'
        f"</svg>"
    )


def render_bar_sparkline(values: list, width: int = 200, height: int = 32, color: str = "#26a69a") -> str:
    """Render inline SVG bar sparkline."""
    if not values:
        return f'<svg width="{width}" height="{height}" aria-label="empty"></svg>'
    n = len(values)
    vmax = max(values) if values else 1
    if vmax == 0:
        vmax = 1
    bw = max(1, (width - 2) / n)
    bars = []
    for i, v in enumerate(values):
        bh = round(v * (height - 2) / vmax)
        x = round(i * bw) + 1
        y = height - 1 - bh
        bars.append(f'<rect x="{x}" y="{y}" width="{max(1, round(bw - 0.5))}" height="{bh}" fill="{color}"/>')
    return (
        f'<svg width="{width}" height="{height}" role="img" aria-label="bar-sparkline">'
        + "".join(bars)
        + "</svg>"
    )


def render_html(metrics: dict, generated_at: str) -> str:
    """Build complete HTML dashboard (single-file, no external deps)."""
    win_spark = render_sparkline_svg(metrics["win_series"], color="#66bb6a")
    duration_spark = render_bar_sparkline(metrics["duration_series"], color="#7e57c2")
    kills_spark = render_bar_sparkline(metrics["kills_series"], color="#ff9800")
    funnel = metrics["funnel"]
    funnel_rows = "".join(
        f"<tr><td><code>{k}</code></td><td class='num'>{v}</td></tr>"
        for k, v in funnel.items()
    )
    return f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<title>Evo-Tactics — Sparkline Dashboard</title>
<style>
  body {{ font-family: 'Inter', system-ui, sans-serif; background: #0b0d12; color: #e8eaf0; margin: 0; padding: 20px 28px; }}
  h1 {{ font-size: 1.4rem; margin: 0 0 6px; color: #d4b8e8; }}
  .meta {{ color: #8891a3; font-size: 0.78rem; margin-bottom: 18px; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }}
  .card {{ background: #1a1f2e; border: 1px solid #2a3040; border-radius: 8px; padding: 14px 16px; }}
  .card .title {{ font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1.5px; color: #8891a3; margin-bottom: 4px; }}
  .card .value {{ font-size: 1.6rem; font-weight: 700; color: #ffffff; }}
  .card .spark {{ margin-top: 6px; }}
  .card .delta {{ font-size: 0.78rem; color: #66bb6a; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 0.85rem; }}
  td {{ padding: 4px 6px; border-bottom: 1px solid #2a3040; }}
  td.num {{ text-align: right; font-variant-numeric: tabular-nums; color: #d4b8e8; }}
  code {{ font-size: 0.76rem; color: #a3a8b8; }}
  .footer {{ margin-top: 28px; font-size: 0.7rem; color: #555; }}
</style>
</head>
<body>
<h1>Evo-Tactics — Sparkline Dashboard</h1>
<div class="meta">Tufte-style telemetry · {metrics['total_sessions']} sessioni aggregate · generated {generated_at}</div>
<div class="grid">
  <div class="card">
    <div class="title">Win Rate</div>
    <div class="value">{metrics['win_rate_pct']}%</div>
    <div class="spark">{win_spark}</div>
    <div class="delta">last {len(metrics['win_series'])} sessions</div>
  </div>
  <div class="card">
    <div class="title">Avg Duration</div>
    <div class="value">{int(metrics['avg_duration_s'])}s</div>
    <div class="spark">{duration_spark}</div>
    <div class="delta">per session</div>
  </div>
  <div class="card">
    <div class="title">Avg Kills</div>
    <div class="value">{metrics['avg_kills_per_session']:.1f}</div>
    <div class="spark">{kills_spark}</div>
    <div class="delta">per session</div>
  </div>
  <div class="card">
    <div class="title">Reward Skip Rate</div>
    <div class="value">{metrics['skip_rate_pct']}%</div>
    <div class="delta">{metrics['reward_skips']} skips / {metrics['reward_offers']} offers</div>
  </div>
  <div class="card" style="grid-column: 1 / -1;">
    <div class="title">Tutorial Funnel</div>
    <table><tbody>{funnel_rows}</tbody></table>
  </div>
</div>
<div class="footer">Sprint 5 §I — Tufte sparklines (Tier E #14). Source: tools/py/sparkline_dashboard.py</div>
</body>
</html>
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--logs-dir", default=str(DEFAULT_LOGS_DIR))
    ap.add_argument("--out", default=str(DEFAULT_OUT))
    ap.add_argument("--max-sessions", type=int, default=100)
    args = ap.parse_args()

    logs_dir = Path(args.logs_dir)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    if not logs_dir.is_dir():
        print(f"WARN: logs dir not found ({logs_dir}); generating empty dashboard", file=sys.stderr)
        events = []
    else:
        events = load_events(logs_dir)

    metrics = aggregate_metrics(events, max_sessions=args.max_sessions)
    html = render_html(
        metrics,
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    )
    out_path.write_text(html, encoding="utf-8")
    rel_path = out_path.relative_to(ROOT) if out_path.is_relative_to(ROOT) else out_path
    print(f"OK -> {rel_path}")
    print(
        "  sessions: %d | win_rate: %s%% | skip_rate: %s%%"
        % (metrics["total_sessions"], metrics["win_rate_pct"], metrics["skip_rate_pct"])
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
