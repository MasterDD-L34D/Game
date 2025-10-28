#!/usr/bin/env python3
"""Utility CLI per gestione matrici trait↔specie/eventi."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Iterable

try:  # pragma: no cover - ambiente minimale
    import yaml
except ModuleNotFoundError as exc:  # pragma: no cover
    raise SystemExit(
        "PyYAML non è installato: eseguire `pip install PyYAML` per usare tools/traits.py"
    ) from exc


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MATRIX_PATH = PROJECT_ROOT / "docs/catalog/species_trait_matrix.json"
DEFAULT_SPECIES_HINTS = [
    PROJECT_ROOT / "data/species.yaml",
    PROJECT_ROOT / "data/species",
    PROJECT_ROOT / "packs/evo_tactics_pack/data/species",
]
DEFAULT_EVENTS_HINTS = [PROJECT_ROOT / "data/events"]
BIOME_INDEX_PATH = PROJECT_ROOT / "data/biomes.yaml"
BIOME_ALIASES_PATH = PROJECT_ROOT / "data/biome_aliases.yaml"


def _ensure_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        result: list[str] = [str(item) for item in value if item is not None]
        return result
    return [str(value)]


def _unique_sorted(values: Iterable[str]) -> list[str]:
    return sorted({value for value in values if value})


def _load_yaml(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def _rel_path(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(PROJECT_ROOT))
    except ValueError:
        return str(path)


def _register_alias_entry(
    alias_map: dict[str, str],
    alias_meta: dict[str, dict[str, str]],
    raw_alias: str,
    canonical: str,
    metadata: dict[str, Any] | None,
) -> None:
    alias_key = raw_alias.casefold()
    entry: dict[str, str] = {"alias": raw_alias, "canonical": canonical}
    if metadata:
        status = metadata.get("status")
        notes = metadata.get("notes")
        if status:
            entry["status"] = str(status)
        if notes:
            entry["notes"] = str(notes)
    alias_map[alias_key] = canonical
    alias_meta[alias_key] = entry


def _load_biome_registry() -> tuple[set[str], dict[str, str], dict[str, str], dict[str, dict[str, str]]]:
    canonical: set[str] = set()
    canonical_casefold: dict[str, str] = {}
    alias_map: dict[str, str] = {}
    alias_meta: dict[str, dict[str, str]] = {}

    if BIOME_INDEX_PATH.exists():
        data = _load_yaml(BIOME_INDEX_PATH)
        biomes = data.get("biomes") if isinstance(data, dict) else {}
        if isinstance(biomes, dict):
            canonical = {str(key) for key in biomes.keys()}
    for biome_id in canonical:
        variants = {biome_id, biome_id.replace("-", "_")}
        for variant in variants:
            canonical_casefold[variant.casefold()] = biome_id

    if BIOME_ALIASES_PATH.exists():
        aliases_payload = _load_yaml(BIOME_ALIASES_PATH)
        alias_entries = aliases_payload.get("aliases") if isinstance(aliases_payload, dict) else {}
        for alias, value in (alias_entries or {}).items():
            canonical_id: str | None
            metadata: dict[str, Any] | None
            if isinstance(value, dict):
                canonical_id = value.get("canonical")
                metadata = value
            else:
                canonical_id = value
                metadata = None
            if not canonical_id:
                continue
            canonical_id = str(canonical_id)
            if canonical and canonical_id not in canonical:
                print(
                    f"[WARN] Alias bioma '{alias}' mappa a identificatore non canonico '{canonical_id}'",
                    file=sys.stderr,
                )
                continue
            for variant in {alias, alias.replace("-", "_")}:
                _register_alias_entry(alias_map, alias_meta, variant, canonical_id, metadata)

    return canonical, canonical_casefold, alias_map, alias_meta


CANONICAL_BIOMES, BIOME_CASEFOLD, BIOME_ALIAS_MAP, BIOME_ALIAS_META = _load_biome_registry()


def _iter_species_entries(path: Path) -> Iterable[tuple[dict[str, Any], Path]]:
    if not path.exists():
        return []
    if path.is_file():
        data = _load_yaml(path)
        if isinstance(data, dict) and "species" in data:
            for entry in data.get("species", []) or []:
                if isinstance(entry, dict):
                    yield entry, path
        elif isinstance(data, dict):
            yield data, path
        return []
    files = sorted(p for p in path.rglob("*.yaml") if p.is_file())
    for file_path in files:
        data = _load_yaml(file_path)
        if isinstance(data, dict):
            yield data, file_path
    return []


def _classify_entry(entry: dict[str, Any]) -> str:
    flags = entry.get("flags") or {}
    if isinstance(flags, dict) and flags.get("event"):
        return "event"
    role = entry.get("role_trofico")
    if isinstance(role, str) and role.startswith("evento"):
        return "event"
    identifier = entry.get("id")
    if isinstance(identifier, str) and identifier.startswith("evento-"):
        return "event"
    return "species"


def _extract_form_threshold(entry: dict[str, Any]) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    estimated = entry.get("estimated_weight")
    if isinstance(estimated, (int, float)):
        payload["estimated_weight"] = estimated
    weight_budget = entry.get("weight_budget")
    if isinstance(weight_budget, (int, float)):
        payload["weight_budget"] = weight_budget
    loadout = entry.get("pi_loadout")
    if isinstance(loadout, dict):
        budget = loadout.get("weight_budget")
        if isinstance(budget, (int, float)):
            payload.setdefault("weight_budget", budget)
    return payload


def _extract_environment_focus(entry: dict[str, Any]) -> dict[str, Any]:
    trait_plan = entry.get("trait_plan")
    if isinstance(trait_plan, dict):
        focus = trait_plan.get("environment_focus")
        if isinstance(focus, dict):
            result = {}
            biome = focus.get("biome_class")
            if biome:
                result["biome_class"] = str(biome)
            rationale = focus.get("rationale")
            if rationale:
                result["rationale"] = str(rationale)
            if result:
                return result
    affinity = entry.get("environment_affinity")
    if isinstance(affinity, dict):
        result = {}
        biome = affinity.get("biome_class")
        if biome:
            result["biome_class"] = str(biome)
        rationale = affinity.get("rationale")
        if rationale:
            result["rationale"] = str(rationale)
        if result:
            return result
    return {}


def _extract_traits(entry: dict[str, Any]) -> tuple[list[str], list[str], list[str]]:
    core: list[str] = []
    optional: list[str] = []
    synergy: list[str] = []
    trait_plan = entry.get("trait_plan")
    if isinstance(trait_plan, dict):
        core = _ensure_list(trait_plan.get("core"))
        optional = _ensure_list(trait_plan.get("optional"))
        synergy = _ensure_list(trait_plan.get("synergies"))
    if not core:
        derived = entry.get("derived_from_environment") or {}
        if isinstance(derived, dict):
            core = _ensure_list(derived.get("suggested_traits"))
            optional = _ensure_list(derived.get("optional_traits"))
    return _unique_sorted(core), _unique_sorted(optional), _unique_sorted(synergy)


def _extract_synergy_hints(entry: dict[str, Any]) -> list[str]:
    hints = entry.get("synergy_hints")
    return _unique_sorted(_ensure_list(hints))


def _extract_required_capabilities(entry: dict[str, Any]) -> list[str]:
    derived = entry.get("derived_from_environment")
    if isinstance(derived, dict):
        return _unique_sorted(_ensure_list(derived.get("required_capabilities")))
    return []


def _extract_archetypes(entry: dict[str, Any]) -> list[str]:
    jobs_bias = _ensure_list(entry.get("jobs_bias"))
    if jobs_bias:
        return _unique_sorted(jobs_bias)
    jobs_synergy = _ensure_list(entry.get("jobs_synergy"))
    if jobs_synergy:
        return _unique_sorted(jobs_synergy)
    role = entry.get("role_trofico")
    if isinstance(role, str):
        return [role]
    return []


def _extract_biomes(entry: dict[str, Any]) -> list[str]:
    biomes = _ensure_list(entry.get("biomes"))
    if not biomes:
        biome_affinity = entry.get("biome_affinity")
        if biome_affinity:
            biomes = _ensure_list(biome_affinity)
    focus = entry.get("trait_plan")
    if isinstance(focus, dict):
        env = focus.get("environment_focus")
        if isinstance(env, dict) and env.get("biome_class"):
            biomes.extend(_ensure_list(env.get("biome_class")))
    return _unique_sorted(biomes)


def _resolve_biome_token(token: str) -> tuple[str | None, dict[str, str] | None]:
    slug = str(token).strip()
    if not slug:
        return None, None
    variants = [slug, slug.replace("-", "_")]
    for variant in variants:
        key = variant.casefold()
        if key in BIOME_CASEFOLD:
            canonical = BIOME_CASEFOLD[key]
            if canonical != slug:
                return canonical, {"alias": slug, "canonical": canonical}
            return canonical, None
    for variant in variants:
        key = variant.casefold()
        if key in BIOME_ALIAS_MAP:
            canonical = BIOME_ALIAS_MAP[key]
            metadata = BIOME_ALIAS_META.get(key, {}).copy()
            if not metadata:
                metadata = {"alias": slug, "canonical": canonical}
            else:
                metadata.setdefault("alias", slug)
                metadata.setdefault("canonical", canonical)
            return canonical, metadata
    return None, None


def _merge_alias_records(*records: Iterable[dict[str, Any]]) -> list[dict[str, str]]:
    merged: list[dict[str, str]] = []
    registry: dict[tuple[str | None, str | None], dict[str, str]] = {}
    for collection in records:
        for record in collection or []:
            if not isinstance(record, dict):
                continue
            alias = record.get("alias")
            canonical = record.get("canonical")
            key = (str(alias) if alias is not None else None, str(canonical) if canonical is not None else None)
            target = registry.get(key)
            if target is None:
                target = {}
                if alias is not None:
                    target["alias"] = str(alias)
                if canonical is not None:
                    target["canonical"] = str(canonical)
                registry[key] = target
                merged.append(target)
            for field in ("status", "notes"):
                value = record.get(field)
                if value:
                    target[field] = str(value)
    merged.sort(key=lambda item: (item.get("alias") or "", item.get("canonical") or ""))
    return merged


def _normalize_biome_list(
    biomes: Iterable[str],
    entry_id: str,
    source: Path,
) -> tuple[list[str], list[dict[str, str]]]:
    normalized: list[str] = []
    alias_records: list[dict[str, str]] = []
    reported: set[tuple[str, str]] = set()
    for raw in biomes:
        canonical, metadata = _resolve_biome_token(raw)
        if not canonical:
            rel = _rel_path(source)
            raise ValueError(f"Bioma '{raw}' non riconosciuto per {entry_id} in {rel}")
        normalized.append(canonical)
        if metadata or canonical != raw:
            record = {"alias": str(raw), "canonical": canonical}
            if metadata:
                for field in ("status", "notes"):
                    value = metadata.get(field)
                    if value:
                        record[field] = str(value)
            alias_records.append(record)
            log_key = (str(raw), canonical)
            if log_key not in reported:
                extras: list[str] = []
                if metadata:
                    status = metadata.get("status")
                    notes = metadata.get("notes")
                    if status:
                        extras.append(f"status={status}")
                    if notes:
                        extras.append(notes)
                suffix = f" ({', '.join(extras)})" if extras else ""
                print(
                    f"[INFO] Normalizzato bioma '{raw}' -> '{canonical}' per {entry_id} ({_rel_path(source)}){suffix}",
                    file=sys.stderr,
                )
                reported.add(log_key)
    normalized = _unique_sorted(normalized)
    alias_records = _merge_alias_records(alias_records)
    return normalized, alias_records


def build_entry_payload(entry: dict[str, Any], source: Path) -> dict[str, Any]:
    identifier = entry.get("id")
    if not identifier:
        raise ValueError(f"Specie/evento senza id in {source}")
    display = entry.get("display_name")
    archetypes = _extract_archetypes(entry)
    core_traits, optional_traits, synergy_traits = _extract_traits(entry)
    raw_biomes = _extract_biomes(entry)
    normalized_biomes, biome_aliases = _normalize_biome_list(raw_biomes, str(identifier), source)

    payload: dict[str, Any] = {
        "id": str(identifier),
        "display_name": str(display) if display else str(identifier),
        "biomes": normalized_biomes,
        "morphotype": entry.get("morphotype"),
        "role": entry.get("role_trofico"),
        "archetypes": archetypes,
        "core_traits": core_traits,
        "optional_traits": optional_traits,
        "synergy_traits": synergy_traits,
        "synergy_hints": _extract_synergy_hints(entry),
        "required_capabilities": _extract_required_capabilities(entry),
        "form_threshold": _extract_form_threshold(entry),
        "environment_focus": _extract_environment_focus(entry),
        "playable_unit": entry.get("playable_unit"),
        "source_files": [_rel_path(source)],
    }
    # Normalizza morphotype e role
    if payload["morphotype"] is not None:
        payload["morphotype"] = str(payload["morphotype"])
    if payload["role"] is not None:
        payload["role"] = str(payload["role"])
    if payload["playable_unit"] is None:
        payload.pop("playable_unit")
    # Rimuove form_threshold se vuoto
    if not payload["form_threshold"]:
        payload.pop("form_threshold")
    if not payload["environment_focus"]:
        payload.pop("environment_focus")
    if biome_aliases:
        payload["biome_aliases"] = biome_aliases
    return payload


def collect_species_and_events(
    species_hints: Iterable[Path],
    events_hints: Iterable[Path],
) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]], list[str]]:
    species: dict[str, dict[str, Any]] = {}
    events: dict[str, dict[str, Any]] = {}
    sources: list[str] = []

    processed_paths: set[Path] = set()
    for hint in list(species_hints) + list(events_hints):
        if not hint or not hint.exists():
            continue
        if hint in processed_paths:
            continue
        processed_paths.add(hint)
        for entry, src in _iter_species_entries(hint):
            try:
                payload = build_entry_payload(entry, src)
            except ValueError as exc:
                print(f"[WARN] {exc}", file=sys.stderr)
                continue
            entry_type = _classify_entry(entry)
            target = species if entry_type == "species" else events
            identifier = payload["id"]
            existing = target.get(identifier)
            if existing:
                sources.extend(payload["source_files"])
                merged_sources = _unique_sorted(existing.get("source_files", []) + payload["source_files"])
                existing["source_files"] = merged_sources
                # merge trait lists preserving union
                for key in ("core_traits", "optional_traits", "synergy_traits", "synergy_hints", "required_capabilities"):
                    existing[key] = _unique_sorted(existing.get(key, []) + payload.get(key, []))
                if payload.get("form_threshold"):
                    existing.setdefault("form_threshold", {}).update(payload["form_threshold"])
                if payload.get("environment_focus"):
                    existing["environment_focus"] = payload["environment_focus"]
                if payload.get("biomes"):
                    existing["biomes"] = _unique_sorted(existing.get("biomes", []) + payload["biomes"])
                if payload.get("biome_aliases"):
                    merged_aliases = _merge_alias_records(
                        existing.get("biome_aliases", []), payload.get("biome_aliases", [])
                    )
                    if merged_aliases:
                        existing["biome_aliases"] = merged_aliases
                continue
            target[identifier] = payload
            sources.extend(payload["source_files"])
    return species, events, _unique_sorted(sources)


def _format_alias_details(records: Iterable[dict[str, Any]]) -> str:
    chunks: list[str] = []
    for record in records or []:
        alias = record.get("alias") or "?"
        canonical = record.get("canonical") or "?"
        extras: list[str] = []
        status = record.get("status")
        notes = record.get("notes")
        if status:
            extras.append(f"status={status}")
        if notes:
            extras.append(notes)
        suffix = f" ({'; '.join(extras)})" if extras else ""
        chunks.append(f"{alias}→{canonical}{suffix}")
    return ", ".join(chunks)


def lint_datasets(
    species_hints: Iterable[Path] | None = None,
    events_hints: Iterable[Path] | None = None,
) -> int:
    species_paths = species_hints or DEFAULT_SPECIES_HINTS
    events_paths = events_hints or DEFAULT_EVENTS_HINTS
    species, events, _ = collect_species_and_events(species_paths, events_paths)

    issues = 0
    for catalog_name, entries in (("species", species), ("events", events)):
        for identifier, payload in sorted(entries.items()):
            aliases = payload.get("biome_aliases", [])
            if aliases:
                issues += 1
                print(
                    f"[WARN] {catalog_name} '{identifier}' usa alias bioma: {_format_alias_details(aliases)}",
                    file=sys.stderr,
                )
            for biome in payload.get("biomes", []):
                if biome not in CANONICAL_BIOMES:
                    issues += 1
                    print(
                        f"[ERROR] {catalog_name} '{identifier}' punta a bioma non canonico '{biome}'",
                        file=sys.stderr,
                    )

    if issues:
        print(f"Rilevate {issues} incongruenze bioma.")
        return 1

    print("Biomi canonici OK su specie ed eventi.")
    return 0


def generate_matrix(
    species_hints: Iterable[Path] | None = None,
    events_hints: Iterable[Path] | None = None,
) -> dict[str, Any]:
    species_paths = species_hints or DEFAULT_SPECIES_HINTS
    events_paths = events_hints or DEFAULT_EVENTS_HINTS
    species, events, sources = collect_species_and_events(species_paths, events_paths)
    matrix = {
        "schema_version": "1.0",
        "sources": {
            "species": sources,
        },
        "species": {identifier: species[identifier] for identifier in sorted(species)},
        "events": {identifier: events[identifier] for identifier in sorted(events)},
    }
    return matrix


def write_matrix(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    content = json.dumps(data, indent=2, ensure_ascii=False, sort_keys=True)
    path.write_text(content + "\n", encoding="utf-8")


def validate_matrix(matrix_path: Path, expected: dict[str, Any]) -> int:
    if not matrix_path.exists():
        print(f"Matrix non trovata: {matrix_path}", file=sys.stderr)
        return 1
    with matrix_path.open("r", encoding="utf-8") as handle:
        current = json.load(handle)
    if current == expected:
        print(f"Matrix valida: {matrix_path}")
        return 0
    print("La matrix non è aggiornata rispetto ai dataset correnti.")
    current_text = json.dumps(current, indent=2, ensure_ascii=False, sort_keys=True)
    expected_text = json.dumps(expected, indent=2, ensure_ascii=False, sort_keys=True)
    import difflib

    diff = difflib.unified_diff(
        current_text.splitlines(),
        expected_text.splitlines(),
        fromfile="matrix",
        tofile="expected",
        lineterm="",
    )
    for line in diff:
        print(line)
    return 2


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    matrix_parser = subparsers.add_parser("matrix", help="Rigenera la species trait matrix")
    matrix_parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_MATRIX_PATH,
        help="Percorso del file JSON da generare",
    )
    matrix_parser.add_argument(
        "--species-path",
        type=Path,
        action="append",
        help="Percorso aggiuntivo da cui leggere le specie",
    )
    matrix_parser.add_argument(
        "--events-path",
        type=Path,
        action="append",
        help="Percorso aggiuntivo da cui leggere gli eventi",
    )

    validate_parser = subparsers.add_parser(
        "validate", help="Confronta dataset specie/eventi con la matrix"
    )
    validate_parser.add_argument(
        "--matrix",
        type=Path,
        default=DEFAULT_MATRIX_PATH,
        help="Matrix JSON da validare",
    )
    validate_parser.add_argument(
        "--species-path",
        type=Path,
        action="append",
        help="Percorso aggiuntivo da cui leggere le specie",
    )
    validate_parser.add_argument(
        "--events-path",
        type=Path,
        action="append",
        help="Percorso aggiuntivo da cui leggere gli eventi",
    )

    lint_parser = subparsers.add_parser(
        "lint", help="Valida che specie ed eventi usino biomi canonici"
    )
    lint_parser.add_argument(
        "--species-path",
        type=Path,
        action="append",
        help="Percorso aggiuntivo da cui leggere le specie",
    )
    lint_parser.add_argument(
        "--events-path",
        type=Path,
        action="append",
        help="Percorso aggiuntivo da cui leggere gli eventi",
    )

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    species_paths = args.species_path if args.species_path else None
    events_paths = args.events_path if args.events_path else None

    if args.command == "matrix":
        data = generate_matrix(species_paths, events_paths)
        write_matrix(args.out, data)
        print(f"Matrix generata in {args.out}")
        return 0

    if args.command == "validate":
        expected = generate_matrix(species_paths, events_paths)
        return validate_matrix(args.matrix, expected)

    if args.command == "lint":
        return lint_datasets(species_paths, events_paths)

    parser.error(f"Comando non riconosciuto: {args.command}")
    return 3


if __name__ == "__main__":  # pragma: no cover - entrypoint script
    sys.exit(main())
