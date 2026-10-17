---
title: 'OD-024 D4 -- principled interoception_traits override rule (full pass)'
doc_status: draft
doc_owner: master-dd
workstream: backend
last_verified: '2026-06-22'
source_of_truth: false
language: en
review_cycle_days: 30
---

# OD-024 D4 -- principled interoception_traits override rule

## Goal

D4 shipped the pipeline (PR #2950): the producer reads a per-species
`interoception_traits` override (`perSpeciesOverride`), the schema allows it, the
ETL assemblers carry it, and `tools/etl/apply_interoception_traits.py` syncs an
authored value from `species.yaml` into the catalog. ZERO species author the
field yet.

This is the principled **full pass** (master-dd verdict 2026-06-22, Approach A):
derive a per-species override for every catalog species from a ratified rule
combining sentience tier (D2 baseline) + ecology, and write it into
`data/core/species/species_catalog.json`. The override REPLACES the D2 tier
subset, so the rule computes `tier_default UNION ecological_additions` and writes
it only where it differs from the tier default (no redundant rows).

**Band-neutral:** the grant flag `SENTIENCE_INTEROCEPTION_GRANT_ENABLED` stays
OFF, so the producer never grants -> no runtime behavior change despite the
catalog diff. N=40 calibration gates the eventual flip (D7, owner).

## Key simplification (data-grounded)

`propriocezione` + `equilibrio_vestibolare` are the T1 floor, so every T1+ species
already carries both via the tier default. The only ecological ADDITIONS the rule
can make are therefore:

- **nocicezione** to a sub-T2 species (T2+ already have it by tier)
- **termocezione** to a sub-T3 species (T3+ already have it by tier)

No aerial/aquatic detection is needed (vestibular is universal). The sparse
`morphotype` (13/75) and `ecology` (12/75) fields are NOT used as drivers; the
rule uses only fields present on 100% of species: `sentience_index`,
`biome_affinity`, `risk_profile.danger_level`.

## The rule

```
base       = tier_default(sentience_index)        # D2 cumulative map
additions  = {}
  + nocicezione   if risk_profile.danger_level >= 2     (RATIFIED 2026-06-22)
  + termocezione  if biome_affinity in THERMAL_BIOMES   (RATIFIED 2026-06-22)
override   = canonical_order(filter_whitelist(base UNION additions))
write override to the catalog entry IFF override != base
skip species whose tier rank < 1 (T0 / unknown) -- the producer gates them out
  before reading the override, so an override there is dead.
```

`tier_default` mirrors the producer `interoceptionForTier` (D2 map): `T1 =
[propriocezione, equilibrio_vestibolare]`, `T2 += nocicezione`, `T3+ +=
termocezione`. `filter_whitelist` + canonical order come from the shared
`tools/etl/interoception_field.py` (`INTEROCEPTION_TRAIT_IDS`).

### THERMAL_BIOMES (RATIFIED 2026-06-22)

Hot: `deserto_caldo`, `abisso_vulcanico`, `dorsale_termale_tropicale`,
`pianura_salina_iperarida`. Cold: `cryosteppe`, `caldera_glaciale`,
`mezzanotte_orbitale`, `stratosfera_tempestosa`. Arid-extreme: `badlands`
(master-dd call; `atollo_obsidiana` + `canyons_risonanti` ruled NON-thermal).

Non-thermal (no termocezione boost): `foresta_temperata`, `palude`, `savana`,
`canopia_ionica`, `foresta_acida`, `steppe_algoritmiche`, `reef_luminescente`,
`caverna`, `frattura_abissale_sinaptica`, `atollo_obsidiana`,
`canyons_risonanti`.

## Impact (computed on current catalog, 75 species)

33 species get an override (30 T1, 3 T2); 41 stay on the tier default (no row);
1 T0 skipped. Examples: thermal-biome T1 species -> `[prop, vest, termo]`; T1
danger>=2 -> `[prop, vest, noci]`; T2 thermal+danger -> all 4.

## Implementation

New `tools/etl/derive_interoception_overrides.py` (rule-based mirror of
`tools/py/apply_biome_affinity.py` + `apply_interoception_traits.py`):

- Module-level constants documented as RATIFIED: `THERMAL_BIOMES`,
  `NOCICEPTION_DANGER_THRESHOLD = 2`, `TIER_INTEROCEPTION_MAP` (mirror of the
  producer D2 map). Reuse `interoception_field.filter_interoception` +
  `INTEROCEPTION_TRAIT_IDS`.
- Pure core: `tier_default(tier)`, `derive_override(entry)` (returns the override
  list or `None` when it equals the tier default / tier < T1),
  `plan_overrides(catalog)` -> `(to_apply, skipped)`.
- IO wrapper: DRY-RUN by default, `--apply` to write; idempotent (entry already
  in sync -> skip); writes `interoception_traits` + `_provenance` (tag
  `d4-derived-rule`); `json.dump(ensure_ascii=False, indent=2)` + trailing
  newline (catalog format).
- Distinct from `apply_interoception_traits.py` (which reads an authored
  `species.yaml` field): this DERIVES from the rule. Both target the same catalog
  field; the rule-derived pass is the canonical D4 populate, manual authoring
  stays available for later exceptions.

## Test plan

- TDD pure functions: `tier_default` per tier; `derive_override` for each
  add-path (thermal T1, danger T1, both T2, T3+ -> None, T0 -> None, in-sync ->
  None); `plan_overrides` count/idempotency.
- Regenerate the catalog via `--apply`; assert the 33-entry diff is exactly
  `interoception_traits` + `_provenance` additions (no other field churn).
- Schema still validates (`interoception_traits` already an allowed property).
- Re-baseline any catalog snapshot/hash test that reacts to the new field
  (e.g. `tests/server/generationSnapshot.spec.js`) -- expected, documented.
- Full `node scripts/run-test-api.cjs` green; `PYTHONPATH=tools/py pytest`
  green. Producer band-neutral with flag OFF (no grant) -- assert no win-rate
  oracle shift.

## Non-goals

- Flipping `SENTIENCE_INTEROCEPTION_GRANT_ENABLED` (D7, owner, post N=40).
- Down-deviations / removing a baseline trait (Approach A is additive-only).
- Using morphotype/ecology as drivers (too sparse; revisit if authored later).

## Risks

- When the flag eventually flips, granting nocicezione/termocezione to ~33 more
  species shifts win-rates -> N=40 per the D7 gate (owner). Catalog change here is
  inert until then.
- Catalog snapshot tests will need a one-time re-baseline (the field is new).
- The rule is SDMG (designed here); the THERMAL set + danger threshold are
  RATIFIED by master-dd 2026-06-22, but the win-rate consequence is only known
  post N=40.
