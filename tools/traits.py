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


def build_entry_payload(entry: dict[str, Any], source: Path) -> dict[str, Any]:
    identifier = entry.get("id")
    if not identifier:
        raise ValueError(f"Specie/evento senza id in {source}")
    display = entry.get("display_name")
    archetypes = _extract_archetypes(entry)
    core_traits, optional_traits, synergy_traits = _extract_traits(entry)
    payload: dict[str, Any] = {
        "id": str(identifier),
        "display_name": str(display) if display else str(identifier),
        "biomes": _extract_biomes(entry),
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
                continue
            target[identifier] = payload
            sources.extend(payload["source_files"])
    return species, events, _unique_sorted(sources)


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

    parser.error(f"Comando non riconosciuto: {args.command}")
    return 3


if __name__ == "__main__":  # pragma: no cover - entrypoint script
    sys.exit(main())
