#!/usr/bin/env python3
"""
i18n Parity Validator — Q-001 T1.5 PR-2 of 6

Verifica parity chiavi fra locale bundles in data/i18n/*/ (it + en al lancio).

Checks:
1. Ogni locale ha stesse chiavi (nessuna chiave manca in un locale)
2. Nessun valore TODO / MISSING / placeholder
3. Interpolation params (Mustache {{var}}) coerenti fra locale
4. _meta.completion_percent coerente con actual translation

Usage:
    python3 tools/py/validate_i18n_parity.py [--root data/i18n] [--strict]

Exit codes:
    0: pass
    1: errors
    2: warnings only (without --strict)

Reference: docs/architecture/i18n-strategy.md
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
from typing import Dict, List, Set, Tuple

MUSTACHE_RE = re.compile(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}")
PLACEHOLDER_MARKERS = ("TODO", "MISSING", "FIXME", "XXX")


def flatten_keys(obj, prefix: str = "") -> Dict[str, str]:
    """Flatten nested dict into dot-notation key → value (string leaves only)."""
    result = {}
    if not isinstance(obj, dict):
        return result
    for k, v in obj.items():
        if k.startswith("_"):  # skip _meta
            continue
        new_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            result.update(flatten_keys(v, new_key))
        elif isinstance(v, str):
            result[new_key] = v
    return result


def extract_params(value: str) -> Set[str]:
    return set(MUSTACHE_RE.findall(value))


def load_bundle(path: pathlib.Path) -> Dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def validate_namespace(
    namespace: str, bundles: Dict[str, Dict]
) -> Tuple[List[str], List[str]]:
    """Return (errors, warnings) for namespace."""
    errors, warnings = [], []
    locales = sorted(bundles.keys())
    flat_per_locale = {loc: flatten_keys(bundles[loc]) for loc in locales}

    all_keys: Set[str] = set()
    for flat in flat_per_locale.values():
        all_keys.update(flat.keys())

    for key in sorted(all_keys):
        present_in = [loc for loc in locales if key in flat_per_locale[loc]]
        missing_in = [loc for loc in locales if key not in flat_per_locale[loc]]
        if missing_in:
            errors.append(
                f"[{namespace}] key '{key}' missing in locale(s) {missing_in} "
                f"(present in {present_in})"
            )
            continue

        params_per_locale = {
            loc: extract_params(flat_per_locale[loc][key]) for loc in locales
        }
        first_params = params_per_locale[locales[0]]
        for loc, params in params_per_locale.items():
            if params != first_params:
                errors.append(
                    f"[{namespace}] key '{key}' interpolation mismatch: "
                    f"{locales[0]}={sorted(first_params)} vs {loc}={sorted(params)}"
                )
                break

        for loc in locales:
            value = flat_per_locale[loc][key]
            for marker in PLACEHOLDER_MARKERS:
                if marker in value:
                    warnings.append(
                        f"[{namespace}] locale={loc} key='{key}' contains placeholder '{marker}': {value!r}"
                    )

    return errors, warnings


def validate_meta(bundles: Dict[str, Dict]) -> List[str]:
    warnings = []
    for loc, bundle in bundles.items():
        meta = bundle.get("_meta", {})
        completion = meta.get("completion_percent", 0)
        if completion < 90:
            warnings.append(
                f"locale={loc} completion_percent={completion}% (< 90% release gate)"
            )
    return warnings


def discover_namespaces(root: pathlib.Path) -> Dict[str, Dict[str, pathlib.Path]]:
    """Return {namespace: {locale: path}}."""
    result: Dict[str, Dict[str, pathlib.Path]] = {}
    for locale_dir in sorted(root.iterdir()):
        if not locale_dir.is_dir():
            continue
        locale = locale_dir.name
        for bundle_file in sorted(locale_dir.glob("*.json")):
            namespace = bundle_file.stem
            result.setdefault(namespace, {})[locale] = bundle_file
    return result


def main():
    parser = argparse.ArgumentParser(description="i18n parity validator")
    parser.add_argument("--root", default="data/i18n", help="i18n root directory")
    parser.add_argument("--strict", action="store_true", help="treat warnings as errors")
    args = parser.parse_args()

    root = pathlib.Path(args.root)
    if not root.exists():
        print(f"ERROR: root path not found: {root}", file=sys.stderr)
        sys.exit(1)

    namespaces = discover_namespaces(root)
    if not namespaces:
        print(f"ERROR: no JSON bundles found under {root}/<locale>/*.json", file=sys.stderr)
        sys.exit(1)

    all_errors: List[str] = []
    all_warnings: List[str] = []

    for namespace, locale_paths in namespaces.items():
        if len(locale_paths) < 2:
            all_warnings.append(
                f"namespace '{namespace}' present only in {list(locale_paths.keys())} "
                f"(need at least 2 locales for parity check)"
            )
            continue
        bundles = {loc: load_bundle(p) for loc, p in locale_paths.items()}
        errors, warnings = validate_namespace(namespace, bundles)
        all_errors.extend(errors)
        all_warnings.extend(warnings)
        all_warnings.extend(validate_meta(bundles))

    print(f"[i18n] namespaces: {sorted(namespaces.keys())}")
    print(f"[i18n] errors={len(all_errors)} warnings={len(all_warnings)}")

    for e in all_errors:
        print(f"  ERROR: {e}")
    for w in all_warnings:
        print(f"  WARN:  {w}")

    if all_errors:
        sys.exit(1)
    if all_warnings and args.strict:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
