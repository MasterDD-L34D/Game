#!/usr/bin/env python3
"""Trait schema gate -- pre-commit + CI validator (ADR-2026-05-29).

Validates that data/core/traits/*.json + data/core/traits/active_effects.yaml +
data/traits/index.json + data/traits/<categoria>/*.json + config/schemas/trait.schema.json
declare schema_version 2.0 and respect Tier-Ancestor policy (DC-01 derived:
prefix 'ancestor_' allows design block absent).

Usage:
    python tools/lint/trait_schema_gate.py --check <file1> [--check <file2> ...]
    python tools/lint/trait_schema_gate.py --check <file> --allow-skip-marker

Exit codes:
    0 = all files pass
    1 = at least one validation failure
    2 = bootstrap error (script broken)

Encoding: ASCII-first body prose (ADR-0021).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

EXPECTED_VERSION = "2.0"
REQUIRED_DESIGN_FIELDS = ("tier", "famiglia_tipologia", "slot_profile")


def _load(path: Path):
    """Return parsed dict or None on parse error (prints diagnostic)."""
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        print(f"FILE-NOT-FOUND {path}", file=sys.stderr)
        return None
    except Exception as e:  # noqa: BLE001
        print(f"READ-FAIL {path}: {e}", file=sys.stderr)
        return None

    if path.suffix in (".yaml", ".yml"):
        try:
            import yaml  # type: ignore
        except ImportError:
            print(f"YAML-NO-PARSER {path}: install pyyaml", file=sys.stderr)
            return None
        try:
            return yaml.safe_load(text)
        except Exception as e:  # noqa: BLE001
            print(f"YAML-PARSE-FAIL {path}: {e}", file=sys.stderr)
            return None

    try:
        return json.loads(text)
    except Exception as e:  # noqa: BLE001
        print(f"JSON-PARSE-FAIL {path}: {e}", file=sys.stderr)
        return None


def _is_index_shaped(path: Path) -> bool:
    """Path heuristic: file in data/traits/ tree (index or per-trait file)."""
    parts = {p.lower() for p in path.parts}
    return path.name == "index.json" or ("traits" in parts and "core" not in parts)


def _is_per_trait_file(path: Path) -> bool:
    """True if path matches data/traits/<categoria>/<slug>.json (NOT index.json)."""
    if path.name == "index.json" or path.suffix != ".json":
        return False
    parts = [p.lower() for p in path.parts]
    return "traits" in parts and path.parent.name not in ("traits", "")


def check(path: Path, allow_skip_marker: bool = False, strict_design: bool = False) -> int:
    """Return 0 on pass, 1 on fail.

    HARD checks (return 1 on fail):
        - schema_version present and == EXPECTED_VERSION ("2.0")
        - top-level must be object/dict
        - per-entry must be dict

    SOFT checks (print WARN to stderr but return 0):
        - design block (tier/famiglia_tipologia/slot_profile) for non-ancestor
          entries in index-shaped paths.

    HARD on per-trait files (data/traits/<cat>/<slug>.json) when strict_design=True
    OR when path matches per-trait pattern (default True via per_trait detection).
    """
    data = _load(path)
    if data is None:
        return 1

    if allow_skip_marker and isinstance(data, dict) and data.get("_gate_skip_reason"):
        return 0

    if not isinstance(data, dict):
        print(f"SHAPE-FAIL {path}: top-level must be object/dict", file=sys.stderr)
        return 1

    schema_version = data.get("schema_version")
    if schema_version is None:
        print(f"MISSING schema_version in {path}", file=sys.stderr)
        return 1
    if str(schema_version) != EXPECTED_VERSION:
        print(
            f"WRONG schema_version in {path} "
            f"(got {schema_version!r}, want {EXPECTED_VERSION!r})",
            file=sys.stderr,
        )
        return 1

    traits = data.get("traits")
    if not isinstance(traits, dict):
        return 0

    rc = 0
    is_index = _is_index_shaped(path)
    is_per_trait = _is_per_trait_file(path)
    # Design check HARD on per-trait files OR when strict_design override.
    design_hard = is_per_trait or strict_design

    for trait_id, entry in traits.items():
        if not isinstance(entry, dict):
            print(f"INVALID entry {trait_id!r} in {path}", file=sys.stderr)
            rc = 1
            continue

        if str(trait_id).startswith("ancestor_"):
            continue

        if is_index or is_per_trait:
            missing = [f for f in REQUIRED_DESIGN_FIELDS if f not in entry]
            if missing:
                severity = "MISSING" if design_hard else "WARN-MISSING"
                print(
                    f"{severity} design fields {missing} for non-ancestor trait "
                    f"{trait_id!r} in {path}",
                    file=sys.stderr,
                )
                if design_hard:
                    rc = 1

    return rc


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--check",
        action="append",
        required=True,
        help="File(s) to validate (repeatable).",
    )
    ap.add_argument(
        "--allow-skip-marker",
        action="store_true",
        help="Honor _gate_skip_reason top-level key (use sparingly with reason).",
    )
    ap.add_argument(
        "--strict-design",
        action="store_true",
        help="Promote design field missing from WARN to HARD even for index.json.",
    )
    a = ap.parse_args(argv)

    rc = 0
    for f in a.check:
        rc |= check(
            Path(f),
            allow_skip_marker=a.allow_skip_marker,
            strict_design=a.strict_design,
        )
    return rc


if __name__ == "__main__":
    sys.exit(main())
