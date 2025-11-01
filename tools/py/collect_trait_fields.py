#!/usr/bin/env python3
"""Utility per estrarre i campi presenti nei file trait raggruppandoli per tipologia."""
from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Dict, Set

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_TRAITS_PATH = ROOT / "data" / "traits"


def load_traits(directory: Path) -> tuple[Dict[str, Dict[str, Set[str]]], Dict[str, Set[str]]]:
    grouped: Dict[str, Dict[str, Set[str]]] = defaultdict(lambda: defaultdict(set))
    type_files: Dict[str, Set[str]] = defaultdict(set)
    for path in sorted(directory.rglob("*.json")):
        if path.name in {"index.json", "species_affinity.json"}:
            continue
        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        trait_type = data.get("famiglia_tipologia") or path.parent.name
        type_files[trait_type].add(str(path.relative_to(ROOT)))
        for key in data.keys():
            grouped[trait_type][key].add(str(path.relative_to(ROOT)))
    return grouped, type_files


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "directory",
        type=Path,
        nargs="?",
        default=DEFAULT_TRAITS_PATH,
        help="Percorso della directory dei trait (default: data/traits)",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        help="File JSON di output con i campi raggruppati per tipologia.",
    )
    args = parser.parse_args()
    directory = args.directory.resolve()
    if not directory.exists():
        raise SystemExit(f"Directory non trovata: {directory}")

    grouped, type_files = load_traits(directory)
    serializable = {
        trait_type: {
            "trait_count": len(type_files[trait_type]),
            "fields": sorted(fields.keys()),
        }
        for trait_type, fields in sorted(grouped.items())
    }

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("w", encoding="utf-8") as fh:
            json.dump(serializable, fh, ensure_ascii=False, indent=2)
    else:
        print(json.dumps(serializable, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
