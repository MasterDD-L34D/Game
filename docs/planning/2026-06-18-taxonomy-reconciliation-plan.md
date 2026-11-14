---
title: 'Taxonomy reconciliation plan -- file-side consistency without DB-as-SoT'
date: 2026-06-18
type: planning
doc_status: active
doc_owner: master-dd
workstream: dataset-pack
language: en
source_of_truth: false
review_cycle_days: 30
related_rfc:
  - 'Game-Database docs/rfc/2026-06-11-bidirectional-sync.md (RFC #4)'
  - 'Game-Database docs/rfc/2026-06-18-s3-db-as-sot-scoping.md (S3 scoping brief, #228)'
related_adr:
  - docs/adr/ADR-2026-04-14-game-database-topology.md
  - docs/adr/ADR-2026-05-15-species-catalog-schema-fork-resolution.md
tags: [evo-tactics, taxonomy, ssot, data-as-code, consistency, reconciliation]
---

# Taxonomy reconciliation plan (2026-06-18)

> **Status: PLAN (phased, decision-points open).** Frames how to close the
> discovered multi-representation taxonomy gaps WITHOUT making the DB the
> source-of-truth (DB-as-SoT deferred to S3+ per RFC #4). Ratifies nothing
> destructive; each phase is a separate gated change.

## 1. Context

RFC #4 S2 is closed: traits export-shipped, species fidelity-shadow, biome +
ecosystem import-only. DB-as-SoT authoring (S3) was scoped and **deferred** --
the schema gap (40+ fields/entity), ~25 runtime consumers, missing biome/eco
exporter, and the live control surfaces (sync:evo-pack generator + calibration
auto-ratify writing files + SPEC/item governance) all argue the DB should stay a
downstream shadow, not a second authoring surface (S3 scoping brief, Game-DB
#228).

That left the real question: **how do we reconcile the documents and close the
discovered gaps if NOT via the DB?** This plan answers it with the
file-based / git, no-DB best practice.

## 2. The standard (researched, cited)

For a single canonical source + derived views in a file-based git repo, the
industry standard converges on five rules:

1. **One canonical source per entity; GENERATE the derived views, never
   hand-author them.** (DRY / SSOT: "every piece of knowledge [has] a single,
   unambiguous, authoritative representation"; the "imposed duplication" fix is
   an _active_ build-time generator.)
2. **Mark generated files DO-NOT-EDIT and enforce generation in CI** -- a
   `regenerate && git diff --exit-code` (golden-file) gate makes drift between
   source and derived **impossible by construction**. Determinism required (no
   timestamps/random in the compared body).
3. **Represent tiers (designed / deployed / playable) as an explicit
   status/flag field on the canonical entity + a build-time filter** -- NOT as
   separate parallel hand-edited files.
4. **Cross-file referential integrity is a dedicated CHECKER (script), not JSON
   Schema `$ref`.** JSON Schema puts foreign-keys / id-exists-elsewhere
   explicitly out of scope; `$ref` is for schema composition only. Keep JSON
   Schema for per-record SHAPE, add a script that loads all representations and
   asserts refs resolve + uniqueness + SoT==derived.
5. **Do not over-unify ("One Truth Above All Else" anti-pattern).** Federate
   where divergence is legitimate; gate where it is drift. The biome/eco
   import-only + DB-as-SoT-deferred staging IS this pragmatic governance, not a
   shortcoming.

Sources: Pragmatic Programmer (Hunt & Thomas, "The Evils of Duplication");
en.wikipedia.org/wiki/Single_source_of_truth; jOOQ codegen version-control
(commit-vs-regenerate); JSON Schema spec "Scope of JSON Schema Validation"
(referential integrity out of scope); conftest / CUE (policy-as-code over
files); pret/pokefirered jsonproc (JSON SoT -> generated artifacts);
agiledata.org "One Truth Above All Else"; Software Engineering at Google
(monorepo = one source of truth).

**Validation:** the repo already implements this pattern by hand --
`sync:evo-pack` is the generator; `schemas/evo/species_catalog.schema.json` is
the shape gate; `tests/scripts/speciesTraitReferences.test.js` (species
`trait_id` -> glossary FK guard) and `tests/scripts/speciesIndexIntegrity.test.js`
(id uniqueness + `total_species` drift equality) are cross-file integrity gates.
**The gap is consolidation + coverage, not a new paradigm.**

## 3. Gap inventory (all entities, worst -> best)

| Entity         | Representations                                                                                                           | Real gaps found                                                                                                                                                                                                | Risk         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **Biomes**     | 4 (`data/core/biomes.yaml`, `biomes_expansion.yaml`, `biome_aliases.yaml`, `packs/.../data/biomes.yaml`)                  | `biomes_expansion.yaml` (20 biomes) unregistered in pack enrollment; alias mapping without merge enforcement; no equivalence gate; schema v1.0 vs v2.0                                                         | **Critical** |
| **Ecosystems** | 3-4 (`data/ecosystems/*.ecosystem.yaml`, `packs/.../data/ecosystems/*`, orphan `docs/planning/ecosystems-draft/`)         | REAL roster divergence (badlands 5 -> 8 species between core and pack); orphan draft folder                                                                                                                    | **High**     |
| **Species**    | 3 (`data/core/species/species_catalog.json` 75, `catalog_data.json` roster 21, per-file `docs/catalog/species/*.json` 21) | `role_tags:'playable'` (8 legacy, undeployed) vs `playable_unit:true` (8 deployed) overload = two answers to "playable"; 4 `evento_*` roster-only (is_event, generator-filtered); cross-layer parity unchecked | **High**     |
| **Traits**     | 3 primary + 5 derived (auto-synced via `traits-sync.yml`)                                                                 | single auto-synced SoT (cleanest); 60+ per-biome trait-keeper sidecars lack back-concordance to glossary                                                                                                       | **Medium**   |

Note: species per-file == roster (21==21, identical ids) -- no orphan files. The
58 catalog species not in the roster are designed-but-undeployed backlog (by
`source`), not drift.

## 4. Layered solution

- **L1 -- Generation-enforcement (root fix, highest leverage).** Make the
  derived views provably generated, not hand-edited: a CI gate that regenerates
  (`sync:evo-pack`) and fails on a dirty tree (`git diff --exit-code`), plus a
  `DO NOT EDIT - generated by sync:evo-pack` header on each generated file. Kills
  the species/biome/eco "stale or hand-edited derived file" drift class by
  construction. Requires the generator to be deterministic (the existing
  `TIMESTAMP_KEYS` ignore for `generated_at` is the pattern).
- **L2 -- Tiers as flags + collapse the playable overload.** Add an explicit
  `tier`/`status` field to the canonical entity; pick ONE canonical "playable"
  flag and derive the per-file `playable_unit` from it (no double authoring).
  Resolves the 8-vs-8 mismatch. (Decision-point: see section 6.)
- **L3 -- Extend the cross-file integrity checker** (the existing
  `speciesIndexIntegrity` / `check-canon-consistency.cjs` pattern) for the
  invariants generation does not cover: roster species in catalog OR `is_event`;
  biome enrollment (expansion biomes registered); ecosystem roster equivalence
  (the badlands 5->8 case); trait-keeper back-concordance. Fail CI with the
  offending ids.
- **L4 -- Per-entity shape schema** under `schemas/` validated in the existing
  gate chain (partially done for species; extend to biome/eco).

## 5. Phased sequencing

1. **Phase A -- L1 species + biome/eco generation-enforcement gate** (root fix;
   no semantic decisions needed; highest leverage). DO-NOT-EDIT markers +
   regenerate-and-diff CI gate.
2. **Phase B -- L3 referential-integrity coverage** for the non-generated
   cross-refs (events-allowed, biome enrollment, ecosystem roster equivalence).
3. **Phase C -- L2 tiers + playable collapse** (gated on the section-6 tier
   decision).
4. **Phase D -- L4 schema coverage** for biome/eco (lowest urgency).

Each phase is a separate worktree-isolated PR through `evo-import-gate` +
`dataset-checks`, Eduardo merge.

## 6. Decisions

**Ratified (this session):**

- DB-as-SoT for taxonomy authoring is DEFERRED to S3+ (a single Game-led
  authoring migration; not now). File = authoring SoT, DB = downstream shadow +
  trait-export-SoT.
- Reconciliation is file-side (generator + checker + schema), per the standard.

**Pending (Eduardo):**

- **Tier semantics** -- the canonical partition: full-catalog (75 designed) /
  deployed (21 roster = per-file) / events (`is_event`, catalog_data-only) /
  playable. Confirm the field + meaning.
- **Playable collapse direction** -- the 8 legacy `role_tags:'playable'` are
  lore-only (zero gameplay data) and reference undeployed biomes; deploying them
  is a separate design+calibration project. Decision (2026-06-18): treat
  `role_tags:'playable'` as **designed-backlog** distinct from `playable_unit`
  (deployed); the L3 checker codifies the distinction + baselines the 8 as
  tracked backlog. Deploy is deferred.
- **Commit-vs-regenerate** for the generated derived files (catalog_data,
  per-file species): commit + CI-diff-gate (tracked-contract) OR
  regenerate-in-build (no commit). Default per standard = the diff-gate is the
  enforcement either way.
- **Per-entity scope** -- do all four entities now, or species first?

## 7. References

- RFC #4 (Game-Database `docs/rfc/2026-06-11-bidirectional-sync.md`) + S3
  scoping brief (`docs/rfc/2026-06-18-s3-db-as-sot-scoping.md`, #228).
- ADR-2026-04-14 (Game <-> Game-Database topology; DB downstream, build-time
  import) + ADR-2026-05-15 (species catalog Option A; `species_catalog.json` =
  canonical authored SoT).
- Existing guards: `scripts/check-canon-consistency.cjs` (G3 5-rule gate),
  `tests/scripts/speciesIndexIntegrity.test.js`,
  `tests/scripts/speciesTraitReferences.test.js`, `schemas/evo/species_catalog.schema.json`.
- Generator: `scripts/update_evo_pack_catalog.js` + `scripts/sync_evo_pack_assets.js` (`npm run sync:evo-pack`).
- Standards: see section 2 source list.

## 8. Outcome (2026-06-18)

- **Phase A -- SHIPPED** (#2832): species generation-enforcement (DO-NOT-EDIT
  `_generated` marker + regenerate-and-diff gate via `git status --porcelain`).
- **Phase B -- SHIPPED** (#2837): added `roster-species-canon` (inv1, clean) +
  `ecosystem-roster-parity` (inv3) rules to `check-canon-consistency.cjs`.
  Recon DROPPED inv2 (biome enrollment = dead-def S3 debt, overlaps `biome-refs`)
  and inv4 (trait-keeper = empty stub sidecars; the "violations" were
  `services_links` ecosystem-service refs, not traits -- already covered).
- **5 ghost species -- DEPLOYED honest-stub** (#2850): the legacy `ecosystem-roster-parity`
  baseline ghosts were brought into the game as honest uncalibrated stubs
  (encounter_role only + empty vc + canon-truth traits); baseline shrunk to `[]`.
  Real balance/vc deferred to AI-playtest calibration.
- **Phase C -- SKIPPED.** The "playable overload" premise does not hold: the
  three "playable" signals are near-disjoint distinct concepts, not a redundant
  double-authoring -- (a) `clade_tag: Playable` (7, a taxonomy clade), (b)
  `role_tags: 'playable'` (8 canon, a design-intent/backlog tag), (c)
  `playable_unit: true` (8 roster, a deploy flag). The `role_tags:'playable'`
  and `playable_unit` sets have ZERO overlap; the deployed playable_unit set has clade=null and
  role_tags-playable=false. Collapsing them would conflate taxonomy + intent +
  deploy-state (over-unify, plan rule 5). The "tier" is already derivable
  (deployed = in roster; backlog = canon-not-roster; event = `is_event` /
  `flags.event`), so a stored `tier` field is YAGNI. No conflation/drift exists
  today. A stored tier field + collapse is NOT pursued.
- **Phase D -- SHIPPED**: per-entity shape schemas `schemas/evo/biome.schema.json`
  and `schemas/evo/ecosystem.schema.json`, validated in `validate_datasets.py`
  (`validate_biome_schema` and `validate_ecosystem_schema`, mirroring the
  species_catalog full-schema gate). Required fields = the set present on all
  current records; `additionalProperties: true` permits per-record extras.
  SCOPE: the biome schema guards top-level record completeness only (nested
  shapes are enforced by the procedural `validate_biomes()`); the ecosystem
  schema governs the `data/ecosystems/*.ecosystem.yaml` shape only (the
  `packs/.../data/ecosystems/` files have a different shape, governed by
  `run_all_validators.py`). Negative-control (bad docs caught: 13 biome / 8
  ecosystem) verified with the real jsonschema; a committed regression test is
  deferred to the repo-root `jsonschema/` shadow cleanup (else it would no-op).
