#!/usr/bin/env python3
"""Normalize trait metadata according to the styleguide."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict

from styleguide_utils import PROJECT_ROOT, normalize_slug


EDITORIAL_GLOSSARY = PROJECT_ROOT / "docs" / "editorial" / "trait_sources.json"


TRAITS_ROOT = PROJECT_ROOT / "data" / "traits"
TRAIT_INDEX = TRAITS_ROOT / "index.json"
TRAIT_AFFINITY = TRAITS_ROOT / "species_affinity.json"


TEXT_FIELDS = (
    "label",
    "descrizione",
    "mutazione_indotta",
    "uso_funzione",
    "spinta_selettiva",
    "debolezza",
)


def normalize_trait_id(value: str) -> str:
    """Return a snake_case identifier accepted by the styleguide."""

    cleaned = value.strip().lower()
    cleaned = re.sub(r"[^a-z0-9]+", "_", cleaned)
    cleaned = re.sub(r"_+", "_", cleaned)
    return cleaned.strip("_")


def ensure_text_references(payload: Dict[str, Any], trait_id: str) -> bool:
    """Convert textual fields to i18n references when needed."""

    changed = False
    for field in TEXT_FIELDS:
        value = payload.get(field)
        expected = f"i18n:traits.{trait_id}.{field}"
        if field == "label":
            if value != expected:
                payload[field] = expected
                changed = True
            continue
        if isinstance(value, str):
            normalised = value.strip()
            if normalised and not normalised.startswith("i18n:"):
                payload[field] = expected
                changed = True
        elif value is None:
            # Leave the field missing for optional descriptions.
            continue
        elif not isinstance(value, str):
            payload[field] = expected
            changed = True
    return changed


def load_source_slug_map(path: Path) -> Dict[str, str]:
    """Return a mapping of known editorial sources to canonical slugs."""

    if not path.exists():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    sources = raw.get("sources")
    alias_map: Dict[str, str] = {}
    if isinstance(sources, dict):
        for alias, slug in sources.items():
            if isinstance(alias, str) and isinstance(slug, str) and slug.strip():
                canonical = slug.strip()
                alias_map[alias.strip().lower()] = canonical
                alias_map[canonical.lower()] = canonical
        return alias_map
    if isinstance(sources, list):
        for entry in sources:
            if not isinstance(entry, dict):
                continue
            slug = entry.get("slug")
            if not isinstance(slug, str) or not slug.strip():
                continue
            canonical = slug.strip()
            alias_map[canonical.lower()] = canonical
            aliases = entry.get("aliases") or []
            if isinstance(aliases, list):
                for alias in aliases:
                    if isinstance(alias, str) and alias.strip():
                        alias_map[alias.strip().lower()] = canonical
    return alias_map


def ensure_data_origin(payload: Dict[str, Any], source_map: Dict[str, str]) -> bool:
    """Populate or normalise ``data_origin`` using the editorial source map."""

    if not source_map:
        return False
    current = payload.get("data_origin")
    if isinstance(current, str) and current.strip():
        normalised = source_map.get(current.strip().lower())
        if normalised and normalised != current.strip():
            payload["data_origin"] = normalised
            return True
        return False
    if current is not None and not isinstance(current, str):
        # Unexpected type, bail out.
        return False

    expansions: set[str] = set()
    requisiti = payload.get("requisiti_ambientali")
    if isinstance(requisiti, list):
        for requirement in requisiti:
            if not isinstance(requirement, dict):
                continue
            meta = requirement.get("meta")
            if not isinstance(meta, dict):
                continue
            expansion = meta.get("expansion")
            if isinstance(expansion, str) and expansion.strip():
                key = expansion.strip()
                mapped = source_map.get(key.lower())
                if mapped:
                    expansions.add(mapped)
    if len(expansions) == 1:
        payload["data_origin"] = expansions.pop()
        return True
    return False


def normalise_trait_payload(
    payload: Dict[str, Any],
    expected_id: str | None = None,
    *,
    convert_text: bool = True,
    source_map: Dict[str, str] | None = None,
    known_origins: Dict[str, str] | None = None,
) -> bool:
    changed = False
    trait_id = payload.get("id")
    normalised_id = normalize_trait_id(trait_id) if isinstance(trait_id, str) else ""
    target_id = ""
    if expected_id:
        target_id = normalize_trait_id(expected_id)
    elif normalised_id:
        target_id = normalised_id
    if target_id and trait_id != target_id:
        payload["id"] = target_id
        trait_id = target_id
        changed = True
    if convert_text and isinstance(trait_id, str) and trait_id:
        if ensure_text_references(payload, trait_id):
            changed = True
    if source_map and ensure_data_origin(payload, source_map):
        changed = True
    current_origin = payload.get("data_origin")
    if (
        known_origins
        and isinstance(trait_id, str)
        and trait_id in known_origins
        and (not isinstance(current_origin, str) or not current_origin.strip())
    ):
        payload["data_origin"] = known_origins[trait_id]
        changed = True
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
    has_data_origin = bool(payload.get("data_origin"))
    for key, value in {
        "has_biome": has_biome,
        "has_species_link": has_species,
        "has_data_origin": has_data_origin,
    }.items():
        if flags.get(key) != value:
            flags[key] = value
            changed = True
    normalized = {k: bool(v) for k, v in flags.items()}
    if payload.get("completion_flags") != normalized:
        payload["completion_flags"] = normalized
        changed = True
    return changed


def normalise_trait_files(
    root: Path, source_map: Dict[str, str], known_origins: Dict[str, str]
) -> int:
    updated = 0
    for path in sorted(root.glob("*/*.json")):
        if path.name == "index.json" or "_drafts" in path.parts:
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict) or "id" not in data:
            continue
        expected_id = path.stem
        if normalise_trait_payload(
            data, expected_id, source_map=source_map, known_origins=known_origins
        ):
            path.write_text(
                json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            updated += 1
        trait_id = data.get("id")
        origin = data.get("data_origin")
        if isinstance(trait_id, str) and isinstance(origin, str) and origin.strip():
            known_origins[trait_id] = origin.strip()
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


def normalise_trait_index(
    path: Path, source_map: Dict[str, str], known_origins: Dict[str, str]
) -> bool:
    data = json.loads(path.read_text(encoding="utf-8"))
    traits = data.get("traits") or {}
    changed = False
    for trait_id, trait in traits.items():
        if isinstance(trait, dict) and normalise_trait_payload(
            trait,
            trait_id,
            convert_text=False,
            source_map=source_map,
            known_origins=known_origins,
        ):
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
    source_map = load_source_slug_map(EDITORIAL_GLOSSARY)
    known_origins: Dict[str, str] = {}
    updated_files = normalise_trait_files(traits_root, source_map, known_origins)
    changed_affinity = normalise_affinity_table(TRAIT_AFFINITY)
    index_changed = normalise_trait_index(TRAIT_INDEX, source_map, known_origins)
    print(
        "Aggiornati {} file trait{}{}".format(
            updated_files,
            ", tabella affinity" if changed_affinity else "",
            ", index" if index_changed else "",
        )
    )


if __name__ == "__main__":
    main()
