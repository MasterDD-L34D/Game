---
title: 'Spore — Part-pack runtime stack 6 pattern S1-S6 (P2 fonte primaria)'
museum_id: M-2026-04-27-008
type: research
domain: evolution_genetics
provenance:
  found_at: docs/research/2026-04-26-spore-deep-extraction.md
  git_sha_first: cfc31c52
  git_sha_last: 6480e025
  last_modified: 2026-04-26
  last_author: creature-aspect-illuminator
  buried_reason: unintegrated
relevance_score: 5
reuse_path: 'Minimal: ADR locked schema (~1h) / Moderate: S1-S3-S6 + visual swap authoring 30 mutations (~21h) / Full: + S5 propagateLineage + biome-aware mutation gate (~50h)'
related_pillars: [P2]
status: curated
excavated_by: claude-code (deep extraction pass-2 2026-04-27)
excavated_on: 2026-04-27
last_verified: 2026-04-27
---

# Spore — Part-pack runtime stack 6 pattern S1-S6 (P2 fonte primaria)

## Summary (30s)

- **5/5 score** — Spore Creature Stage è il **donor primario Pillar 2** mai prima estratto a livello deep. PR #1895 shipped ha appena documentato 6 pattern S1-S6 transferable.
- **Repo state**: 84 specie YAML + 30 mutation_catalog entries + 5-fase lifecycle (dune_stalker solo) — **zero runtime evolution engine**. Spore è la chiave per chiudere il gap.
- **Reuse path Moderate ~21h** (S1+S2+S3+S6 + visual swap) chiude P2 → 🟢 candidato definitivo. Ship 1 ADR + 9 ticket sequenziali.

## What was buried

[`docs/research/2026-04-26-spore-deep-extraction.md`](../../research/2026-04-26-spore-deep-extraction.md) shipped 2026-04-26 PR #1895 contiene 6 pattern dettagliati:

|      # | Pattern                                               |                        Effort |                          Status                           |
| -----: | ----------------------------------------------------- | ----------------------------: | :-------------------------------------------------------: |
| **S1** | Slot-based morphology (`body_slot` field)             |                     3h schema |                          🔴 0/30                          |
| **S2** | Ability derivation auto (`derived_ability_id`)        |          6h engine + endpoint |                            🔴                             |
| **S3** | DNA budget per-encounter (pool MP separato da PE)     |                            4h |                            🔴                             |
| **S4** | Visual swap obbligatorio (Wildermyth/Voidling lesson) | 18h authoring + render + lint | 🟡 lint shipped #1899; 0/30 mutation hanno `aspect_token` |
| **S5** | Generational inheritance (`propagateLineage`)         |                            5h |             🔴 (mating engine 469 LOC orphan)             |
| **S6** | Part-category bingo 3-align (MHS gene grid)           |                            7h |                            🔴                             |

## Why it might still matter

### Pillar match

- **P2 Evoluzione 🟡++ → 🟢 candidato (Moderate path)**: Spore è il pillar P2 missing piece. Senza, P2 resta 🟡 perpetuo. Con, P2 chiude playtestable.

### Convergenza Mutation Pipeline (5 fonti, vedi M-2026-04-27-007)

- Spore S1-S6 (questo) = backbone runtime
- CoQ morphotype gating (char creation)
- MHS gene grid (snapshot)
- Subnautica habitat lifecycle (longitudinal)
- Wildermyth permanent visible (narrative parallel)
- Voidling Bound Pattern 6 visual swap (P0 conferma esterna)

### File targets

- Mutation catalog: [`data/core/mutations/mutation_catalog.yaml`](../../../data/core/mutations/mutation_catalog.yaml) — 30 entries
- Skiv lifecycle: [`data/core/species/dune_stalker_lifecycle.yaml`](../../../data/core/species/dune_stalker_lifecycle.yaml) — `mutation_morphology` 4 entries con `aspect_token` (only Skiv)
- Form evolution: [`apps/backend/services/forms/formEvolution.js`](../../../apps/backend/services/forms/formEvolution.js)
- Reward offer: [`apps/backend/services/rewards/rewardOffer.js`](../../../apps/backend/services/rewards/rewardOffer.js) — softmax pool R/A/P + nuovo M
- Render: [`apps/play/src/render.js`](../../../apps/play/src/render.js) — `drawMutationDots()` overlay
- Lint shipped: [`tools/py/lint_mutations.py`](../../../tools/py/lint_mutations.py)

### Cross-card relations

- M-2026-04-26-001 [Voidling Bound](evolution_genetics-voidling-bound-patterns.md) — Pattern 6 visual swap conferma esterna
- M-2026-04-27-007 [MHS Gene Grid + CoQ + Subnautica](creature-mhs-gene-grid-coq-morphotype.md) — Spore S6 = MHS bingo
- M-2026-04-27-004 [Wildermyth Battle-Scar](creature-wildermyth-battle-scar-portrait.md) — convergenza visual swap
- M-2026-04-25-007 [Mating Engine Orphan](mating_nido-engine-orphan.md) — Spore S5 propagateLineage = wire mating engine 469 LOC

