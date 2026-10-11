#!/usr/bin/env python3
"""Lint mutation_catalog.yaml category balance (Path B 2026-04-27).

Fixes anti-pattern S6 (ADR-2026-04-26 spore-part-pack-slots): pre-rebalance
14/30 physiological mutations (47%) made bingo physiological quasi-garantito.
Target post-rebalance: nessuna category > 40% (warn) and > 50% (error).

Output:
  - JSON report: reports/lint/mutation_balance.json
  - stdout: human-readable summary
  - exit 0 = ok, exit 1 = hard error (any category > 50% or no entries)

Usage:
  python tools/py/lint_mutation_balance.py
  python tools/py/lint_mutation_balance.py --catalog path/to/custom.yaml
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CATALOG = REPO_ROOT / "data" / "core" / "mutations" / "mutation_catalog.yaml"
DEFAULT_REPORT = REPO_ROOT / "reports" / "lint" / "mutation_balance.json"

WARN_THRESHOLD_PCT = 40.0
ERROR_THRESHOLD_PCT = 50.0
MIN_ENTRIES_PER_CATEGORY = 4
SYMBIOTIC_MIN_EXEMPT = True  # symbiotic intentionally rarer (ADR §S1)


def load_catalog(path: Path) -> dict:
    with open(path, encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def analyze(catalog: dict) -> dict:
    mutations = catalog.get("mutations") or {}
    total = len(mutations)
    if total == 0:
        return {
            "ok": False,
            "total": 0,
            "categories": {},
            "warnings": ["catalog_empty"],
            "errors": ["no_mutations_in_catalog"],
        }

    cats = Counter(m.get("category", "_unknown") for m in mutations.values())
    warnings: list[str] = []
    errors: list[str] = []

    cat_report: dict[str, dict] = {}
    for cat, n in sorted(cats.items()):
        pct = 100.0 * n / total
        cat_report[cat] = {"count": n, "percentage": round(pct, 2)}
        if pct > ERROR_THRESHOLD_PCT:
            errors.append(
                f"category_dominance:{cat}={pct:.1f}% > {ERROR_THRESHOLD_PCT}%"
            )
        elif pct > WARN_THRESHOLD_PCT:
            warnings.append(
                f"category_dominance_warn:{cat}={pct:.1f}% > {WARN_THRESHOLD_PCT}%"
            )
        if n < MIN_ENTRIES_PER_CATEGORY:
            if SYMBIOTIC_MIN_EXEMPT and cat == "symbiotic":
                warnings.append(
                    f"category_low_count:{cat}={n} (symbiotic exempt from min)"
                )
            else:
                errors.append(
                    f"category_low_count:{cat}={n} < {MIN_ENTRIES_PER_CATEGORY}"
                )

    return {
        "ok": len(errors) == 0,
        "total": total,
        "categories": cat_report,
        "warnings": warnings,
        "errors": errors,
        "thresholds": {
            "warn_pct": WARN_THRESHOLD_PCT,
            "error_pct": ERROR_THRESHOLD_PCT,
            "min_per_category": MIN_ENTRIES_PER_CATEGORY,
        },
    }


def write_report(report: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def render_summary(report: dict) -> str:
    lines = [
        f"Mutation balance lint ({report['total']} entries)",
        "Categories:",
    ]
    for cat, info in sorted(report["categories"].items()):
        lines.append(f"  {cat}: {info['count']} ({info['percentage']}%)")
    if report["warnings"]:
        lines.append("Warnings:")
        for w in report["warnings"]:
            lines.append(f"  - {w}")
    if report["errors"]:
        lines.append("Errors:")
        for e in report["errors"]:
            lines.append(f"  - {e}")
    lines.append("Status: " + ("OK" if report["ok"] else "FAIL"))
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument(
        "--quiet", action="store_true", help="Suppress stdout summary (report still written)"
    )
    args = parser.parse_args()

    if not args.catalog.exists():
        print(f"ERROR: catalog not found: {args.catalog}", file=sys.stderr)
        return 2

    try:
        catalog = load_catalog(args.catalog)
    except yaml.YAMLError as exc:
        print(f"ERROR: YAML parse failure: {exc}", file=sys.stderr)
        return 2

    report = analyze(catalog)
    write_report(report, args.report)

    if not args.quiet:
        print(render_summary(report))
        print(f"Report: {args.report}")

    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
