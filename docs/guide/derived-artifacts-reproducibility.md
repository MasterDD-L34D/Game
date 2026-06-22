---
title: 'Derived data artifacts -- reproducibility hazard + guard (trait bridge + species catalog)'
date: 2026-06-22
doc_status: draft
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-06-22'
source_of_truth: false
review_cycle_days: 90
tags: [derived, reproducibility, drift, trait, species, catalog, etl, guard, ci]
---

# Derived data artifacts -- reproducibility hazard

## TL;DR (verdict)

Two families of committed DERIVED artifacts are **stale (drift), NOT a build-host
split**. Every real source IS in-repo -- the `/tmp` paths in the catalog
provenance are misleading leftover stamps from the original one-off build host,
not a required external input. A naive "just regenerate it" on a plain dev
checkout therefore produces a massive spurious diff that corrupts the canon and
blocks otherwise-simple trait/species data work (this is what stalled
TKT-P6-TRAIT-ORPHAN-DESIGN-B v3/v5/v6 + the v8 trait rename).

| Family             | Artifact(s)                                                   | Generator                                | Committed                        | No-op regen on dev       | Diff                                            |
| ------------------ | ------------------------------------------------------------- | ---------------------------------------- | -------------------------------- | ------------------------ | ----------------------------------------------- |
| 1. Trait bridge    | `data/traits/index.json`, `data/traits/species_affinity.json` | `tools/py/build_species_trait_bridge.py` | 287 affinity entries             | 54                       | 18101 lines on index.json; 3746 del on affinity |
| 2. Species catalog | `data/core/species/species_catalog.json`                      | `tools/etl/` 5-stage ETL                 | 75 species (stub:5 / promote:22) | 74 (stub:21 / promote:5) | ~2990 lines                                     |

