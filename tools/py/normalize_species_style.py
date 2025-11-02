#!/usr/bin/env python3
"""Normalize species identifiers, filenames and references to snake_case slugs."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable

import yaml

from styleguide_utils import PROJECT_ROOT, normalize_slug


SPECIES_ROOT = PROJECT_ROOT / "packs" / "evo_tactics_pack" / "data" / "species"
PACK_SPECIES_CATALOG = PROJECT_ROOT / "packs" / "evo_tactics_pack" / "data" / "species.yaml"
ECOSYSTEMS_ROOT = PROJECT_ROOT / "packs" / "evo_tactics_pack" / "data" / "ecosystems"
FOODWEBS_ROOT = PROJECT_ROOT / "packs" / "evo_tactics_pack" / "data" / "foodwebs"
PACK_DOCS_ROOT = PROJECT_ROOT / "packs" / "evo_tactics_pack" / "docs" / "catalog"
GLOBAL_DOCS_ROOT = PROJECT_ROOT / "docs" / "catalog"
IDEA_TAXONOMY = PROJECT_ROOT / "docs" / "public" / "idea-taxonomy.json"
PACK_NPG = PROJECT_ROOT / "packs" / "evo_tactics_pack" / "data" / "npg"


def _read_yaml(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))



def normalise_species_files(root: Path) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for path in sorted(root.rglob("*.yaml")):
        if not path.is_file():
            continue
        data = _read_yaml(path)
        if not isinstance(data, dict):
            continue
        species_id = data.get("id")
        if not isinstance(species_id, str):
            continue
        target_id = normalize_slug(species_id)
        target_stem = normalize_slug(path.stem)
        changed = False
        if target_id and target_id != species_id:
            text = path.read_text(encoding="utf-8")
            text = text.replace(f"id: {species_id}", f"id: {target_id}")
            path.write_text(text, encoding="utf-8")
            changed = True
        new_path = path
        if target_stem and target_stem != path.stem:
            new_path = path.with_name(f"{target_stem}{path.suffix}")
            path.rename(new_path)
            changed = True
        if changed and species_id:
            mapping[species_id] = target_id or species_id
    return mapping


def replace_in_text(path: Path, mapping: dict[str, str]) -> bool:
    text = path.read_text(encoding="utf-8")
    updated = text
    for old, new in mapping.items():
        updated = updated.replace(old, new)
    if updated != text:
        path.write_text(updated, encoding="utf-8")
        return True
    return False


def replace_in_json(path: Path, mapping: dict[str, str]) -> bool:
    payload = json.loads(path.read_text(encoding="utf-8"))

    def transform(value):
        if isinstance(value, dict):
            return {mapping.get(k, k): transform(v) for k, v in value.items()}
        if isinstance(value, list):
            return [transform(item) for item in value]
        if isinstance(value, str):
            new_value = mapping.get(value, value)
            if new_value == value:
                for old, new in mapping.items():
                    if old in new_value:
                        new_value = new_value.replace(old, new)
            return new_value
        return value

    transformed = transform(payload)
    if transformed != payload:
        path.write_text(
            json.dumps(transformed, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        return True
    return False


def replace_in_csv(path: Path, mapping: dict[str, str]) -> bool:
    import csv

    changed = False
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
        fieldnames = reader.fieldnames or []
    for row in rows:
        slug = row.get("id_specie")
        if isinstance(slug, str) and slug in mapping:
            row["id_specie"] = mapping[slug]
            changed = True
    if changed:
        with path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
    return changed


def update_html_files(files: Iterable[Path], mapping: dict[str, str]) -> None:
    for path in files:
        replace_in_text(path, mapping)


def update_yaml_directories(directories: Iterable[Path], mapping: dict[str, str]) -> None:
    for directory in directories:
        if not directory.exists():
            continue
        for path in directory.rglob("*.yaml"):
            replace_in_text(path, mapping)


def update_pack_docs(mapping: dict[str, str]) -> None:
    html_files = [PACK_DOCS_ROOT / "index.html", PACK_DOCS_ROOT / "species_index.html"]
    html_files.extend((PACK_DOCS_ROOT / "biomes").glob("*.html"))
    update_html_files(html_files, mapping)

    json_targets = [
        PACK_DOCS_ROOT / "catalog_data.json",
        GLOBAL_DOCS_ROOT / "catalog_data.json",
        GLOBAL_DOCS_ROOT / "species_trait_matrix.json",
    ]
    for target in json_targets:
        replace_in_json(target, mapping)

    replace_in_csv(GLOBAL_DOCS_ROOT / "species_trait_quicklook.csv", mapping)
    replace_in_json(IDEA_TAXONOMY, mapping)


def update_pack_data(mapping: dict[str, str]) -> None:
    replace_in_text(PACK_SPECIES_CATALOG, mapping)
    update_yaml_directories([ECOSYSTEMS_ROOT, FOODWEBS_ROOT], mapping)
    if PACK_NPG.exists():
        for path in PACK_NPG.glob("*.json"):
            replace_in_json(path, mapping)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--species-root",
        type=Path,
        default=SPECIES_ROOT,
        help="Directory radice delle specie da normalizzare",
    )
    args = parser.parse_args()
    species_root = args.species_root.resolve()
    mapping = normalise_species_files(species_root)
    if not mapping:
        print("Nessuna specie da aggiornare")
        return
    update_pack_data(mapping)
    update_pack_docs(mapping)
    print(f"Specie normalizzate: {len(mapping)}")


if __name__ == "__main__":
    main()
