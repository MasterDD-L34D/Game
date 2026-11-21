"""apply_biome_affinity.py — merge master-dd-APPROVED biome_affinity suggestions
from the D4 draft into the canonical species catalog.

Contract (spec docs/superpowers/specs/2026-05-30-d4-biome-affinity-ecoyaml-design.md §4):
- Writes ONLY `biome_affinity` + `_provenance['biome_affinity']`. Never other fields.
- DRY-RUN by default; `--apply` required to write the catalog.
- Idempotent + safe: skips species that already have a `biome_affinity`
  (never overwrites the 21 editorially-assigned golden entries).
- Validates the biome against data/core/biomes.yaml (no invented biomes).
- UTF-8 explicit (CLAUDE.md Encoding Discipline), ensure_ascii=False, indent=2.

Approval input: master-dd reviews the draft and flips `"approved": true` on the
entries to accept (optionally `"approved_biome": "<id>"` to override the
suggestion). An entry is applied iff `approved` is truthy; the biome written is
`approved_biome` if present, else `suggested_biome`.
"""

import argparse
import json
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = REPO_ROOT / "data/core/species/species_catalog.json"
BIOMES_PATH = REPO_ROOT / "data/core/biomes.yaml"
DRAFT_PATH = REPO_ROOT / "docs/planning/2026-05-30-biome-affinity-draft.json"
PROV_TAG = "d4-heuristic-suggest+master-dd-approve"


def load_valid_biomes(path: Path = BIOMES_PATH) -> set:
    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return set(data["biomes"].keys())


def load_draft(path: Path) -> list:
    """Return the draft entries, or [] if the file is absent. The draft is an
    untracked artifact (docs/planning), so a clean checkout may lack it — treat
    that as zero approved entries so the dry-run contract still holds."""
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    if isinstance(d, dict):
        return d.get("draft", [])
    return d if isinstance(d, list) else []


def select_approved(draft: list, valid_biomes: set):
    """Return (approved_changes, problems). approved_changes = [{species_id, biome}].
    Only entries with truthy `approved`; biome = approved_biome or suggested_biome;
    biome must be in valid_biomes. Not-approved entries are silently skipped;
    approved-but-broken entries (no biome / invalid biome / no id) -> problems."""
    approved, problems = [], []
    for e in draft:
        if not e.get("approved"):
            continue
        sid = e.get("species_id")
        biome = e.get("approved_biome") or e.get("suggested_biome")
        if not sid:
            problems.append(("<no species_id>", "approved entry missing species_id"))
            continue
        if not biome:
            problems.append((sid, "approved but no biome (suggested_biome null)"))
            continue
        if biome not in valid_biomes:
            problems.append((sid, f"biome '{biome}' not in biomes.yaml"))
            continue
        approved.append({"species_id": sid, "biome": biome})
    return approved, problems


def plan_changes(catalog: list, approved: list):
    """Match approved changes to catalog species. Skip species already carrying a
    biome_affinity (idempotent + never overwrite golden) and species not present.
    Return (to_apply, skipped). to_apply = [(species_obj, biome)]."""
    by_id = {}
    for sp in catalog:
        key = sp.get("species_id") or sp.get("legacy_slug")
        if key:
            by_id[key] = sp
    to_apply, skipped = [], []
    for ch in approved:
        sp = by_id.get(ch["species_id"])
        if sp is None:
            skipped.append((ch["species_id"], "not in catalog"))
            continue
        existing = sp.get("biome_affinity")
        if isinstance(existing, str) and existing.strip():
            skipped.append((ch["species_id"], f"already has biome_affinity={existing}"))
            continue
        to_apply.append((sp, ch["biome"]))
    return to_apply, skipped


def apply_changes(to_apply: list) -> None:
    for sp, biome in to_apply:
        sp["biome_affinity"] = biome
        prov = sp.setdefault("_provenance", {})
        if not isinstance(prov, dict):
            prov = {}
            sp["_provenance"] = prov
        prov["biome_affinity"] = PROV_TAG


def main(argv=None):
    ap = argparse.ArgumentParser(description="Apply approved D4 biome_affinity into the canonical catalog")
    ap.add_argument("--draft", default=str(DRAFT_PATH))
    ap.add_argument("--catalog", default=str(CATALOG_PATH))
    ap.add_argument("--apply", action="store_true", help="write the catalog (default: dry-run)")
    args = ap.parse_args(argv)

    valid = load_valid_biomes()
    draft_path = Path(args.draft)
    if not draft_path.exists():
        print(f"[draft] not found at {draft_path} -> treating as 0 entries")
        print("        regenerate via: python tools/py/suggest_biome_affinity.py --gate 0.45")
    draft = load_draft(draft_path)
    approved, problems = select_approved(draft, valid)

    with open(args.catalog, encoding="utf-8") as f:
        data = json.load(f)
    catalog = data["catalog"]
    to_apply, skipped = plan_changes(catalog, approved)

    print(f"[draft] {len(draft)} entries -> {len(approved)} approved+valid, {len(problems)} rejected")
    for sid, why in problems:
        print(f"  reject {sid}: {why}")
    print(f"[plan] {len(to_apply)} to apply, {len(skipped)} skipped")
    for sid, why in skipped:
        print(f"  skip {sid}: {why}")
    for sp, biome in to_apply:
        print(f"  + {sp.get('species_id')}: biome_affinity={biome}")

    if not args.apply:
        print("[DRY-RUN] no write. Re-run with --apply to write the catalog.")
        return 0
    if not to_apply:
        print("[apply] nothing to apply.")
        return 0

    apply_changes(to_apply)
    with open(args.catalog, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[APPLIED] wrote {len(to_apply)} biome_affinity into {args.catalog}")
    return 0


if __name__ == "__main__":
    import sys

    sys.exit(main())
