#!/usr/bin/env python3
"""Utility per estrarre i campi presenti nei file trait raggruppandoli per tipologia."""
from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Dict, Optional, Set

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_TRAITS_PATH = ROOT / "data" / "traits"
DEFAULT_GLOSSARY_PATH = ROOT / "data" / "core" / "traits" / "glossary.json"


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


def normalise_lang_code(code: str) -> str:
    return code.strip().lower().replace("-", "_")


def load_glossary(
    glossary_path: Path, languages: Optional[Set[str]] = None
) -> Dict[str, Dict[str, Dict[str, str]]]:
    with glossary_path.open("r", encoding="utf-8") as fh:
        payload = json.load(fh)

    traits = payload.get("traits", {})
    result: Dict[str, Dict[str, Dict[str, str]]] = {}

    for trait_id, fields in traits.items():
        per_language: Dict[str, Dict[str, str]] = {}
        for key, value in fields.items():
            if not isinstance(value, str) or "_" not in key:
                continue
            prefix, suffix = key.split("_", 1)
            if prefix not in {"label", "description"}:
                continue
            lang_key = normalise_lang_code(suffix)
            if languages and lang_key not in languages:
                continue
            display_lang = lang_key.replace("_", "-")
            per_language.setdefault(display_lang, {})[prefix] = value.strip()
        if per_language:
            result[trait_id] = dict(sorted(per_language.items()))
    return result


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
    parser.add_argument(
        "--glossary",
        type=Path,
        default=DEFAULT_GLOSSARY_PATH,
        help="Percorso del glossario trait da cui estrarre label/description approvate.",
    )
    parser.add_argument(
        "--glossary-output",
        type=Path,
        help="File JSON opzionale con le stringhe approvate per lingua.",
    )
    parser.add_argument(
        "--glossary-languages",
        nargs="+",
        help="Filtra il report del glossario alle lingue indicate (es. it en).",
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

    produce_glossary = bool(args.glossary_output or args.glossary_languages)

    if produce_glossary:
        glossary_path = args.glossary
        if not glossary_path.is_absolute():
            glossary_path = (Path.cwd() / glossary_path).resolve()
        if not glossary_path.exists():
            raise SystemExit(f"Glossario non trovato: {glossary_path}")
        languages = None
        if args.glossary_languages:
            languages = {normalise_lang_code(lang) for lang in args.glossary_languages}
        glossary_data = load_glossary(glossary_path, languages)
        if args.glossary_output:
            args.glossary_output.parent.mkdir(parents=True, exist_ok=True)
            with args.glossary_output.open("w", encoding="utf-8") as fh:
                json.dump(glossary_data, fh, ensure_ascii=False, indent=2)
        else:
            print(json.dumps(glossary_data, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
