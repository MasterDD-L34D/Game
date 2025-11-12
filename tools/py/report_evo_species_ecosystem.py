#!/usr/bin/env python3
"""Normalizza i cataloghi Evo specie/ecotipi e genera analisi gap con asset legacy."""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

try:  # pragma: no cover - PyYAML opzionale nei CI minimal
    import yaml
except ModuleNotFoundError:  # pragma: no cover - fallback controllato
    yaml = None  # type: ignore[assignment]

ROOT = Path(__file__).resolve().parents[2]

DEFAULT_SPECIES_CATALOG = ROOT / "data" / "external" / "evo" / "species" / "species_catalog.json"
DEFAULT_ECOTYPE_MAP = ROOT / "data" / "external" / "evo" / "species" / "species_ecotype_map.json"
DEFAULT_LEGACY_SPECIES = ROOT / "data" / "core" / "species.yaml"
DEFAULT_TERRAFORMING = ROOT / "biomes" / "terraforming_bands.yaml"
DEFAULT_TRAIT_MATRIX = ROOT / "reports" / "evo" / "rollout" / "traits_normalized.csv"
DEFAULT_OUTPUT_CSV = ROOT / "reports" / "evo" / "rollout" / "species_ecosystem_matrix.csv"
DEFAULT_REPORT_MD = ROOT / "reports" / "evo" / "rollout" / "species_ecosystem_gap.md"


class CatalogError(RuntimeError):
    """Errore logico nel caricamento dei dataset richiesti."""


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_yaml(path: Path) -> Mapping[str, Any]:
    if yaml is None:
        raise CatalogError(
            "Impossibile caricare file YAML: PyYAML non è disponibile. Installarlo per eseguire lo script."
        )
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    return data if isinstance(data, Mapping) else {}


def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return [dict(row) for row in reader]


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "_", value)
    value = value.strip("_")
    return value


@dataclass
class LegacySpecies:
    species_id: str
    biome_affinity: str | None
    default_slots: list[str]
    trait_slugs: set[str]


@dataclass
class TerraformingSummary:
    band_slots: list[int]
    stable_bands: int


@dataclass
class EcotypeRow:
    payload: dict[str, Any]


def build_trait_code_index(rows: Iterable[dict[str, str]]) -> dict[str, str]:
    index: dict[str, str] = {}
    for row in rows:
        code = row.get("trait_code")
        slug = row.get("slug")
        if code and slug:
            index[code] = slug
    return index


def build_legacy_species_index(data: Mapping[str, Any]) -> dict[str, LegacySpecies]:
    species_payload = data.get("species")
    if not isinstance(species_payload, Sequence):
        return {}
    index: dict[str, LegacySpecies] = {}
    for entry in species_payload:
        if not isinstance(entry, Mapping):
            continue
        legacy_id = entry.get("id")
        display_name = entry.get("display_name")
        reference = legacy_id or display_name
        if not isinstance(reference, str):
            continue
        slug = slugify(reference)
        default_parts = entry.get("default_parts")
        if isinstance(default_parts, Mapping):
            default_slots = []
            for slot_name, slot_value in default_parts.items():
                if not slot_name:
                    continue
                slot_name = str(slot_name)
                default_slots.append(slot_name)
                if isinstance(slot_value, str):
                    default_slots.append(f"{slot_name}:{slot_value}")
                elif isinstance(slot_value, Sequence):
                    for part in slot_value:
                        if part:
                            default_slots.append(f"{slot_name}:{part}")
        else:
            default_slots = []
        trait_plan = entry.get("trait_plan")
        trait_slugs: set[str] = set()
        if isinstance(trait_plan, Mapping):
            for roles in trait_plan.values():
                if isinstance(roles, Sequence):
                    for trait_id in roles:
                        if isinstance(trait_id, str) and trait_id:
                            trait_slugs.add(trait_id)
        biome_affinity = entry.get("biome_affinity")
        biome_affinity_str = str(biome_affinity) if isinstance(biome_affinity, str) else None
        index[slug] = LegacySpecies(
            species_id=str(legacy_id or slug),
            biome_affinity=biome_affinity_str,
            default_slots=default_slots,
            trait_slugs=trait_slugs,
        )
    return index


