---
title: 'ADR-2026-05-15 — species catalog schema fork resolution (Q1 OD-027)'
date: 2026-05-15
type: adr
workstream: dataset-pack
owner: master-dd
status: proposed
proposed_by: claude-code (PR #2271 audit Phase A residue)
related_files:
  - data/core/species.yaml
  - data/core/species_expansion.yaml
  - data/core/species/species_catalog.json
  - schemas/evo/species.schema.json
  - schemas/evo/enums.json
  - apps/backend/services/vcScoring.js
  - apps/backend/services/nebulaTelemetryAggregator.js
related_adr:
  - docs/adr/ADR-2026-05-02-species-ecology-schema.md
  - docs/adr/ADR-2026-05-11-species-expansion-schema-canonical-migration.md
related_pr:
  - https://github.com/MasterDD-L34D/Game/pull/2260
  - https://github.com/MasterDD-L34D/Game/pull/2262
  - https://github.com/MasterDD-L34D/Game/pull/2271
related_od:
  - OD-027 (PR #2260 audit Q1)
  - OD-031 (Pack drift core autoritativo)
language: it
---

# ADR-2026-05-15 — Species catalog schema fork resolution (Q1 OD-027)

## Status

**PROPOSED** by claude-code (PR #2271 audit Phase A residue completism).

⚠️ Subjective Claude judgment markup soft — pending master-dd verdict per criteri canonical-migration vs coexistence vs merge-back diversi.

## Context

Post-PR #2262 ai-station Envelope B shipping, esiste **schema fork temporaneo** tra 2 sistemi species canonical:

### System A — `data/core/species.yaml` + `species_expansion.yaml` (legacy)

- **53 species** (20 in species.yaml + 33 in species_expansion.yaml species_examples)
- Schema: `sentience_tier` (T0-T6 enum)
- Field set: `id` + `legacy_slug` + `genus` + `epithet` + `clade_tag` + `sentience_tier` + `display_name_*` + `morph_slots` + `preferred_biomes` + `role_tags` + `trait_plan` + `source` + `ecology`
- Status: 100% sentience_tier assigned, ALL species fully populated
- Runtime consumers: legacy species pipeline (catalog.js, validators)

### System B — `data/core/species/species_catalog.json` (new ai-station Envelope B 2026-05-14)

- **15 species** (10 from Pack v2-full-plus + 5 game-canonical stubs Frattura Abissale + dune_stalker)
- Schema: `sentience_index` (T0-T6 enum, $ref enums.json#/$defs/sentience_tier — same enum but different field name)
- Field set: rich schema v0.2.0 — `species_id` + `scientific_name` + `common_names` + `classification` + `functional_signature` + `visual_description` + `risk_profile` + `interactions` + `constraints` + `sentience_index` + `ecotypes` + `trait_refs` + `lifecycle_yaml` + `source` + `merged_at`
- Status: 15/15 sentience_index, rich provenance trail
- Runtime consumers: vcScoring.js:1057 (4-layer psicologico) + nebulaTelemetryAggregator.js (atlas analytics)

### Coexistence anomaly

Schema `schemas/evo/species.schema.json:94` defines ONLY `sentience_index` field (NOT `sentience_tier`). System A files use `sentience_tier`. So System A files **technically schema-non-compliant** ma nessun validator blocca (legacy carve-out).

PR #2271 commit `75cb025` (TKT-ECO-A4-residue) ha mirror-synced sentience_index = sentience_tier per tutti 53 species in System A. Bridge safe ma redundancy ora presente.

## Decision options

### Option A — Canonical migration (System B = canonical, System A deprecated)

Migrate all 53 species from System A → System B (species_catalog.json). Deprecate species.yaml + species_expansion.yaml.

**Pros**:
- Single SOT clean per species (matches OD-031 "core autoritativo" direction extended)
- Rich schema v0.2.0 forced everywhere (better catalog quality)
- vcScoring + nebulaTelemetry consume uniform single source
- ETL pipeline `tools/etl/merge_pack_v2_species.py` extensible per residue

**Cons**:
- Effort substantial: ~10-15h ETL extension per 38 residue species (rich schema fields manual fill: scientific_name + visual_description + risk_profile + ecotypes + trait_refs)
- Legacy consumers (catalog.js, validators) require migration
- Risk: species.yaml è referenced cross-stack (Game-Database build-time import via packs/evo_tactics_pack/docs/catalog/) — break risk

### Option B — Coexistence permanent (status quo)

Mantieni dual SOT con bridge field (sentience_index mirror via PR #2271 A4-residue).

**Pros**:
- Zero break risk
- Zero migration effort
- vcScoring already works via species_catalog.json (15 species subset)
- 38 residue species sentience_tier preserved + sentience_index mirrored = consumable se needed

**Cons**:
- Permanent schema drift technical debt
- Future agents will re-discover the fork + confusion
- Rich schema v0.2.0 NOT propagated to 38 residue (limited atlas / wiki quality per legacy entries)
- Maintenance burden (2 files vs 1)

### Option C — Merge-back to species.yaml (System A = canonical, System B = subset cache)

Migrate 15 catalog species fields back to species.yaml (extend schema with rich v0.2.0 fields). Treat species_catalog.json as cache/subset for fast lookup.

**Pros**:
- Single SOT in legacy file
- Existing tooling preserved
- Pack v2-full-plus rich data preserved

**Cons**:
- Anti-pattern: rich schema → flat YAML (loss of validation rigor)
- vcScoring + nebulaTelemetry need to refactor consumer back to species.yaml
- ETL pipeline `merge_pack_v2_species.py` becomes obsolete
- Diverges from ai-station "core autoritativo" Envelope B direction

## Recommended option (Claude-proposed pending master-dd verdict)

**Option A — Canonical migration** with phased rollout:

### Phase 1 (~4-6h, autonomous)
- ETL extension `tools/etl/merge_pack_v2_species.py` to absorb species.yaml + species_expansion.yaml entries
- Heuristic populate rich schema fields (scientific_name from genus+epithet, visual_description from existing description if any, sentience_index from existing sentience_tier, ecotypes + risk_profile + interactions left empty/null per gradual fill master-dd review)
- Output: species_catalog.json grows 15 → 53 entries

### Phase 2 (~2-3h, autonomous)
- Update vcScoring + nebulaTelemetry to consume species_catalog.json full 53 species
- Mark species.yaml + species_expansion.yaml as DEPRECATED via header comment + governance file

### Phase 3 (~1-2h, master-dd review)
- Master-dd review draft scientific_name + visual_description + ecotypes for all 53 species
- Iterate fill quality
- Final sign-off

### Phase 4 (~3-4h, master-dd authority)
- Update Game-Database build-time import to read species_catalog.json
- Remove species.yaml + species_expansion.yaml after sync (keep historical snapshot in `docs/archive/`)
- Validator update to reject `sentience_tier` field

**Total effort estimate**: ~10-15h cross-stack.

### Why Option A vs B/C

- B (coexistence) leaves schema drift permanente, future agent confusion (audit error pattern PR #2260 L7c may repeat for species discovery)
- C (merge-back) anti-pattern rich → flat schema + diverges ai-station direction

Option A respects:
- "Core autoritativo additive" (OD-031) spirit (canonical = species_catalog.json with rich schema)
- "Finish work, not conservative" (ai-station 2026-05-14 master-dd direction)
- Single SOT principle (CLAUDE.md guardrail)
- Engine LIVE Surface DEAD anti-pattern killer (rich data accessible via schema-validated single source)

## Risks Option A

- Migration ETL bugs corrupting 38 species data → mitigation: idempotent ETL + dry-run + diff verify pre-commit
- Game-Database build-time import break → mitigation: backward compat `docs/catalog/*.md` regeneration sync (Game/ → Game-Database existing pipeline)
- Rich schema fields heuristic may produce low-quality entries → mitigation: master-dd review draft Phase 3 explicit gate

## Decision

**PENDING MASTER-DD VERDICT**.

Possible verdicts:
- ✅ ACCEPT Option A → Claude autonomous Phase 1+2 (~6-9h), master-dd Phase 3+4
- ⚠️ ACCEPT Option B → status quo (Phase A residue A4-residue mirror sync sufficient)
- ❌ ACCEPT Option C → Claude autonomous merge-back (~10-12h)
- 🔄 PROPOSE alternative (es. hybrid catalog as lookup index + species.yaml as content store)

## References

- PR #2260 ecosystem 7-strati audit (Q1 governance question raised)
- PR #2262 Envelope B species_catalog.json shipping (System B introduction)
- PR #2271 Phase A residue A4-residue mirror sync (System A bridge)
- ADR-2026-05-02 species ecology schema (predecessor)
- ADR-2026-05-11 species_expansion schema canonical migration (related precedent)
- OD-027 PR #2260 audit Q1 schema fork
- OD-031 Pack drift core autoritativo additive verdict
- vault docs/decisions/OD-024-031-aistation-reanalysis-2026-05-14.md (ai-station methodology)

## Related cards

- Museum card M-2026-05-13-001 promotions-orphan-claim-discarded (lessons codify per Explore agent inventory)
- Museum card mating_nido-engine-orphan revived state (FULL CLOSURE PathA precedent for big migration)

---

*Sabbia segue. — Skiv*
