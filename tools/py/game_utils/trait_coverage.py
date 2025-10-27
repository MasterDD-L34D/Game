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
        if not traits:
            continue
        combos = []
        if biomes:
            combos = [(biome, morph) for biome in biomes]
        else:
            combos = [(None, morph)]
        for trait_id in traits:
            for combo in combos:
                species_matrix[trait_id][combo] += 1
                species_examples[trait_id][combo].add(species_id)

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
        missing_in_species = [_format_combo_key(combo) for combo in sorted(rule_keys - species_keys, key=_combo_sort_key)]
        missing_in_rules = [_format_combo_key(combo) for combo in sorted(species_keys - rule_keys, key=_combo_sort_key)]

        summary["rules_missing_species_total"] += len(missing_in_species)
        if missing_in_species and rule_counter:
            traits_missing_species.append(trait_id)
        if missing_in_rules and species_counter:
            traits_missing_rules.append(trait_id)

        glossary_entry = glossary.get(trait_id) if isinstance(glossary, Mapping) else None
        label_it = glossary_entry.get("label_it") if isinstance(glossary_entry, Mapping) else None
        label_en = glossary_entry.get("label_en") if isinstance(glossary_entry, Mapping) else None

        report_traits[trait_id] = {
            "label_it": label_it,
            "label_en": label_en,
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

