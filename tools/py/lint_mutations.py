#!/usr/bin/env python3
"""Mutations linter — Voidling Bound Pattern 6 enforcement.

Source: docs/research/2026-04-26-voidling-bound-evolution-patterns.md (Pattern 6).
Voidling Bound design rule: ogni mutation tier-up DEVE avere visual change visible.
Senza visual_swap_it: player non vede effetto della mutation = invisible feature.

Pattern adoption: docs/research/2026-04-26-cross-game-extraction-MASTER.md §2 + §4.

Usage:
    python tools/py/lint_mutations.py [--fix] [--catalog PATH]

Exit codes:
    0 = all mutations compliant (visual_swap_it present + non-empty)
    1 = lint failures (missing or empty visual_swap_it)
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
PLACEHOLDER = "TODO: descrivi visual change post-mutation (Pattern 6 Voidling Bound)"


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
        vsi = mdata.get("visual_swap_it")
        if vsi is None:
            violations.append((mid, "missing visual_swap_it"))
            if fix:
                mdata["visual_swap_it"] = PLACEHOLDER
                fix_count += 1
        elif not isinstance(vsi, str) or not vsi.strip():
            violations.append((mid, "empty visual_swap_it"))
            if fix:
                mdata["visual_swap_it"] = PLACEHOLDER
                fix_count += 1

    total = len(mutations)
    if not violations:
        print(f"OK: {total}/{total} mutations have visual_swap_it (Pattern 6 compliant)")
        return 0

    print(f"FAIL: {len(violations)}/{total} mutations violate Pattern 6:")
    for mid, reason in violations:
        print(f"  - {mid}: {reason}")

    if fix:
        with catalog_path.open("w", encoding="utf-8") as fh:
            yaml.safe_dump(data, fh, allow_unicode=True, sort_keys=False)
        print(f"\nFIXED: {fix_count} placeholder visual_swap_it added.")
        print("ACTION: replace placeholders with real visual descriptions.")
        return 1  # still failure (placeholders need real content)

    print("\nFix: rerun with --fix to add placeholder visual_swap_it.")
    print("Then replace placeholders with real visual descriptions.")
    return 1


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--catalog", default=DEFAULT_CATALOG, help="path to mutation_catalog.yaml")
    ap.add_argument("--fix", action="store_true", help="auto-add placeholder visual_swap_it")
    args = ap.parse_args()

    return lint_mutations(Path(args.catalog), fix=args.fix)


if __name__ == "__main__":
    sys.exit(main())
