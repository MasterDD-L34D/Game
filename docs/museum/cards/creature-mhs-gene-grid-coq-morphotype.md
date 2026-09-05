---
title: 'MHS Gene Grid + CoQ Morphotype + Subnautica Lifecycle (P2 mutation pipeline canonical)'
museum_id: M-2026-04-27-007
type: research
domain: evolution_genetics
provenance:
  found_at: docs/research/2026-04-26-tier-a-extraction-matrix.md#7-monster-hunter-stories-capcom--201621
  git_sha_first: c4a0a4d5
  git_sha_last: 6480e025
  last_modified: 2026-04-26
  last_author: platform-research
  buried_reason: unintegrated
relevance_score: 5
reuse_path: 'Minimal: Subnautica habitat 5-stage wire (~3h) / Moderate: MHS gene grid 3×3 + CoQ morphotype (~10-13h) / Full: stack canonical 4-source mutation pipeline (~30h)'
related_pillars: [P2, P3]
status: curated
excavated_by: claude-code (deep extraction pass-2 2026-04-27)
excavated_on: 2026-04-27
last_verified: 2026-04-27
---

# MHS Gene Grid + CoQ Morphotype + Subnautica Lifecycle (P2 stack)

## Summary (30s)

- **5/5 score** — convergenza 4 fonti su mutation pipeline stack canonical: CoQ morphotype (char creation static) + MHS gene grid (snapshot accumulation 3×3) + Subnautica habitat (longitudinal stage) + CK3 DNA chains (V3 multi-generation, blocked OD-001).
- **3 pattern alto-ROI**: Subnautica habitat lifecycle 5-stage wire (~3h, Skiv hooks live), MHS gene grid 3×3 + bingo bonus (~4h Min), CoQ morphotype gating (~6h Min).
- **Stack adoption Moderate (~13h)**: CoQ at char-creation + MHS for accumulation + Subnautica for stage progression. Chiude P2 senza blocco OD-001 V3 mating.

## What was buried

Tier A matrix #6-9 mappa cluster "Mutation/Genetics" come donor canonical P2 multi-source:

- 🔴 **Subnautica habitat lifecycle** — stage = biome affinity (hatchling savana → juvenile desert → mature caverna → apex any)
- 🔴 **MHS gene grid 3×3** — 9 slot mutation, 3 align stessa categoria → bingo set bonus
- 🔴 **CoQ morphotype gating** — char creation single critical choice (Chimera/Esper) → mutation pool restriction
- ⚪ **CK3 DNA chains** — string compatta encoding parent→child, BLOCKED OD-001 V3 Mating verdict

## Why it might still matter

### Pillar match

- **P2 Evoluzione 🟡++**: Spore deep extraction (P2 fonte primaria) ha 6 pattern S1-S6 di cui S6 è MHS gene grid bingo. Stack 4-source = chiusura P2 runtime mutation engine completo.
- **P3 Specie×Job 🟡**: morphotype gating allinea con job archetype. CoQ morphotype = pool tag, Evo-Tactics job = pool subset.

### Convergenza Mutation Pipeline (5 fonti)

- **CoQ morphotype** (char creation static)
- **MHS gene grid** (snapshot accumulation)
- **Subnautica habitat** (longitudinal stage)
- **CK3 DNA chains** (V3 multi-generation)
- **Wildermyth permanent visible** (M-2026-04-27-004) — narrative parallel

5 fonti convergono su pattern "layered mutation surface" = signal robusto canonical.

### File targets

- Mutation catalog: [`data/core/mutations/mutation_catalog.yaml`](../../../data/core/mutations/mutation_catalog.yaml) — 30 entries, `category` field già presente (14 phys/5 sens/5 env/4 behav/2 sym)
- Form evolution: [`apps/backend/services/forms/formEvolution.js`](../../../apps/backend/services/forms/formEvolution.js)
- Skiv lifecycle: [`data/core/species/dune_stalker_lifecycle.yaml`](../../../data/core/species/dune_stalker_lifecycle.yaml) — `biome_affinity_per_stage` hook
- biomeSpawnBias: `apps/backend/services/spawn/biomeSpawnBias.js` (V7 shipped)
- Forms panel UI: [`apps/play/src/formsPanel.js`](../../../apps/play/src/formsPanel.js) — gene grid pattern reference

### Cross-card relations

- M-2026-04-26-001 [Voidling Bound](evolution_genetics-voidling-bound-patterns.md) — Pattern 1-6 + Spliced terminal endpoint
- M-2026-04-27-004 [Wildermyth Battle-Scar](creature-wildermyth-battle-scar-portrait.md) — narrative parallel
- M-2026-04-25-007 [Mating Engine Orphan](mating_nido-engine-orphan.md) — V3 Mating prerequisite per CK3
- M-2026-04-27-005 [Hades Multi-Currency](economy-hades-multi-currency-pact-menu.md) — currency separation Mutagen vs PE

