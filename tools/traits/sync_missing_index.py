#!/usr/bin/env python3
"""Sincronizza il glossario legacy con i trait Evo e genera l'export partner.

Il comando utilizza il report `reports/evo/rollout/traits_gap.csv` per trovare i
trait marcati come `missing_in_index`, recupera i metadati dal pacchetto Evo e
li inserisce in `data/core/traits/glossary.json`. Facoltativamente può
produrre un export normalizzato per i partner esterni con i trait ancora
assenti dai loro cataloghi.
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import OrderedDict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Mapping, Optional, Sequence


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_GAP_REPORT = REPO_ROOT / "reports/evo/rollout/traits_gap.csv"
DEFAULT_GLOSSARY = REPO_ROOT / "data/core/traits/glossary.json"
DEFAULT_TRAIT_DIR = REPO_ROOT / "data/external/evo/traits"


@dataclass
class TraitRecord:
    slug: str
    status: str
    external_code: Optional[str]
    external_label: Optional[str]
    legacy_label: Optional[str]
    external_tier: Optional[str]
    legacy_tier: Optional[str]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_GAP_REPORT,
        help="Percorso del report traits_gap.csv",
    )
    parser.add_argument(
        "--dest",
        type=Path,
        default=DEFAULT_GLOSSARY,
        help="File glossary.json da aggiornare",
    )
    parser.add_argument(
        "--trait-dir",
        type=Path,
        default=DEFAULT_TRAIT_DIR,
        help="Directory contenente i trait Evo normalizzati",
    )
    parser.add_argument(
        "--external-output",
        "--export",
        dest="external_output",
        type=Path,
        help="Percorso opzionale per generare l'export partner",
    )
    parser.add_argument(
        "--update-glossary",
        dest="update_glossary",
        action="store_true",
        help="Scrive le modifiche sul glossario legacy",
    )
    parser.add_argument(
        "--no-update-glossary",
        dest="update_glossary",
        action="store_false",
        help="Esegue un dry-run senza aggiornare il glossario",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Mostra le modifiche senza scriverle su disco",
    )
    parser.set_defaults(update_glossary=True)
    return parser.parse_args()


def read_gap_report(path: Path) -> List[TraitRecord]:
    if not path.exists():
        raise FileNotFoundError(f"Report gap non trovato: {path}")
    records: List[TraitRecord] = []
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            records.append(
                TraitRecord(
                    slug=(row.get("slug") or "").strip(),
                    status=(row.get("status") or "").strip(),
                    external_code=(row.get("external_code") or "").strip() or None,
                    external_label=(row.get("external_label") or "").strip() or None,
                    legacy_label=(row.get("legacy_label") or "").strip() or None,
                    external_tier=(row.get("external_tier") or "").strip() or None,
                    legacy_tier=(row.get("legacy_tier") or "").strip() or None,
                )
            )
    return records


def slug_to_path(trait_dir: Path, record: TraitRecord) -> Optional[Path]:
    if record.external_code:
        candidate = trait_dir / f"{record.external_code}.json"
        if candidate.exists():
            return candidate
    aggregate = trait_dir / "traits_aggregate.json"
    if aggregate.exists():
        return aggregate
    return None


def load_trait_payload(path: Path, slug: str) -> Dict[str, str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if "trait_code" in data and "label" in data:
        payload = data
    else:
        # aggregate file: pick the entry with matching slug
        traits = data.get("traits") if isinstance(data, dict) else []
        payload = next(
            (
                item
                for item in traits
                if isinstance(item, dict)
                and (item.get("slug") == slug or item.get("trait_code") == slug)
            ),
            None,
        )
        if payload is None:
            raise KeyError(f"Trait {slug} non trovato in {path}")
    return payload


def extract_localised_fields(payload: Dict[str, object], fallback_label: str) -> Dict[str, str]:
    label = str(payload.get("label") or fallback_label or "").strip()
    description = str(payload.get("uso_funzione") or payload.get("description") or "").strip()
    if not description and payload.get("mutazione_indotta"):
        description = str(payload["mutazione_indotta"]).strip()
    if not label:
        label = fallback_label or ""
    if not description:
        description = "Trait importato dal pacchetto Evo."
    return {
        "label_it": label,
        "label_en": label,
        "description_it": description,
        "description_en": description,
    }


def update_glossary(
    glossary_path: Path,
    trait_dir: Path,
    records: Sequence[TraitRecord],
    dry_run: bool = False,
) -> Dict[str, object]:
    glossary = json.loads(glossary_path.read_text(encoding="utf-8"))
    traits: Dict[str, dict] = glossary.setdefault("traits", {})
    updated = 0

    for record in records:
        if record.status != "missing_in_index":
            continue
        if not record.slug:
            continue
        if record.slug in traits:
            continue
        trait_path = slug_to_path(trait_dir, record)
        if not trait_path or not trait_path.exists():
            print(f"[WARN] Dati trait mancanti per {record.slug}: {trait_path}")
            continue
        try:
            payload = load_trait_payload(trait_path, record.external_code or record.slug)
        except (KeyError, json.JSONDecodeError) as error:
            print(f"[WARN] Impossibile caricare {record.slug}: {error}")
            continue
        fields = extract_localised_fields(payload, record.external_label or record.legacy_label or record.slug)
        traits[record.slug] = OrderedDict(fields)
        updated += 1

    if updated:
        glossary["updated_at"] = datetime.now(timezone.utc).isoformat()

    if not dry_run:
        glossary_path.write_text(json.dumps(glossary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Trait aggiunti al glossario: {updated}")
    return glossary


def build_partner_export(
    output_path: Path,
    records: Sequence[TraitRecord],
    glossary: Mapping[str, object],
) -> None:
    traits_section = glossary.get("traits", {}) if isinstance(glossary, dict) else {}
    fieldnames = ["slug", "label_it", "label_en", "tier", "external_code", "status"]
    rows: List[Dict[str, str]] = []
    for record in records:
        if record.status not in {"missing_in_external", "missing_in_index"}:
            continue
        info = traits_section.get(record.slug, {}) if isinstance(traits_section, dict) else {}
        tier = record.external_tier or record.legacy_tier or ""
        rows.append(
            {
                "slug": record.slug,
                "label_it": info.get("label_it") or record.external_label or record.legacy_label or record.slug,
                "label_en": info.get("label_en") or record.external_label or record.legacy_label or record.slug,
                "tier": tier,
                "external_code": record.external_code or "",
                "status": record.status,
            }
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
    print(f"Export partner generato: {output_path} ({len(rows)} righe)")


def main() -> None:
    args = parse_args()
    records = read_gap_report(args.source)
    dry_run = args.dry_run or not args.update_glossary
    glossary = update_glossary(args.dest, args.trait_dir, records, dry_run=dry_run)
    if args.external_output:
        build_partner_export(args.external_output, records, glossary)


if __name__ == "__main__":
    main()
