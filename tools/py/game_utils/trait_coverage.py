"""Utility per generare report di coverage trait↔bioma↔forma."""

from __future__ import annotations

from collections import Counter, defaultdict
from collections.abc import Iterable, Mapping
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import json

try:  # pragma: no cover - compatibilità ambienti minimal
    import yaml
except ModuleNotFoundError:  # pragma: no cover
    yaml = None


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def _load_json(path: Path) -> Mapping[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _load_yaml(path: Path) -> Mapping[str, Any]:
    if yaml is None:
        raise RuntimeError(
            f"Impossibile caricare {path}: PyYAML non è disponibile nell'ambiente."
        )
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def _ensure_list(value: Iterable | None) -> list:
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        return list(value)
    return [value]


def _resolve_path(hint: str | Path | None, *anchors: Path) -> Path | None:
    if not hint:
        return None

    candidate = Path(hint)
    if candidate.is_absolute() and candidate.exists():
        return candidate

    for anchor in anchors:
        if anchor:
            resolved = (anchor / candidate).resolve()
            if resolved.exists():
                return resolved

    fallback = (PROJECT_ROOT / candidate).resolve()
    return fallback if fallback.exists() else None


def _format_combo_key(combo: tuple[str | None, str | None]) -> dict[str, str | None]:
    biome, morph = combo
    return {"biome": biome, "morphotype": morph}


def _combo_sort_key(combo: tuple[str | None, str | None]) -> tuple[str, str]:
    biome, morph = combo
    return ((biome or ""), (morph or ""))


def _counter_to_rows(
    counter: Counter[tuple[str | None, str | None]],
    examples: Mapping[tuple[str | None, str | None], set[str]] | None = None,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for combo in sorted(counter.keys(), key=_combo_sort_key):
        row = _format_combo_key(combo)
        row["count"] = counter[combo]
        if examples:
            sample = sorted(examples.get(combo, []))
            if sample:
                row["examples"] = sample[:5]
        rows.append(row)
    return rows


def _gather_species_paths(root: Path) -> list[Path]:
    if root.is_file():
        return [root]
    return sorted(path for path in root.rglob("*.yaml") if path.is_file())


def generate_trait_coverage(
    env_traits_path: Path,
    trait_reference_path: Path,
    species_root: Path,
    trait_glossary_path: Path | None = None,
) -> dict[str, Any]:
    """Calcola matrici di coverage trait↔bioma↔forma."""

    env_data = _load_json(env_traits_path)
    trait_data = _load_json(trait_reference_path)

    if trait_glossary_path and not isinstance(trait_glossary_path, Path):
        trait_glossary_path = Path(trait_glossary_path)

    if trait_glossary_path is None:
        trait_glossary_path = _resolve_path(
            env_data.get("trait_glossary")
            or trait_data.get("trait_glossary"),
            env_traits_path.parent,
            trait_reference_path.parent,
        )

    glossary: Mapping[str, Mapping] = {}
    if trait_glossary_path and trait_glossary_path.exists():
        glossary = _load_json(trait_glossary_path)
        if not isinstance(glossary, Mapping):
            glossary = {}
        else:
            glossary = glossary.get("traits", {})
    else:
        trait_glossary_path = None

    target_traits = set(trait_data.get("traits", {}).keys())

    rule_matrix: dict[str, Counter] = defaultdict(Counter)
    species_matrix: dict[str, Counter] = defaultdict(Counter)
    species_examples: dict[str, dict[tuple[str | None, str | None], set[str]]] = defaultdict(
        lambda: defaultdict(set)
    )

    for rule in env_data.get("rules", []):
        conditions = rule.get("when") or {}
        biome = conditions.get("biome_class")
        morph = conditions.get("morphotype")
        traits = _ensure_list((rule.get("suggest") or {}).get("traits"))
        for trait_id in traits:
            if trait_id not in target_traits:
                continue
            rule_matrix[trait_id][(biome, morph)] += 1

    foodweb_roles: dict[str, dict[str, list[dict[str, Any]]]] = defaultdict(
        lambda: defaultdict(list)
    )

    for species_path in _gather_species_paths(species_root):
        data = _load_yaml(species_path)
        if not isinstance(data, Mapping):
            continue
        species_id = str(data.get("id") or species_path.stem)
        morph = data.get("morphotype")
        biomes = _ensure_list(data.get("biomes"))
        if not biomes:
            affinity = data.get("environment_affinity") or {}
            biome_cls = affinity.get("biome_class")
            if biome_cls:
                biomes = [biome_cls]
        suggested = _ensure_list(
            (data.get("derived_from_environment") or {}).get("suggested_traits")
        )
        traits = [trait for trait in suggested if trait in target_traits]
        trophic_role = data.get("role_trofico") or data.get("role")
        playable = bool(data.get("playable_unit"))
        if trophic_role and biomes:
            signature_traits = traits[:3]
            for biome in biomes:
                entry = {
                    "id": species_id,
                    "playable_unit": playable,
                    "core_traits": signature_traits,
                    "source": str(species_path),
                }
                foodweb_roles[trophic_role][biome].append(entry)
        if not traits:
            continue
        combos = []
        if biomes:
            combos = [(biome, morph) for biome in biomes]
        else:
            combos = [(None, morph)]
        for trait_id in traits:
            rule_counter = rule_matrix.get(trait_id, Counter())
            for combo in combos:
                species_matrix[trait_id][combo] += 1
                species_examples[trait_id][combo].add(species_id)

                biome, morph_combo = combo
                if (
                    morph_combo is not None
                    and rule_counter
                    and (biome, None) in rule_counter
                ):
                    wildcard_combo = (biome, None)
                    species_matrix[trait_id][wildcard_combo] += 1
                    species_examples[trait_id][wildcard_combo].add(species_id)

    summary = {
        "traits_total": len(target_traits),
        "traits_with_rules": 0,
        "traits_with_species": 0,
        "rule_combos_total": 0,
        "species_combos_total": 0,
        "rules_missing_species_total": 0,
    }

    report_traits: dict[str, Any] = {}
    traits_missing_species: list[str] = []
    traits_missing_rules: list[str] = []

    for trait_id in sorted(target_traits):
        rule_counter = rule_matrix.get(trait_id, Counter())
        species_counter = species_matrix.get(trait_id, Counter())

        if rule_counter:
            summary["traits_with_rules"] += 1
        if species_counter:
            summary["traits_with_species"] += 1

        summary["rule_combos_total"] += len(rule_counter)
        summary["species_combos_total"] += len(species_counter)

        rule_rows = _counter_to_rows(rule_counter)
        species_rows = _counter_to_rows(
            species_counter, species_examples.get(trait_id, {})
        )

        rule_keys = set(rule_counter.keys())
        species_keys = set(species_counter.keys())

        missing_in_species: list[dict[str, str | None]] = []
        for combo in sorted(rule_keys, key=_combo_sort_key):
            biome, morph = combo
            if morph is None:
                if not any(biome == species_biome for species_biome, _ in species_keys):
                    missing_in_species.append(_format_combo_key(combo))
            else:
                if combo not in species_keys and (biome, None) not in species_keys:
                    missing_in_species.append(_format_combo_key(combo))

        missing_in_rules: list[dict[str, str | None]] = []
        for combo in sorted(species_keys, key=_combo_sort_key):
            biome, morph = combo
            if morph is None:
                if not any(biome == rule_biome for rule_biome, _ in rule_keys):
                    missing_in_rules.append(_format_combo_key(combo))
            else:
                if combo not in rule_keys and (biome, None) not in rule_keys:
                    missing_in_rules.append(_format_combo_key(combo))

        summary["rules_missing_species_total"] += len(missing_in_species)
        if missing_in_species and rule_counter:
            traits_missing_species.append(trait_id)
        if missing_in_rules and species_counter:
            traits_missing_rules.append(trait_id)

        glossary_entry = glossary.get(trait_id) if isinstance(glossary, Mapping) else None
        label_it = glossary_entry.get("label_it") if isinstance(glossary_entry, Mapping) else None
        label_en = glossary_entry.get("label_en") if isinstance(glossary_entry, Mapping) else None
        description_it = (
            glossary_entry.get("description_it") if isinstance(glossary_entry, Mapping) else None
        )
        description_en = (
            glossary_entry.get("description_en") if isinstance(glossary_entry, Mapping) else None
        )

        report_traits[trait_id] = {
            "label_it": label_it,
            "label_en": label_en,
            "description_it": description_it,
            "description_en": description_en,
            "rules": {
                "total": sum(rule_counter.values()),
                "coverage": rule_rows,
            },
            "species": {
                "total": sum(species_counter.values()),
                "coverage": species_rows,
            },
            "diff": {
                "missing_in_species": missing_in_species,
                "missing_in_rules": missing_in_rules,
            },
        }

    summary["traits_missing_species"] = traits_missing_species
    summary["traits_missing_rules"] = traits_missing_rules

    foodweb_threshold = 2
    foodweb_report: dict[str, Any] = {
        "schema_version": "1.0",
        "thresholds": {"species_per_role_biome": foodweb_threshold},
        "roles": {},
    }
    for role, biome_map in sorted(foodweb_roles.items()):
        role_entry: dict[str, Any] = {"total_species": 0, "biomes": {}}
        missing_threshold: list[str] = []
        for biome, species_list in sorted(biome_map.items()):
            sorted_species = sorted(species_list, key=lambda item: item["id"])
            playable_count = sum(1 for item in sorted_species if item["playable_unit"])
            count = len(sorted_species)
            meets = count >= foodweb_threshold
            if not meets:
                missing_threshold.append(biome)
            role_entry["biomes"][biome] = {
                "count": count,
                "playable_count": playable_count,
                "meets_threshold": meets,
                "species": sorted_species,
            }
            role_entry["total_species"] += count
        role_entry["biomes_missing_threshold"] = missing_threshold
        foodweb_report["roles"][role] = role_entry

    report = {
        "schema_version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "sources": {
            "env_traits": str(env_traits_path),
            "trait_reference": str(trait_reference_path),
            "trait_glossary": str(trait_glossary_path) if trait_glossary_path else None,
            "species_root": str(species_root),
        },
        "summary": summary,
        "traits": report_traits,
        "foodweb_coverage": foodweb_report,
    }

    return report


def iter_matrix_rows(report: Mapping[str, Any]) -> list[dict[str, Any]]:
    """Esporta le matrici trait↔bioma↔forma in formato tabellare."""

    rows: list[dict[str, Any]] = []
    traits = report.get("traits", {}) if isinstance(report, Mapping) else {}
    for trait_id, info in sorted(traits.items()):
        label_en = info.get("label_en") if isinstance(info, Mapping) else None
        label_it = info.get("label_it") if isinstance(info, Mapping) else None
        rules = info.get("rules", {}) if isinstance(info, Mapping) else {}
        species = info.get("species", {}) if isinstance(info, Mapping) else {}
        rule_entries = {}
        for row in rules.get("coverage", []):
            if isinstance(row, Mapping):
                key = (row.get("biome"), row.get("morphotype"))
                rule_entries[key] = row.get("count", 0)
        species_entries = {}
        for row in species.get("coverage", []):
            if isinstance(row, Mapping):
                key = (row.get("biome"), row.get("morphotype"))
                species_entries[key] = row.get("count", 0)
        all_keys = set(rule_entries.keys()) | set(species_entries.keys())
        for combo in sorted(all_keys, key=_combo_sort_key):
            biome, morph = combo
            rows.append(
                {
                    "trait_id": trait_id,
                    "label_it": label_it,
                    "label_en": label_en,
                    "biome": biome or "",
                    "morphotype": morph or "",
                    "rules_count": rule_entries.get(combo, 0),
                    "species_count": species_entries.get(combo, 0),
                }
            )
    return rows

