#!/usr/bin/env python3
"""Produce un profilo di run del generatore a partire dalla species trait matrix."""
from __future__ import annotations

import argparse
import json
import sys
import time
from collections import defaultdict
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Sequence

import yaml

ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DATA_ROOT = ROOT_DIR / "data" / "core"
DEFAULT_MATRIX_PATH = ROOT_DIR / "docs" / "catalog" / "species_trait_matrix.json"
DEFAULT_OUTPUT_PATH = ROOT_DIR / "logs" / "tooling" / "generator_run_profile.json"
DEFAULT_INVENTORY_PATH = ROOT_DIR / "docs" / "catalog" / "traits_inventory.json"


@dataclass
class EntrySummary:
    """Riepilogo normalizzato per specie/eventi nella matrix."""

    entry_id: str
    entry_type: str
    display_name: str
    core_traits: Sequence[str]
    optional_traits: Sequence[str]
    synergy_traits: Sequence[str]
    sources: Sequence[str]

    @property
    def is_enriched(self) -> bool:
        return bool(self.optional_traits or self.synergy_traits)


class GeneratorProfileError(RuntimeError):
    """Errore bloccante durante la generazione del profilo."""


def _load_json(path: Path) -> Mapping[str, Any]:
    if not path.exists():
        raise GeneratorProfileError(f"File JSON non trovato: {path}")
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except json.JSONDecodeError as exc:  # pragma: no cover - struttura garantita dal repo
        raise GeneratorProfileError(f"JSON non valido: {path}: {exc}") from exc


def _load_yaml(path: Path) -> Mapping[str, Any]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        payload = yaml.safe_load(handle) or {}
    if not isinstance(payload, dict):
        raise GeneratorProfileError(f"Il file YAML {path} deve avere un mapping alla radice")
    return payload


def _iter_matrix_entries(matrix: Mapping[str, Any]) -> Iterable[EntrySummary]:
    def build(entry_type: str, entry_id: str, payload: Mapping[str, Any]) -> EntrySummary:
        def _gather(key: str) -> List[str]:
            values = payload.get(key) or []
            if not isinstance(values, list):
                raise GeneratorProfileError(
                    f"Campo {entry_id}.{key} deve essere una lista nella matrix"
                )
            result: List[str] = []
            for value in values:
                if isinstance(value, str) and value:
                    result.append(value)
            return sorted(set(result))

        display_name = payload.get("display_name") or entry_id
        sources = payload.get("source_files") or []
        if not isinstance(sources, list):
            raise GeneratorProfileError(
                f"Campo {entry_id}.source_files deve essere una lista nella matrix"
            )
        normalized_sources = [str(item) for item in sources]
        return EntrySummary(
            entry_id=entry_id,
            entry_type=entry_type,
            display_name=display_name,
            core_traits=_gather("core_traits"),
            optional_traits=_gather("optional_traits"),
            synergy_traits=_gather("synergy_traits"),
            sources=normalized_sources,
        )

    for entry_id, payload in (matrix.get("species") or {}).items():
        if not isinstance(payload, Mapping):
            raise GeneratorProfileError(f"Specie {entry_id} deve essere un oggetto JSON")
        yield build("species", entry_id, payload)

    for entry_id, payload in (matrix.get("events") or {}).items():
        if not isinstance(payload, Mapping):
            raise GeneratorProfileError(f"Evento {entry_id} deve essere un oggetto JSON")
        yield build("event", entry_id, payload)


def _load_inventory_core_traits(path: Path) -> List[str]:
    if not path.exists():
        raise GeneratorProfileError(f"Inventario trait non trovato: {path}")
    payload = _load_json(path)
    raw_traits = payload.get("core_traits")
    if raw_traits is None:
        return []
    if not isinstance(raw_traits, list):
        raise GeneratorProfileError("Il campo core_traits dell'inventario deve essere una lista")
    result: List[str] = []
    seen: set[str] = set()
    for index, value in enumerate(raw_traits):
        if not isinstance(value, str) or not value.strip():
            raise GeneratorProfileError(f"core_traits[{index}] non è una stringa valida nell'inventario")
        normalized = value.strip()
        if normalized not in seen:
            seen.add(normalized)
            result.append(normalized)
    return result


