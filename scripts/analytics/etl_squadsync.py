"""ETL pipeline per il report Analytics SquadSync.

Il modulo permette di caricare un dataset giornaliero delle squadre,
calcolare indici di engagement e produrre un report aggregato pronto per la
pubblicazione nel canale analytics/companion e nell'endpoint GraphQL.
"""
from __future__ import annotations

import argparse
import csv
import json
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, List, Mapping, Optional, Sequence

DATE_INPUT_FORMATS = ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y")
DATE_OUTPUT_FORMAT = "%Y-%m-%d"
DEFAULT_OUTPUT_PATH = Path("data/analysis/squadsync_report.json")


class SquadSyncETLError(RuntimeError):
    """Errore generico del pipeline SquadSync."""


@dataclass(frozen=True)
class SquadSyncRecord:
    """Rappresenta una riga normalizzata del dataset giornaliero."""

    date: date
    squad: str
    active_members: int
    standups: int
    deployments: int
    incidents: int

    @classmethod
    def from_mapping(cls, mapping: Mapping[str, Any]) -> "SquadSyncRecord":
        try:
            parsed_date = _parse_date(mapping["date"])
        except KeyError as exc:  # pragma: no cover - defensive guard
            raise SquadSyncETLError("Record privo del campo 'date'") from exc

        try:
            squad = str(mapping["squad"]).strip()
        except KeyError as exc:  # pragma: no cover - defensive guard
            raise SquadSyncETLError("Record privo del campo 'squad'") from exc

        if not squad:
            raise SquadSyncETLError("Il campo 'squad' non può essere vuoto")

        def _as_int(field: str) -> int:
            try:
                value = int(mapping[field])
            except KeyError as exc:  # pragma: no cover - defensive guard
                raise SquadSyncETLError(f"Record privo del campo '{field}'") from exc
            except (TypeError, ValueError) as exc:
                raise SquadSyncETLError(f"Valore non numerico per '{field}': {mapping[field]!r}") from exc
            if value < 0:
                raise SquadSyncETLError(f"Il campo '{field}' non può essere negativo: {value}")
            return value

        active_members = _as_int("active_members")
        standups = _as_int("standups")
        deployments = _as_int("deployments")
        incidents = _as_int("incidents")

        return cls(
            date=parsed_date,
            squad=squad,
            active_members=active_members,
            standups=standups,
            deployments=deployments,
            incidents=incidents,
        )


def _parse_date(raw: Any) -> date:
    if isinstance(raw, date):
        return raw
    if isinstance(raw, datetime):
        return raw.date()
    if not isinstance(raw, str):  # pragma: no cover - defensive guard
        raise SquadSyncETLError(f"Formato data non supportato: {raw!r}")

    raw = raw.strip()
    for fmt in DATE_INPUT_FORMATS:
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    raise SquadSyncETLError(f"Formato data non riconosciuto: {raw!r}")


