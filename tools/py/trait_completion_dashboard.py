#!/usr/bin/env python3
"""Generate the trait completion dashboard with KPI coverage metrics."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


TRACKED_FIELDS: dict[str, str] = {
    "species_affinity": "Specie collegate",
    "biome_tags": "Tag bioma",
    "usage_tags": "Tag d'uso",
    "completion_flags": "Flag completamento",
    "data_origin": "Origine dati",
}


@dataclass
class FieldMetric:
    field: str
    label: str
    total_traits: int
    traits_with_value: int

    @property
    def percent(self) -> float:
        if self.total_traits == 0:
            return 0.0
        return (self.traits_with_value / self.total_traits) * 100

    def format_percent(self) -> str:
        return f"{self.percent:.1f}%"


@dataclass
class DashboardSnapshot:
    timestamp: datetime
    metrics: list[FieldMetric]

    def to_payload(self) -> dict:
        return {
            "timestamp": self.timestamp.isoformat(),
            "metrics": {
                metric.field: {
                    "total_traits": metric.total_traits,
                    "traits_with_value": metric.traits_with_value,
                    "percent": metric.percent,
                }
                for metric in self.metrics
            },
        }

    @classmethod
    def from_payload(cls, payload: dict) -> "DashboardSnapshot":
        timestamp = datetime.fromisoformat(payload["timestamp"])
        metrics: list[FieldMetric] = []
        for field, meta in payload.get("metrics", {}).items():
            metrics.append(
                FieldMetric(
                    field=field,
                    label=TRACKED_FIELDS.get(field, field),
                    total_traits=int(meta.get("total_traits", 0)),
                    traits_with_value=int(meta.get("traits_with_value", 0)),
                )
            )
        metrics.sort(key=lambda item: item.label)
        return cls(timestamp=timestamp, metrics=metrics)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--trait-reference",
        type=Path,
        default=Path("data/traits/index.json"),
        help="JSON principale con i tratti consolidati",
    )
    parser.add_argument(
        "--out-markdown",
        type=Path,
        default=Path("reports/trait_progress.md"),
        help="File Markdown da aggiornare con il dashboard",
    )
    parser.add_argument(
        "--history-file",
        type=Path,
        default=Path("logs/trait_audit/trait_progress_history.json"),
        help="File JSON con lo storico dei KPI (verrà creato se assente)",
    )
    parser.add_argument(
        "--no-history-update",
        action="store_true",
        help="Non aggiornare lo storico, limitandosi a generare il report corrente",
    )
    return parser


def load_traits(trait_path: Path) -> dict[str, dict]:
    try:
        payload = json.loads(trait_path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise SystemExit(f"Trait reference non trovata: {trait_path}") from exc
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Trait reference non valida ({trait_path}): {exc}") from exc

    traits = payload.get("traits")
    if not isinstance(traits, dict):
        raise SystemExit("Formato trait reference non riconosciuto: manca la chiave 'traits'.")
    return traits


def compute_metrics(traits: dict[str, dict]) -> list[FieldMetric]:
    total = len(traits)
    metrics: list[FieldMetric] = []
    for field, label in TRACKED_FIELDS.items():
        with_value = sum(1 for data in traits.values() if _has_value(data, field))
        metrics.append(
            FieldMetric(
                field=field,
                label=label,
                total_traits=total,
                traits_with_value=with_value,
            )
        )
    return metrics


def _has_value(trait_data: dict, field: str) -> bool:
    if field not in trait_data:
        return False
    value = trait_data[field]
    if value is None:
        return False
    if isinstance(value, (list, dict, str)):
        if isinstance(value, str):
            return value.strip() != ""
        return len(value) > 0
    return True


def collect_missing_traits(traits: dict[str, dict], metrics: Iterable[FieldMetric]) -> dict[str, list[str]]:
    missing: dict[str, list[str]] = {}
    for metric in metrics:
        ids = [tid for tid, data in traits.items() if not _has_value(data, metric.field)]
        ids.sort()
        missing[metric.field] = ids
    return missing


def load_history(history_path: Path) -> list[DashboardSnapshot]:
    if not history_path.exists():
        return []
    try:
        raw_history = json.loads(history_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Impossibile leggere lo storico dei KPI: {exc}") from exc
    if not isinstance(raw_history, list):
        raise SystemExit("Formato storico non valido: atteso un array di snapshot")
    snapshots: list[DashboardSnapshot] = []
    for item in raw_history:
        if not isinstance(item, dict):
            continue
        try:
            snapshots.append(DashboardSnapshot.from_payload(item))
        except Exception:
            continue
    snapshots.sort(key=lambda snap: snap.timestamp)
    return snapshots


def update_history(
    history_path: Path, existing: list[DashboardSnapshot], snapshot: DashboardSnapshot
) -> list[DashboardSnapshot]:
    if existing and existing[-1].timestamp.date() == snapshot.timestamp.date():
        # Replace the latest snapshot for the same day to avoid duplicates.
        existing = existing[:-1]
    updated = [*existing, snapshot]
    payload = [entry.to_payload() for entry in updated]
    history_path.parent.mkdir(parents=True, exist_ok=True)
    history_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return updated


def build_markdown(
    snapshot: DashboardSnapshot,
    missing_traits: dict[str, list[str]],
    history: list[DashboardSnapshot],
) -> str:
    lines: list[str] = []
    lines.append("# Trait Completion Dashboard")
    lines.append("")
    lines.append(
        f"_Aggiornato al {snapshot.timestamp.strftime('%Y-%m-%d %H:%M UTC')}, totale tratti: {snapshot.metrics[0].total_traits}_"
    )
    lines.append("")
    lines.append("## KPI principali")
    lines.append("")
    lines.append("| Indicatore | Tratti con dato | Totale | Copertura |")
    lines.append("| --- | ---: | ---: | --- |")
    for metric in snapshot.metrics:
        lines.append(
            f"| {metric.label} | {metric.traits_with_value} | {metric.total_traits} | {metric.format_percent()} |"
        )
    lines.append("")
    lines.append("### Gap principali")
    lines.append("")
    for metric in snapshot.metrics:
        missing = missing_traits.get(metric.field, [])
        if missing:
            count = len(missing)
            noun = _pluralize(count, "tratto", "tratti")
            sample = ", ".join(missing[:5])
            extra_count = count - 5
            extra = (
                ""
                if count <= 5
                else f" … (+{extra_count} {_pluralize(extra_count, 'altro', 'altri')})"
            )
            lines.append(
                f"- **{metric.label}**: {count} {noun} senza dato → `{sample}`{extra}"
            )
        else:
            lines.append(f"- **{metric.label}**: copertura completa ✅")
    lines.append("")
    if history:
        lines.append("## Trend storico")
        lines.append("")
        lines.append("| Data | " + " | ".join(metric.label for metric in snapshot.metrics) + " |")
        lines.append("| --- | " + " | ".join(["---:" for _ in snapshot.metrics]) + " |")
        for entry in history[-10:]:
            lines.append(
                "| "
                + entry.timestamp.strftime("%Y-%m-%d")
                + " | "
                + " | ".join(
                    f"{_find_metric(entry, metric.field).percent:.1f}%"
                    for metric in snapshot.metrics
                )
                + " |"
            )
        lines.append("")
    lines.append("## Interpretazione")
    lines.append("")
    lines.append(
        "- **Specie collegate** misura quante mutazioni hanno già un'ancora con il bestiario."
    )
    lines.append(
        "- **Tag bioma** e **Tag d'uso** sono ancora sperimentali: il dashboard aiuta a individuare i tratti da prioritizzare per completare la tassonomia."
    )
    lines.append(
        "- **Flag completamento** e **Origine dati** sono pensati per segnalare la qualità dell'inventario: una copertura bassa suggerisce di allineare i registri di editing."
    )
    lines.append("")
    return "\n".join(lines)


def _find_metric(snapshot: DashboardSnapshot, field: str) -> FieldMetric:
    for metric in snapshot.metrics:
        if metric.field == field:
            return metric
    raise KeyError(field)


def _pluralize(count: int, singular: str, plural: str) -> str:
    return singular if count == 1 else plural


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    traits = load_traits(args.trait_reference)
    metrics = compute_metrics(traits)
    timestamp = datetime.now(timezone.utc)
    snapshot = DashboardSnapshot(timestamp=timestamp, metrics=metrics)

    history = load_history(args.history_file)
    if args.no_history_update:
        history_with_current = [*history, snapshot]
    else:
        history_with_current = update_history(args.history_file, history, snapshot)

    missing_traits = collect_missing_traits(traits, metrics)
    markdown = build_markdown(snapshot, missing_traits, history_with_current)

    args.out_markdown.parent.mkdir(parents=True, exist_ok=True)
    args.out_markdown.write_text(markdown + "\n", encoding="utf-8")

    print(f"Dashboard aggiornato: {args.out_markdown}")
    if not args.no_history_update:
        print(f"Storico aggiornato: {args.history_file}")
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entrypoint
    sys.exit(main())