def _normalize_data_root(candidate: Path) -> Path:
    """Return the directory that actually contains the core dataset."""

    species_path = candidate / "species.yaml"
    if species_path.exists():
        return candidate
    nested = candidate / "core" / "species.yaml"
    if nested.exists():
        return candidate / "core"
    return candidate


def _load_species_dataset(data_root: Path) -> Sequence[Mapping[str, Any]]:
    species_path = data_root / "species.yaml"
    payload = _load_yaml(species_path)
    raw_species = payload.get("species") or []
    if not isinstance(raw_species, list):
        raise GeneratorProfileError(f"Il file {species_path} deve definire una lista 'species'")
    normalized: List[Mapping[str, Any]] = []
    for index, item in enumerate(raw_species):
        if isinstance(item, Mapping):
            normalized.append(item)
        else:
            raise GeneratorProfileError(
                f"Elemento species[{index}] in {species_path} deve essere un mapping"
            )
    return normalized


def _relative_to_root(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT_DIR))
    except ValueError:  # pragma: no cover - path esterni poco frequenti
        return str(path)


def _default_path_from_env(env_var: str, fallback: Path) -> Path:
    value = os.environ.get(env_var)
    if not value:
        return fallback
    candidate = Path(value)
    if not candidate.is_absolute():
        candidate = ROOT_DIR / candidate
    return candidate


def _build_trait_usage(entries: Sequence[EntrySummary]) -> Dict[str, Dict[str, List[str]]]:
    usage: Dict[str, Dict[str, List[str]]] = defaultdict(lambda: {"core": [], "optional": [], "synergy": []})
    for entry in entries:
        for trait in entry.core_traits:
            bucket = usage[trait]["core"]
            bucket.append(entry.entry_id)
        for trait in entry.optional_traits:
            bucket = usage[trait]["optional"]
            bucket.append(entry.entry_id)
        for trait in entry.synergy_traits:
            bucket = usage[trait]["synergy"]
            bucket.append(entry.entry_id)
    for trait, buckets in usage.items():
        for key, values in buckets.items():
            buckets[key] = sorted(set(values))
    return dict(sorted(usage.items(), key=lambda item: item[0]))


def _compute_highlights(usage: Mapping[str, Mapping[str, Sequence[str]]], limit: int = 3) -> List[Dict[str, Any]]:
    scored: List[tuple[int, str]] = []
    for trait, buckets in usage.items():
        total = len(buckets.get("core", [])) * 2 + len(buckets.get("optional", [])) + len(buckets.get("synergy", []))
        scored.append((total, trait))
    scored.sort(key=lambda item: (-item[0], item[1]))
    highlights: List[Dict[str, Any]] = []
    for _, trait in scored[:limit]:
        buckets = usage[trait]
        highlights.append(
            {
                "trait": trait,
                "core_refs": buckets.get("core", []),
                "optional_refs": buckets.get("optional", []),
                "synergy_refs": buckets.get("synergy", []),
            }
        )
    return highlights