def load_records(path: Path) -> List[SquadSyncRecord]:
    """Estrae il dataset giornaliero da un file CSV o JSON."""

    if not path.exists():
        raise SquadSyncETLError(f"Dataset inesistente: {path}")

    if path.suffix.lower() == ".csv":
        with path.open("r", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            return [SquadSyncRecord.from_mapping(row) for row in reader]

    if path.suffix.lower() == ".json":
        with path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
        if isinstance(payload, Mapping):
            records = payload.get("records")
            if records is None:
                raise SquadSyncETLError("JSON privo della chiave 'records'")
        elif isinstance(payload, Sequence):
            records = payload
        else:
            raise SquadSyncETLError("Struttura JSON non supportata per il dataset")

        return [SquadSyncRecord.from_mapping(record) for record in records]

    raise SquadSyncETLError(f"Estensione file non supportata per {path}")


def build_squadsync_report(
    records: Iterable[SquadSyncRecord],
    *,
    start: Optional[date] = None,
    end: Optional[date] = None,
) -> Dict[str, Any]:
    """Trasforma i record giornalieri in un report aggregato."""

    record_list = list(records)
    if not record_list:
        raise SquadSyncETLError("Nessun record disponibile per generare il report")

    dates = [item.date for item in record_list]
    computed_start = start or min(dates)
    computed_end = end or max(dates)

    if computed_start > computed_end:
        raise SquadSyncETLError("L'intervallo temporale è invalido (start > end)")

    filtered: List[SquadSyncRecord] = [
        record
        for record in record_list
        if computed_start <= record.date <= computed_end
    ]

    if not filtered:
        raise SquadSyncETLError("Nessun record nell'intervallo selezionato")

    maxima = _compute_maxima(filtered)
    grouped: Dict[str, List[Dict[str, Any]]] = {}

    for record in sorted(filtered, key=lambda item: (item.squad, item.date)):
        engagement = _compute_engagement(record, maxima)
        daily_payload = {
            "date": record.date.strftime(DATE_OUTPUT_FORMAT),
            "activeMembers": record.active_members,
            "standups": record.standups,
            "deployments": record.deployments,
            "incidents": record.incidents,
            "engagement": engagement,
        }
        grouped.setdefault(record.squad, []).append(daily_payload)

    squads: List[Dict[str, Any]] = []
    total_deployments = 0
    total_standups = 0
    total_incidents = 0
    sum_active = 0
    sum_engagement = 0.0
    total_days = 0

    for squad_name, entries in sorted(grouped.items()):
        days = len(entries)
        total_days += days

        squad_deployments = sum(item["deployments"] for item in entries)
        squad_standups = sum(item["standups"] for item in entries)
        squad_incidents = sum(item["incidents"] for item in entries)
        avg_active = _round(sum(item["activeMembers"] for item in entries) / days, 2)
        avg_engagement = _round(sum(item["engagement"] for item in entries) / days, 3)

        total_deployments += squad_deployments
        total_standups += squad_standups
        total_incidents += squad_incidents
        sum_active += sum(item["activeMembers"] for item in entries)
        sum_engagement += sum(item["engagement"] for item in entries)

        squads.append(
            {
                "name": squad_name,
                "summary": {
                    "daysCovered": days,
                    "averageActiveMembers": avg_active,
                    "totalDeployments": squad_deployments,
                    "totalStandups": squad_standups,
                    "totalIncidents": squad_incidents,
                    "engagementScore": avg_engagement,
                },
                "daily": entries,
            }
        )

    overall_avg_active = _round(sum_active / total_days, 2)
    overall_avg_engagement = _round(sum_engagement / total_days, 3)

    payload: Dict[str, Any] = {
        "range": {
            "start": computed_start.strftime(DATE_OUTPUT_FORMAT),
            "end": computed_end.strftime(DATE_OUTPUT_FORMAT),
            "days": (computed_end - computed_start).days + 1,
        },
        "generatedAt": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "squads": squads,
        "totals": {
            "deployments": total_deployments,
            "standups": total_standups,
            "incidents": total_incidents,
            "averageActiveMembers": overall_avg_active,
            "averageEngagement": overall_avg_engagement,
        },
    }

    return payload


def write_report(report: Mapping[str, Any], destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def _compute_maxima(records: Iterable[SquadSyncRecord]) -> Dict[str, int]:
    maxima = {
        "active_members": 0,
        "deployments": 0,
        "standups": 0,
        "incidents": 0,
    }
    for record in records:
        maxima["active_members"] = max(maxima["active_members"], record.active_members)
        maxima["deployments"] = max(maxima["deployments"], record.deployments)
        maxima["standups"] = max(maxima["standups"], record.standups)
        maxima["incidents"] = max(maxima["incidents"], record.incidents)
    # evitare divisioni per zero
    if maxima["deployments"] == 0:
        maxima["deployments"] = 1
    if maxima["standups"] == 0:
        maxima["standups"] = 1
    if maxima["incidents"] == 0:
        maxima["incidents"] = 1
    if maxima["active_members"] == 0:
        maxima["active_members"] = 1
    return maxima


def _compute_engagement(record: SquadSyncRecord, maxima: Mapping[str, int]) -> float:
    active_ratio = record.active_members / maxima["active_members"]
    deployments_ratio = record.deployments / maxima["deployments"]
    standups_ratio = record.standups / maxima["standups"]
    incidents_ratio = record.incidents / maxima["incidents"]

    positive = 0.5 * active_ratio + 0.3 * deployments_ratio + 0.2 * standups_ratio
    penalty = 0.1 * incidents_ratio
    score = max(0.0, min(1.0, positive - penalty))
    return _round(score, 3)


def _round(value: float, digits: int) -> float:
    return float(f"{value:.{digits}f}")


def _iter_records_from_args(args: argparse.Namespace) -> Iterator[SquadSyncRecord]:
    records = load_records(args.input)
    for record in records:
        yield record


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Genera il report SquadSync analytics")
    parser.add_argument("input", type=Path, help="Percorso del dataset (CSV o JSON)")
    parser.add_argument(
        "output",
        type=Path,
        nargs="?",
        default=DEFAULT_OUTPUT_PATH,
        help=f"Percorso del report (default: {DEFAULT_OUTPUT_PATH})",
    )
    parser.add_argument("--start", type=_parse_date, help="Data di inizio (inclusa)")
    parser.add_argument("--end", type=_parse_date, help="Data di fine (inclusa)")
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    records = list(_iter_records_from_args(args))
    report = build_squadsync_report(records, start=args.start, end=args.end)
    write_report(report, args.output)
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
