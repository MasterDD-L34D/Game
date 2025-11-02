#!/usr/bin/env python3
"""Generate the styleguide compliance report and history snapshots."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Mapping


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_TRAITS_DIR = PROJECT_ROOT / "data" / "traits"
DEFAULT_GLOSSARY = PROJECT_ROOT / "data" / "core" / "traits" / "glossary.json"
DEFAULT_HISTORY = PROJECT_ROOT / "logs" / "trait_audit" / "styleguide_compliance_history.json"
DEFAULT_MARKDOWN = PROJECT_ROOT / "reports" / "styleguide_compliance.md"
DEFAULT_JSON = PROJECT_ROOT / "reports" / "styleguide_compliance.json"
DEFAULT_SLA = PROJECT_ROOT / "config" / "styleguide_sla.json"


UCUM_PATTERN = re.compile(r"^[A-Za-z0-9%/._^() -]+$")


@dataclass(frozen=True)
class MetricSnapshot:
    """Aggregated information for a single KPI."""

    key: str
    label: str
    compliant: int
    total: int
    percent: float | None
    violations: list[str]
    sla_threshold: float | None = None

    @property
    def status(self) -> str:
        if self.percent is None:
            return "n/a"
        if self.sla_threshold is None:
            return "ok"
        return "breach" if self.percent < self.sla_threshold * 100 else "ok"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--traits-dir",
        type=Path,
        default=DEFAULT_TRAITS_DIR,
        help="Directory containing the canonical trait JSON files.",
    )
    parser.add_argument(
        "--glossary",
        type=Path,
        default=DEFAULT_GLOSSARY,
        help="Trait glossary with localized labels and descriptions.",
    )
    parser.add_argument(
        "--history-file",
        type=Path,
        default=DEFAULT_HISTORY,
        help="JSON file storing the historical snapshots for the KPIs.",
    )
    parser.add_argument(
        "--out-markdown",
        type=Path,
        default=DEFAULT_MARKDOWN,
        help="Markdown destination for the rendered report.",
    )
    parser.add_argument(
        "--out-json",
        type=Path,
        default=DEFAULT_JSON,
        help="Machine readable JSON summary output.",
    )
    parser.add_argument(
        "--sla-config",
        type=Path,
        default=DEFAULT_SLA,
        help="Configuration file containing the KPI SLA thresholds (0-1 range).",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit with non-zero status if one or more KPIs breach their SLA threshold.",
    )
    return parser


def iter_trait_files(directory: Path) -> Iterable[Path]:
    for path in sorted(directory.rglob("*.json")):
        if path.name in {"index.json", "species_affinity.json"}:
            continue
        if "_drafts" in path.parts:
            continue
        yield path


def load_json(path: Path) -> Mapping[str, object]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:  # pragma: no cover - CLI guard
        raise SystemExit(f"File non trovato: {path}") from exc
    except json.JSONDecodeError as exc:  # pragma: no cover - corrupt file
        raise SystemExit(f"JSON non valido ({path}): {exc}") from exc


def load_sla_thresholds(path: Path) -> dict[str, float]:
    if not path.exists():
        return {}
    payload = load_json(path)
    thresholds: dict[str, float] = {}
    for key, value in payload.items():
        if isinstance(value, (int, float)):
            thresholds[str(key)] = float(value)
    return thresholds


def collect_trait_ids(traits_dir: Path) -> dict[str, Path]:
    ids: dict[str, Path] = {}
    for path in iter_trait_files(traits_dir):
        try:
            payload = load_json(path)
        except SystemExit:
            raise
        except Exception as exc:  # pragma: no cover - I/O error fallback
            raise SystemExit(f"Impossibile leggere {path}: {exc}") from exc
        trait_id = payload.get("id") if isinstance(payload, dict) else None
        if isinstance(trait_id, str):
            ids[trait_id] = path
    return ids


def evaluate_name_compliance(
    trait_ids: Iterable[str], glossary: Mapping[str, object]
) -> tuple[int, int, list[str]]:
    traits_section = glossary.get("traits") if isinstance(glossary, Mapping) else {}
    compliant = 0
    violations: list[str] = []
    trait_list = list(trait_ids)
    for trait_id in trait_list:
        entry = traits_section.get(trait_id) if isinstance(traits_section, Mapping) else None
        if not isinstance(entry, Mapping):
            violations.append(trait_id)
            continue
        label_it = entry.get("label_it")
        label_en = entry.get("label_en")
        if isinstance(label_it, str) and label_it.strip() and isinstance(label_en, str) and label_en.strip():
            compliant += 1
        else:
            violations.append(trait_id)
    total = len(trait_list)
    return compliant, total, violations


def evaluate_description_compliance(
    trait_ids: Iterable[str], glossary: Mapping[str, object]
) -> tuple[int, int, list[str]]:
    traits_section = glossary.get("traits") if isinstance(glossary, Mapping) else {}
    compliant = 0
    violations: list[str] = []
    trait_list = list(trait_ids)
    for trait_id in trait_list:
        entry = traits_section.get(trait_id) if isinstance(traits_section, Mapping) else None
        if not isinstance(entry, Mapping):
            violations.append(trait_id)
            continue
        description_it = entry.get("description_it")
        description_en = entry.get("description_en")
        if (
            isinstance(description_it, str)
            and description_it.strip()
            and isinstance(description_en, str)
            and description_en.strip()
        ):
            compliant += 1
        else:
            violations.append(trait_id)
    total = len(trait_list)
    return compliant, total, violations


def evaluate_ucum_presence(trait_paths: Mapping[str, Path]) -> tuple[int, int, list[str]]:
    compliant_traits = 0
    total_traits = len(trait_paths)
    violations: list[str] = []
    for trait_id, path in trait_paths.items():
        payload = load_json(path)
        metrics = payload.get("metrics") if isinstance(payload, Mapping) else None
        if not isinstance(metrics, list) or not metrics:
            compliant_traits += 1
            continue
        trait_ok = True
        for metric in metrics:
            if not isinstance(metric, Mapping):
                trait_ok = False
                break
            unit = metric.get("unit")
            if not (isinstance(unit, str) and UCUM_PATTERN.fullmatch(unit)):
                trait_ok = False
                break
        if trait_ok:
            compliant_traits += 1
        else:
            violations.append(trait_id)
    return compliant_traits, total_traits, violations


def compute_metric_percent(compliant: int, total: int) -> float | None:
    if total == 0:
        return None
    return (compliant / total) * 100


def build_metric_snapshots(
    trait_paths: Mapping[str, Path],
    glossary_payload: Mapping[str, object],
    sla_thresholds: Mapping[str, float],
) -> list[MetricSnapshot]:
    trait_ids = list(trait_paths.keys())
    name_ok, name_total, name_violations = evaluate_name_compliance(trait_ids, glossary_payload)
    desc_ok, desc_total, desc_violations = evaluate_description_compliance(trait_ids, glossary_payload)
    ucum_ok, ucum_total, ucum_violations = evaluate_ucum_presence(trait_paths)

    snapshots = [
        MetricSnapshot(
            key="name_compliance",
            label="Nomi conformi",
            compliant=name_ok,
            total=name_total,
            percent=compute_metric_percent(name_ok, name_total),
            violations=name_violations,
            sla_threshold=sla_thresholds.get("name_compliance"),
        ),
        MetricSnapshot(
            key="description_completeness",
            label="Descrizioni complete",
            compliant=desc_ok,
            total=desc_total,
            percent=compute_metric_percent(desc_ok, desc_total),
            violations=desc_violations,
            sla_threshold=sla_thresholds.get("description_completeness"),
        ),
        MetricSnapshot(
            key="ucum_presence",
            label="UCUM presenti",
            compliant=ucum_ok,
            total=ucum_total,
            percent=compute_metric_percent(ucum_ok, ucum_total),
            violations=ucum_violations,
            sla_threshold=sla_thresholds.get("ucum_presence"),
        ),
    ]
    return snapshots


def load_history(path: Path) -> list[dict[str, object]]:
    if not path.exists():
        return []
    payload = load_json(path)
    if isinstance(payload, list):
        return payload
    return []


def update_history(path: Path, snapshot: dict[str, object]) -> list[dict[str, object]]:
    history = load_history(path)
    timestamp = snapshot.get("generated_at")
    if timestamp is None:
        return history
    day_key = str(timestamp)[:10]
    filtered = [
        entry
        for entry in history
        if str(entry.get("generated_at", ""))[:10] != day_key
    ]
    filtered.append(snapshot)
    filtered.sort(key=lambda item: item.get("generated_at", ""))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(filtered, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return filtered


def build_json_payload(
    timestamp: str,
    metrics: list[MetricSnapshot],
) -> dict[str, object]:
    alerts = [
        {
            "metric": metric.key,
            "label": metric.label,
            "percent": metric.percent,
            "sla_threshold": metric.sla_threshold,
        }
        for metric in metrics
        if metric.status == "breach"
    ]
    payload: dict[str, object] = {
        "generated_at": timestamp,
        "kpi": {
            metric.key: {
                "label": metric.label,
                "compliant": metric.compliant,
                "total": metric.total,
                "percent": metric.percent,
                "violations": metric.violations,
                "sla_threshold": metric.sla_threshold,
                "status": metric.status,
            }
            for metric in metrics
        },
    }
    if alerts:
        payload["alerts"] = alerts
    return payload


def render_trend_table(history: list[dict[str, object]], metrics: list[MetricSnapshot]) -> list[str]:
    if not history:
        return []
    lines = ["## Trend storico", ""]
    header = "| Data | " + " | ".join(metric.label for metric in metrics) + " |"
    separator = "| --- | " + " | ".join("---:" for _ in metrics) + " |"
    lines.extend([header, separator])
    tail = history[-10:]
    for entry in tail:
        generated_at = entry.get("generated_at")
        try:
            date_str = generated_at[:10]
        except Exception:
            date_str = str(generated_at)
        row_values: list[str] = []
        entry_metrics = entry.get("kpi") if isinstance(entry, Mapping) else {}
        for metric in metrics:
            bucket = entry_metrics.get(metric.key) if isinstance(entry_metrics, Mapping) else None
            percent = bucket.get("percent") if isinstance(bucket, Mapping) else None
            if isinstance(percent, (int, float)):
                row_values.append(f"{percent:.1f}%")
            else:
                row_values.append("—")
        lines.append("| " + date_str + " | " + " | ".join(row_values) + " |")
    lines.append("")
    return lines


def render_alerts(metrics: list[MetricSnapshot]) -> list[str]:
    alerts: list[str] = []
    for metric in metrics:
        if metric.status == "breach" and metric.percent is not None and metric.sla_threshold is not None:
            alerts.append(
                f"- **{metric.label}** sotto SLA: {metric.percent:.1f}% (soglia {metric.sla_threshold * 100:.0f}%)"
            )
    if not alerts:
        return []
    return ["## Alert SLA", "", *alerts, ""]


def render_markdown(
    timestamp: str,
    metrics: list[MetricSnapshot],
    history: list[dict[str, object]],
) -> str:
    lines = ["# Styleguide Compliance", "", f"_Aggiornato al {timestamp}_", ""]
    lines.append("## KPI correnti")
    lines.append("")
    lines.append("| KPI | Compliant | Totale | Copertura | SLA | Stato |")
    lines.append("| --- | ---: | ---: | --- | --- | --- |")
    for metric in metrics:
        if metric.percent is None:
            coverage = "—"
        else:
            coverage = f"{metric.percent:.1f}%"
        sla = f">= {metric.sla_threshold * 100:.0f}%" if metric.sla_threshold is not None else "—"
        lines.append(
            "| "
            + metric.label
            + f" | {metric.compliant} | {metric.total} | {coverage} | {sla} | {metric.status.upper()} |"
        )
    lines.append("")

    lines.append("## Anomalie principali")
    lines.append("")
    for metric in metrics:
        if metric.violations:
            head = ", ".join(metric.violations[:5])
            extra = len(metric.violations) - 5
            suffix = "" if extra <= 0 else f" … (+{extra})"
            lines.append(f"- **{metric.label}**: {head}{suffix}")
        else:
            lines.append(f"- **{metric.label}**: nessuna anomalia")
    lines.append("")

    lines.extend(render_trend_table(history, metrics))
    lines.extend(render_alerts(metrics))
    lines.append("## Azioni consigliate")
    lines.append("")
    lines.append(
        "- Coordinare localization e narrativa per chiudere i gap di glossario quando segnalati."
    )
    lines.append(
        "- Prioritizzare l'allineamento delle unità UCUM nelle metriche prima delle milestone di bilanciamento."
    )
    lines.append(
        "- Validare i nuovi tratti con `trait_template_validator.py` per prevenire regressioni sullo styleguide."
    )
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    trait_paths = collect_trait_ids(args.traits_dir)
    glossary_payload = load_json(args.glossary)
    sla_thresholds = load_sla_thresholds(args.sla_config)

    metrics = build_metric_snapshots(trait_paths, glossary_payload, sla_thresholds)
    timestamp = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    json_payload = build_json_payload(timestamp, metrics)

    history = update_history(args.history_file, json_payload)

    args.out_json.parent.mkdir(parents=True, exist_ok=True)
    args.out_json.write_text(json.dumps(json_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    markdown = render_markdown(timestamp, metrics, history)
    args.out_markdown.parent.mkdir(parents=True, exist_ok=True)
    args.out_markdown.write_text(markdown, encoding="utf-8")

    breaches = [metric for metric in metrics if metric.status == "breach"]
    if args.strict and breaches:
        labels = ", ".join(metric.label for metric in breaches)
        raise SystemExit(f"SLA non rispettati: {labels}")

    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entrypoint
    raise SystemExit(main())
