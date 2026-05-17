#!/usr/bin/env python3
"""Mutations linter — Voidling Bound + Wildermyth Pattern 6 enforcement.

Source: docs/research/2026-04-26-voidling-bound-evolution-patterns.md (Pattern 6).
Design rule: ogni mutation tier-up DEVE avere visual change visible.
Required fields:
  - visual_swap_it (str): textual description del cambio morfologico
  - aspect_token (str): render-layer key per portrait/sprite overlay
                        (apps/play/src/render.js ASPECT_TOKEN_OVERLAY).
                        Token unknown = no-op render (graceful).

Senza questi: player non vede effetto della mutation = invisible feature.

Pattern adoption: docs/research/2026-04-26-cross-game-extraction-MASTER.md §2 + §4.

Usage:
    python tools/py/lint_mutations.py [--fix] [--catalog PATH]

Exit codes:
    0 = all mutations compliant (visual_swap_it + aspect_token present + non-empty)
    1 = lint failures (missing or empty required field)
    2 = file/parse error
"""

import argparse
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required. pip install pyyaml", file=sys.stderr)
    sys.exit(2)


DEFAULT_CATALOG = "data/core/mutations/mutation_catalog.yaml"
PLACEHOLDER_VSI = "TODO: descrivi visual change post-mutation (Pattern 6 Voidling Bound)"
PLACEHOLDER_TOKEN = "TODO_aspect_token"

REQUIRED_FIELDS = ("visual_swap_it", "aspect_token")


def lint_mutations(catalog_path: Path, fix: bool = False) -> int:
    """Lint mutations. Return 0 OK, 1 violations, 2 IO/parse error."""
    if not catalog_path.is_file():
        print(f"ERROR: catalog not found: {catalog_path}", file=sys.stderr)
        return 2

    try:
        with catalog_path.open(encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
    except yaml.YAMLError as e:
        print(f"ERROR: YAML parse fail: {e}", file=sys.stderr)
        return 2

    mutations = (data or {}).get("mutations", {})
    if not mutations:
        print("WARN: no mutations found in catalog")
        return 0

    violations = []
    fix_count = 0
    for mid, mdata in mutations.items():
        if not isinstance(mdata, dict):
            violations.append((mid, "not a dict"))
            continue
        for field in REQUIRED_FIELDS:
            value = mdata.get(field)
            placeholder = PLACEHOLDER_VSI if field == "visual_swap_it" else PLACEHOLDER_TOKEN
            if value is None:
                violations.append((mid, f"missing {field}"))
                if fix:
                    mdata[field] = placeholder
                    fix_count += 1
            elif not isinstance(value, str) or not value.strip():
                violations.append((mid, f"empty {field}"))
                if fix:
                    mdata[field] = placeholder
                    fix_count += 1

    total = len(mutations)
    if not violations:
        print(f"OK: {total}/{total} mutations have {' + '.join(REQUIRED_FIELDS)} (Pattern 6 compliant)")
        return 0

    print(f"FAIL: {len(violations)} violations on {total} mutations (Pattern 6):")
    for mid, reason in violations:
        print(f"  - {mid}: {reason}")

    if fix:
        with catalog_path.open("w", encoding="utf-8") as fh:
            yaml.safe_dump(data, fh, allow_unicode=True, sort_keys=False)
        print(f"\nFIXED: {fix_count} placeholder fields added.")
        print("ACTION: replace placeholders with real values.")
        return 1  # still failure (placeholders need real content)

    print("\nFix: rerun with --fix to add placeholder fields.")
    print("Then replace placeholders with real values.")
    return 1


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--catalog", default=DEFAULT_CATALOG, help="path to mutation_catalog.yaml")
    ap.add_argument("--fix", action="store_true", help="auto-add placeholder visual_swap_it")
    args = ap.parse_args()

    return lint_mutations(Path(args.catalog), fix=args.fix)


if __name__ == "__main__":
    sys.exit(main())
