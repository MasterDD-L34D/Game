---
title: Voidling Bound — 6 Evolution & Genetics Patterns (Pilastro 2+3)
museum_id: M-2026-04-26-001
type: research
domain: evolution_genetics
provenance:
  found_at: docs/research/2026-04-26-voidling-bound-evolution-patterns.md
  git_sha_first: 'unknown'
  git_sha_last: 'unknown'
  last_modified: 2026-04-26
  last_author: creature-aspect-illuminator
  buried_reason: unintegrated
relevance_score: 4
reuse_path: 'Minimal: open BACKLOG ticket + flag mutation_catalog design debt (~1h) / Moderate: Pattern 6 visual_swap_it lint adoption 30 mutations (~5-6h) / Full: all 6 patterns wire M14 mutation engine (~15-20h)'
related_pillars: [P2, P3]
status: curated
excavated_by: creature-aspect-illuminator (research) + repo-archaeologist (curation)
excavated_on: 2026-04-26
last_verified: 2026-04-26
---

# Voidling Bound — 6 Evolution & Genetics Patterns (Pilastro 2+3)

## Summary (30s)

- **6 actionable patterns** harvested da Voidling Bound (Hatchery Games, ex-Skylanders/Ubisoft, demo 97% positive 1139 recensioni, release 2026-06-09). TPS+monster collector, overlap P2 evolution + marginale P3 stat allocation.
- **P0 gap conferma esterna**: Pattern 6 (`visual_swap_it` mandatory per tier-up) = gap GIÀ identificato da creature-aspect-illuminator audit, ora confermato da evidence indipendente. 0/30 mutation in `mutation_catalog.yaml` hanno questo field.
- **2 cross-pillar gem** ad alto valore: terminal-endpoint Apex (Spliced analog) + 3-currency separation (Mutagen vs Research Points vs Attribute Points) — entrambi con reuse path concreto nei file attivi.

## What was buried

Research doc (`docs/research/2026-04-26-voidling-bound-evolution-patterns.md`) contenente mechanic facts primary-sourced da Steam wiki + press + demo.

**Gioco**: Voidling Bound, Steam app 2004680. Hatchery Games (Quebec), team ex-Skylanders + Ubisoft. Genre: TPS + monster collector basato su "evolution & DNA splicing". Demo live, release 9 giugno 2026.

### 6 Pattern estratti

| #   | Pattern                                                                                               | Match file                                                   | Effort               |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------- |
| P1  | Rarity-gated ability CLASS unlock (ogni tier = verbo nuovo, non numero più grande)                    | `mutation_catalog.yaml` + `formEvolution.js`                 | ~2h                  |
| P2  | Element-choice path-lock al primo commitment (`mutually_exclusive_with`)                              | `mutation_catalog.yaml` schema additive                      | ~1-3h                |
| P3  | Spliced terminal endpoint: max freedom + no-breed tradeoff (Apex analog)                              | `dune_stalker_lifecycle.yaml` + future mutation engine       | ~3-6h                |
| P4  | 3-currency separation: Mutagen (tier-up) / Research Points (ability depth) / Attribute Points (stats) | `mutation_catalog.yaml` + `packs.yaml` + `formEvolution.js`  | ~2h design-debt flag |
| P5  | Faction element affinity → `archetype_affinity` per mutation (biome+archetype bridge)                 | `mutation_catalog.yaml` + `resistanceEngine.js`              | ~3h                  |
| P6  | Visual change mandatory every tier (P0 linter rule)                                                   | `mutation_catalog.yaml` + `tools/py/lint_mutations.py` (NEW) | ~2h                  |

### Rarity tiers VB (primary-source wiki Rarity page)

Common (0 Mutagen) → Rare (1, +Element) → Superior (3, +primary ability) → Exotic (6, +secondary ability) → Mutated (10, +Perk slot) → Spliced (N/A, any ability+element+3 perks cross-species, CANNOT BREED)

### 2 Cross-pillar gem

**Gem 1 — Apex as Spliced analog**: Spliced-cannot-breed = build freedom + genetic-cut tradeoff. Apex in `dune_stalker_lifecycle.yaml` dovrebbe: (a) togliere tutti i `mutually_exclusive_with` lock, (b) abilitare cross-species perk borrow (2 perk da altre species in roster), (c) produrre solo Legacy offspring (non direct hatch). Phase già nominata nel lifecycle YAML — solo flags da aggiungere.

**Gem 2 — Research Points come ability-depth currency**: VB split "sblocca nuovo tier" (Mutagen) da "approfondisce abilità esistente" (Research Points). Per Evo-Tactics: `jobs_expansion.yaml` perk (48 perk) potrebbe usare currency VC-derived separata da PE. Previene competizione PE "evolvi MBTI form" vs "sblocca job perk".

## Why it was buried

Research doc creato 2026-04-26 da `creature-aspect-illuminator` come harvest patterns. **Non è "sepolto"** nel senso tradizionale: il doc è nuovo. È **unintegrated** — i 6 pattern non hanno ancora ticket BACKLOG aperti, nessun campo schema aggiunto, nessun ADR proposto. La curation ha valore come primo accesso da Museum per agent futuri (evita re-research stesso gioco).

