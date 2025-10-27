#!/usr/bin/env python3
"""Convalida la nomenclatura slug e i mapping IT/EN dei registri ambientali."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections.abc import Mapping
from pathlib import Path
from typing import Iterable

import yaml

SLUG_PATTERN = re.compile(r"^[a-z0-9_]+$")
PROJECT_ROOT = Path(__file__).resolve().parents[2]


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def load_yaml(path: Path):
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def load_structured(path: Path):
    if path.suffix.lower() in {".yaml", ".yml"}:
        return load_yaml(path)
    return load_json(path)


def resolve_path(value: str | Path | None, *anchors: Path) -> Path | None:
    if not value:
        return None

    candidate = Path(value)
    if candidate.is_absolute():
        return candidate

    for anchor in anchors:
        resolved = (anchor / candidate).resolve()
        if resolved.exists():
            return resolved

    return (anchors[0] / candidate).resolve() if anchors else candidate.resolve()


def check_slug(value: str, context: str, errors: list[str]) -> None:
    if not SLUG_PATTERN.fullmatch(value):
        errors.append(f"{context}: '{value}' non è uno slug valido")


def gather_trait_ids(reference: dict) -> set[str]:
    return set(reference.get("traits", {}).keys())


def gather_salinity_rules(rules: Iterable[dict]) -> set[str]:
    values: set[str] = set()
    for rule in rules:
        cond = rule.get("when") or {}
        for item in cond.get("salinita_in", []) or []:
            values.add(item)
    return values


def validate_trait_reference(trait_reference: dict, errors: list[str]) -> set[str]:
    trait_ids = gather_trait_ids(trait_reference)
    for trait_id in trait_ids:
        check_slug(trait_id, "trait_reference", errors)
    return trait_ids


def validate_env_rules(rules: list[dict], known_traits: set[str], errors: list[str]) -> None:
    for index, rule in enumerate(rules, start=1):
        suggestion = rule.get("suggest") or {}
        for trait in suggestion.get("traits", []) or []:
            check_slug(trait, f"rule[{index}].traits", errors)


def gather_hazard_ids(hazard_registry: dict) -> set[str]:
    hazards = hazard_registry.get("hazards") or []
    if isinstance(hazards, dict):
        return set(hazards.keys())

    found: set[str] = set()
    for entry in hazards:
        if isinstance(entry, dict):
            hid = entry.get("id")
            if hid:
                found.add(str(hid))
        elif isinstance(entry, str):
            found.add(entry)
    return found


def gather_biome_classes(biome_registry: dict) -> set[str]:
    return set(biome_registry.get("classes", []))


def gather_koppen_codes(biome_registry: dict) -> set[str]:
    codes: set[str] = set()
    for values in (biome_registry.get("koppen_examples") or {}).values():
        codes.update(values)
    return codes


def gather_morphotypes(species_root: Path) -> set[str]:
    morphotypes: set[str] = set()
    for yaml_path in species_root.rglob("*.yaml"):
        data = load_yaml(yaml_path)
        if isinstance(data, dict):
            mt = data.get("morphotype")
            if mt:
                morphotypes.add(mt)
    return morphotypes


def validate_project_index(
    project_index: dict,
    traits: set[str],
    hazards: set[str],
    biome_classes: set[str],
    morphotypes: set[str],
    salinity_values: set[str],
    koppen_codes: set[str],
    trait_glossary: Mapping[str, Mapping],
    glossary_path: Path | None,
    errors: list[str],
) -> None:
    weights = project_index.get("weights", {})
    if not weights:
        errors.append("config/project_index.json: manca la sezione 'weights'")
    else:
        total = sum(weights.values())
        if abs(total - 1.0) > 1e-6:
            errors.append(
                f"config/project_index.json: i pesi devono sommare a 1.0 (attuale {total:.4f})"
            )
        for key, value in weights.items():
            if value <= 0:
                errors.append(f"config/project_index.json: peso '{key}' deve essere positivo")

    mappings = project_index.get("mappings", {})
    hazard_map = mappings.get("hazards", {})
    missing_hazards = hazards.difference(hazard_map.keys())
    if missing_hazards:
        errors.append(
            "config/project_index.json: mapping mancante per hazard "
            + ", ".join(sorted(missing_hazards))
        )
    else:
        for key, label in hazard_map.items():
            if not str(label).strip():
                errors.append(f"config/project_index.json: hazard '{key}' senza traduzione")

    biome_map = mappings.get("biome_classes", {})
    missing_biomes = biome_classes.difference(biome_map.keys())
    if missing_biomes:
        errors.append(
            "config/project_index.json: mapping mancante per biomi "
            + ", ".join(sorted(missing_biomes))
        )

    morpho_map = mappings.get("morphotypes", {})
    missing_morphotypes = morphotypes.difference(morpho_map.keys())
    if missing_morphotypes:
        errors.append(
            "config/project_index.json: mapping mancante per morphotype "
            + ", ".join(sorted(missing_morphotypes))
        )

    salinity_map = mappings.get("salinity", {})
    missing_salinity = salinity_values.difference(salinity_map.keys())
    if missing_salinity:
        errors.append(
            "config/project_index.json: mapping mancante per salinità "
            + ", ".join(sorted(missing_salinity))
        )

    koppen_map = mappings.get("koppen", {})
    missing_koppen = koppen_codes.difference(koppen_map.keys())
    if missing_koppen:
        errors.append(
            "config/project_index.json: mapping mancante per codici Köppen "
            + ", ".join(sorted(missing_koppen))
        )

    trait_map = mappings.get("traits")
    if isinstance(trait_map, dict):
        for key, label in trait_map.items():
            if key not in traits:
                errors.append(
                    f"config/project_index.json: mapping per tratto sconosciuto '{key}'"
                )
            elif not str(label).strip():
                errors.append(
                    f"config/project_index.json: traduzione mancante per tratto '{key}'"
                )

    if not trait_glossary:
        target = str(glossary_path) if glossary_path else "data/traits/glossary.json"
        errors.append(f"{target}: glossario tratti mancante o vuoto")
        return

    unknown_entries = sorted(set(trait_glossary.keys()) - traits)
    if unknown_entries:
        target = str(glossary_path) if glossary_path else "glossario tratti"
        errors.append(
            f"{target}: entry per tratti non presenti nel reference: "
            + ", ".join(unknown_entries)
        )

    missing_entries = sorted(traits - set(trait_glossary.keys()))
    if missing_entries:
        target = str(glossary_path) if glossary_path else "glossario tratti"
        errors.append(
            f"{target}: mancano le entry per i tratti " + ", ".join(missing_entries)
        )

    for trait_id in sorted(traits):
        entry = trait_glossary.get(trait_id) or {}
        if not isinstance(entry, Mapping):
            entry = {}
        label_it = str(entry.get("label_it", "")).strip()
        label_en = str(entry.get("label_en", "")).strip()
        if not label_it and not label_en:
            target = str(glossary_path) if glossary_path else "glossario tratti"
            errors.append(
                f"{target}: tratto '{trait_id}' privo di label_it/label_en"
            )


def parse_arguments(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--project-index",
        type=Path,
        default=Path("config/project_index.json"),
        help="Percorso al file di mapping IT/EN",
    )
    parser.add_argument(
        "--trait-reference",
        type=Path,
        default=Path("docs/evo-tactics-pack/trait-reference.json"),
        help="File JSON del trait reference",
    )
    parser.add_argument(
        "--env-rules",
        type=Path,
        default=Path("packs/evo_tactics_pack/tools/config/registries/env_to_traits.yaml"),
        help="Registro YAML delle regole ambientali",
    )
    parser.add_argument(
        "--hazards",
        type=Path,
        default=Path("packs/evo_tactics_pack/tools/config/registries/hazards.yaml"),
        help="Registro YAML degli hazard",
    )
    parser.add_argument(
        "--biomes",
        type=Path,
        default=Path("packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml"),
        help="Registro YAML delle classi di bioma",
    )
    parser.add_argument(
        "--species-root",
        type=Path,
        default=Path("packs/evo_tactics_pack/data/species"),
        help="Directory radice contenente le specie per estrarre i morphotype",
    )
    parser.add_argument(
        "--trait-glossary",
        type=Path,
        default=None,
        help="Percorso del glossario tratti centralizzato (override)",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_arguments(argv)

    trait_reference = load_json(args.trait_reference)
    env_rules = load_yaml(args.env_rules).get("rules", [])
    hazard_registry = load_yaml(args.hazards)
    biome_registry = load_yaml(args.biomes)
    project_index = load_json(args.project_index)

    errors: list[str] = []

    glossary_hint = args.trait_glossary or (project_index.get("glossaries", {}) or {}).get("traits")
    glossary_path: Path | None = None
    trait_glossary: Mapping[str, Mapping] = {}

    if glossary_hint:
        glossary_path = resolve_path(
            glossary_hint,
            args.project_index.parent,
            Path.cwd(),
            PROJECT_ROOT,
        )
        if glossary_path and glossary_path.exists():
            try:
                glossary_data = load_structured(glossary_path)
            except Exception as exc:  # pragma: no cover - errore IO
                errors.append(f"{glossary_path}: errore caricamento glossario ({exc})")
            else:
                entries = glossary_data.get("traits") if isinstance(glossary_data, Mapping) else None
                if isinstance(entries, Mapping):
                    trait_glossary = {
                        str(trait_id): value if isinstance(value, Mapping) else {}
                        for trait_id, value in entries.items()
                    }
                else:
                    errors.append(f"{glossary_path}: sezione 'traits' mancante o non valida")
        else:
            errors.append(f"{glossary_hint}: glossario tratti non trovato")
    else:
        errors.append(
            "config/project_index.json: manca glossaries.traits o parametro --trait-glossary"
        )

    trait_ids = validate_trait_reference(trait_reference, errors)
    validate_env_rules(env_rules, trait_ids, errors)

    hazards = gather_hazard_ids(hazard_registry)
    biome_classes = gather_biome_classes(biome_registry)
    koppen_codes = gather_koppen_codes(biome_registry)
    morphotypes = gather_morphotypes(args.species_root)
    salinity_values = gather_salinity_rules(env_rules)

    validate_project_index(
        project_index,
        trait_ids,
        hazards,
        biome_classes,
        morphotypes,
        salinity_values,
        koppen_codes,
        trait_glossary,
        glossary_path,
        errors,
    )

    if errors:
        print("\n".join(f"- {msg}" for msg in errors), file=sys.stderr)
        return 1

    print("Nomenclatura e mapping registri: OK")
    return 0


if __name__ == "__main__":  # pragma: no cover - script CLI
    sys.exit(main())
