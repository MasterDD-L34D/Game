#!/usr/bin/env python3
"""Trait mirror consistency validator — P1 #2351 prevention.

Asserts every trait in `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`
has a corresponding entry in `data/core/traits/active_effects.yaml`.

Gap discovered 2026-05-20: scarica_ionica + arco_voltaico shipped only in
trait_mechanics.yaml; runtime resolution reads active_effects.yaml ONLY →
traits silently no-op'd in production. Engine LIVE Surface DEAD anti-pattern
manifestation despite Gate 5 enforcement.

Exit codes:
  0 = mirror consistent
  1 = traits missing in active_effects.yaml (drift detected)
  2 = file I/O error

Usage (manual):
  python tools/py/check_trait_mirror_consistency.py
  python tools/py/check_trait_mirror_consistency.py --strict  # also flag orphans

CI:
  Add to docs-governance pipeline OR pre-commit hook.

Refs:
- docs/playtest/2026-05-21-codex-audit-report.md "Engine LIVE Surface DEAD"
- Codex PR #2351 audit feedback
- CLAUDE.md anti-pattern #5 Gate 5 enforcement
"""

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TRAIT_MECHANICS = REPO_ROOT / "packs" / "evo_tactics_pack" / "data" / "balance" / "trait_mechanics.yaml"
ACTIVE_EFFECTS = REPO_ROOT / "data" / "core" / "traits" / "active_effects.yaml"

# Top-level trait keys appear at column 2 indent (2 spaces) inside `traits:`
# OR top-level. Pattern: `^  <trait_id>:\s*$` (column-2 indented).
TRAIT_KEY_RE = re.compile(r"^  ([a-z][a-z0-9_]+):\s*$", re.MULTILINE)


def extract_trait_ids(yaml_path):
    """Parse top-level trait keys via regex (no PyYAML dep).

    Returns set of trait_id strings.
    """
    if not yaml_path.exists():
        return None
    try:
        with open(yaml_path, "r", encoding="utf-8") as f:
            content = f.read()
    except OSError as e:
        print(f"ERROR reading {yaml_path}: {e}", file=sys.stderr)
        return None

    # Skip top-level section markers (version:, traits:, validation:, references:)
    # which may also match TRAIT_KEY_RE if they happen to be at column 2.
    # Also skip role-category defaults (_defaults block in trait_mechanics.yaml).
    ids = set()
    skip_keys = {"version", "traits", "validation", "references", "schema_version",
                 "scenario_overrides", "encounter_classes", "enemy_tiers",
                 "player_classes", "resistances", "active_effects", "trigger",
                 "effect", "description_it", "notes",
                 # _defaults block role categories in trait_mechanics.yaml
                 "offensive", "defensive", "utility", "hybrid", "mobility"}
    # Detect _defaults: block scope — keys inside it are role categories not traits.
    in_defaults = False
    defaults_indent = None
    for line in content.splitlines():
        stripped = line.rstrip()
        if not stripped:
            continue
        if stripped.startswith("_defaults:"):
            in_defaults = True
            defaults_indent = 0
            continue
        if in_defaults:
            # Exit _defaults when we hit a non-indented line.
            indent = len(line) - len(line.lstrip())
            if indent <= defaults_indent and not line.startswith(" "):
                in_defaults = False
        m = TRAIT_KEY_RE.match(line + "\n" if not line.endswith("\n") else line)
        # Use line-by-line match since multi-line MULTILINE re may be inconsistent
    # Re-run simple match approach + filter via skip_keys.
    for m in TRAIT_KEY_RE.finditer(content):
        key = m.group(1)
        if key in skip_keys:
            continue
        ids.add(key)
    return ids


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--strict", action="store_true",
                   help="Also flag orphans (in active_effects.yaml but not trait_mechanics.yaml)")
    p.add_argument("--json", action="store_true", help="Output JSON report instead of human")
    args = p.parse_args()

    mech_ids = extract_trait_ids(TRAIT_MECHANICS)
    active_ids = extract_trait_ids(ACTIVE_EFFECTS)

    if mech_ids is None or active_ids is None:
        print("ERROR: failed to read trait YAML files", file=sys.stderr)
        return 2

    # Missing in active_effects (runtime gap — silent no-op).
    missing = sorted(mech_ids - active_ids)
    # Orphans in active_effects (legacy or schema-only — usually OK but flagged --strict).
    orphans = sorted(active_ids - mech_ids)
    # Mirrored (good).
    mirrored = sorted(mech_ids & active_ids)

    if args.json:
        import json
        report = {
            "mech_total": len(mech_ids),
            "active_total": len(active_ids),
            "mirrored_count": len(mirrored),
            "missing_in_active_effects": missing,
            "orphans_in_active_effects": orphans,
            "status": "FAIL" if missing else ("WARN" if (args.strict and orphans) else "PASS"),
        }
        print(json.dumps(report, indent=2, ensure_ascii=False))
        if missing:
            return 1
        if args.strict and orphans:
            return 1
        return 0

    # Human output
    print(f"Trait mirror consistency report")
    print(f"  trait_mechanics.yaml: {len(mech_ids)} traits")
    print(f"  active_effects.yaml:  {len(active_ids)} traits")
    print(f"  mirrored:             {len(mirrored)} traits")

    if missing:
        print(f"\nFAIL — {len(missing)} traits in trait_mechanics.yaml MISSING in active_effects.yaml:")
        for tid in missing:
            print(f"  - {tid}")
        print(f"\nP1 RUNTIME GAP: traits silently no-op'd. Add corresponding entries")
        print(f"to data/core/traits/active_effects.yaml (see ali_ioniche / scarica_ionica template).")
        return 1

    if args.strict and orphans:
        print(f"\nWARN (--strict) — {len(orphans)} traits in active_effects.yaml NOT in trait_mechanics.yaml:")
        for tid in orphans:
            print(f"  - {tid}")
        print(f"\nMay be legacy or schema-only. Investigate.")
        return 1

    print(f"\nPASS — mirror consistent.")
    if orphans and not args.strict:
        print(f"  ({len(orphans)} orphans in active_effects.yaml — run --strict to flag)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
