#!/usr/bin/env python3
"""Normalize trait metadata according to the styleguide."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict

from styleguide_utils import PROJECT_ROOT, normalize_slug


TRAITS_ROOT = PROJECT_ROOT / "data" / "traits"
TRAIT_INDEX = TRAITS_ROOT / "index.json"
TRAIT_AFFINITY = TRAITS_ROOT / "species_affinity.json"


def normalise_trait_payload(payload: Dict[str, Any]) -> bool:
    changed = False
    affinity = payload.get("species_affinity")
    if isinstance(affinity, list):
        for entry in affinity:
            if not isinstance(entry, dict):
                continue
            species_id = entry.get("species_id")
            if isinstance(species_id, str):
                normalised = normalize_slug(species_id)
                if normalised and normalised != species_id:
                    entry["species_id"] = normalised
                    changed = True
    flags = payload.get("completion_flags")
    if not isinstance(flags, dict):
        flags = {}
        changed = True
    has_biome = bool(payload.get("biome_tags")) or bool(payload.get("requisiti_ambientali"))
    has_species = bool(payload.get("species_affinity"))
    for key, value in {"has_biome": has_biome, "has_species_link": has_species}.items():
        if flags.get(key) != value:
            flags[key] = value
            changed = True
    normalized = {k: bool(v) for k, v in flags.items()}
    if payload.get("completion_flags") != normalized:
        payload["completion_flags"] = normalized
        changed = True
    return changed


def normalise_trait_files(root: Path) -> int:
    updated = 0
    for path in sorted(root.glob("*/*.json")):
        if path.name == "index.json" or "_drafts" in path.parts:
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict) or "id" not in data:
            continue
        if normalise_trait_payload(data):
            path.write_text(
                json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            updated += 1
    return updated


def normalise_affinity_table(path: Path) -> bool:
    if not path.exists():
        return False
    data = json.loads(path.read_text(encoding="utf-8"))
    changed = False
    for entries in data.values():
        if not isinstance(entries, list):
            continue
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            species_id = entry.get("species_id")
            if isinstance(species_id, str):
                normalised = normalize_slug(species_id)
                if normalised and normalised != species_id:
                    entry["species_id"] = normalised
                    changed = True
    if changed:
        path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    return changed


def normalise_trait_index(path: Path) -> bool:
    data = json.loads(path.read_text(encoding="utf-8"))
    traits = data.get("traits") or {}
    changed = False
    for trait in traits.values():
        if isinstance(trait, dict) and normalise_trait_payload(trait):
            changed = True
    if changed:
        path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    return changed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--traits-root",
        type=Path,
        default=TRAITS_ROOT,
        help="Directory dei file trait",
    )
    args = parser.parse_args()
    traits_root = args.traits_root.resolve()
    updated_files = normalise_trait_files(traits_root)
    changed_affinity = normalise_affinity_table(TRAIT_AFFINITY)
    index_changed = normalise_trait_index(TRAIT_INDEX)
    print(
        "Aggiornati {} file trait{}{}".format(
            updated_files,
            ", tabella affinity" if changed_affinity else "",
            ", index" if index_changed else "",
        )
    )


if __name__ == "__main__":
    main()
