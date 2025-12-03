#!/usr/bin/env python3
"""Genera un report di coverage reale confrontando ETL e trait reference."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

AXES = [
    ("sensoriale", "Asse Sensoriale"),
    ("locomotorio", "Asse Locomotorio"),
    ("difensivo", "Asse Difensivo"),
    ("metabolico", "Asse Metabolico"),
    ("supporto", "Asse Supporto"),
    ("offensivo", "Asse Offensivo"),
    ("strategia", "Asse Strategia"),
    ("simbiotico", "Asse Simbiotico"),
    ("strutturale", "Asse Strutturale"),
]
AXIS_MAP = {key: label for key, label in AXES}
CORE_ALIAS = {
    "sensoriale": "sensoriale",
    "nervoso": "strategia",
    "locomotorio": "locomotorio",
    "idrostatico": "supporto",
    "tegumentario": "difensivo",
    "difensivo": "difensivo",
    "digestivo": "metabolico",
    "metabolico": "metabolico",
    "escretorio": "metabolico",
    "respiratorio": "metabolico",
    "supporto": "supporto",
    "circolatorio": "supporto",
    "offensivo": "offensivo",
    "strategico": "strategia",
    "tattico": "strategia",
    "simbiotico": "simbiotico",
    "riproduttivo": "simbiotico",
    "strutturale": "strutturale",
}
AXIS_UNKNOWN = ("altro", "Asse Non Classificato")


def load_json(path: Path) -> Mapping[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def resolve_axis(trait_entry: Mapping[str, Any]) -> str:
    profile = trait_entry.get("slot_profile") if isinstance(trait_entry, Mapping) else None
    core = None
    if isinstance(profile, Mapping):
        core = profile.get("core")
    if not core and isinstance(trait_entry, Mapping):
        famiglia = trait_entry.get("famiglia_tipologia")
        if isinstance(famiglia, str) and "/" in famiglia:
            core = famiglia.split("/", 1)[0].strip().lower()
    if isinstance(core, str):
        normalized = core.strip().lower()
        if normalized in AXIS_MAP:
            return normalized
        alias = CORE_ALIAS.get(normalized)
        if alias in AXIS_MAP:
            return alias
    return AXIS_UNKNOWN[0]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--etl-report",
        type=Path,
        default=Path("data/derived/mock/prod_snapshot/analysis/trait_coverage_report.json"),
        help="Report coverage ETL in formato JSON",
    )
    parser.add_argument(
        "--trait-reference",
        type=Path,
        default=Path("data/traits/index.json"),
        help="Registry locale dei tratti",
    )
    parser.add_argument(
        "--trait-glossary",
        type=Path,
        default=Path("data/core/traits/glossary.json"),
        help="Glossario centrale dei tratti",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("data/derived/analysis/trait_gap_report.json"),
        help="File JSON in cui salvare il report di gap",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    etl_report = load_json(args.etl_report)
    trait_reference = load_json(args.trait_reference)

    glossary: Mapping[str, Mapping[str, Any]] = {}
    if args.trait_glossary and args.trait_glossary.exists():
        glossary_payload = load_json(args.trait_glossary)
        if isinstance(glossary_payload, Mapping):
            glossary = glossary_payload.get("traits", {})  # type: ignore[assignment]

    reference_traits = (
        trait_reference.get("traits", {}) if isinstance(trait_reference, Mapping) else {}
    )
    etl_traits = etl_report.get("traits", {}) if isinstance(etl_report, Mapping) else {}

    axis_summary: dict[str, dict[str, Any]] = {}
    for key, label in AXES:
        axis_summary[key] = {
            "label": label,
            "total_traits": 0,
            "covered_traits": 0,
            "traits_missing_coverage": [],
        }
    axis_summary[AXIS_UNKNOWN[0]] = {
        "label": AXIS_UNKNOWN[1],
        "total_traits": 0,
        "covered_traits": 0,
        "traits_missing_coverage": [],
    }

    coverage_details: dict[str, dict[str, Any]] = {}

    for trait_id, entry in reference_traits.items():
        axis_key = resolve_axis(entry)
        axis_info = axis_summary.setdefault(
            axis_key,
            {
                "label": AXIS_UNKNOWN[1],
                "total_traits": 0,
                "covered_traits": 0,
                "traits_missing_coverage": [],
            },
        )
        axis_info["total_traits"] += 1
        etl_entry = etl_traits.get(trait_id)
        rules_total = 0
        species_total = 0
        if isinstance(etl_entry, Mapping):
            rules_total = int((etl_entry.get("rules") or {}).get("total", 0))
            species_total = int((etl_entry.get("species") or {}).get("total", 0))
        covered = (rules_total + species_total) > 0
        label_it = None
        glossary_entry = glossary.get(trait_id) if isinstance(glossary, Mapping) else None
        if isinstance(glossary_entry, Mapping):
            label_it = glossary_entry.get("label_it") or glossary_entry.get("label_en")
        if not label_it and isinstance(entry, Mapping):
            label_it = entry.get("label")
        coverage_details[trait_id] = {
            "axis": axis_key,
            "label": label_it,
            "rules_total": rules_total,
            "species_total": species_total,
            "covered": covered,
        }
        if covered:
            axis_info["covered_traits"] += 1
        else:
            axis_info["traits_missing_coverage"].append({
                "id": trait_id,
                "label": label_it,
            })

    missing_in_etl = sorted(
        (
            {"id": trait_id, "label": detail["label"], "axis": detail["axis"]}
            for trait_id, detail in coverage_details.items()
            if not detail["covered"]
        ),
        key=lambda item: item["id"],
    )

    missing_in_reference = sorted(
        trait_id for trait_id in etl_traits.keys() if trait_id not in reference_traits
    )

    axes_with_coverage = {
        key
        for key, info in axis_summary.items()
        if info["covered_traits"] > 0 and key != AXIS_UNKNOWN[0]
    }

    summary = {
        "reference_traits_total": len(reference_traits),
        "etl_traits_total": len(etl_traits),
        "traits_missing_in_etl": len(missing_in_etl),
        "traits_missing_in_reference": len(missing_in_reference),
        "traits_with_coverage": len(reference_traits) - len(missing_in_etl),
        "axes_total": len(AXES),
        "axes_with_coverage": len(axes_with_coverage),
    }

    for info in axis_summary.values():
        total = info["total_traits"] or 0
        covered = info["covered_traits"] or 0
        info["coverage_ratio"] = round(covered / total, 3) if total else 0.0
        info["traits_missing_coverage"] = sorted(
            info["traits_missing_coverage"], key=lambda item: item.get("id") or ""
        )

    report = {
        "schema_version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "sources": {
            "etl_report": str(args.etl_report),
            "trait_reference": str(args.trait_reference),
            "trait_glossary": str(args.trait_glossary),
        },
        "summary": summary,
        "axes": axis_summary,
        "missing": {
            "in_etl": missing_in_etl,
            "in_reference": missing_in_reference,
        },
        "details": coverage_details,
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Report di gap generato in {args.out}")
    return 0


if __name__ == "__main__":  # pragma: no cover - entrypoint script
    raise SystemExit(main())
