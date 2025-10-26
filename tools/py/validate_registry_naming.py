#!/usr/bin/env python3
"""Convalida la nomenclatura slug e i mapping IT/EN dei registri ambientali."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Iterable

import yaml

SLUG_PATTERN = re.compile(r"^[a-z0-9_]+$")


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def load_yaml(path: Path):
    return yaml.safe_load(path.read_text(encoding="utf-8"))


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
    return set((hazard_registry.get("hazards") or {}).keys())


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

    trait_map = mappings.get("traits", {})
    for key, label in trait_map.items():
        if key not in traits:
            errors.append(
                f"config/project_index.json: mapping per tratto sconosciuto '{key}'"
            )
        elif not str(label).strip():
            errors.append(
                f"config/project_index.json: traduzione mancante per tratto '{key}'"
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
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_arguments(argv)

    trait_reference = load_json(args.trait_reference)
    env_rules = load_yaml(args.env_rules).get("rules", [])
    hazard_registry = load_yaml(args.hazards)
    biome_registry = load_yaml(args.biomes)
    project_index = load_json(args.project_index)

    errors: list[str] = []

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
        errors,
    )

    if errors:
        print("\n".join(f"- {msg}" for msg in errors), file=sys.stderr)
        return 1

    print("Nomenclatura e mapping registri: OK")
    return 0


if __name__ == "__main__":  # pragma: no cover - script CLI
    sys.exit(main())