def build_terraforming_summary(data: Mapping[str, Any]) -> TerraformingSummary:
    bands = data.get("bands")
    slots: list[int] = []
    stable_count = 0
    if isinstance(bands, Mapping):
        for _, payload in sorted(bands.items()):
            if isinstance(payload, Mapping):
                value = payload.get("slots")
                if isinstance(value, int):
                    slots.append(value)
                if payload.get("stable") is True:
                    stable_count += 1
    slots = [slot for slot in slots if isinstance(slot, int)]
    return TerraformingSummary(band_slots=slots, stable_bands=stable_count)


def ensure_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, (tuple, set)):
        return list(value)
    return [value]


def build_normalised_rows(
    catalog: Mapping[str, Any],
    ecotypes: Mapping[str, Any],
    legacy_index: Mapping[str, LegacySpecies],
    trait_code_index: Mapping[str, str],
    terraforming: TerraformingSummary,
) -> list[EcotypeRow]:
    entries = ecotypes.get("entries")
    if not isinstance(entries, Sequence):
        raise CatalogError("Mappa ecotipi non valida: campo 'entries' mancante o non sequenza")
    catalog_entries = catalog.get("catalog")
    if not isinstance(catalog_entries, Sequence):
        raise CatalogError("Catalogo specie non valido: campo 'catalog' mancante o non sequenza")
    species_map: dict[str, Mapping[str, Any]] = {}
    for entry in catalog_entries:
        if not isinstance(entry, Mapping):
            continue
        name = entry.get("scientific_name")
        if not isinstance(name, str):
            continue
        species_map[slugify(name)] = entry

    rows: list[EcotypeRow] = []
    for item in entries:
        if not isinstance(item, Mapping):
            continue
        scientific = item.get("species")
        if not isinstance(scientific, str):
            continue
        slug = slugify(scientific)
        species_data = species_map.get(slug)
        trait_refs = ensure_list(species_data.get("trait_refs")) if species_data else []
        sentience = species_data.get("sentience_index") if isinstance(species_data, Mapping) else None
        legacy = legacy_index.get(slug)
        mapped_trait_slugs: set[str] = set()
        unknown_trait_refs: list[str] = []
        for trait_ref in trait_refs:
            if not isinstance(trait_ref, str):
                continue
            slug_value = trait_code_index.get(trait_ref)
            if slug_value:
                mapped_trait_slugs.add(slug_value)
            else:
                unknown_trait_refs.append(trait_ref)
        legacy_trait_slugs = legacy.trait_slugs if legacy else set()
        shared_traits = mapped_trait_slugs & legacy_trait_slugs
        traits_missing_in_legacy = sorted(mapped_trait_slugs - legacy_trait_slugs)
        legacy_missing_in_evo = sorted(legacy_trait_slugs - mapped_trait_slugs)
        payload: dict[str, Any] = {
            "species_scientific_name": scientific,
            "species_slug": slug,
            "sentience_index": sentience or None,
            "ecotype_id": item.get("ecotype_id"),
            "ecotype_label": item.get("label"),
            "biome_class": item.get("biome_class"),
            "matched_legacy_biome_ids": ";".join(
                sorted(
                    {
                        str(entry.get("biome_id"))
                        for entry in ensure_list(item.get("matched_ecosystems"))
                        if isinstance(entry, Mapping) and entry.get("biome_id")
                    }
                )
            ),
            "matched_legacy_biome_labels": ";".join(
                sorted(
                    {
                        str(entry.get("label"))
                        for entry in ensure_list(item.get("matched_ecosystems"))
                        if isinstance(entry, Mapping) and entry.get("label")
                    }
                )
            ),
            "matched_legacy_biome_count": sum(
                1
                for entry in ensure_list(item.get("matched_ecosystems"))
                if isinstance(entry, Mapping) and entry.get("biome_id")
            ),
            "unresolved_ecosystems_count": sum(
                1 for entry in ensure_list(item.get("unresolved_ecosystems")) if isinstance(entry, Mapping)
            ),
            "notes": item.get("notes") or None,
            "trait_refs_count": len(trait_refs),
            "mapped_trait_slugs_count": len(mapped_trait_slugs),
            "legacy_trait_slugs_count": len(legacy_trait_slugs),
            "shared_trait_slugs_count": len(shared_traits),
            "trait_refs_missing_in_legacy": ";".join(traits_missing_in_legacy) or None,
            "legacy_traits_missing_in_evo": ";".join(legacy_missing_in_evo) or None,
            "unknown_trait_refs": ";".join(sorted(unknown_trait_refs)) or None,
            "legacy_species_id": legacy.species_id if legacy else None,
            "legacy_biome_affinity": legacy.biome_affinity if legacy else None,
            "legacy_default_slots": ";".join(legacy.default_slots) if legacy else None,
            "legacy_default_slot_count": len(legacy.default_slots) if legacy else 0,
            "terraforming_band_slots": ";".join(str(slot) for slot in terraforming.band_slots),
            "terraforming_max_slots": max(terraforming.band_slots) if terraforming.band_slots else None,
            "terraforming_stable_bands": terraforming.stable_bands,
        }
        rows.append(EcotypeRow(payload=payload))
    return rows


