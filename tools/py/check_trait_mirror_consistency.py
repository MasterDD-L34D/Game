#!/usr/bin/env python3
"""Trait mirror consistency validator — P1 #2351 prevention.

Asserts every trait in `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`
has a corresponding entry in `data/core/traits/active_effects.yaml`.

Gap discovered 2026-05-20: scarica_ionica + arco_voltaico shipped only in
trait_mechanics.yaml; runtime resolution reads active_effects.yaml ONLY →
traits silently no-op'd in production. Engine LIVE Surface DEAD anti-pattern
manifestation despite Gate 5 enforcement.

F6 hardening (2026-06-10, docs/reports/2026-06-10-electric-channel-n40-evidence.md,
PR #2715): a DUPLICATE trait key in active_effects.yaml makes js-yaml THROW at
load -> loadActiveTraitRegistry returns {} -> the ENTIRE trait engine silently
no-ops in production (soft-fail by design). PyYAML is last-wins on duplicates
(no error), so two extra checks exist:
  - duplicate-key count per column-2 key (js-yaml-equivalent guard);
  - parse canary: real yaml.safe_load (fallback: node js-yaml one-liner)
    so ANY YAML-breaking edit fails the validator, not only duplicates.

Exit codes:
  0 = mirror consistent
  1 = drift / duplicate keys / parse failure detected
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
import subprocess
import sys
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TRAIT_MECHANICS = REPO_ROOT / "packs" / "evo_tactics_pack" / "data" / "balance" / "trait_mechanics.yaml"
ACTIVE_EFFECTS = REPO_ROOT / "data" / "core" / "traits" / "active_effects.yaml"

# Top-level trait keys appear at column 2 indent (2 spaces) inside `traits:`
# OR top-level. Pattern: `^  <trait_id>:\s*$` (column-2 indented).
TRAIT_KEY_RE = re.compile(r"^  ([a-z][a-z0-9_]+):\s*$", re.MULTILINE)

# Top-level section markers (version:, traits:, validation:, references:)
# which may also match TRAIT_KEY_RE if they happen to be at column 2,
# plus role-category defaults (_defaults block in trait_mechanics.yaml).
SKIP_KEYS = {"version", "traits", "validation", "references", "schema_version",
             "scenario_overrides", "encounter_classes", "enemy_tiers",
             "player_classes", "resistances", "active_effects", "trigger",
             "effect", "description_it", "notes",
             # _defaults block role categories in trait_mechanics.yaml
             "offensive", "defensive", "utility", "hybrid", "mobility"}


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

    ids = set()
    for m in TRAIT_KEY_RE.finditer(content):
        key = m.group(1)
        if key in SKIP_KEYS:
            continue
        ids.add(key)
    return ids


def find_duplicate_keys(yaml_path):
    """Count column-2 key occurrences; return {key: count} for count > 1.

    F6 (PR #2715): js-yaml THROWS on a duplicate mapping key ->
    loadActiveTraitRegistry returns {} -> trait engine silently no-op.
    PyYAML safe_load is last-wins on duplicates (no error), so the parse
    canary alone cannot catch this -- the regex count is the
    js-yaml-equivalent guard. Returns None on read error.
    """
    if not yaml_path.exists():
        return None
    try:
        content = yaml_path.read_text(encoding="utf-8")
    except OSError as e:
        print(f"ERROR reading {yaml_path}: {e}", file=sys.stderr)
        return None
    counts = Counter(
        m.group(1) for m in TRAIT_KEY_RE.finditer(content)
        if m.group(1) not in SKIP_KEYS
    )
    return {key: n for key, n in sorted(counts.items()) if n > 1}


def parse_canary(yaml_path):
    """Attempt a real YAML parse; returns 'ok' | 'skipped' | 'fail: <reason>'.

    Primary: PyYAML safe_load. Fallback (PyYAML missing): node js-yaml
    one-liner (the production loader). Neither available -> 'skipped'.
    Covers ANY YAML-breaking edit, not only duplicate keys.
    """
    try:
        content = yaml_path.read_text(encoding="utf-8")
    except OSError as e:
        return f"fail: unreadable ({e})"
    try:
        import yaml
    except ImportError:
        return _node_js_yaml_canary(yaml_path)
    try:
        yaml.safe_load(content)
        return "ok"
    except yaml.YAMLError as e:
        reason = " ".join(str(e).split()) or e.__class__.__name__
        return f"fail: {reason}"


def _node_js_yaml_canary(yaml_path):
    """Parse via node js-yaml (production loader). 'skipped' if node missing."""
    one_liner = (
        "const fs=require('fs');const yaml=require('js-yaml');"
        "yaml.load(fs.readFileSync(process.argv[1],'utf8'));"
    )
    try:
        proc = subprocess.run(
            ["node", "-e", one_liner, str(yaml_path)],
            capture_output=True, text=True, check=False,
            cwd=str(REPO_ROOT), timeout=30,
        )
    except (OSError, subprocess.TimeoutExpired):
        return "skipped"
    if proc.returncode == 0:
        return "ok"
    stderr = proc.stderr or ""
    if "Cannot find module" in stderr:
        # node present but js-yaml unresolvable (e.g. CI job without npm ci):
        # tooling gap, not a YAML failure.
        return "skipped"
    lines = [ln.strip() for ln in stderr.splitlines() if ln.strip()]
    return f"fail: {lines[0]}" if lines else "fail: js-yaml parse error"


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--strict", action="store_true",
                   help="Also flag orphans (in active_effects.yaml but not trait_mechanics.yaml)")
    p.add_argument("--json", action="store_true", help="Output JSON report instead of human")
    p.add_argument("--trait-mechanics", type=Path, default=TRAIT_MECHANICS,
                   help="Override trait_mechanics.yaml path (tests/fixtures)")
    p.add_argument("--active-effects", type=Path, default=ACTIVE_EFFECTS,
                   help="Override active_effects.yaml path (tests/fixtures)")
    args = p.parse_args()

    mech_path = args.trait_mechanics
    active_path = args.active_effects

    mech_ids = extract_trait_ids(mech_path)
    active_ids = extract_trait_ids(active_path)

    if mech_ids is None or active_ids is None:
        print("ERROR: failed to read trait YAML files", file=sys.stderr)
        return 2

    # F6: duplicate column-2 keys break js-yaml load -> registry {} -> engine no-op.
    mech_dups = find_duplicate_keys(mech_path) or {}
    active_dups = find_duplicate_keys(active_path) or {}

    # F6: parse canary -- any YAML-breaking edit fails here.
    canary = {
        "trait_mechanics": parse_canary(mech_path),
        "active_effects": parse_canary(active_path),
    }
    canary_fails = {k: v for k, v in canary.items() if v.startswith("fail")}

    # Missing in active_effects (runtime gap — silent no-op).
    missing = sorted(mech_ids - active_ids)
    # Orphans in active_effects (legacy or schema-only — usually OK but flagged --strict).
    orphans = sorted(active_ids - mech_ids)
    # Mirrored (good).
    mirrored = sorted(mech_ids & active_ids)

    failed = bool(missing or mech_dups or active_dups or canary_fails)

    if args.json:
        import json
        report = {
            "mech_total": len(mech_ids),
            "active_total": len(active_ids),
            "mirrored_count": len(mirrored),
            "missing_in_active_effects": missing,
            "orphans_in_active_effects": orphans,
            "duplicate_keys": {
                "trait_mechanics": mech_dups,
                "active_effects": active_dups,
            },
            "parse_canary": canary,
            "status": "FAIL" if failed else ("WARN" if (args.strict and orphans) else "PASS"),
        }
        print(json.dumps(report, indent=2, ensure_ascii=False))
        if failed:
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

    if mech_dups or active_dups:
        print(f"\nFAIL -- DUPLICATE keys (F6: js-yaml throws -> registry {{}} -> trait engine no-op):")
        for label, dups in (("trait_mechanics.yaml", mech_dups),
                            ("active_effects.yaml", active_dups)):
            for key, n in dups.items():
                print(f"  - {label}: {key} x{n}")
        print(f"\nRemove the stale/orphan entry (keep ONE definition per trait id).")

    if canary_fails:
        print(f"\nFAIL -- parse canary (YAML does not load):")
        for label, msg in canary_fails.items():
            print(f"  - {label}: {msg}")

    if failed:
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
