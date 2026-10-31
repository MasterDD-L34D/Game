#!/usr/bin/env python3
"""Diff helper for JSON Schema enumeration definitions."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple


def load_schema_defs(directory: Path) -> Dict[str, dict]:
    schema_path = directory / "enums.json"
    if not schema_path.exists():
        raise FileNotFoundError(f"Missing enums.json in {directory}")
    try:
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in {schema_path}: {exc}") from exc
    defs = schema.get("$defs")
    if not isinstance(defs, dict):
        raise ValueError(f"Schema {schema_path} does not expose a `$defs` mapping")
    return defs


def extract_enum_payload(definition: dict) -> Tuple[str, object]:
    if "enum" in definition:
        values = definition["enum"]
        if not isinstance(values, list):
            raise ValueError("`enum` entries must be a list of values")
        return ("enum", tuple(values))
    minimum = definition.get("minimum")
    maximum = definition.get("maximum")
    if minimum is not None or maximum is not None:
        return ("range", (minimum, maximum))
    return ("none", None)


def render_list(values: Iterable[object]) -> str:
    return ", ".join(map(repr, values)) if values else "(none)"


def diff_enums(base_defs: Dict[str, dict], candidate_defs: Dict[str, dict]) -> List[str]:
    lines: List[str] = []
    all_keys = sorted(set(base_defs) | set(candidate_defs))
    for key in all_keys:
        base_payload = extract_enum_payload(base_defs.get(key, {}))
        candidate_payload = extract_enum_payload(candidate_defs.get(key, {}))
        if base_payload[0] == candidate_payload[0] == "enum":
            base_values = set(base_payload[1]) if base_payload[1] else set()
            candidate_values = set(candidate_payload[1]) if candidate_payload[1] else set()
            added = sorted(candidate_values - base_values)
            removed = sorted(base_values - candidate_values)
            if not added and not removed:
                continue
            lines.append(f"- {key}:")
            if added:
                lines.append(f"    + added: {render_list(added)}")
            if removed:
                lines.append(f"    - removed: {render_list(removed)}")
        elif base_payload[0] == candidate_payload[0] == "range":
            if base_payload[1] != candidate_payload[1]:
                lines.append(
                    f"- {key}: range changed from {base_payload[1]} to {candidate_payload[1]}"
                )
        else:
            if base_payload[0] == "none" and candidate_payload[0] != "none":
                lines.append(f"- {key}: definition added in candidate")
            elif candidate_payload[0] == "none" and base_payload[0] != "none":
                lines.append(f"- {key}: definition removed in candidate")
            elif base_payload[0] != candidate_payload[0]:
                lines.append(
                    f"- {key}: payload type changed from {base_payload[0]} to {candidate_payload[0]}"
                )
    return lines


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", type=Path, required=True, help="Directory containing enums.json for the base dataset")
    parser.add_argument(
        "--candidate",
        type=Path,
        required=True,
        help="Directory containing enums.json for the candidate dataset",
    )
    args = parser.parse_args(argv)

    try:
        base_defs = load_schema_defs(args.base)
        candidate_defs = load_schema_defs(args.candidate)
    except (FileNotFoundError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    diff_lines = diff_enums(base_defs, candidate_defs)
    if not diff_lines:
        print("No differences detected between base and candidate enum definitions.")
    else:
        print("Enum differences:")
        for line in diff_lines:
            print(line)
    return 0


if __name__ == "__main__":
    sys.exit(main())
