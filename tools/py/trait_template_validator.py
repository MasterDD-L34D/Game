#!/usr/bin/env python3
"""Validator per i trait in ``data/traits``.

Il comando esegue tre controlli principali:

1. Convalida ogni file JSON contro ``config/schemas/trait.schema.json``.
2. Verifica che l'indice ``data/traits/index.json`` sia coerente e contenga
   voci valide secondo lo stesso schema.
3. Confronta gli identificativi dei trait tra file singoli e indice per
   assicurare copertura completa.

Opzionalmente, con ``--summary`` stampa la lista dei campi raggruppati per
``famiglia_tipologia``.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

from jsonschema import Draft202012Validator

from collect_trait_fields import load_traits

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SCHEMA = ROOT / "config" / "schemas" / "trait.schema.json"
DEFAULT_TRAITS_DIR = ROOT / "data" / "traits"
DEFAULT_INDEX = DEFAULT_TRAITS_DIR / "index.json"


def load_json(path: Path) -> object:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def format_error(path: Iterable[object], message: str) -> str:
    location = "/".join(str(part) for part in path) or "<root>"
    return f"{location}: {message}"


def validate_trait_files(
    directory: Path, validator: Draft202012Validator
) -> Tuple[Dict[str, List[str]], Dict[str, Path]]:
    errors: Dict[str, List[str]] = {}
    registry: Dict[str, Path] = {}

    ignored_files = {"index.json", "species_affinity.json"}

    for path in sorted(directory.rglob("*.json")):
        if path.name in ignored_files:
            continue
        rel_path = str(path.relative_to(ROOT))
        try:
            payload = load_json(path)
        except json.JSONDecodeError as exc:
            errors.setdefault(rel_path, []).append(f"JSON non valido: {exc}")
            continue

        trait_id = payload.get("id")
        if not isinstance(trait_id, str) or not trait_id:
            errors.setdefault(rel_path, []).append(
                "Campo 'id' mancante o non valido (deve essere stringa non vuota)."
            )
        else:
            if trait_id in registry:
                existing = registry[trait_id]
                errors.setdefault(rel_path, []).append(
                    f"ID duplicato: già definito in {existing.relative_to(ROOT)}"
                )
            else:
                registry[trait_id] = path
            expected_id = path.stem
            if trait_id != expected_id:
                errors.setdefault(rel_path, []).append(
                    f"ID '{trait_id}' deve coincidere con il nome file '{expected_id}'."
                )

        schema_errors = sorted(
            validator.iter_errors(payload), key=lambda err: list(err.path)
        )
        if schema_errors:
            formatted = [format_error(err.path, err.message) for err in schema_errors]
            errors.setdefault(rel_path, []).extend(formatted)

    return errors, registry


def validate_index(
    index_path: Path, validator: Draft202012Validator
) -> Tuple[List[str], Dict[str, dict]]:
    messages: List[str] = []
    registry: Dict[str, dict] = {}

    if not index_path.exists():
        return [f"Indice non trovato: {index_path}"], registry

    try:
        payload = load_json(index_path)
    except json.JSONDecodeError as exc:
        return [f"Indice non è un JSON valido: {exc}"], registry

    if not isinstance(payload, dict):
        return ["Indice deve essere un oggetto JSON."], registry

    traits_section = payload.get("traits")
    if not isinstance(traits_section, dict):
        return ["Campo 'traits' dell'indice deve essere un oggetto."], registry

    for key, trait_payload in sorted(traits_section.items()):
        entry_path = ["traits", key]
        schema_errors = sorted(
            validator.iter_errors(trait_payload), key=lambda err: list(err.path)
        )
        for err in schema_errors:
            messages.append(format_error(entry_path + list(err.path), err.message))

        trait_id = trait_payload.get("id")
        if trait_id is None:
            messages.append(
                f"traits/{key}: campo 'id' mancante (deve coincidere con la chiave)."
            )
        else:
            registry[key] = trait_payload
            if trait_id != key:
                messages.append(
                    f"traits/{key}: campo 'id' ({trait_id}) non coincide con la chiave dell'indice."
                )

    return messages, registry


def compare_registries(
    file_registry: Dict[str, Path], index_registry: Dict[str, dict]
) -> List[str]:
    messages: List[str] = []
    file_ids = set(file_registry)
    index_ids = set(index_registry)

    missing_in_index = sorted(file_ids - index_ids)
    if missing_in_index:
        formatted = ", ".join(missing_in_index)
        messages.append(
            f"Trait definiti nei file ma assenti in index.json: {formatted}."
        )

    missing_files = sorted(index_ids - file_ids)
    if missing_files:
        formatted = ", ".join(missing_files)
        messages.append(
            f"Trait presenti in index.json ma senza file dedicato: {formatted}."
        )

    return messages


def print_summary(directory: Path) -> None:
    grouped, type_files = load_traits(directory)
    print("== Campi per tipologia ==")
    for trait_type in sorted(grouped):
        fields = sorted(grouped[trait_type])
        count = len(type_files.get(trait_type, []))
        print(f"- {trait_type} ({count} trait): {', '.join(fields)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Valida i trait e l'indice associato.")
    parser.add_argument(
        "--schema",
        type=Path,
        default=DEFAULT_SCHEMA,
        help="Percorso dello schema JSON da utilizzare.",
    )
    parser.add_argument(
        "--traits-dir",
        type=Path,
        default=DEFAULT_TRAITS_DIR,
        help="Directory contenente i file trait.",
    )
    parser.add_argument(
        "--index",
        type=Path,
        default=DEFAULT_INDEX,
        help="File index.json da verificare.",
    )
    parser.add_argument(
        "--summary",
        action="store_true",
        help="Stampa il riepilogo dei campi per tipologia se la validazione va a buon fine.",
    )
    args = parser.parse_args()

    schema_path = args.schema.resolve()
    traits_dir = args.traits_dir.resolve()
    index_path = args.index.resolve()

    if not schema_path.exists():
        print(f"[ERR] Schema non trovato: {schema_path}", file=sys.stderr)
        sys.exit(2)
    if not traits_dir.exists():
        print(f"[ERR] Directory trait non trovata: {traits_dir}", file=sys.stderr)
        sys.exit(2)

    schema = load_json(schema_path)
    validator = Draft202012Validator(schema)

    file_errors, file_registry = validate_trait_files(traits_dir, validator)
    index_messages, index_registry = validate_index(index_path, validator)
    coverage_messages = compare_registries(file_registry, index_registry)

    has_errors = False

    if file_errors:
        has_errors = True
        print("[VALIDATION] Errori nei file trait:")
        for rel_path, issues in sorted(file_errors.items()):
            for issue in issues:
                print(f" - {rel_path}: {issue}")

    if index_messages:
        has_errors = True
        print("[INDEX] Errori rilevati:")
        for message in index_messages:
            print(f" - {message}")

    if coverage_messages:
        has_errors = True
        print("[COVERAGE] Disallineamenti:")
        for message in coverage_messages:
            print(f" - {message}")

    if has_errors:
        sys.exit(1)

    print("[VALIDATION] Tutti i trait rispettano lo schema.")
    if args.summary:
        print_summary(traits_dir)


if __name__ == "__main__":
    main()
