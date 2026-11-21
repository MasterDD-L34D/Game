#!/usr/bin/env python3
"""Validate Evo species JSON files against the canonical schema."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List

from jsonschema import RefResolver, ValidationError
from jsonschema.validators import validator_for


@dataclass
class ValidationIssue:
    file: Path
    message: str
    json_path: str


def collect_species_files(root: Path) -> Iterable[Path]:
    for path in sorted(root.glob("*.json")):
        if path.name.startswith("species_catalog"):
            continue
        yield path


def build_validator(schema_path: Path) -> object:
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    validator_cls = validator_for(schema)
    store: Dict[str, dict] = {}
    schema_id = schema.get("$id")
    if schema_id:
        store[schema_id] = schema
    enums_path = schema_path.with_name("enums.json")
    if enums_path.exists():
        enums_schema = json.loads(enums_path.read_text(encoding="utf-8"))
        enums_id = enums_schema.get("$id")
        if enums_id:
            store[enums_id] = enums_schema
    resolver = RefResolver.from_schema(schema, store=store)
    validator = validator_cls(schema, resolver=resolver)
    return validator


def validate_species(validator, files: Iterable[Path]) -> List[ValidationIssue]:
    issues: List[ValidationIssue] = []
    for path in files:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            issues.append(ValidationIssue(file=path, message=f"Invalid JSON: {exc}", json_path=""))
            continue
        if "species" not in payload:
            continue
        try:
            validator.validate(payload)
        except ValidationError as exc:
            issues.append(
                ValidationIssue(
                    file=path,
                    message=exc.message,
                    json_path=str(exc.json_path),
                )
            )
    return issues


def format_report(root: Path, files_checked: int, issues: List[ValidationIssue]) -> str:
    lines = [
        f"Validation report for {root}",
        f"Files checked: {files_checked}",
        f"Failures: {len(issues)}",
        ""
    ]
    if issues:
        lines.append("Detailed issues:")
        for issue in issues:
            location = f" ({issue.json_path})" if issue.json_path else ""
            lines.append(f"- {issue.file}: {issue.message}{location}")
    else:
        lines.append("All species payloads passed validation.")
    return "\n".join(lines)


def parse_args(argv: List[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--species-root",
        type=Path,
        default=Path("incoming/lavoro_da_classificare/species"),
        help="Directory containing Evo species JSON files.",
    )
    parser.add_argument(
        "--schema",
        type=Path,
        default=Path("schemas/evo/species.schema.json"),
        help="Path to the Evo species JSON schema.",
    )
    parser.add_argument(
        "--log",
        type=Path,
        default=Path("reports/species/species_validation.log"),
        help="Destination for the validation report.",
    )
    return parser.parse_args(argv)


def main(argv: List[str] | None = None) -> int:
    args = parse_args(argv)
    if not args.species_root.exists():
        raise SystemExit(f"Species directory not found: {args.species_root}")
    args.log.parent.mkdir(parents=True, exist_ok=True)
    validator = build_validator(args.schema)
    files = list(collect_species_files(args.species_root))
    issues = validate_species(validator, files)
    report = format_report(args.species_root, len(files), issues)
    args.log.write_text(report + "\n", encoding="utf-8")
    print(report)
    return 1 if issues else 0


if __name__ == "__main__":
    raise SystemExit(main())
