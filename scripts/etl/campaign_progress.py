"""Pipeline ETL per la dashboard Campaign Progress."""
from __future__ import annotations

import argparse
import csv
import json
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence

DATE_INPUT_FORMATS = ("%Y-%m-%d", "%d/%m/%Y", "%Y%m%d")
DEFAULT_OUTPUT_PATH = Path("data/derived/analytics/campaign_progress.json")
STAGE_ORDER = (
    "awareness",
    "consideration",
    "evaluation",
    "activation",
    "retention",
)


class CampaignProgressError(RuntimeError):
    """Errore generico dell'ETL campaign progress."""


@dataclass(frozen=True)
class CampaignRecord:
    """Record normalizzato per la pipeline campaign progress."""

    campaign: str
    stage: str
    channel: str
    period: str
    leads: int
    conversions: int
    report_date: date
    momentum: float = 0.0

    @classmethod
    def from_mapping(cls, mapping: Mapping[str, Any]) -> "CampaignRecord":
        try:
            campaign = str(mapping["campaign"]).strip()
        except KeyError as exc:  # pragma: no cover - sicurezza input
            raise CampaignProgressError("Record privo del campo 'campaign'") from exc
        if not campaign:
            raise CampaignProgressError("Il campo 'campaign' non può essere vuoto")

        try:
            stage = str(mapping["stage"]).strip()
        except KeyError as exc:  # pragma: no cover - sicurezza input
            raise CampaignProgressError("Record privo del campo 'stage'") from exc
        if not stage:
            raise CampaignProgressError("Il campo 'stage' non può essere vuoto")

        try:
            channel = str(mapping["channel"]).strip()
        except KeyError as exc:  # pragma: no cover - sicurezza input
            raise CampaignProgressError("Record privo del campo 'channel'") from exc
        if not channel:
            raise CampaignProgressError("Il campo 'channel' non può essere vuoto")

        period = str(mapping.get("period", "")) or "N/D"

        leads = _ensure_int(mapping, "leads")
        conversions = _ensure_int(mapping, "conversions")

        if conversions > leads:
            raise CampaignProgressError(
                f"Le conversioni ({conversions}) non possono superare le lead ({leads})"
            )

        report_date_raw = mapping.get("report_date") or mapping.get("date")
        if report_date_raw is None:
            raise CampaignProgressError("Record privo della data di report")
        report_date = _parse_date(report_date_raw)

        momentum_raw = mapping.get("momentum", 0)
        try:
            momentum = float(momentum_raw)
        except (TypeError, ValueError):
            raise CampaignProgressError(f"Momentum non numerico: {momentum_raw!r}") from None

        return cls(
            campaign=campaign,
            stage=stage,
            channel=channel,
            period=period,
            leads=leads,
            conversions=conversions,
            report_date=report_date,
            momentum=momentum,
        )


def _ensure_int(mapping: Mapping[str, Any], field: str) -> int:
    try:
        value = int(mapping[field])
    except KeyError as exc:  # pragma: no cover - sicurezza input
        raise CampaignProgressError(f"Record privo del campo '{field}'") from exc
    except (TypeError, ValueError) as exc:
        raise CampaignProgressError(f"Valore non numerico per '{field}': {mapping[field]!r}") from exc
    if value < 0:
        raise CampaignProgressError(f"Il campo '{field}' non può essere negativo: {value}")
    return value


def _parse_date(raw: Any) -> date:
    if isinstance(raw, date):
        return raw
    if isinstance(raw, datetime):
        return raw.date()
    if not isinstance(raw, str):  # pragma: no cover - sicurezza input
        raise CampaignProgressError(f"Formato data non supportato: {raw!r}")
    raw = raw.strip()
    for fmt in DATE_INPUT_FORMATS:
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    raise CampaignProgressError(f"Formato data non riconosciuto: {raw!r}")


