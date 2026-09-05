#!/usr/bin/env python3
"""Genera la schedule di monitoraggio per il rollout Mission Control QA."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

DEFAULT_FLAG_PATH = Path("config/featureFlags.json")
DEFAULT_OUTPUT_PATH = Path("logs/qa/rollout_metrics_schedule.json")
FLAG_KEY_PATH = ("featureFlags", "rollout", "qaMetricsMonitoring")


class MonitoringConfigError(RuntimeError):
    """Errore di configurazione dei monitor."""


def load_json(path: Path) -> Mapping[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, Mapping):
        raise MonitoringConfigError(f"Il file {path} non contiene un oggetto JSON valido.")
    return payload


def extract_flag(payload: Mapping[str, Any], key_path: tuple[str, ...]) -> Mapping[str, Any]:
    current: Mapping[str, Any] | Any = payload
    for key in key_path:
        if not isinstance(current, Mapping) or key not in current:
            raise MonitoringConfigError(
                """Configurazione flag assente. Aspettato percorso {}.""".format(" → ".join(key_path))
            )
        current = current[key]
    if not isinstance(current, Mapping):
        raise MonitoringConfigError("Il flag di monitoraggio deve essere un oggetto JSON.")
    return current


def build_schedule(
    flag_config: Mapping[str, Any],
    *,
    job_id: str,
    frequency_minutes: int,
    evaluation_window_hours: int,
) -> dict[str, Any]:
    rollout = flag_config.get("rollout") if isinstance(flag_config, Mapping) else None
    if not isinstance(rollout, Mapping):
        raise MonitoringConfigError("Il flag non definisce il blocco 'rollout'.")

    cohorts = rollout.get("cohorts")
    if not isinstance(cohorts, list) or not all(isinstance(item, str) for item in cohorts):
        raise MonitoringConfigError("Il rollout deve elencare almeno una coorte valida.")

    pipeline = rollout.get("pipeline") if isinstance(rollout, Mapping) else None
    pipeline_config = None
    if isinstance(pipeline, Mapping):
        pipeline_config = {
            "jobId": pipeline.get("jobId"),
            "config": pipeline.get("config"),
        }

    owner = flag_config.get("owner") if isinstance(flag_config, Mapping) else None
    metrics = flag_config.get("metrics") if isinstance(flag_config, Mapping) else None
    if not isinstance(metrics, list) or not metrics:
        raise MonitoringConfigError("Il flag deve definire almeno una metrica da monitorare.")

    normalized_metrics: list[dict[str, Any]] = []
    for entry in metrics:
        if not isinstance(entry, Mapping):
            raise MonitoringConfigError("Oggetto metrica non valido.")
        metric_name = entry.get("name")
        if not isinstance(metric_name, str) or not metric_name.strip():
            raise MonitoringConfigError("Le metriche devono avere un campo 'name' valido.")
        normalized_metrics.append(
            {
                "name": metric_name,
                "threshold": entry.get("threshold"),
                "window": entry.get("window"),
                "alertChannel": entry.get("alertChannel"),
            }
        )

    schedule_payload: dict[str, Any] = {
        "jobId": job_id,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "frequencyMinutes": frequency_minutes,
        "evaluationWindowHours": evaluation_window_hours,
        "stageGate": rollout.get("stageGate"),
        "phase": rollout.get("phase"),
        "cohorts": cohorts,
        "pipeline": pipeline_config,
        "owner": owner,
        "metrics": normalized_metrics,
    }
    return schedule_payload


def dump_schedule(schedule: Mapping[str, Any]) -> str:
    return json.dumps(schedule, indent=2, ensure_ascii=False) + "\n"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--flags",
        type=Path,
        default=DEFAULT_FLAG_PATH,
        help="Percorso del file JSON con la definizione del flag di monitoraggio.",
    )
    parser.add_argument(
        "--job-id",
        default="qa-rollout-metrics",
        help="Identificatore del job di monitoraggio.",
    )
    parser.add_argument(
        "--frequency",
        type=int,
        default=30,
        help="Frequenza (in minuti) degli slot di monitoraggio.",
    )
    parser.add_argument(
        "--window",
        type=int,
        default=6,
        help="Ampiezza (in ore) della finestra aggregata per la validazione QA.",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help="File JSON da generare con la schedule dei monitor.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Non scrive su disco: stampa soltanto la schedule generata.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Scrive su disco la schedule generata oltre a stamparla su stdout.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.frequency <= 0:
        raise MonitoringConfigError("La frequenza deve essere un intero positivo.")
    if args.window <= 0:
        raise MonitoringConfigError("La finestra di valutazione deve essere un intero positivo.")

    flags_payload = load_json(args.flags)
    flag_config = extract_flag(flags_payload, FLAG_KEY_PATH)

    schedule = build_schedule(
        flag_config,
        job_id=args.job_id,
        frequency_minutes=args.frequency,
        evaluation_window_hours=args.window,
    )

    schedule_dump = dump_schedule(schedule)
    print(schedule_dump, end="")

    if args.apply:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(schedule_dump, encoding="utf-8")
    elif not args.dry_run:
        # Default behaviour: preserva safety, non scrive se nessun flag è specificato esplicitamente.
        parser.error("Specificare --apply per salvare o --dry-run per uscita solo a schermo.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