All numbers above were **reproduced on a clean worktree off origin/main** (see
[Evidence](#evidence)). The guard `tools/py/check_derived_reproducible.py`
detects this drift without writing any corrupt artifact.

> The repo's "regenerate-or-die, never hand-edit derived species files" rule
> (canon-enforcement Phase A/B/D, `docs/pipelines/PIPELINE_SPECIES_BIOMES_STANDARD.md`)
> is currently **unsafe**: regenerate != committed. Until the
> [remediation](#owner-gated-remediation) lands, treat these artifacts as
> append-only and run the guard before any regen+commit.

## Family 1 -- trait bridge (DRIFT)

Root cause = stale output + generator non-determinism + a source-layer mismatch:

1. **Stale since 2025-12-03.** The affinity content was last genuinely generated
   by commit `7944d5d8` ("Complete trait species affinity coverage", 2025-12-03)
   from the THEN-richer pack species set. Across 2026 the pack species were pruned
   (canon-reconcile, orphan drops `#2813`, `#2271` deprecation, schema canonization
   `#2427`) down to **54** distinct trait references, but the bridge was never
   re-run. Result: **80 of the 84 species** referenced by the committed affinity
   no longer exist in the catalog (mostly deleted species + `*-trait-keeper`
   carriers).
2. **Source-layer mismatch (why renaming a per-trait file did nothing).**
   `build_species_affinity()` reads trait ids from the **species YAML**
   (`genetic_traits` + `derived_from_environment` in `packs/evo_tactics_pack/data/species`),
   NOT from the per-trait DB files `data/traits/<cat>/<trait>.json`. The per-trait
   files are only read by `--validate-only`. So a v8-style rename of
   `data/traits/<cat>/<trait>.json` cannot change the regen -- the affinity id
   comes from the species YAML. (The trait DEFINITIONS in `index.json` are built
   by a SEPARATE tool, `scripts/build_trait_index.js`, from the per-trait files;
   the Python bridge only overlays the `species_affinity` sub-field onto existing
   entries.)
3. **Post-hoc manual edit.** `#2885` (2026-06-20) hand-added a top-level
   `schema_version: "2.0"` wrapper key to `species_affinity.json` that the bridge
   does NOT emit -> a regen silently drops it.
4. **Windows newline non-determinism.** The bridge uses `Path.write_text(...)`
   (text mode) -> on Windows it emits CRLF, but the committed file is LF
   (`.gitattributes`). Even a content-identical regen diffs on every line on
   Windows.

## Family 2 -- species catalog ETL (DRIFT)

The chain `merge_pack_v2_species -> enrich_species_heuristic ->
promote_gameplay_to_canon -> derive_interoception_overrides ->
apply_interoception_traits` runs fine from in-repo sources, but the committed
catalog is **not reproducible even with the documented recipe**. Three concrete
mechanisms (each predicted by the guard):

1. **Downgrade-on-rerun (pipeline order bug).** `merge` emits a bare
   `game-canonical-stub` for every `data/core/species/*_lifecycle.yaml`; `promote`
   then SKIPS any species already in the catalog. **16** species that were
   `gameplay-promote` (rich: morphotype / threat_tier / pack_path) when the catalog
   was built have since gained a lifecycle YAML, so a re-run stubs them at merge
   and promote skips them -> they DOWNGRADE to bare stubs. Adding a lifecycle YAML
   makes the catalog worse on the next regen.
2. **Lingering events (additive promote never prunes).** **6** entries
   (`aurora_bridge_runner`, `glowcap_weaver`, `magneto_ridge_hunter`,
   `myco_spire_warden`, `slag_veil_ambusher`, `zephyr_spore_courier`) are
   ecological events (`role_trofico=evento_ecologico`). They were promoted before
   the `is_event` filter (v0.4.3) landed; promote only ADDS, so they were never
   removed. A fresh run excludes them.
3. **Missing newer species.** A fresh run promotes 5 gameplay species
   (`arboryxis_lenis`, `ferrimordax_rutilus`, `ferriscroba_detrita`,
   `nebulocornis_mollis`, `rubrospina_velox`) absent from the committed catalog.

Plus the footguns that make a faithful regen hard to even attempt:

- `source_provenance` points at `/tmp/species_catalog_v0.2.0_backup.json` +
  `/tmp/species_*_etl_source.yaml` (ephemeral build-host leftovers). The real
  in-repo inputs are `data/external/evo/species/species_catalog.json` (pack-v2)
  and the archived legacy YAMLs at
  `docs/archive/historical-snapshots/2026-05-15_species-deprecation/`.
- The default `--species-yaml` / `--expansion-yaml` of `merge_pack_v2_species.py`
  point at `data/core/species.yaml` / `species_expansion.yaml`, which were
  **deleted** in `#2271`. With the defaults, legacy absorb silently = 0 species
  (-38).
- `promote_gameplay_to_canon.py` has no `--out` / `--catalog` flag -- it writes
  the real catalog IN-PLACE, so you cannot dry-test it to a temp.

## Guard

`tools/py/check_derived_reproducible.py` makes the drift visible and CI-gateable.
It NEVER writes a tracked file: the trait-bridge check regenerates the affinity
map in-process to memory; the catalog check is a non-destructive prediction of
exactly which entries a full ETL re-run would add / drop / downgrade.

```bash
python tools/py/check_derived_reproducible.py                 # both, exit 1 on drift
python tools/py/check_derived_reproducible.py --only trait-bridge
python tools/py/check_derived_reproducible.py --warn-only     # advisory (exit 0)
```

Run it **before** regenerating + committing any of these artifacts. A clean exit
means a no-op regen reproduces the committed file from current sources.

## Faithful regen recipes (use only after the guard is clean / per owner)

Trait bridge (2 steps -- definitions then affinity overlay):

```bash
node scripts/build_trait_index.js          # index.json trait definitions (per-trait JSON -> index)
python tools/py/build_species_trait_bridge.py   # species_affinity.json + index species_affinity overlay
```

Species catalog (5 stages, non-default source args required):

```bash
AR=docs/archive/historical-snapshots/2026-05-15_species-deprecation
python tools/etl/merge_pack_v2_species.py \
  --pack-v2 data/external/evo/species/species_catalog.json \
  --species-yaml "$AR/species.yaml" --expansion-yaml "$AR/species_expansion.yaml" \
  --lifecycle-dir data/core/species --out data/core/species/species_catalog.json
python tools/etl/enrich_species_heuristic.py --catalog data/core/species/species_catalog.json --in-place
python tools/etl/promote_gameplay_to_canon.py --all-gameplay
python tools/etl/derive_interoception_overrides.py --apply
python tools/etl/apply_interoception_traits.py --apply
```

> WARNING: as of 2026-06-22 this recipe does NOT reproduce the committed catalog
> byte-for-byte (74 vs 75 species; stub/promote partition flips). See
> [remediation](#owner-gated-remediation) -- it needs the pipeline fix first,
> otherwise it REGRESSES the catalog.

## Owner-gated remediation (proposed, NOT done here)

Making a no-op regen reproduce the committed artifacts requires generator/pipeline
fixes plus a one-time re-baseline. These touch consumed data + (for CI wiring)
forbidden paths, so they are owner / master-dd gated:

1. **Generator determinism (tools, low risk):**
   - `build_species_trait_bridge.py`: write LF explicitly (`open(..., newline="")`
     or normalize) and preserve/emit the `schema_version` wrapper.
   - add `--out` to `promote_gameplay_to_canon.py` (and friends) so the chain is
     dry-testable to a temp.
2. **Pipeline idempotency (tools, design call):** make `promote` not lose to a
   bare lifecycle stub (e.g. merge should not stub a species that has a gameplay
   YAML, or promote should upgrade an existing stub in place), and prune entries
   whose source no longer qualifies (lingering `evento_ecologico`).
3. **Re-baseline (data change, master-dd):** after 1+2, run the recipes once and
   commit the fresh artifacts. For Family 1 this drops the 80 dead-species
   references (desired); confirm consumers (`apps/backend/services/traitRepository.js`,
   `apps/backend/services/catalog.js`, mission-console, trait-editor,
   `scripts/qa/frattura_abissale_validations.py`) tolerate the leaner affinity.
4. **CI wiring (forbidden path `.github/workflows/`, owner):** add
   `python tools/py/check_derived_reproducible.py` as a gate (or `--warn-only`
   advisory first) so future drift fails loudly.

## Source / derived map (reference)

- DERIVED (regenerate, never hand-edit): `data/core/species/species_catalog.json`,
  `data/traits/index.json`, `data/traits/species_affinity.json`, the pack catalog
  mirror, generation snapshots.
- SOURCE: `data/core/traits/active_effects.yaml`, `data/core/traits/glossary.json`,
  per-trait `data/traits/<cat>/<trait>.json`, `data/external/evo/species/species_catalog.json`,
  pack species YAML under `packs/evo_tactics_pack/data/species`, and the archived
  legacy YAMLs under `docs/archive/historical-snapshots/2026-05-15_species-deprecation/`.

Related: [`2026-06-22-tkt-p6-b-resolution-status.md`](../planning/2026-06-22-tkt-p6-b-resolution-status.md),
[`2026-06-22-tkt-p6-b-reground-correction.md`](../planning/2026-06-22-tkt-p6-b-reground-correction.md).