def write_csv(path: Path, rows: Sequence[EcotypeRow]) -> None:
    if not rows:
        raise CatalogError("Nessuna riga generata: controllare i cataloghi di origine")
    headers = sorted(rows[0].payload.keys())
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers)
        writer.writeheader()
        for row in rows:
            writer.writerow(row.payload)


def compute_gap_summary(rows: Sequence[EcotypeRow]) -> dict[str, Any]:
    species_stats: dict[str, dict[str, Any]] = {}
    biome_gap_counter: defaultdict[str, int] = defaultdict(int)
    sentience_levels: defaultdict[str, int] = defaultdict(int)
    trait_miss_counter: int = 0
    slot_gap_species: set[str] = set()
    for row in rows:
        payload = row.payload
        slug = payload["species_slug"]
        stats = species_stats.setdefault(
            slug,
            {
                "scientific_name": payload["species_scientific_name"],
                "sentience_index": payload["sentience_index"] or "Unknown",
                "legacy_species_id": payload.get("legacy_species_id"),
                "legacy_trait_slugs_count": payload.get("legacy_trait_slugs_count", 0),
                "mapped_trait_slugs": set(),
                "unmatched_ecotypes": 0,
                "matched_ecotypes": 0,
                "unknown_trait_refs": set(),
                "legacy_traits_missing_in_evo": set(),
                "trait_refs_missing_in_legacy": set(),
                "legacy_default_slot_count": payload.get("legacy_default_slot_count", 0),
            },
        )
        if payload.get("matched_legacy_biome_count"):
            stats["matched_ecotypes"] += 1
        else:
            stats["unmatched_ecotypes"] += 1
            biome_gap_counter[payload.get("biome_class") or "unknown"] += 1
        trait_missing = payload.get("trait_refs_missing_in_legacy")
        if trait_missing:
            stats["trait_refs_missing_in_legacy"].update(trait_missing.split(";"))
        legacy_missing = payload.get("legacy_traits_missing_in_evo")
        if legacy_missing:
            stats["legacy_traits_missing_in_evo"].update(legacy_missing.split(";"))
        unknown_refs = payload.get("unknown_trait_refs")
        if unknown_refs:
            stats["unknown_trait_refs"].update(unknown_refs.split(";"))
        if payload.get("legacy_default_slot_count", 0) == 0:
            slot_gap_species.add(slug)
        if payload.get("trait_refs_missing_in_legacy") or payload.get("legacy_traits_missing_in_evo"):
            trait_miss_counter += 1
        sentience_levels[payload.get("sentience_index") or "Unknown"] += 1
    return {
        "species_stats": species_stats,
        "biome_gap_counter": dict(sorted(biome_gap_counter.items(), key=lambda item: (-item[1], item[0]))),
        "sentience_levels": dict(sorted(sentience_levels.items(), key=lambda item: item[0])),
        "species_with_slot_gaps": sorted(slot_gap_species),
        "rows_with_trait_mismatch": trait_miss_counter,
    }


