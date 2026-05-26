---
title: 'ADR-2026-05-26 — Deep genetics Fase-1: scoped supersede of FINAL-DESIGN-FREEZE §21.3'
date: 2026-05-26
type: adr
workstream: evo-tactics / Pilastro 2
owner: master-dd
status: accepted
accepted_by: master-dd (in-chat 2026-05-26)
supersedes_scoped: vault `90-FINAL-DESIGN-FREEZE §21.3` (only for Fase-1 scope below)
related:
  - docs/superpowers/specs/2026-05-26-repro-heir-genetic-model-design.md (D-REPRO + D-HEIR)
  - docs/research/2026-04-26-spore-deep-extraction.md (S1-S6)
  - docs/adr/ADR-2026-04-26-spore-part-pack-slots.md (5 body_slot locked, complexity-budget, S5 deferred)
  - vault SoT §5 / §20 (Tri-Sorgente) / §21
---

# ADR-2026-05-26 — Deep genetics Fase-1: scoped supersede of freeze §21.3

## Context

`90-FINAL-DESIGN-FREEZE §21.3` (vault) defers "genetica complessa; genealogie
profonde; ecosistema riproduttivo a lungo termine; simulazione cross-mission
ricca". Cross-repo verify (2026-05-26) found the genotype + phenotype substrate
is largely SHIPPED (`rollMatingOffspring`/`inheritGeneSlots`, `mating.yaml`
gene_slots, `mutation_catalog` biome boost/penalty, `geneEncoder` lineage,
emergent tribes) and the Spore part-pack model is already designed + ADR'd
(ADR-2026-04-26, S5 generational-inheritance explicitly deferred). The
D-REPRO+D-HEIR spec proposes a deep 3-layer model. To build any of it we must
exit the §21.3 freeze-defer — but a full supersede risks scope-creep against the
shipping freeze.

## Decision

**Supersede §21.3 SCOPED to Fase-1 only** (Spore "Moderate" reuse-path). The
freeze-defer is lifted for, and ONLY for:

- **S1 body_slot** (5 locked slots, max 1 mutation/slot, `symbiotic` exception)
- **S2 part -> ability derivation** (`derived_ability_id`)
- **S3 MP-pool** (Mutation Points, complexity-budget `Sigma c <= C_max`)
- **S4 morphology-first** (`aspect_token` + `visual_swap_it`)
- **S6 category-bingo** (MHS gene grid)

These are additive to the existing 2-gene-slot + 1-env-mutation canonical rule;
they deepen the genotype/phenotype WITHOUT deep genealogies or the epigenome.

**Still DEFERRED (remain §21.3 vision, NOT unlocked here)**:
- Epigenome / Lamarck-lite telemetry-heritable layer (Fase-3).
- Deep multi-generation genealogies / long-term reproductive ecosystem.
- S5 ambient-drift lifecycle wire + cross-lineage isolation (Fase-2).

### Resolved decisions (D-REPRO/D-HEIR spec §5)

1. ADR-supersede = **this ADR, scoped Fase-1** (above).
2. **Epigenome accepted WITH mandatory `decay`/regression-to-mean** (anti-snowball),
   build deferred to Fase-3.
3. **2 reproduction paths stay distinct** (individual mating vs S5 ambient pool);
   fix cross-lineage isolation bug (`lineagePropagator.js:14-15`) in Fase-2.
4. **Backend canonical** for genotype (SoT §1); Godot consumes via API; unify the
   3 partial Godot impls (avg-blend / lineage_merge / offspring_ritual) in Fase-2.

## Scope & seam

Fase-1 = the existing `TKT-CREATURE-SPORE-01..08` (Moderate path, ~21h) from
`docs/research/2026-04-26-spore-deep-extraction.md §4`. No new path invented;
extends `metaProgression` / `progressionEngine` / `rewardOffer` / `mutation_catalog`.

## Consequences

- (+) Unlocks concrete Pilastro-2 build (part-pack depth) on already-designed
  ground, without committing to the risky epigenome or deep genealogies.
- (+) Keeps the shipping freeze intact for everything outside Fase-1.
- (-) Partial supersede = the freeze §21.3 now has a scoped carve-out; the vault
  freeze doc needs a "superseded-scoped by this ADR" banner (paired vault PR).
- (-) MP-pool + body_slot are schema changes (ripple: progressionEngine,
  rewardOffer, formEvolution) — schema-ripple escalation before merge.

## Risks (red-team)

1. **Snowball** (Fase-3 epigenome, pre-flagged): heritable play-shaped traits ->
   parents strong -> offspring stronger. Mitigation locked NOW: decay /
   regression-to-mean is a Fase-3 acceptance gate, not optional.
2. **Complexity-budget escape**: inheritance must NOT let a build exceed `C_max`
   regardless of inherited parts. Enforce at offspring materialization.
3. **Scope creep past Fase-1**: any genealogy/epigenome work needs a NEW ADR;
   this one does not authorize it.
4. **Bingo imbalance** (14/30 mutations physiological): catalog rebalance is
   authoring debt to plan before bingo ships.

## Status / next

Accepted. Next = `writing-plans` for Fase-1 (per phase / per TKT). Vault freeze
§21.3 superseded-banner = paired vault PR. Promotion of D-HEIR to SoT canonical
section = after Fase-1 ships.
