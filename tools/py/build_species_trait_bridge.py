#!/usr/bin/env python3
"""Genera la tabella ponte trait↔specie con pesi normalizzati."""
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Mapping

try:  # pragma: no cover - compatibilità ambienti minimal
    import yaml
except ModuleNotFoundError:  # pragma: no cover - fallback con messaggio chiaro
    yaml = None  # type: ignore[assignment]


ROLE_WEIGHTS: Mapping[str, int] = {"core": 3, "synergy": 2, "optional": 1}


@dataclass
class SpeciesTraitRoles:
    """Accumula ruoli osservati per un tratto su una singola specie."""

    roles: set[str] = field(default_factory=set)

    def add_role(self, role: str) -> None:
        if role in ROLE_WEIGHTS:
            self.roles.add(role)

    @property
    def weight(self) -> int:
        return sum(ROLE_WEIGHTS[role] for role in self.roles)

    def as_payload(self, species_id: str) -> dict[str, Any]:
        return {
            "species_id": species_id,
            "roles": sorted(self.roles),
            "weight": self.weight,
        }


def _ensure_list(value: Iterable | None) -> list:
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        return [item for item in value if item is not None]
    return [value]


def _load_yaml(path: Path) -> Mapping[str, Any]:
    if yaml is None:
        raise RuntimeError(
            "Impossibile caricare file YAML: PyYAML non è disponibile nell'ambiente esecutivo."
        )
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    return data if isinstance(data, Mapping) else {}


def _load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def _gather_species_files(root: Path) -> list[Path]:
    if root.is_file():
        return [root]
    return sorted(candidate for candidate in root.rglob("*.yaml") if candidate.is_file())


def _collect_roles_from_species(data: Mapping[str, Any]) -> dict[str, SpeciesTraitRoles]:
    traits_map: dict[str, SpeciesTraitRoles] = defaultdict(SpeciesTraitRoles)

    genetic = data.get("genetic_traits")
    if isinstance(genetic, Mapping):
        for role_name, entries in genetic.items():
            if role_name not in ROLE_WEIGHTS:
                continue
            for trait_id in _ensure_list(entries):
                if trait_id:
                    traits_map[trait_id].add_role(role_name)

    derived = data.get("derived_from_environment")
    if isinstance(derived, Mapping):
        suggested = _ensure_list(derived.get("suggested_traits"))
        for trait_id in suggested:
            if trait_id:
                # I suggerimenti ambientali sono assimilati a ruoli opzionali.
                traits_map[trait_id].add_role("optional")

        optional_traits = _ensure_list(derived.get("optional_traits"))
        for trait_id in optional_traits:
            if trait_id:
                traits_map[trait_id].add_role("optional")

    return traits_map


def build_species_affinity(species_root: Path) -> dict[str, list[dict[str, Any]]]:
    trait_index: dict[str, dict[str, SpeciesTraitRoles]] = defaultdict(lambda: {})

    for species_file in _gather_species_files(species_root):
        data = _load_yaml(species_file)
        if not data:
            continue
        species_id = data.get("id") or species_file.stem
        if not isinstance(species_id, str):
            species_id = str(species_id)

        roles_by_trait = _collect_roles_from_species(data)
        if not roles_by_trait:
            continue

        for trait_id, roles in roles_by_trait.items():
            if not roles.roles:
                continue
            trait_entry = trait_index.setdefault(trait_id, {})
            trait_entry[species_id] = roles

    affinity: dict[str, list[dict[str, Any]]] = {}
    for trait_id, species_roles in trait_index.items():
        payload = [roles.as_payload(species_id) for species_id, roles in species_roles.items()]
        payload.sort(key=lambda item: (-item["weight"], item["species_id"]))
        affinity[trait_id] = payload

    return affinity


def merge_into_trait_index(
    trait_index_path: Path, affinity: Mapping[str, list[dict[str, Any]]]
) -> dict[str, Any]:
    index_data = _load_json(trait_index_path)
    traits = index_data.get("traits")
    if not isinstance(traits, dict):
        raise RuntimeError("Indice tratti non valido: campo 'traits' assente o non è un dizionario")

    updated_traits = set()
    for trait_id, entries in affinity.items():
        trait_payload = traits.get(trait_id)
        if not isinstance(trait_payload, dict):
            continue
        trait_payload["species_affinity"] = entries
        updated_traits.add(trait_id)

    # Rimuove il campo per i tratti non presenti nella nuova mappa, mantenendo l'indice pulito.
    for trait_id, trait_payload in traits.items():
        if not isinstance(trait_payload, dict):
            continue
        if trait_id not in updated_traits and "species_affinity" in trait_payload:
            trait_payload.pop("species_affinity", None)

    return index_data


