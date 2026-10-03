#!/usr/bin/env python3
"""Audit repository datasets against the styleguide constraints."""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
from pathlib import Path
from typing import Any

import yaml

from styleguide_utils import PROJECT_ROOT, is_slug, normalize_slug


def gather_species_violations(species_root: Path) -> dict[str, list[dict[str, str]]]:
    issues: dict[str, list[dict[str, str]]] = {
        "non_slug_ids": [],
        "mismatched_filename": [],
    }
    for path in sorted(species_root.rglob("*.yaml")):
        if not path.is_file():
            continue
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
        except Exception as exc:  # pragma: no cover - corrupted file
            issues.setdefault("unreadable", []).append(
                {"path": str(path.relative_to(PROJECT_ROOT)), "error": str(exc)}
            )
            continue
        if not isinstance(data, dict):
            continue
        species_id = data.get("id")
        if not isinstance(species_id, str):
            continue
        rel = str(path.relative_to(PROJECT_ROOT))
        if not is_slug(species_id):
            issues["non_slug_ids"].append({"id": species_id, "path": rel})
        expected = normalize_slug(path.stem)
        if species_id != expected:
            issues["mismatched_filename"].append(
                {"id": species_id, "path": rel, "expected": expected}
            )
    return {key: value for key, value in issues.items() if value}


def gather_trait_violations(trait_index: Path) -> dict[str, Any]:
    payload = json.loads(trait_index.read_text(encoding="utf-8"))
    traits: dict[str, dict[str, Any]] = payload.get("traits", {})
    missing_flags: dict[str, list[str]] = {}
    non_slug_species: set[str] = set()
    for trait_id, data in traits.items():
        flags = data.get("completion_flags")
        required = {"has_biome", "has_species_link"}
        if not isinstance(flags, dict):
            missing_flags[trait_id] = sorted(required)
        else:
            missing = sorted(key for key in required if key not in flags)
            if missing:
                missing_flags[trait_id] = missing
        for entry in data.get("species_affinity", []) or []:
            if not isinstance(entry, dict):
                continue
            species_id = entry.get("species_id")
            if isinstance(species_id, str) and not is_slug(species_id):
                non_slug_species.add(species_id)
    issues: dict[str, Any] = {}
    if missing_flags:
        issues["missing_completion_flags"] = missing_flags
    if non_slug_species:
        issues["non_slug_species_refs"] = sorted(non_slug_species)
    return issues


def gather_catalog_violations(matrix_path: Path, quicklook_csv: Path) -> dict[str, Any]:
    issues: dict[str, Any] = {}
    data = json.loads(matrix_path.read_text(encoding="utf-8"))
    non_slug_species: list[str] = []
    for key in data.get("species", {}).keys():
        if not is_slug(key):
            non_slug_species.append(key)
    for key in data.get("events", {}).keys():
        if not is_slug(key):
            non_slug_species.append(key)
    if non_slug_species:
        issues["matrix_non_slug_keys"] = sorted(set(non_slug_species))

    taxonomy_flags: list[str] = []
    for entry in data.get("trophic_taxonomy", []) or []:
        playable = entry.get("playable_species")
        ambient = entry.get("ambient_species")
        for value in (playable, ambient):
            if isinstance(value, str) and not is_slug(value):
                taxonomy_flags.append(value)
    if taxonomy_flags:
        issues["trophic_taxonomy"] = sorted(set(taxonomy_flags))

    with quicklook_csv.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        bad_ids = [row["id_specie"] for row in reader if not is_slug(row["id_specie"])]
    if bad_ids:
        issues["quicklook_non_slug_ids"] = sorted(set(bad_ids))
    return issues


def gather_idea_taxonomy_violations(path: Path) -> dict[str, Any]:
    issues: dict[str, Any] = {}
    data = json.loads(path.read_text(encoding="utf-8"))
    species = data.get("species") or []
    non_slug_species = [value for value in species if isinstance(value, str) and not is_slug(value)]
    if non_slug_species:
        issues["species"] = sorted(set(non_slug_species))
    catalog = data.get("catalog") or {}
    catalog_flags: list[str] = []
    for entry in catalog.get("species", []) or []:
        slug = entry.get("slug")
        if isinstance(slug, str) and not is_slug(slug):
            catalog_flags.append(slug)
    if catalog_flags:
        issues["catalog_species"] = sorted(set(catalog_flags))
    return issues


def build_report() -> dict[str, Any]:
    species_root = PROJECT_ROOT / "packs" / "evo_tactics_pack" / "data" / "species"
    trait_index = PROJECT_ROOT / "data" / "traits" / "index.json"
    matrix = PROJECT_ROOT / "docs" / "catalog" / "species_trait_matrix.json"
    quicklook = PROJECT_ROOT / "docs" / "catalog" / "species_trait_quicklook.csv"
    idea_taxonomy = PROJECT_ROOT / "docs" / "public" / "idea-taxonomy.json"

    report: dict[str, Any] = {
        "generated_at": dt.datetime.utcnow().isoformat(timespec="seconds") + "Z",
    }
    species_issues = gather_species_violations(species_root)
    if species_issues:
        report["species"] = species_issues
    trait_issues = gather_trait_violations(trait_index)
    if trait_issues:
        report["traits"] = trait_issues
    catalog_issues = gather_catalog_violations(matrix, quicklook)
    if catalog_issues:
        report["catalog"] = catalog_issues
    idea_issues = gather_idea_taxonomy_violations(idea_taxonomy)
    if idea_issues:
        report["idea_taxonomy"] = idea_issues
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        help="Scrive il report JSON sul percorso indicato",
    )
    args = parser.parse_args()
    report = build_report()
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    else:
        print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