## Concrete reuse paths

### Minimal — ADR locked schema (~1h)

1. ADR `docs/adr/ADR-2026-04-26-spore-part-pack-slots.md` — schema body_slot + gating rule + no runtime change
2. `form_pack_bias.yaml` — section commentato `mutation_slots:` 5 slot canonici (mouth, appendage, sense, tegument, back)
3. Sblocca authoring 30 mutation parallelo (autonomous)

### Moderate — S1+S2+S3+S6 + visual swap (~21h totale)

1. **S1 schema** (~3h): `body_slot` field a tutti 30 mutation entries
2. **Authoring visual swap** (~15h): `aspect_token` + `visual_swap_it` per 30 entries (0.5h × 30)
3. **S2 engine** (~6h): `progressionEngine.applyMutation()` + endpoint `POST /api/session/:id/mutation/apply`
4. **S3 currency MP** (~4h): rename `pe_cost` → split + pool M softmax + Skiv saga state
5. **S6 bingo** (~7h): `computeMutationBingo()` + UI panel `formsPanel` extension
6. **render** (~2h): `drawMutationDots()` overlay (max 3 dot CELL=40)
7. **lint** (~1h): wire `lint_mutations.py` (shipped) in CI npm script

Total Moderate: 21h schema+engine + 15h authoring authoring batch parallelo.

### Full — All 6 patterns (~50h)

1. - **S5 propagateLineage** (~5h): legacy phase hook → write `lineage_traits` (chiude Mating engine orphan ROI)
2. - **Biome-aware mutation unlock gates** (~3h): `biomeSpawnBias.js` extension
3. - **geneEncoder CK3 V3** (~8h): per V3 Mating wire blocked OD-001
4. - **Authoring catalog 30→50+ mutations** (~10h): bilanciamento per coprire 8 slot × 5 biome cluster

## Tickets proposed

10 ticket sequenziali catalogati nel docs/research/2026-04-26-spore-deep-extraction.md §7:

- `TKT-CREATURE-SPORE-01` ADR (1h)
- `TKT-CREATURE-SPORE-02` Authoring 30 mutation (15h)
- `TKT-CREATURE-SPORE-03` lint script (1h, ✅ shipped #1899)
- `TKT-CREATURE-SPORE-04` slot-conflict gating (2h)
- `TKT-CREATURE-SPORE-05` applyMutation endpoint (3h)
- `TKT-CREATURE-SPORE-06` computeMutationBingo (2h)
- `TKT-CREATURE-SPORE-07` rewardOffer pool M (1h)
- `TKT-CREATURE-SPORE-08` drawMutationDots overlay (2h)
- `TKT-CREATURE-SPORE-09` propagateLineage (5h)
- `TKT-CREATURE-SPORE-10` formsPanel mutation grid UI (4h)

Total Moderate (TKT-01→TKT-08): ~27h. Full (TKT-01→TKT-10): ~36h.

## Sources / provenance trail

- Source: [`docs/research/2026-04-26-spore-deep-extraction.md`](../../research/2026-04-26-spore-deep-extraction.md) (PR #1895)
- Spore Wiki creature parts database: `https://spore.fandom.com/wiki/Creature_Stage`
- Maxis GDC 2009 "Procedural Approach in Spore" — part derivation + ability emergence
- PR shipped: [#1895 cfc31c52](https://github.com/MasterDD-L34D/Game/pull/1895), [#1899 50cc5fe3 lint](https://github.com/MasterDD-L34D/Game/pull/1899)
- Stato arte: [`docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md`](../../reports/2026-04-27-stato-arte-completo-vertical-slice.md) §B (Spore extraction)

## Risks / open questions

- **Schema-changing**: `pe_cost` rename = blast radius. Verifica `grep -rn "pe_cost" apps/ data/` pre-merge.
- **Catalog imbalance**: 14/30 mutations physiological — bingo S6 a 3 quasi garantito senza authoring re-balance.
- **Authoring debt**: 30 mutation × 0.5h = 15h authoring batch. Bottleneck cycle time.
- **S5 propagateLineage** ROI: chiude mating engine orphan 469 LOC ma OD-001 V3 verdict pending.

## Anti-pattern guard

- ❌ NON Spore sandbox open-world navigation (Evo turn-based hex)
- ❌ NON real-time creature editor mid-encounter (async campaign)
- ❌ NON full 5-stage Cell→Space progression (scope creep)
- ❌ NON procedural creature creator 3D (Cogmind lesson)
- ❌ NON infinite revert (DP rimborsabili) — Frostpunk lesson irreversibilità
- ❌ NON real-time combat (d20 turn-based)
- ✅ DO part-pack additive (5 slot)
- ✅ DO ability emergence dalle parti (deterministic)
- ✅ DO visual emergence prima del testo (Wildermyth + Voidling Pattern 6 conferma)