def load_campaign_records(path: Path) -> List[CampaignRecord]:
    """Carica i record da un file CSV o JSON."""

    if not path.exists():
        raise CampaignProgressError(f"Dataset inesistente: {path}")

    if path.suffix.lower() == ".csv":
        with path.open("r", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            return [CampaignRecord.from_mapping(row) for row in reader]

    if path.suffix.lower() == ".json":
        with path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
        if isinstance(payload, Mapping):
            records = payload.get("records")
            if records is None:
                raise CampaignProgressError("JSON privo della chiave 'records'")
        elif isinstance(payload, list):
            records = payload
        else:
            raise CampaignProgressError("Struttura JSON non supportata")
        return [CampaignRecord.from_mapping(item) for item in records]

    raise CampaignProgressError(f"Estensione file non supportata: {path.suffix}")


def build_campaign_progress(records: Iterable[CampaignRecord]) -> Dict[str, Any]:
    """Aggrega i record in un payload per la dashboard."""

    record_list = list(records)
    if not record_list:
        raise CampaignProgressError("Nessun record disponibile per generare il report")

    stages: Dict[str, Dict[str, float]] = {}
    channels: Dict[str, Dict[str, float]] = {}
    campaigns = {record.campaign for record in record_list}

    for record in record_list:
        stage_key = record.stage.lower()
        stage_bucket = stages.setdefault(
            stage_key,
            {
                "id": stage_key,
                "label": record.stage,
                "leads": 0,
                "conversions": 0,
                "momentum": 0.0,
            },
        )
        stage_bucket["leads"] += record.leads
        stage_bucket["conversions"] += record.conversions
        stage_bucket["momentum"] += record.momentum

        channel_bucket = channels.setdefault(record.channel, {})
        period_payload = channel_bucket.setdefault(record.period, {"leads": 0, "conversions": 0})
        period_payload["leads"] += record.leads
        period_payload["conversions"] += record.conversions

    sorted_stages = sorted(
        stages.values(),
        key=lambda item: (
            STAGE_ORDER.index(item["id"]) if item["id"] in STAGE_ORDER else len(STAGE_ORDER),
            item["label"],
        ),
    )

    funnel: List[Dict[str, Any]] = []
    for index, stage in enumerate(sorted_stages):
        leads = int(stage["leads"])
        conversions = int(stage["conversions"])
        previous = funnel[index - 1] if index > 0 else None
        drop_off_base = (previous["conversions"] if previous else leads) or (previous["leads"] if previous else leads)
        drop_off_rate = 0.0
        if previous and drop_off_base:
            drop_off_rate = max(0.0, 1 - leads / drop_off_base)
        conversion_rate = conversions / leads if leads else 0.0
        stage_momentum = stage["momentum"]
        funnel.append(
            {
                "id": stage["id"],
                "label": stage["label"],
                "leads": leads,
                "conversions": conversions,
                "conversionRate": round(conversion_rate, 4),
                "dropOffRate": round(drop_off_rate, 4),
                "delta": round(stage_momentum, 4),
            }
        )

    periods = sorted({period for bucket in channels.values() for period in bucket})
    channel_rows: List[Dict[str, Any]] = []
    for channel_name, bucket in sorted(channels.items()):
        channel_rows.append(
            {
                "channel": channel_name,
                "values": [
                    _compute_rate(bucket.get(period, {"leads": 0, "conversions": 0})) for period in periods
                ],
                "leads": [
                    int(bucket.get(period, {"leads": 0})["leads"]) for period in periods
                ],
            }
        )

    total_leads = sum(record.leads for record in record_list)
    total_conversions = sum(record.conversions for record in record_list)
    conversion_rate = total_conversions / total_leads if total_leads else 0.0
    avg_momentum = (
        sum(stage["delta"] for stage in funnel) / len(funnel)
        if funnel
        else 0.0
    )
    last_report = max(record.report_date for record in record_list)

    highlights = _build_highlights(record_list)

    return {
        "generatedAt": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "summary": {
            "activeCampaigns": len(campaigns),
            "totalLeads": total_leads,
            "totalConversions": total_conversions,
            "conversionRate": round(conversion_rate, 4),
            "targetConversionRate": round(conversion_rate - avg_momentum, 4),
            "lastUpdated": last_report.isoformat(),
        },
        "funnel": funnel,
        "heatmap": {
            "periods": periods,
            "channels": [row["channel"] for row in channel_rows],
            "values": [row["values"] for row in channel_rows],
            "leads": [row["leads"] for row in channel_rows],
        },
        "highlights": highlights,
    }


def _build_highlights(records: Iterable[CampaignRecord]) -> List[Dict[str, Any]]:
    grouped: Dict[str, Dict[str, Any]] = {}
    for record in records:
        key = f"{record.campaign}:{record.stage}"
        payload = grouped.setdefault(
            key,
            {
                "id": key,
                "title": record.campaign,
                "owner": record.channel,
                "description": f"Stage {record.stage} — period {record.period}",
                "momentum": 0.0,
                "leadTotal": 0,
                "conversionTotal": 0,
            },
        )
        payload["momentum"] += record.momentum
        payload["leadTotal"] += record.leads
        payload["conversionTotal"] += record.conversions
    highlights = []
    for payload in grouped.values():
        conversion_rate = (
            payload["conversionTotal"] / payload["leadTotal"]
            if payload["leadTotal"]
            else 0.0
        )
        highlights.append(
            {
                "id": payload["id"],
                "title": payload["title"],
                "description": payload["description"],
                "owner": payload["owner"],
                "eta": None,
                "momentum": round(payload["momentum"], 4),
                "conversionRate": round(conversion_rate, 4),
            }
        )
    return sorted(highlights, key=lambda item: item["momentum"], reverse=True)


def _compute_rate(payload: Mapping[str, float]) -> float:
    leads = float(payload.get("leads", 0) or 0)
    conversions = float(payload.get("conversions", 0) or 0)
    if leads <= 0:
        return 0.0
    return round(conversions / leads, 4)


def write_snapshot(payload: Mapping[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Genera il dataset campaign progress consolidato")
    parser.add_argument("input", type=Path, help="Percorso del dataset (CSV o JSON)")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help=f"Percorso di scrittura (default: {DEFAULT_OUTPUT_PATH})",
    )
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    records = load_campaign_records(args.input)
    payload = build_campaign_progress(records)
    write_snapshot(payload, args.output)
    return 0


if __name__ == "__main__":  # pragma: no cover - entry point CLI
    raise SystemExit(main())