## Concrete reuse paths

### Minimal — Subnautica wire (~3h, Skiv direct fit)

1. `data/core/species/dune_stalker_lifecycle.yaml` extend con `biome_affinity_per_stage: {hatchling: savana, juvenile: desert, mature: caverna, apex: any}`
2. `biomeSpawnBias.js` consume `biome_affinity_per_stage` per applicare bias per stage
3. Test playable: spawn Skiv in biome non-affine → vedi penalty stat
4. Skiv canonical reference

### Moderate — MHS gene grid + CoQ morphotype (~10-13h)

**MHS gene grid 3×3** (~4h):

1. Schema `data/core/mutation_grid.yaml` — slot 0-8 → mutation_id per creature
2. `progressionEngine.js computeMutationBingo(unit, catalog)` — if 3+ same category → bonus passive (es. 3× physiological → tank_plus +1 DR)
3. UI: estendi `formsPanel.js` con mutation grid pannello (clone form pattern)

**CoQ morphotype — DECISION CODIFIED 2026-04-27 → Soft bias** (~6h):

1. Field `morphotype_bias: [physiological|behavioral|cognitive|...]` su mutation YAML (default empty = universal)
2. Char creation: select 1 MBTI personality → mutation della stessa "category" appaiono **2× più frequenti** in `rewardOffer.js` softmax (NON exclusive — preserva flessibilità)
3. **Verdict definitivo**: soft bias (allinea V1 onboarding 60s shipped PR #1726). Hard gate **DEFER post-playtest live** — riconsiderato solo se players SI bloccano in soft bias durante TKT-M11B-06.
4. **Cross-impact Spore S6 bingo**: con soft bias, bingo bonus diventa **discovery emergente** (più reward design vs trivial garantito hard gate).

### Full — Stack canonical 4-source (~30h, blocked OD-001)

- CoQ + MHS + Subnautica + CK3 DNA chains
- CK3 require `services/generation/geneEncoder.js` (Tier A #8, 6h Min standalone)
- BLOCKED OD-001 V3 Mating verdict — geneEncoder può procedere standalone come prepartazione

## Tickets proposed

- [`TKT-CREATURE-SUBNAUTICA-LIFECYCLE`](../../../data/core/tickets/proposed/TKT-CREATURE-SUBNAUTICA-LIFECYCLE.json) (3h) — quick win Skiv direct fit
- [`TKT-CREATURE-MHS-GENE-GRID`](../../../data/core/tickets/proposed/TKT-CREATURE-MHS-GENE-GRID.json) (4h) — Spore S6 dependency
- [`TKT-CREATURE-COQ-MORPHOTYPE`](../../../data/core/tickets/proposed/TKT-CREATURE-COQ-MORPHOTYPE.json) (6h)
- [`TKT-CREATURE-CK3-DNA-CHAINS`](../../../data/core/tickets/proposed/TKT-CREATURE-CK3-DNA-CHAINS.json) (6h, blocked OD-001)

## Sources / provenance trail

- Source matrix: [`docs/research/2026-04-26-tier-a-extraction-matrix.md`](../../research/2026-04-26-tier-a-extraction-matrix.md) §6-9
- Caves of Qud (Freehold 2015+), Monster Hunter Stories (Capcom 2016/21), Subnautica (Unknown Worlds 2018), Crusader Kings 3 (Paradox 2020)
- Spore deep extraction Pattern S6: [`docs/research/2026-04-26-spore-deep-extraction.md`](../../research/2026-04-26-spore-deep-extraction.md)
- Stato arte: [`docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md`](../../reports/2026-04-27-stato-arte-completo-vertical-slice.md) §B.2

## Risks / open questions

- **Catalog imbalance**: 14/30 mutations physiological → bingo a 3 quasi garantito per ogni build. Authoring debt: balanciare catalog 7-8 mutation per categoria.
- ~~**Morphotype hard gate vs soft bias**~~ ✅ **risolta 2026-04-27**: soft bias confermato (allinea V1 onboarding 60s shipped). Vedi sezione "DECISION CODIFIED" sopra.
- **CK3 blocked OD-001**: V3 Mating verdict pending. geneEncoder.js può proceedere standalone come preparazione.
- **MHS bingo balance**: bingo bonus tier proportional o flat? +1 stat conservative; più amplifica meta dominante.

## Anti-pattern guard

- ❌ NON 248 evoluzioni Voidling-style scale (overwhelming MVP)
- ❌ NON Spore-trap procedural creator senza ricognizione
- ❌ NON stage cinematic blocking transitions
- ❌ NON random mutation senza visual_swap_it (Voidling Pattern 6 P0 conferma esterna)
- ✅ DO layered surface (char creation + accumulation + lifecycle)
- ✅ DO category bingo discoverable
- ✅ DO biome-stage affinity (Skiv canonical)
