"""Utility per idratare un profilo Enneagramma partendo dal dataset canonico."""
from __future__ import annotations

import argparse
import json
import os
import sys
from functools import lru_cache
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Optional

BASE_DIR = os.path.dirname(__file__)
DATASET_PATH = os.path.join(BASE_DIR, "enneagramma_dataset.json")

TypeProfile = MutableMapping[str, Any]


def _load_dataset(path: Optional[str] = None) -> Dict[str, Any]:
    dataset_path = path or DATASET_PATH
    with open(dataset_path, "r", encoding="utf-8") as handle:
        return json.load(handle)


@lru_cache(maxsize=1)
def _dataset_index(path: Optional[str] = None) -> Dict[str, Any]:
    data = _load_dataset(path)
    type_index = {entry["id"]: entry for entry in data.get("types", [])}

    def _build_lookup(triad_name: str) -> Dict[int, str]:
        lookup: Dict[int, str] = {}
        for block in data.get("triads", {}).get(triad_name, []):
            label = block.get("group")
            for tid in block.get("types", []):
                lookup[int(tid)] = label
        return lookup

    triads = {
        "core_emotion": _build_lookup("Centri (emozione di base)"),
        "social_style": _build_lookup("Hornevian (stile sociale)"),
        "conflict_style": _build_lookup("Harmonic (gestione del conflitto)"),
        "object_relation": _build_lookup("Object Relations"),
    }

    return {
        "raw": data,
        "types": type_index,
        "triads": triads,
    }


def _assign_if_missing(target: TypeProfile, key: str, value: Any) -> None:
    if value is None:
        return
    if target.get(key) != value:
        target[key] = value


def _ensure_wings(profile: TypeProfile, type_data: Mapping[str, Any]) -> None:
    wings = list(type_data.get("wings", []))
    if wings and not profile.get("wings"):
        profile["wings"] = wings
    if profile.get("wing_primary") not in wings and wings:
        profile["wing_primary"] = wings[0]
    profile["wings_names_ei"] = list(type_data.get("wings_names_ei", []))


def hydrate_enneagram_profile(profile: Mapping[str, Any], *, dataset_path: Optional[str] = None) -> Dict[str, Any]:
    """Restituisce una copia del profilo con i campi derivati popolati dal dataset."""

    if "type_id" not in profile:
        raise ValueError("type_id richiesto per idratare il profilo Enneagramma")

    type_id = int(profile["type_id"])
    index = _dataset_index(dataset_path)
    type_data = index["types"].get(type_id)
    if not type_data:
        raise KeyError(f"type_id {type_id} non presente nel dataset Enneagramma")

    hydrated: Dict[str, Any] = dict(profile)

    for key in [
        "type_name_it",
        "basic_fear",
        "basic_desire",
        "passion",
        "fixation",
        "virtue",
        "stress_to",
        "growth_to",
    ]:
        if key in type_data:
            _assign_if_missing(hydrated, key, type_data[key])

    _assign_if_missing(hydrated, "core_emotion", type_data.get("core_emotion"))
    _assign_if_missing(hydrated, "center", type_data.get("center"))

    _ensure_wings(hydrated, type_data)

    triads = index["triads"]
    _assign_if_missing(hydrated, "social_style", triads["social_style"].get(type_id))
    _assign_if_missing(hydrated, "conflict_style", triads["conflict_style"].get(type_id))
    _assign_if_missing(hydrated, "object_relation", triads["object_relation"].get(type_id))

    return hydrated


def hydrate_many(profiles: Iterable[Mapping[str, Any]], *, dataset_path: Optional[str] = None) -> List[Dict[str, Any]]:
    return [hydrate_enneagram_profile(profile, dataset_path=dataset_path) for profile in profiles]


def main(argv: Optional[List[str]] = None) -> None:
    parser = argparse.ArgumentParser(description="Idrata un profilo Enneagramma partendo dal dataset canonico")
    parser.add_argument("--dataset", dest="dataset_path", default=None, help="Percorso alternativo del dataset JSON")
    parser.add_argument("input", nargs="?", default="-", help="File JSON di input (default: stdin)")
    parser.add_argument("output", nargs="?", default="-", help="File JSON di output (default: stdout)")
    args = parser.parse_args(argv)

    if args.input == "-":
        data = json.load(sys.stdin)
    else:
        with open(args.input, "r", encoding="utf-8") as handle:
            data = json.load(handle)

    result = hydrate_enneagram_profile(data, dataset_path=args.dataset_path)

    if args.output == "-":
        json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
    else:
        with open(args.output, "w", encoding="utf-8") as handle:
            json.dump(result, handle, ensure_ascii=False, indent=2)
            handle.write("\n")


if __name__ == "__main__":
    main()
