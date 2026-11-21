"""derive_interoception_overrides.py -- OD-024 D4 principled override populate.

NOTE (reproducibility): mutates the DERIVED species_catalog.json (stale vs current
sources). Run tools/py/check_derived_reproducible.py first and read
docs/guide/derived-artifacts-reproducibility.md before regenerating + committing.

Derive a per-species `interoception_traits` override from a RATIFIED rule and
write it into the canonical species_catalog.json IN PLACE. Rule-based mirror of
tools/py/apply_biome_affinity.py + tools/etl/apply_interoception_traits.py.

Rule (master-dd ratified 2026-06-22, Approach A = tier-floor + ecological boosts):
  override = tier_default(sentience_index)  UNION  ecological additions
    + nocicezione   if risk_profile.danger_level >= NOCICEPTION_DANGER_THRESHOLD
    + termocezione  if biome_affinity in THERMAL_BIOMES
  write the override ONLY where it differs from the tier default (no redundant
  rows); skip tier < T1 (producer gates them out before reading the override).

propriocezione + equilibrio_vestibolare are the universal T1 floor, so the only
ecological additions the rule can make are nocicezione (to sub-T2) and
termocezione (to sub-T3). Spec:
docs/superpowers/specs/2026-06-22-od024-d4-interoception-overrides-rule-design.md

Contract: DRY-RUN by default; `--apply` required to write. Idempotent (a species
already in sync is skipped). Whitelist-filtered + canonical order via
interoception_field. Band-neutral: the grant flag SENTIENCE_INTEROCEPTION_GRANT_
ENABLED stays OFF, so the producer never grants -- the catalog diff is inert
until the D7 flip (owner, post N=40). UTF-8, ensure_ascii=False, indent=2 +
trailing newline (catalog format).
"""

import argparse
import json
import sys
from pathlib import Path

from interoception_field import INTEROCEPTION_TRAIT_IDS, filter_interoception

REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = REPO_ROOT / "data/core/species/species_catalog.json"
PROV_TAG = "d4-derived-rule"

# RATIFIED 2026-06-22 (master-dd).
NOCICEPTION_DANGER_THRESHOLD = 2
THERMAL_BIOMES = frozenset(
    {
        "deserto_caldo",
        "abisso_vulcanico",
        "dorsale_termale_tropicale",
        "pianura_salina_iperarida",
        "cryosteppe",
        "caldera_glaciale",
        "mezzanotte_orbitale",
        "stratosfera_tempestosa",
        "badlands",
    }
)
# Cumulative; mirror of producer interoceptionForTier (sentienceInteroceptionGrant.js D2 map).
TIER_INTEROCEPTION_MAP = {
    "T1": ["propriocezione", "equilibrio_vestibolare"],
    "T2": ["nocicezione"],
    "T3": ["termocezione"],
}


def _rank(tier):
    return (
        int(tier[1])
        if isinstance(tier, str) and len(tier) == 2 and tier[0] == "T" and tier[1].isdigit()
        else None
    )


def tier_default(tier):
    """The D2 cumulative interoception subset for a tier (whitelist-ordered)."""
    r = _rank(tier)
    if r is None:
        return []
    out = []
    for k, ids in TIER_INTEROCEPTION_MAP.items():
        if _rank(k) <= r:
            out += ids
    return filter_interoception(out)


def derive_override(entry):
    """Return the rule-derived override list for a catalog entry, or None when it
    equals the tier default (no row needed) or the tier is below the gateway (T0/
    unknown -- the producer gates it out before reading the override)."""
    r = _rank(entry.get("sentience_index"))
    if r is None or r < 1:
        return None
    base = tier_default(entry.get("sentience_index"))
    additions = set()
    if (entry.get("risk_profile") or {}).get("danger_level", 1) >= NOCICEPTION_DANGER_THRESHOLD:
        additions.add("nocicezione")
    if entry.get("biome_affinity") in THERMAL_BIOMES:
        additions.add("termocezione")
    full = filter_interoception(
        list(base) + [a for a in INTEROCEPTION_TRAIT_IDS if a in additions]
    )
    return full if full != base else None


def plan_overrides(catalog):
    """Return (to_apply, skipped). to_apply = [(species_obj, override_list)] for
    species whose rule-derived override differs from what they already carry."""
    to_apply, skipped = [], []
    for sp in catalog:
        override = derive_override(sp)
        if override is None:
            skipped.append((sp.get("species_id"), "tier-default or below-gateway"))
        elif sp.get("interoception_traits") == override:
            skipped.append((sp.get("species_id"), "already in sync"))
        else:
            to_apply.append((sp, override))
    return to_apply, skipped


def apply_changes(to_apply):
    for sp, override in to_apply:
        sp["interoception_traits"] = override
        prov = sp.setdefault("_provenance", {})
        if not isinstance(prov, dict):
            prov = {}
            sp["_provenance"] = prov
        prov["interoception_traits"] = PROV_TAG


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Derive per-species interoception_traits overrides (ratified rule) into the catalog"
    )
    ap.add_argument("--catalog", default=str(CATALOG_PATH))
    ap.add_argument("--apply", action="store_true", help="write the catalog (default: dry-run)")
    args = ap.parse_args(argv)

    with open(args.catalog, encoding="utf-8") as f:
        data = json.load(f)
    catalog = data["catalog"]
    to_apply, skipped = plan_overrides(catalog)

    print(f"[plan] {len(to_apply)} to apply, {len(skipped)} skipped (of {len(catalog)})")
    for sp, override in to_apply:
        print(f"  + {sp.get('species_id')} ({sp.get('sentience_index')}): {override}")

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
    print(f"[APPLIED] wrote {len(to_apply)} interoception_traits overrides into {args.catalog}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
