#!/usr/bin/env python3
"""
Trait Template Validator & Summary
- Validates data/traits/index.json
  using trait_catalog.schema.json and trait_entry.schema.json
- Prints an optional summary (--summary) of field types and keys
Usage:
  python tools/py/trait_template_validator.py --summary
Exit codes:
  0 = OK
  1 = Validation error
  2 = File not found / other error
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

from jsonschema import Draft202012Validator, RefResolver

ROOT = pathlib.Path(__file__).resolve().parents[2]
CAT = ROOT / "packs" / "evo_tactics_pack" / "docs" / "catalog"
CAT_FILE = ROOT / "data" / "traits" / "index.json"
SCHEMA_ENTRY = CAT / "trait_entry.schema.json"
SCHEMA_CATALOG = CAT / "trait_catalog.schema.json"


def load_json(path: pathlib.Path) -> object:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def validate() -> int:
    try:
        entry_schema = load_json(SCHEMA_ENTRY)
        catalog_schema = load_json(SCHEMA_CATALOG)
        catalog = load_json(CAT_FILE)
    except FileNotFoundError as exc:
        print(f"[ERR] File not found: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:  # pragma: no cover - protezione errori IO generici
        print(f"[ERR] {exc}", file=sys.stderr)
        return 2

    resolver = RefResolver(
        base_uri=f"file://{CAT}/",
        referrer=catalog_schema,
        store={
            "https://example.com/schemas/trait_catalog.schema.json": catalog_schema,
            "https://example.com/schemas/trait_entry.schema.json": entry_schema,
        },
    )
    catalog_validator = Draft202012Validator(catalog_schema, resolver=resolver)
    errors = sorted(catalog_validator.iter_errors(catalog), key=lambda err: err.path)

    if errors:
        print("[VALIDATION] FAIL — catalog header or structure invalid:")
        for err in errors:
            location = "/".join(str(part) for part in err.path)
            print(f" - at '{location}': {err.message}")
        return 1

    entry_validator = Draft202012Validator(entry_schema)
    traits = catalog.get("traits", {})
    has_errors = False
    for trait_key, payload in traits.items():
        issues = sorted(entry_validator.iter_errors(payload), key=lambda err: err.path)
        if issues:
            has_errors = True
            print(f"[TRAIT] {trait_key}: FAIL")
            for issue in issues:
                location = "/".join(str(part) for part in issue.path)
                print(f" - at '{location}': {issue.message}")
        else:
            print(f"[TRAIT] {trait_key}: OK")

    types_section = catalog.get("types")
    if isinstance(types_section, dict):
        for type_key, payload in types_section.items():
            trait_ids = payload.get("traits", [])
            missing_traits = [trait_id for trait_id in trait_ids if trait_id not in traits]
            if missing_traits:
                has_errors = True
                print(f"[TYPE] {type_key}: FAIL")
                for trait_id in missing_traits:
                    print(f" - trait '{trait_id}' is not defined in catalog")
            else:
                print(f"[TYPE] {type_key}: OK")

    return 1 if has_errors else 0


def summary() -> int:
    try:
        catalog = load_json(CAT_FILE)
    except Exception as exc:  # pragma: no cover - errori inattesi
        print(f"[ERR] {exc}", file=sys.stderr)
        return 2

    traits = catalog.get("traits", {})
    print("== Summary of fields (top-level keys per trait) ==")
    keys: set[str] = set()
    for trait in traits.values():
        keys.update(trait.keys())
    for key in sorted(keys):
        print(f" - {key}")
    print(f"Total traits: {len(traits)}")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--summary", action="store_true", help="Print field summary")
    args = parser.parse_args()

    exit_code = validate()
    if args.summary and exit_code == 0:
        summary()

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
