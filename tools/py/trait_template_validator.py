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
import re
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

from jsonschema import Draft202012Validator

from collect_trait_fields import load_traits

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SCHEMA = ROOT / "config" / "schemas" / "trait.schema.json"
DEFAULT_TRAITS_DIR = ROOT / "data" / "traits"
DEFAULT_INDEX = DEFAULT_TRAITS_DIR / "index.json"

LABEL_PATTERN = re.compile(r"^(i18n:[a-z0-9._]+|\S(?:.*\S)?)$")
FAMILY_PATTERN = re.compile(r"^[A-Za-z0-9'’À-ÖØ-öø-ÿ][A-Za-z0-9'’À-ÖØ-öø-ÿ _-]+/[A-Za-z0-9'’À-ÖØ-öø-ÿ][A-Za-z0-9'’À-ÖØ-öø-ÿ _-]+$")
SLUG_PATTERN = re.compile(r"^[a-z0-9_]+$")
SPECIES_ID_PATTERN = re.compile(r"^[a-z0-9_-]+$")
UCUM_PATTERN = re.compile(r"^[A-Za-z0-9%/._^() -]+$")
ENVO_PATTERN = re.compile(r"^http://purl\.obolibrary\.org/obo/ENVO_\d+$")


def load_json(path: Path) -> object:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def format_error(path: Iterable[object], message: str) -> str:
    location = "/".join(str(part) for part in path) or "<root>"
    return f"{location}: {message}"


def collect_additional_issues(trait: dict) -> List[Tuple[List[object], str]]:
    issues: List[Tuple[List[object], str]] = []

    label = trait.get("label")
    if isinstance(label, str) and not LABEL_PATTERN.fullmatch(label):
        issues.append((['label'], "deve essere un riferimento i18n o una stringa senza spazi ai bordi."))

    famiglia_tipologia = trait.get("famiglia_tipologia")
    if isinstance(famiglia_tipologia, str) and not FAMILY_PATTERN.fullmatch(famiglia_tipologia):
        issues.append((['famiglia_tipologia'], "deve rispettare il formato Macro/Sotto con caratteri alfanumerici o spazi."))

    data_origin = trait.get("data_origin")
    if isinstance(data_origin, str) and data_origin.strip() and not SLUG_PATTERN.fullmatch(data_origin.strip()):
        issues.append((['data_origin'], "deve essere uno slug (^[a-z0-9_]+$)."))

    for field in ("biome_tags", "usage_tags"):
        values = trait.get(field)
        if isinstance(values, list):
            for idx, value in enumerate(values):
                if isinstance(value, str) and not SLUG_PATTERN.fullmatch(value):
                    issues.append(([field, idx], "deve contenere solo slug (^[a-z0-9_]+$)."))

    metrics = trait.get("metrics")
    if isinstance(metrics, list):
        for idx, metric in enumerate(metrics):
            if not isinstance(metric, dict):
                issues.append((['metrics', idx], "voce non è un oggetto valido."))
                continue
            name = metric.get("name")
            if isinstance(name, str) and name.strip() != name:
                issues.append((['metrics', idx, 'name'], "deve essere privo di spazi iniziali o finali."))
            unit = metric.get("unit")
            if isinstance(unit, str) and not UCUM_PATTERN.fullmatch(unit):
                issues.append((['metrics', idx, 'unit'], "deve rispettare la sintassi UCUM (es. m/s, Cel, 1)."))

    applicability = trait.get("applicability")
    if isinstance(applicability, dict):
        envo_terms = applicability.get("envo_terms")
        if isinstance(envo_terms, list):
            for idx, term in enumerate(envo_terms):
                if isinstance(term, str) and not ENVO_PATTERN.fullmatch(term):
                    issues.append((['applicability', 'envo_terms', idx], "deve essere un URI ENVO valido."))

    species_affinity = trait.get("species_affinity")
    if isinstance(species_affinity, list):
        for idx, entry in enumerate(species_affinity):
            if not isinstance(entry, dict):
                issues.append((['species_affinity', idx], "voce non è un oggetto valido."))
                continue
            species_id = entry.get("species_id")
            if isinstance(species_id, str) and not SPECIES_ID_PATTERN.fullmatch(species_id):
                issues.append((['species_affinity', idx, 'species_id'], "deve usare slug o trattini (^[a-z0-9_-]+$)."))
            roles = entry.get("roles")
            if isinstance(roles, list):
                for role_idx, role in enumerate(roles):
                    if isinstance(role, str) and not SLUG_PATTERN.fullmatch(role):
                        issues.append((['species_affinity', idx, 'roles', role_idx], "deve essere uno slug (^[a-z0-9_]+$)."))

    return issues


def validate_trait_files(
    directory: Path, validator: Draft202012Validator
) -> Tuple[Dict[str, List[str]], Dict[str, Path]]:
    errors: Dict[str, List[str]] = {}
    coverage_registry: Dict[str, Path] = {}
    seen_ids: Dict[str, Path] = {}

    for path in sorted(directory.rglob("*.json")):
        if path.name == "index.json":
            continue
        if path.name == "species_affinity.json":
            continue
        rel_path = str(path.relative_to(ROOT))
        rel_parts = path.relative_to(directory).parts
        in_drafts = "_drafts" in rel_parts
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
            if trait_id in seen_ids:
                existing = seen_ids[trait_id]
                errors.setdefault(rel_path, []).append(
                    f"ID duplicato: già definito in {existing.relative_to(ROOT)}"
                )
            else:
                seen_ids[trait_id] = path
                if not in_drafts:
                    coverage_registry[trait_id] = path
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

        additional_issues = collect_additional_issues(payload if isinstance(payload, dict) else {})
        if additional_issues:
            formatted_additional = [
                format_error(err_path, message) for err_path, message in additional_issues
            ]
            errors.setdefault(rel_path, []).extend(formatted_additional)

    return errors, coverage_registry


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

        additional_issues = collect_additional_issues(trait_payload if isinstance(trait_payload, dict) else {})
        for issue_path, message in additional_issues:
            messages.append(format_error(entry_path + list(issue_path), message))

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
    print("== Summary of fields (Campi per tipologia) ==")
    for trait_type in sorted(grouped):
        fields = sorted(grouped[trait_type])
        count = len(type_files.get(trait_type, []))
        print(f"- {trait_type} ({count} trait): {', '.join(fields)}")
    all_fields = sorted({field for fields in grouped.values() for field in fields})
    if all_fields:
        print("\n== Field inventory ==")
        for field in all_fields:
            print(f" - {field}")
    total_traits = sum(len(paths) for paths in type_files.values())
    print(f"\nTotal traits: {total_traits}")


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
    for trait_id in sorted(file_registry):
        print(f"[TRAIT] {trait_id}: OK")
    if args.summary:
        print_summary(traits_dir)


if __name__ == "__main__":
    main()