## Why it might still matter

### Pillar match

- **P2 Evoluzione 🟢c+**: Pattern 1 (ability class gating) + P2 (path-lock mutual exclusion) + P3 (Apex terminal) + P4 (currency separation) tutti toccano direttamente il sistema mutation M14.
- **P3 Specie×Job 🟢c+**: Pattern 5 (archetype affinity per mutation) chiude gap "mutations affect stats, non tactical matchups". Pattern 4 / Gem 2 separano PE job-perk da PE form-evolution.

### P0 gap esterna conferma

Pattern 6 (`visual_swap_it` mandatory) = già identificato da creature-aspect-illuminator come P0 linter rule da implementare. Evidenza esterna indipendente (VB wiki Rarity page: "Visual change" per ogni tier) aumenta confidence che gap è reale e impattante per UX.

### Cross-card ecosystem P2

- [M-2026-04-25-011 BiomeMemory](architecture-biome-memory-trait-cost.md) — biome memory + per-biome trait cost (stesso layer P2/P3)
- [M-2026-04-25-005 Magnetic Rift Resonance](old_mechanics-magnetic-rift-resonance.md) — biome-gated trait activation
- VB Pattern 5 archetype affinity → unisce biome system (esistente) con mutation system (M14) via `resistanceEngine.js`

### Cross-card P4

- [M-2026-04-25-009 Triangle Strategy MBTI Transfer](personality-triangle-strategy-transfer.md) — P4 closure path; VB Gem 2 Research Points suggerisce separazione PE da job-perk complementare a Triangle Proposal B
- [M-2026-04-25-007 Mating Engine Orphan](mating_nido-engine-orphan.md) — Spliced-cannot-breed analog mappa su V3 Mating legacy offspring concept

### Skiv `dune_stalker_lifecycle.yaml` direct fit

Pattern P3 Gem 1 (Apex-build-override flags) + Pattern P2 element-path-lock: Skiv lifecycle ha già `phase: apex` placeholder. Aggiungi `build_mode: unrestricted` + `legacy_only: true` + `cross_species_perks: 2` = Apex meaningful endpoint per Skiv Sprint C.

## Concrete reuse paths

### 1. Minimal — BACKLOG ticket + design debt flag (~1h)

P0 action: zero code, solo documentazione/triage:

- Apri ticket BACKLOG `TKT-MUTATION-P6-VISUAL`: "Aggiungere `visual_swap_it` a tutti 30 mutation in `data/core/mutations/mutation_catalog.yaml`". Priorità P1 (P0 gap confermato da 2 fonte indipendenti).
- Aggiungi nota design debt in `mutation_catalog.yaml` header: "`pe_cost` competizione con `formEvolution.js` peCost — separare in `mutagen_cost` pre-M14 wire" (Pattern 4).
- Output: gap documentati, agent futuri non ri-ricercano VB.

### 2. Moderate — Pattern 6 visual_swap_it lint adoption (~5-6h)

Partial adoption del pattern P0 più urgente:

- **Step 1** (~1h): Aggiungi `visual_swap_it` field a tutti 30 mutation in `data/core/mutations/mutation_catalog.yaml`. Testo breve italiano (~1 frase per mutation): es. `"Le falangi sviluppano cristalli di ghiaccio visibili su ogni artiglio"`.
- **Step 2** (~1h): Crea `tools/py/lint_mutations.py` — linter che fallisce se mutation manca `visual_swap_it` o `aspect_token`. Pattern da `tools/py/trait_style_check.js` (analog in JS).
- **Step 3** (~30min): CI hook — aggiungi `lint_mutations.py` a `npm run schema:lint` per PR che toccano `mutation_catalog.yaml`.
- **Step 4** (~2-3h): Aggiungi `mutually_exclusive_with: []` field a 5-6 mutation physiological come pilot (Pattern 2 partial).
- Blast radius: YAML additive + nuovo script Python → **×1.0** (pure docs/data layer). Nessun runtime change.

### 3. Full — All 6 patterns wire M14 mutation engine (~15-20h)

Integrazione completa per M14:

- **Pattern 1** (~2h): `unlocks_category` field per tier + gating logic extension in `formEvolution.js::evaluate()` (prerequisite tier N-1 check). NON strict linearity — parallel categories.
- **Pattern 2** (~3h): `mutually_exclusive_with: []` su tutti 30 mutation + filter logic in engine (filtra opzioni escluse prima di offrire, non blocca post-scelta).
- **Pattern 3** (~4h): `apex.build_mode: unrestricted` + `legacy_only: true` + `cross_species_perks: 2` in `dune_stalker_lifecycle.yaml`. Wire apex-phase check in mutation engine: se phase=apex → skip exclusion list.
- **Pattern 4** (~2h): Rename `pe_cost` → `mutagen_cost` in `mutation_catalog.yaml` + `packs.yaml` add `mutagen` item + `formEvolution.js` doc header separazione MBTI-PE vs Mutagen.
- **Pattern 5** (~3h): `archetype_affinity: {bonus: [], penalty: []}` field in mutation_catalog + hook in `resistanceEngine.js::mergeResistances()` per consumare affinity.
- **Pattern 6** già in Moderate step above.
- **ADR**: proposta a `sot-planner` per M14 mutation system architecture (N=3 currency + terminal-endpoint + path-lock). NON scrivere ADR autonomo.
- Blast radius: Pattern 5 tocca `resistanceEngine.js` (combat hot path) → **×1.5 multiplier**. 15-20h naive × 1.3 (route+service) → 19-26h reale.

