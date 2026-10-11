"""apply_interoception_traits.py -- OD-024 D4 operational populate path.

NOTE (reproducibility): mutates the DERIVED species_catalog.json (stale vs current
sources). Run tools/py/check_derived_reproducible.py first and read
docs/guide/derived-artifacts-reproducibility.md before regenerating + committing.

Sync an authored `interoception_traits` field from the species sources
(data/core/species.yaml + species_expansion.yaml) into the canonical
species_catalog.json, IN PLACE -- the live mirror of tools/py/apply_biome_affinity.py.

Why this exists (recon 2026-06-22): the ETL assemblers (merge_pack_v2_species /
promote_gameplay_to_canon) only carry the field on a FULL rebuild, which is
obsolete (ADR-2026-05-15: merge_pack_v2 "becomes obsolete"; the catalog is the SoT
and is mutated in place by the tools/py/apply_*.py family). Without this tool the
assembler passthrough is latent -- there is no operational way to populate the
field. This is that path.

Contract (mirror apply_biome_affinity.py):
- Writes ONLY `interoception_traits` + `_provenance['interoception_traits']`.
- DRY-RUN by default; `--apply` required to write the catalog.
- Whitelist-filtered (tools/etl/interoception_field) -- a bad/typo id never lands.
- Idempotent: a species already in sync with its source is skipped.
- Conservative: never REMOVES the field (dropping a source authoring is a manual
  decision); only adds/updates from a present, non-empty source value.
- No-op on current data: no species authors the field yet -> the catalog stays
  byte-identical (the tool returns before opening the file for write).
- UTF-8 explicit, ensure_ascii=False, indent=2 + trailing newline (catalog format).

Authoring: master-dd adds `interoception_traits: [<gateway ids>]` to a species in
data/core/species.yaml (or species_expansion.yaml), then runs this with --apply.
"""

import argparse
import json
import sys
from pathlib import Path

import yaml

from interoception_field import filter_interoception

REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = REPO_ROOT / "data/core/species/species_catalog.json"
SPECIES_YAML = REPO_ROOT / "data/core/species.yaml"
EXPANSION_YAML = REPO_ROOT / "data/core/species_expansion.yaml"
PROV_TAG = "d4-species-yaml-authored"


def _collect(entries, source, seen):
    """Add filtered, non-empty interoception_traits from a list of source entries
    into `source` (keyed by id), respecting first-seen precedence via `seen`."""
    for entry in entries or []:
        if not isinstance(entry, dict):
            continue
        sid = entry.get("id")
        if not sid or sid in seen:
            continue
        seen.add(sid)
        filtered = filter_interoception(entry.get("interoception_traits"))
        if filtered:
            source[sid] = filtered


def load_source_interoception(species_yaml_path=SPECIES_YAML, expansion_yaml_path=EXPANSION_YAML):
    """Return {species_id: [filtered gateway ids]} for every source species that
    authors a non-empty interoception_traits. species.yaml wins over the expansion
    examples (mirrors merge_pack_v2 legacy precedence)."""
    source: dict = {}
    seen: set = set()
    sp_path = Path(species_yaml_path) if species_yaml_path else None
    if sp_path and sp_path.exists():
        data = yaml.safe_load(sp_path.read_text(encoding="utf-8")) or {}
        _collect(data.get("species", []), source, seen)
    exp_path = Path(expansion_yaml_path) if expansion_yaml_path else None
    if exp_path and exp_path.exists():
        data = yaml.safe_load(exp_path.read_text(encoding="utf-8")) or {}
        _collect(data.get("species_examples", []), source, seen)
    return source


def plan_interoception_changes(catalog, source_map):
    """Match authored values to catalog species. Skip species not present and
    species already in sync (idempotent). Return (to_apply, skipped).
    to_apply = [(species_obj, [ids])]."""
    by_id = {}
    for sp in catalog:
        key = sp.get("species_id") or sp.get("legacy_slug")
        if key:
            by_id.setdefault(key, sp)
    to_apply, skipped = [], []
    for sid, traits in source_map.items():
        sp = by_id.get(sid)
        if sp is None:
            skipped.append((sid, "not in catalog"))
            continue
        if sp.get("interoception_traits") == traits:
            skipped.append((sid, "already in sync"))
            continue
        to_apply.append((sp, traits))
    return to_apply, skipped


def apply_changes(to_apply):
    for sp, traits in to_apply:
        sp["interoception_traits"] = traits
        prov = sp.setdefault("_provenance", {})
        if not isinstance(prov, dict):
            prov = {}
            sp["_provenance"] = prov
        prov["interoception_traits"] = PROV_TAG


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Sync authored interoception_traits from species sources into the canonical catalog"
    )
    ap.add_argument("--species-yaml", default=str(SPECIES_YAML))
    ap.add_argument("--expansion-yaml", default=str(EXPANSION_YAML))
    ap.add_argument("--catalog", default=str(CATALOG_PATH))
    ap.add_argument("--apply", action="store_true", help="write the catalog (default: dry-run)")
    args = ap.parse_args(argv)

    source = load_source_interoception(args.species_yaml, args.expansion_yaml)

    with open(args.catalog, encoding="utf-8") as f:
        data = json.load(f)
    catalog = data["catalog"]
    to_apply, skipped = plan_interoception_changes(catalog, source)

    print(f"[source] {len(source)} species author interoception_traits")
    print(f"[plan] {len(to_apply)} to apply, {len(skipped)} skipped")
    for sid, why in skipped:
        print(f"  skip {sid}: {why}")
    for sp, traits in to_apply:
        print(f"  + {sp.get('species_id')}: interoception_traits={traits}")

    if not args.apply:
        print("[DRY-RUN] no write. Re-run with --apply to write the catalog.")
        return 0
    if not to_apply:
        print("[apply] nothing to apply (catalog unchanged).")
        return 0

    apply_changes(to_apply)
    with open(args.catalog, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"[APPLIED] wrote {len(to_apply)} interoception_traits into {args.catalog}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