def _normalize_affinity_entries(entries: Any) -> list[dict[str, Any]]:
    if not isinstance(entries, list):
        return []

    normalized: list[dict[str, Any]] = []
    for entry in entries:
        if not isinstance(entry, Mapping):
            continue

        species_id = entry.get("species_id")
        if not isinstance(species_id, str):
            continue

        raw_roles = _ensure_list(entry.get("roles"))
        roles = sorted({role for role in raw_roles if isinstance(role, str) and role in ROLE_WEIGHTS})

        weight = entry.get("weight", 0)
        if isinstance(weight, str) and weight.isdigit():
            weight = int(weight)
        if not isinstance(weight, int):
            try:
                weight = int(weight)
            except (TypeError, ValueError):
                weight = 0

        normalized.append({"species_id": species_id, "roles": roles, "weight": weight})

    normalized.sort(key=lambda item: (-item["weight"], item["species_id"]))
    return normalized


def _collect_trait_payloads(traits_root: Path) -> dict[str, Mapping[str, Any]]:
    trait_payloads: dict[str, Mapping[str, Any]] = {}
    for json_path in traits_root.rglob("*.json"):
        if json_path.name in {"index.json", "species_affinity.json"}:
            continue

        data = _load_json(json_path)
        if not isinstance(data, Mapping):
            continue

        trait_id = data.get("id") or json_path.stem
        if not isinstance(trait_id, str):
            trait_id = str(trait_id)

        trait_payloads[trait_id] = data

    return trait_payloads


def validate_trait_index(trait_index_path: Path, traits_root: Path) -> list[str]:
    index_data = _load_json(trait_index_path)
    traits = index_data.get("traits")
    if not isinstance(traits, dict):
        raise RuntimeError(
            "Indice tratti non valido: campo 'traits' assente o non è un dizionario"
        )

    trait_files = _collect_trait_payloads(traits_root)
    mismatches: list[str] = []

    for trait_id, payload in trait_files.items():
        file_entries = _normalize_affinity_entries(payload.get("species_affinity"))
        if not file_entries:
            continue

        index_payload = traits.get(trait_id)
        if not isinstance(index_payload, Mapping):
            mismatches.append(
                f"Il tratto '{trait_id}' ha associazioni specie nel file ma non nell'indice principale"
            )
            continue

        index_entries = _normalize_affinity_entries(index_payload.get("species_affinity"))
        if not index_entries:
            mismatches.append(
                f"Il tratto '{trait_id}' ha associazioni specie nel file ma non nell'indice principale"
            )
        elif file_entries != index_entries:
            mismatches.append(
                f"Il tratto '{trait_id}' ha una sezione species_affinity differente tra file e indice"
            )

    for trait_id, payload in traits.items():
        if not isinstance(payload, Mapping):
            continue

        index_entries = _normalize_affinity_entries(payload.get("species_affinity"))
        if not index_entries:
            continue

        if trait_id not in trait_files:
            continue

        file_entries = _normalize_affinity_entries(
            trait_files[trait_id].get("species_affinity")
        )
        if not file_entries:
            continue

        if file_entries != index_entries:
            mismatches.append(
                f"Il tratto '{trait_id}' ha una sezione species_affinity differente tra file e indice"
            )

    return mismatches


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--species-root",
        type=Path,
        default=Path("packs/evo_tactics_pack/data/species"),
        help="Directory o file YAML da cui leggere le specie",
    )
    parser.add_argument(
        "--trait-index",
        type=Path,
        default=Path("data/traits/index.json"),
        help="Indice principale dei tratti da aggiornare",
    )
    parser.add_argument(
        "--traits-root",
        type=Path,
        default=Path("data/traits"),
        help="Directory radice contenente i file dei singoli trait",
    )
    parser.add_argument(
        "--out-json",
        type=Path,
        default=Path("data/traits/species_affinity.json"),
        help="Percorso di output per la mappa trait→specie",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Non scrive i file, stampa solo un riepilogo",
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Confronta le associazioni calcolate con l'indice senza scrivere file",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    if args.validate_only:
        mismatches = validate_trait_index(args.trait_index, args.traits_root)
        if mismatches:
            print("Rilevate incongruenze nelle associazioni specie↔trait:", file=sys.stderr)
            for message in mismatches:
                print(f"- {message}", file=sys.stderr)
            return 1

        print(
            "Specie↔trait coerenti fra file individuali e indice aggregato"
        )
        return 0

    affinity = build_species_affinity(args.species_root)

    if args.dry_run:
        print(f"Rilevati {len(affinity)} trait con associazioni specie")
        return 0

    _write_json(args.out_json, affinity)

    index_payload = merge_into_trait_index(args.trait_index, affinity)
    _write_json(args.trait_index, index_payload)

    return 0


if __name__ == "__main__":  # pragma: no cover - entrypoint script
    raise SystemExit(main())