def generate_profile(
    data_root: Path,
    matrix_path: Path,
    inventory_path: Path | None,
    output_path: Path,
) -> Dict[str, Any]:
    start_time = time.perf_counter()
    data_root = _normalize_data_root(data_root)
    matrix_data = _load_json(matrix_path)
    entries = list(_iter_matrix_entries(matrix_data))
    if not entries:
        raise GeneratorProfileError("Nessuna specie/evento trovata nella matrix")

    usage = _build_trait_usage(entries)
    core_traits = sorted([trait for trait, buckets in usage.items() if buckets.get("core")])
    optional_traits = sorted([trait for trait, buckets in usage.items() if buckets.get("optional")])
    synergy_traits = sorted([trait for trait, buckets in usage.items() if buckets.get("synergy")])

    dataset_species = _load_species_dataset(data_root)
    species_with_trait_plan = sum(1 for item in dataset_species if isinstance(item.get("trait_plan"), Mapping))

    expected_core_traits: Sequence[str]
    if inventory_path is not None:
        expected_core_traits = _load_inventory_core_traits(inventory_path)
    else:
        expected_core_traits = core_traits

    missing_core = sorted(set(expected_core_traits) - set(core_traits))

    generation_time_ms = int(round((time.perf_counter() - start_time) * 1000))

    species_entries = [entry for entry in entries if entry.entry_type == "species"]
    event_entries = [entry for entry in entries if entry.entry_type == "event"]
    enriched_species = sum(1 for entry in species_entries if entry.is_enriched)

    profile: Dict[str, Any] = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "status": "success" if not missing_core else "error",
        "data_root": _relative_to_root(data_root),
        "matrix_path": _relative_to_root(matrix_path),
        "inventory_path": _relative_to_root(inventory_path) if inventory_path else None,
        "metrics": {
            "generation_time_ms": generation_time_ms,
            "matrix_entries": len(entries),
            "species_total": len(species_entries),
            "event_total": len(event_entries),
            "core_traits_total": len(core_traits),
            "optional_traits_total": len(optional_traits),
            "synergy_traits_total": len(synergy_traits),
            "dataset_species_total": len(dataset_species),
            "species_with_trait_plan": species_with_trait_plan,
            "enriched_species": enriched_species,
            "expected_core_traits": len(expected_core_traits),
        },
        "core_traits": core_traits,
        "optional_traits": optional_traits,
        "synergy_traits": synergy_traits,
        "missing_core_traits": missing_core,
        "entries": [
            {
                "id": entry.entry_id,
                "type": entry.entry_type,
                "display_name": entry.display_name,
                "core_traits": entry.core_traits,
                "optional_traits": entry.optional_traits,
                "synergy_traits": entry.synergy_traits,
                "sources": entry.sources,
            }
            for entry in entries
        ],
        "trait_usage": usage,
        "highlights": _compute_highlights(usage),
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(profile, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    return profile


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Genera un profilo del trait generator")
    parser.add_argument(
        "--data-root",
        type=Path,
        default=_default_path_from_env("GENERATOR_DATA_ROOT", DEFAULT_DATA_ROOT),
        help="Directory radice del dataset specie/trait",
    )
    parser.add_argument(
        "--matrix",
        type=Path,
        default=_default_path_from_env("GENERATOR_MATRIX_PATH", DEFAULT_MATRIX_PATH),
        help="Percorso alla species trait matrix",
    )
    parser.add_argument(
        "--inventory",
        type=Path,
        default=_default_path_from_env("GENERATOR_INVENTORY_PATH", DEFAULT_INVENTORY_PATH),
        help="Percorso all'inventario trait per i controlli core",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=_default_path_from_env("GENERATOR_OUTPUT_PATH", DEFAULT_OUTPUT_PATH),
        help="Percorso file JSON di output",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        profile = generate_profile(
            data_root=args.data_root.resolve(),
            matrix_path=args.matrix.resolve(),
            inventory_path=args.inventory.resolve() if args.inventory else None,
            output_path=args.output.resolve(),
        )
    except GeneratorProfileError as exc:
        print(f"[generator] Errore: {exc}", file=sys.stderr)
        return 1

    metrics = profile.get("metrics", {})
    highlights = profile.get("highlights", [])

    print(
        "[generator] Profilo generato:",
        f"core={metrics.get('core_traits_total')}",
        f"enriched_species={metrics.get('enriched_species')}",
        f"time_ms={metrics.get('generation_time_ms')}",
    )
    if highlights:
        preview = ", ".join(
            f"{item['trait']} (core={len(item['core_refs'])})" for item in highlights
        )
        print(f"[generator] Highlights: {preview}")

    missing = profile.get("missing_core_traits") or []
    if missing:
        print(
            "[generator] Traits core mancanti rispetto all'inventario:",
            ", ".join(missing),
            file=sys.stderr,
        )
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