def render_report(path: Path, summary: Mapping[str, Any], output_csv: Path) -> None:
    species_stats: Mapping[str, Mapping[str, Any]] = summary["species_stats"]
    biome_gap_counter: Mapping[str, int] = summary["biome_gap_counter"]
    sentience_levels: Mapping[str, int] = summary["sentience_levels"]
    slot_gap_species: Sequence[str] = summary["species_with_slot_gaps"]
    rows_with_trait_mismatch = summary["rows_with_trait_mismatch"]

    lines: list[str] = []
    lines.append("# Gap specie/ecosistemi Evo")
    lines.append("")
    lines.append(
        "Report generato da `tools/py/report_evo_species_ecosystem.py` consolidando il catalogo Evo con gli asset legacy."
    )
    lines.append("")
    lines.append(f"- Dataset normalizzato: `{output_csv.relative_to(ROOT)}`")
    lines.append(f"- Specie analizzate: {len(species_stats)}")
    lines.append(
        f"- Righe ecotipo: {sum(stat['matched_ecotypes'] + stat['unmatched_ecotypes'] for stat in species_stats.values())}"
    )
    lines.append(f"- Righe con mismatch trait ↔ legacy: {rows_with_trait_mismatch}")
    lines.append("")
    lines.append("## Distribuzione indici di sentienza")
    lines.append("")
    lines.append("| Indice | Conteggio |")
    lines.append("| --- | ---: |")
    for level, count in sentience_levels.items():
        lines.append(f"| {level} | {count} |")
    lines.append("")
    lines.append("## Gap ecosistemi per biome class")
    lines.append("")
    if biome_gap_counter:
        lines.append("| Biome class | Ecotipi senza match legacy |")
        lines.append("| --- | ---: |")
        for biome, count in biome_gap_counter.items():
            lines.append(f"| {biome} | {count} |")
    else:
        lines.append("Tutti gli ecotipi hanno un match legacy.")
    lines.append("")
    lines.append("## Dettaglio specie")
    lines.append("")
    lines.append(
        "| Specie | Sentienza | Legacy ID | Ecotipi allineati | Ecotipi scoperti | Trait Evo non in legacy | Trait legacy non coperti | Unknown trait refs | Slots legacy |"
    )
    lines.append("| --- | --- | --- | ---: | ---: | --- | --- | --- | ---: |")
    for stats in species_stats.values():
        lines.append(
            "| {scientific_name} | {sentience_index} | {legacy_species_id} | {matched_ecotypes} | {unmatched_ecotypes} | {missing_evo} | {missing_legacy} | {unknown} | {slots} |".format(
                scientific_name=stats["scientific_name"],
                sentience_index=stats["sentience_index"],
                legacy_species_id=stats.get("legacy_species_id") or "—",
                matched_ecotypes=stats.get("matched_ecotypes", 0),
                unmatched_ecotypes=stats.get("unmatched_ecotypes", 0),
                missing_evo=", ".join(sorted(stats.get("trait_refs_missing_in_legacy", []))) or "—",
                missing_legacy=", ".join(sorted(stats.get("legacy_traits_missing_in_evo", []))) or "—",
                unknown=", ".join(sorted(stats.get("unknown_trait_refs", []))) or "—",
                slots=stats.get("legacy_default_slot_count", 0),
            )
        )
    lines.append("")
    lines.append("## Slot legacy mancanti")
    lines.append("")
    if slot_gap_species:
        lines.append("Specie prive di slot legacy predefiniti: " + ", ".join(sorted(slot_gap_species)))
    else:
        lines.append("Tutte le specie hanno slot legacy associati.")
    lines.append("")
    lines.append("## Dipendenze gameplay/telemetria")
    lines.append("")
    lines.append(
        "- Eventi `biome_param_changed`, `band_reached`, `slot_unlocked` definiti in `biomes/terraforming_bands.yaml`: aggiornare gli ingest consumer di telemetria affinché accettino payload con `biome_class` e `ecotype_id` derivati dal dataset normalizzato."
    )
    lines.append(
        "- Gli aggregatori (`server/services/nebulaTelemetryAggregator.js`) devono introdurre fallback per il conteggio di slot sfruttando `terraforming_max_slots` quando `legacy_default_slot_count` è zero."
    )
    lines.append(
        "- I controller Atlas (`server/controllers/atlasController.js`) dovrebbero arricchire i payload delle timeline con il campo `sentience_index` per consentire filtri cross-feature durante il rollout Evo."
    )
    lines.append(
        "- Aggiornare i bundle di mock telemetry (`server/app.js` → `loadMockTelemetry`) includendo i nuovi eventi per evitare errori di validazione schema."
    )
    lines.append("")
    lines.append("## Milestone rollout proposte")
    lines.append("")
    lines.append("1. **Dataset pilota** (Settimana 1): validare due specie con match biome completo (`Chemnotela toxica`, `Elastovaranus hydrus`).")
    lines.append("2. **Integrazione telemetria** (Settimana 2): aggiornare consumer e mock per nuovi eventi, attivare monitor `biome_param_changed`.")
    lines.append(
        "3. **Copertura ecosistemi critici** (Settimana 3): colmare biome class `acquatico_costiero` e `sotterraneo` introducendo fallback slot e definendo nuove entry legacy."
    )
    lines.append(
        "4. **Rollout completo** (Settimana 4): abilitare tutte le specie con verifica incrociata trait↔legacy e aggiornamento documentazione atlas."
    )
    lines.append("")

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=DEFAULT_SPECIES_CATALOG)
    parser.add_argument("--ecotypes", type=Path, default=DEFAULT_ECOTYPE_MAP)
    parser.add_argument("--legacy-species", dest="legacy_species", type=Path, default=DEFAULT_LEGACY_SPECIES)
    parser.add_argument("--terraforming", type=Path, default=DEFAULT_TERRAFORMING)
    parser.add_argument("--traits", type=Path, default=DEFAULT_TRAIT_MATRIX)
    parser.add_argument("--output-csv", dest="output_csv", type=Path, default=DEFAULT_OUTPUT_CSV)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT_MD)
    args = parser.parse_args(argv)

    catalog = load_json(args.catalog)
    ecotypes = load_json(args.ecotypes)
    legacy_data = load_yaml(args.legacy_species)
    terraforming_data = load_yaml(args.terraforming)
    trait_rows = load_csv(args.traits)

    legacy_index = build_legacy_species_index(legacy_data)
    terraforming_summary = build_terraforming_summary(terraforming_data)
    trait_code_index = build_trait_code_index(trait_rows)

    rows = build_normalised_rows(catalog, ecotypes, legacy_index, trait_code_index, terraforming_summary)
    write_csv(args.output_csv, rows)

    summary = compute_gap_summary(rows)
    render_report(args.report, summary, args.output_csv)

    return 0


if __name__ == "__main__":  # pragma: no cover - entry point script
    sys.exit(main())
