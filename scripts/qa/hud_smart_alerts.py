#!/usr/bin/env python3
"""HUD smart alerts validation utilities.

Analizza i log `hud_alert_log.json` generati dai playtest e produce
un report aggregato con metriche di acknowledgement e drop dovuti ai
filtri. L'uscita con codice diverso da zero indica il fallimento dei
controlli minimi definiti dal team QA.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, List, Sequence

ACK_RATE_THRESHOLD = 0.8
MAX_FILTER_RATIO = 0.25


@dataclass
class LogMetrics:
    path: Path
    total_raised: int = 0
    total_acknowledged_alerts: int = 0
    ack_events: int = 0
    filter_events: int = 0
    issues: List[str] = field(default_factory=list)

    @property
    def ack_rate(self) -> float:
        if self.total_raised == 0:
            return 1.0
        return self.total_acknowledged_alerts / self.total_raised

    @property
    def filter_ratio(self) -> float:
        if self.total_raised == 0:
            return 0.0
        return self.filter_events / self.total_raised


def load_log(path: Path) -> Sequence[dict]:
    try:
        with path.open(encoding="utf-8") as fp:
            data = json.load(fp)
    except FileNotFoundError:
        raise SystemExit(f"Log non trovato: {path}")
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Impossibile leggere {path}: {exc}")

    if not isinstance(data, list):
        raise SystemExit(f"Formato non valido per {path}: atteso array JSON")
    return data


def _to_int(value: object, *, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def _normalise_recipients(value: object) -> List[str]:
    if isinstance(value, str):
        return [value] if value else []

    if isinstance(value, list):
        return [item for item in value if isinstance(item, str) and item]

    return []


def analyse_log(path: Path) -> LogMetrics:
    entries = load_log(path)
    metrics = LogMetrics(path=path)

    ack_counts: dict[str, int] = {}

    for entry in entries:
        if not isinstance(entry, dict):
            metrics.issues.append("Voce non valida (non è un oggetto JSON)")
            continue

        status = entry.get("status")
        if status == "raised":
            metrics.total_raised += 1
        elif status == "acknowledged":
            metrics.ack_events += 1
            recipients = _normalise_recipients(entry.get("ackRecipients"))
            alert_id = entry.get("alertId")
            if alert_id:
                fallback_from_recipients = len(recipients)
                fallback_from_recipient = 1 if entry.get("ackRecipient") else 0
                ack_counts[alert_id] = max(
                    ack_counts.get(alert_id, 0),
                    _to_int(entry.get("ackCount")),
                    fallback_from_recipients,
                    fallback_from_recipient,
                )
            if not entry.get("ackRecipient") and not recipients:
                metrics.issues.append("Evento di ack senza `ackRecipient`")
        elif status == "cleared":
            alert_id = entry.get("alertId")
            if alert_id:
                recipients = _normalise_recipients(entry.get("ackRecipients"))
                fallback_from_recipients = len(recipients)
                ack_counts[alert_id] = max(
                    ack_counts.get(alert_id, 0),
                    _to_int(entry.get("ackCount")),
                    fallback_from_recipients,
                )
        elif status == "filtered":
            metrics.filter_events += 1
            if not entry.get("filterName"):
                metrics.issues.append("Evento filtrato senza `filterName`")

    metrics.total_acknowledged_alerts = sum(1 for value in ack_counts.values() if value > 0)

    if metrics.total_raised > 0 and metrics.ack_rate < ACK_RATE_THRESHOLD:
        metrics.issues.append(
            f"Ack rate {metrics.ack_rate:.2%} inferiore alla soglia {ACK_RATE_THRESHOLD:.0%}"
        )

    if metrics.total_raised >= 4 and metrics.filter_ratio > MAX_FILTER_RATIO:
        metrics.issues.append(
            f"Filter ratio {metrics.filter_ratio:.2%} superiore alla soglia {MAX_FILTER_RATIO:.0%}"
        )

    return metrics


def iter_logs(root: Path) -> Iterable[Path]:
    for path in sorted(root.glob("*/hud_alert_log.json")):
        if path.is_file():
            yield path


def format_metrics(metrics: LogMetrics) -> str:
    base = (
        f"- {metrics.path}: raised={metrics.total_raised} "
        f"ack_rate={metrics.ack_rate:.2%} filters={metrics.filter_events}"
    )
    if metrics.issues:
        issues = "; ".join(metrics.issues)
        return f"{base} → FAIL ({issues})"
    return f"{base} → OK"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Valida i log delle HUD smart alerts.")
    parser.add_argument(
        "root",
        nargs="?",
        default=Path("logs/playtests"),
        type=Path,
        help="Directory contenente le cartelle dei playtest",
    )
    parser.add_argument(
        "--json-report",
        type=Path,
        help="Percorso opzionale per salvare il riepilogo in formato JSON",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    root: Path = args.root
    if not root.exists():
        parser.error(f"La directory {root} non esiste")

    metrics_list: List[LogMetrics] = [analyse_log(path) for path in iter_logs(root)]

    if not metrics_list:
        parser.error(f"Nessun log trovato in {root}")

    overall_failures = False
    for metrics in metrics_list:
        line = format_metrics(metrics)
        print(line)
        if metrics.issues:
            overall_failures = True

    if args.json_report:
        payload = [
            {
              "path": str(m.path),
              "total_raised": m.total_raised,
              "ack_rate": m.ack_rate,
              "ack_events": m.ack_events,
              "filter_events": m.filter_events,
              "issues": m.issues,
            }
            for m in metrics_list
        ]
        args.json_report.parent.mkdir(parents=True, exist_ok=True)
        with args.json_report.open("w", encoding="utf-8") as fp:
            json.dump(payload, fp, indent=2, ensure_ascii=False)

    return 1 if overall_failures else 0


if __name__ == "__main__":
    sys.exit(main())