## Sources / provenance trail

- Found at: [docs/research/2026-04-26-voidling-bound-evolution-patterns.md](../../research/2026-04-26-voidling-bound-evolution-patterns.md)
- Primary sources (non-generated):
  - [Rarity — Voidling Bound Wiki](https://voidlingbound.wiki.gg/wiki/Rarity) (CC BY-SA / UGC wiki)
  - [Elements — Voidling Bound Wiki](https://voidlingbound.wiki.gg/wiki/Elements)
  - [Steam app 2004680](https://store.steampowered.com/app/2004680/Voidling_Bound/)
  - [Demo Steam app 3559900](https://store.steampowered.com/app/3559900/Voidling_Bound_Demo/) (97% positive, 1139 reviews)
  - [Press release: Pirate PR June date](https://press.piratepr.com/voidling-bound-will-hatch-in-june-a-sci-fi-monster-taming-action-rpg-built-on-evolution--dna-splicing)
  - [Monster Taming Direct Splicing Station](https://press.piratepr.com/ex-skylanders-devs-unveil-new-voidling-bound-gameplay-during-monster-taming-direct)
- Git history for research doc: file created 2026-04-26, git SHA not yet committed (branch `feat/p0-ui-wcag-threat-tile-2026-04-26`)
- Related canonical targets:
  - [data/core/mutations/mutation_catalog.yaml](../../../data/core/mutations/mutation_catalog.yaml)
  - [apps/backend/services/forms/formEvolution.js](../../../apps/backend/services/forms/formEvolution.js) — `FormEvolutionEngine.evaluate(unit, vcSnapshot, targetFormId, opts)` + `evolve()`
  - [apps/backend/services/combat/resistanceEngine.js](../../../apps/backend/services/combat/resistanceEngine.js) — `mergeResistances(traitResistances, archetypeId, data)`
  - [data/core/species/dune_stalker_lifecycle.yaml](../../../data/core/species/dune_stalker_lifecycle.yaml)
  - [data/packs.yaml](../../../data/packs.yaml)
- Related museum cross-cards:
  - [M-2026-04-25-011 BiomeMemory](architecture-biome-memory-trait-cost.md) — biome layer P2
  - [M-2026-04-25-005 Magnetic Rift Resonance](old_mechanics-magnetic-rift-resonance.md) — biome-gated trait P2
  - [M-2026-04-25-009 Triangle Strategy MBTI](personality-triangle-strategy-transfer.md) — P4 closure
  - [M-2026-04-25-007 Mating Engine Orphan](mating_nido-engine-orphan.md) — Spliced analog + V3 Mating legacy

## Risks / open questions

- **Overlap parziale single-pillar**: VB = TPS+monster-collector, Evo-Tactics = co-op tactical. Genre gap riduce trasferibilità a P2/P3 subset. Pattern 1-6 sono principi strutturali (non mechanics specifiche), quindi gap è accettabile.
- **VB non ancora released** (2026-06-09): mechanic facts da wiki+demo potrebbero cambiare a release. Reverifica post-lancio se adottate pre-M14.
- **Currency rename (Pattern 4)** è schema-changing se altri consumer leggono `pe_cost` da mutation_catalog. Verifica grep prima di rename: `grep -rn "pe_cost" apps/ data/` per blast radius reale.
- **Pattern 5 blast radius**: `resistanceEngine.js` = combat hot path (×1.5 multiplier). 3h naive → 4-5h reale incluso regression test + integration check.
- **Gem 2 Research Points** = design decision, non implementazione. Richiede user verdict prima di fork PE currency.

## Anti-pattern guard (VB applied to Evo-Tactics)

- **NON fare Apex disponibile via PE grind semplice**: VB gates Mutagen via in-world discovery. Apex richiede `mutations_required >= 3 AND thoughts_internalized >= 2`, non solo `level >= 7`.
- **NON condividere Mutagen-equivalent con MBTI PE**: confermato design debt corrente in `mutation_catalog.yaml` (stesso `pe_cost` per mutation tier e form evolution). Flaggare prima di M14.
- **NON strict linear tier lock**: VB è linear (Common → Rare → Superior strict). Evo-Tactics ha mutation categories parallele — adotta "ogni tier = ability class distinta", NON la sequenza fissa.
- **NON saltare visual tier-up feedback**: 0/30 mutation hanno `visual_swap_it`. VB conferma = primary UX signal. Questo è P0 gap pre-M14.
- **NON implementare Pattern 5 senza regression test `resistanceEngine`**: combat hot path. Test suite `node --test tests/ai/*.test.js` deve restare verde post-hook.
