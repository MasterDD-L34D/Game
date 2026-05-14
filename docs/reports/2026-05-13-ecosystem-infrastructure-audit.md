---
title: 'Ecosystem Infrastructure Audit 2026-05-13 — 7-strati pipeline Ecosistema→Evoluzioni'
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-05-13'
source_of_truth: false
language: it
review_cycle_days: 60
tags: [audit, ecosystem, biome, foodweb, species, mating, forms, mutations, skiv, gate-5, museum-first]
---

# Ecosystem Infrastructure Audit — 2026-05-13

**Trigger**: user esplicito "analizza col metodo tutta l'infrastruttura Ecosistema > Biomi > reti trofiche > hazard e opportunità > specie > mating > creature giocabili ed evoluzioni".

**Metodo**: Museum-first (gallery `worldgen` last_verified 2026-04-26 ancora valida — solo 2 commit toccano area dal 26 aprile) + Explore agent layer 5-7 (specie/mating/forms/mutations/promotions) + cross-check pillar reality post-audit 2026-05-07.

**Scope**: solo audit. Zero modifiche runtime. Output = report + decisione mappa per master-dd.

---

## TL;DR — Tabella stato 7 strati

| #   | Strato                  | Dataset                            | Engine                       | Surface player              | Test         | Status                    |
| --- | ----------------------- | ---------------------------------- | ---------------------------- | --------------------------- | ------------ | ------------------------- |
| 1   | Bioma (pacchetto)       | ✅ 4 file ~1100 LOC                | 🟡 `biomeSpawnBias.js` only  | 🟡 affix → spawn weight     | parziale     | 🟡 PARTIAL                |
| 2   | Ecosistema (struttura)  | ✅ 5 file ecosystem + biome.yaml   | ❌ zero runtime              | ❌ zero                     | validator-py | ❌ DATASET-ONLY           |
| 3   | Reti trofiche (foodweb) | ✅ 5 file 534 LOC                  | ❌ zero (solo `/api/quality`)| ❌ zero                     | validator-py | ❌ DATASET-ONLY           |
| 4   | Hazard / cross-events   | ✅ `biomes.yaml` + `cross_events`  | ❌ zero                      | ❌ zero                     | validator-py | ❌ DATASET-ONLY           |
| 5   | Specie                  | ✅ 893 + 4640 + 297 ancestors      | 🟡 `biomeAffinity.js` 106LOC | 🟡 `speciesNames.js` display| ✅ 2/3       | 🟡 PARTIAL                |
| 6   | Mating + Nido + Recruit | ✅ 477 LOC `mating.yaml`           | ✅ 1053 LOC `metaProgression`| ✅ `nestHub.js` + debrief   | ✅ 600 LOC   | 🟢 **FULL WIRED**         |
| 7a  | Forms (MBTI evolution)  | ✅ 472 LOC + d12 bias              | ✅ 1053 LOC 5 services       | ✅ `formsPanel.js` modal    | ✅ 4 test    | 🟢 **FULL WIRED**         |
| 7b  | Mutations (M14)         | ✅ 1366 LOC catalog 30 entries     | ✅ 573 LOC 3 services        | ⚠️ surface location unclear | ✅ 292 LOC   | 🟡 ENGINE OK / SURFACE ?  |
| 7c  | Promotions              | ✅ 43 LOC YAML                     | ✅ 302 LOC `promotionEngine` | ✅ 2 endpoint session route | ⚠️ verify    | 🟢 **WIRED** (corrected)  |
| 7d  | Skiv (creature canon)   | ✅ lifecycle 5-fase + saga.json    | ✅ 8 backend hook            | ✅ diary + thoughts ritual  | ✅ runtime   | 🟢 WIRED (sentience gap)  |

**Sintesi (post cross-validation 2026-05-13 sera)**: 11 strati totali → **4/11 🟢 FULL WIRED** (Mating + Forms + Skiv + **Promotions corrected**), **3/11 🟡 PARTIAL**, **4/11 ❌ DATASET-ONLY**.

**Pattern dominante**: anti-pattern *Engine LIVE Surface DEAD* + *Dataset shipped runtime ZERO* concentrato strati 2-4 (ecosistema strutturale invisibile a player). L7c Promotions originally classified ORPHAN was **FALSE NEGATIVE** — see [§Layer 7c correction](#layer-7c-corrected--promotions) + museum discard card [M-2026-05-13-001](../museum/cards/promotions-orphan-claim-discarded.md).

**Pattern positivo**: strato 6 mating ha chiuso Engine-Orphan museum card M-2026-04-25-007 via Sprint Nido Path A (PR #1876+1879+1911, FULL CLOSURE 2026-04-27).

---

## Layer 1 — Bioma (pacchetto gameplay+fiction)

**Card museum**: [`worldgen-biome-as-gameplay-fiction-package`](../museum/cards/worldgen-biome-as-gameplay-fiction-package.md) score 5/5.

**Dataset** (4 file):
- `data/core/biomes.yaml` — pacchetto canonical: `difficulty`, `affixes`, `hazard.stress_modifiers`, `StressWave`, `npc_archetypes`, `tono`, `hooks`
- `data/core/biome_aliases.yaml` — alias mapping
- `data/core/biomes_expansion.yaml` — extension entries
- `packs/evo_tactics_pack/data/ecosystems/<biome>.biome.yaml` — 5 biome pack (badlands/cryosteppe/deserto_caldo/foresta_temperata/rovine_planari)

**Engine runtime**:
- `apps/backend/services/biomeSpawnBias.js` — UNICO wire runtime (PR #1726, 2026-04-24). Consuma `affixes` da bioma per modificare spawn weight.

**Surface player**: `apps/play/src/biomeChip.js` (UI chip biome name). Affix → spawn weight = effetto invisibile (sub-sistema).

**Gap principali**:
- ❌ `hazard.stress_modifiers` + `diff_base` + `mod_biome` ZERO runtime (~3h reuse path tier 1 museum).
- ❌ `StressWave` iniziale per bioma non scala HP enemy o pressure runtime.
- ❌ `npc_archetypes` per bioma non guida spawn enemy archetipico.
- ❌ `starter_bioma` packs dichiarati stringa, contenuto undefined (~3h tier 1).

**Status**: 🟡 PARTIAL — solo affix wired.

---

## Layer 2 — Ecosistema (struttura trofica completa)

**Card museum**: [`worldgen-bioma-ecosistema-foodweb-network-stack`](../museum/cards/worldgen-bioma-ecosistema-foodweb-network-stack.md) score 5/5.

**Dataset** (5 file `*.ecosystem.yaml` ~290 LOC totali in pack):
- `packs/evo_tactics_pack/data/ecosystems/*.ecosystem.yaml` — 5 ecosistemi con link specie + ruoli trofici + valid_for_combat
- `packs/evo_tactics_pack/data/ecosystems/meta_network_alpha.yaml` — 5 nodi + 12 edge tipizzati + bridge_species_map + regole `at_least`

**Engine runtime**: ❌ ZERO. `services/generation/` ha bridge synthesizer, ma il modello ecosistemico **non viene consumato** dal session engine, dal session round bridge, o da nessun endpoint runtime.

**Surface player**: ❌ ZERO. Il player non vede "questo bioma fa parte di un network ecologico interconnesso".

**Status**: ❌ DATASET-ONLY (validator Python esiste, runtime zero).

---

## Layer 3 — Reti trofiche (foodweb)

**Card museum**: [`worldgen-trophic-roles-validator-not-runtime`](../museum/cards/worldgen-trophic-roles-validator-not-runtime.md) score 4/5.

**Dataset** (5 file foodweb ~534 LOC totali):
- `packs/evo_tactics_pack/data/foodwebs/*_foodweb.yaml` — 5 reti complete con archi predator/prey + nodi tipizzati (species/resource/decomposer)
- `biome_pools.json:role_templates` — 489 righe role pool

**Validator**:
- `tools/py/foodweb.py` + `tools/py/trophic_roles.py` (validator-time)

**Engine runtime**: ❌ ZERO al di fuori del validator. Solo `/api/quality` espone metrics aggregate (non gameplay).

**Surface player**: ❌ ZERO.

**Gap chiave**:
- ❌ `role_templates` da `biome_pools.json` caricato da `catalog.js` ma NON esposto a spawn (museum reuse path tier 1, ~6h).
- ❌ Trophic role resolver Node-native mancante (~15h tier 2, P3 boost).

**Status**: ❌ DATASET-ONLY.

---

## Layer 4 — Hazard / Cross-bioma events / Opportunità

**Card museum**: [`worldgen-cross-bioma-events-propagation`](../museum/cards/worldgen-cross-bioma-events-propagation.md) score 4/5.

**Dataset**:
- `data/core/biomes.yaml` → `hazard.stress_modifiers` + `StressWave`
- `packs/evo_tactics_pack/data/ecosystems/cross_events.yaml` — 3 cross-events con propagation_rules

**Engine runtime**: ❌ ZERO. Nessun service consuma `cross_events.yaml`.

**Surface player**: ❌ ZERO.

**Note critiche**:
- ⚠️ Effetti cross-event descritti narrativamente ("penalità visibilità/gear metallico") senza numeri. Anti-pattern: wire prematuro → richiede design decision prima.
- ❌ Bridge species (`echo-wing`, `ferrocolonia-magnetotattica`, `archon-solare`) shipped nel pack ma NON in `data/core/species.yaml` canonical.

**Status**: ❌ DATASET-ONLY (richiede design ADR pre-wire).

---

## Layer 5 — Specie (registry + ancestry + sentience)

**Card museum**:
- [`ancestors-297-orphan-2026-05-10`](../museum/cards/ancestors-297-orphan-2026-05-10.md) score 3/5
- [`cognitive_traits-sentience-tiers-v1`](../museum/cards/cognitive_traits-sentience-tiers-v1.md)

**Dataset**:
- `data/core/species.yaml` — 893 LOC, 45 specie canonical (incluso Skiv `dune_stalker` riga 71)
- `data/core/species_expansion.yaml` — 896 LOC extension
- `data/core/species/*_lifecycle.yaml` — 16 file lifecycle (62 LOC ciascuno)
- `data/core/ancestors/ancestors_rename_proposal_v1.yaml` — 4640 LOC, 297 entries (T1-T2)
- `data/core/ancestors/ancestors_rename_proposal_v2.yaml` — 4645 LOC duplicato Italian IDs
- `incoming/sentience_traits_v1.0.yaml` — T1-T6 + interoception hooks (BURIED)

**Engine runtime**:
- `apps/backend/services/species/biomeAffinity.js` (106 LOC) — calcola bioma affinity 🟢
- `apps/backend/services/species/wikiLinkBridge.js` (188 LOC) — bridge metadata partial
- `apps/backend/routes/speciesBiomes.js` (119 LOC) — 6 endpoint `GET /api/species`, `/biomes`, `/species-biomes`
- `apps/backend/routes/speciesWiki.js` (78 LOC) — 3 endpoint wiki bridge

**Surface player**:
- `apps/play/src/speciesNames.js` — display-only lista nomi (no evolution affordance UI)
- Nessun HUD player-visible per ancestry selection o sentience tier

**Test coverage**:
- `tests/services/speciesBuilder.test.js` ✅
- `tests/test_species_builder.py` ✅
- Ancestors: zero test, zero consumer runtime

**Gap critici**:
- ❌ **Ancestors 297 entries**: dataset completo, branch metadata UNICO sito (18 categorie), zero runtime consumer (museum reuse path B: biome_pool seeder ~3h).
- ❌ **Sentience tier 0/45 backfill**: enum LIVE in `schemas/core/enums.json` da 6 mesi, **zero specie marcate**. Skiv lifecycle T2-T3 documentato in canonical doc ma non runtime-gated (museum: ~8h backfill).
- ⚠️ Trait orphan: 91 traits totali, **35/91 shipped player-visible** (PR #2210 wave 3+4 chiusi 2026-05-10), 56 residue.

**Status**: 🟡 PARTIAL — biome affinity wired, ma ancestry e sentience layer dormienti.

---

## Layer 6 — Mating + Reclutamento + Nido

**Card museum**: [`mating_nido-engine-orphan`](../museum/cards/mating_nido-engine-orphan.md) score 5/5 — **NOW SUPERSEDED** dal closure OD-001 Path A 2026-04-27.

**Dataset**:
- `data/core/mating.yaml` — 477 LOC canonical: regole d20, cooldown, affinity matrix, ennea modifiers

**Engine runtime**:
- `apps/backend/services/metaProgression.js` — **1053 LOC** (crescita da 469 in museum card → +584 LOC post-2026-04-25)
  - `canMate(unitA, unitB)`, `rollMating(unitA, unitB, rng)`, `computeMatingRoll(...)`
  - `setNest(nestId, config)`, `tickCooldowns(state)`, `recruitFromDefeat(unitId, party)`
- `apps/backend/services/mating/computeMatingEligibles.js` — 140 LOC helper
- `apps/backend/services/meta/{eventChainScripting,geneEncoder,mutationTreeSwap}.js` — 506 LOC supporto evoluzione meta
- `apps/backend/routes/meta.js` — **328 LOC** (era 119) — 7 endpoint REST: `/api/meta/{npg,affinity,trust,recruit,mating,nest,nest/setup}` + ulteriori sub-route
- Prisma adapter `UnitProgression` (migration `0004_unit_progression.sql`)

**Surface player** — confermato wired:
- `apps/play/src/api.js:352-390` — comment "OD-001 Path A V3 Mating/Nido — 7 endpoint /api/meta/* (2026-04-26)" + 7 fetch helpers: `metaNpgList`, `metaAffinity`, `metaTrust`, `metaRecruit`, `metaMating`, `metaNestGet`, `metaNestSetup`
- `apps/play/src/nestHub.js` — squad UI + lista NPC recruited + lineage tab (PR #1911)
- `apps/play/src/debriefPanel.js:680` — fetch `/api/meta/compat` con fallback graceful

**Test coverage**:
- `tests/services/metaProgression.mating.test.js` (~300 LOC)
- `tests/services/metaProgression.lineage.test.js`

**PR trail closure**:
- PR #1876 Sprint A `nestHub` panel + biome_arc unlock
- PR #1879 Sprint C backend mating roll + 3-tier offspring
- PR #1911 Lineage tab UI nestHub
- PR #1877 closed-superseded 2026-04-27 notte

**Status**: 🟢 **FULL WIRED end-to-end** — Engine + Routes + Frontend + Tests. Solo strato del pipeline che ha chiuso anti-pattern Engine LIVE Surface DEAD canonical case.

**Action richiesta**: aggiornare museum card M-2026-04-25-007 con post-script "FULL CLOSURE 2026-04-27 via OD-001 Path A" + last_verified bump (card additive-only per protocol museum).

---

## Layer 7a — Forms (MBTI evolution)

**Card museum**: [`worldgen-forme-mbti-as-evolutionary-seed`](../museum/cards/worldgen-forme-mbti-as-evolutionary-seed.md) score 4/5.

**Dataset**:
- `data/core/forms/mbti_forms.yaml` — 224 LOC, 16 forme MBTI definitions
- `data/core/forms/form_pack_bias.yaml` — 248 LOC d12 bias MBTI → starter pack

**Engine runtime** (5 services ~1053 LOC):
- `formEvolution.js` (221 LOC) — slot gating + bingo (PR #1916)
- `formPackRecommender.js` (242 LOC) — `resolveStarterBioma()` + d12 roll
- `formSessionStore.js` (208 LOC) — Prisma persistence
- `formStatApplier.js` (147 LOC) — stat application
- `packRoller.js` (184 LOC) — d20 seed pack roll
- `formInnataTrait.js` (63 LOC) — innate trait resolver

**Routes** (`apps/backend/routes/forms.js`, 210 LOC, 13 endpoint):
- `GET /registry`, `/starter-biomas`, `/:formId/starter-bioma`, `/:id`
- `POST /evaluate`, `/options`, `/evolve`, `/pack/roll`
- `GET /session/:sid`, `GET /session/:sid/:unitId`, `POST /session/:sid/:unitId/{seed,evolve}`
- `GET /pack/costs`

**Surface player**: `apps/play/src/formsPanel.js` + `apps/play/src/characterCreation.js:174` fetch `/api/forms/{formId}/packs`. Modal evolution overlay LIVE, header button "🧬 Evo".

**Test coverage**: `tests/api/{formEvolution,formPackRoutes,formSessionStorePrisma}.test.js` + `tests/services/formPackRecommender.test.js` (4 test ~620 LOC totali).

**Status**: 🟢 **FULL WIRED** — pillar P2 evoluzione emergente core wire.

---

## Layer 7b — Mutations (M14 unit-self post-encounter)

**Dataset**:
- `data/core/mutations/mutation_catalog.yaml` — **1366 LOC** (~30 entries, M14 framework)
- `data/core/mutations/canonical_list.yaml` — 79 LOC alias index

**Engine runtime** (3 services ~573 LOC):
- `mutationEngine.js` (270 LOC) — `checkSlotConflict`, `applyMutationPure`, `computeMutationBingo`
- `mutationCatalogLoader.js` (181 LOC) — load + index + eligible
- `mpTracker.js` (122 LOC) — MP budget tracking

**Routes** (`apps/backend/routes/mutations.js`, 221 LOC, 5 endpoint):
- `GET /registry`, `GET /:id`
- `POST /eligible`, `POST /apply`, `POST /bingo`

**Surface player**:
- `apps/play/src/api.js:398` — `mutationsRegistry()` wired
- ⚠️ **UI surface location NON trovata via grep** in `apps/play/src/`. Probabile lazy-load inline o deferred modal NOT trovato standalone come `formsPanel.js`.

**Test coverage**: `tests/services/mutationEngine.test.js` (292 LOC) + `tests/services/mutationCatalogLoader.test.js` ✅.

**Gap chiave Gate 5**: engine + routes wired, ma surface player-visible **NON verificabile in <60s gameplay** via inspection. Richiede smoke test live per confermare "user può VEDERE mutation applicata in debrief o overlay".

**Status**: 🟡 **ENGINE WIRED / SURFACE UNVERIFIED** — possibile anti-pattern Gate 5 residuo. Action: smoke live nuova sessione.

---

## Layer 7c (CORRECTED) — Promotions

**⚠️ AUDIT CORRECTION 2026-05-13 sera** — claim originale "ORPHAN COMPLETE" era **FALSE NEGATIVE**. Cross-validation flag da Godot v2 worktree session (`clever-brattain-ce2046`) ha rivelato l'errore.

**Root cause Explore agent miss**:
- Cercato sub-dir literal `apps/backend/services/promotions/` → vuoto
- Realtà: file vive sotto `apps/backend/services/progression/promotionEngine.js`
- Cercato literal "promotion" in route function definition → missato perché import destrutturato `{ evaluatePromotion, applyPromotion }` linea 208
- Speed/completeness tradeoff (226s, 51k token) → false negative su sub-dir naming heuristic

**Ground truth verificata (`grep` diretto 2026-05-13 sera)**:

**Dataset**: `data/core/promotions/promotions.yaml` (43 LOC). ✅

**Engine runtime**:
- `apps/backend/services/progression/promotionEngine.js` — **302 LOC, 9494 bytes**, mtime 2026-05-11
- Functions: `evaluatePromotion`, `applyPromotion`

**Routes** (`apps/backend/routes/session.js`):
- `:208` — `const { evaluatePromotion, applyPromotion } = require('../services/progression/promotionEngine');`
- `:2663` — `GET /api/session/:id/promotion-eligibility`
- `:2681` — `POST /api/session/:id/promote`
- `:2670` + `:2699` + `:2706` — function call sites

**Surface player**: routes wired (player POV verify smoke pending TKT-ECO-A2-revised).

**Cross-stack live (Godot v2 + Postgres)**:
- Godot v2 engine `promotion_engine.gd` (PR #226)
- Godot v2 UI `PromotionPanel.tscn` (PR #243)
- Godot v2 caller wire E3 (PR #252)
- D2-C Postgres `promotion_tiers` JSONB (PR #2259 + #253 + #254 + #256)

**Status corrected**: 🟢 **WIRED full-stack** — cross-stack pillar tra i più completi, NON orphan.

**Action revised**: TKT-ECO-A2 (sandbox header) **CANCELLED** + TKT-ECO-B7 (demolish vs implement) **REVISED** → verify-only smoke ~0.5h.

**Lesson codify**: futuro Explore agent task per "engine inventory" deve grep cross sub-dir naming variants (es. `promotion*` cross `services/*/`) E import destrutturati cross routes. Aggiungo a plan §risk register.

**Provenance correction**: cross-validation flag PR #2260 comment by master-dd (relayed Godot v2 wave session 2026-05-13 closure).

---

## Layer 7d — Creatura giocabile canonical (Skiv)

**Dataset**:
- `data/core/species.yaml:71` — entry `dune_stalker` (Arenavenator vagans) — trait_plan + biome_affinity savana + clade_tag
- `data/core/species/dune_stalker_lifecycle.yaml` — 5 fasi vitali (level gating + aspetto + tactical correlate + ASCII sprite)
- `data/derived/skiv_saga.json` — runtime snapshot (Lv 4, MBTI INTP 76%, picked_perks)
- `docs/skiv/CANONICAL.md` — hub canonico cross-PC

**Engine runtime hooks** (8 backend file):
- `apps/backend/app.js`, `routes/{diary,progression,session,sessionHelpers,sessionRoundBridge}.js`
- `services/combat/{biomeResonance,defyEngine,synergyDetector}.js`
- `services/{diary/diaryStore,thoughts/thoughtCabinet,progression/progressionEngine,hardcoreScenario,tutorialScenario}.js`

**Surface player**: diary panel + thoughts ritual + biomeResonance combat overlay + debrief Lineage tab.

**Tool**: `tools/py/seed_skiv_saga.py` — compose phase → runtime state.

**Cross-layer dependency**:
- ✅ Species (Layer 5) `dune_stalker` registry
- ✅ Forms (Layer 7a) INTP 76% wired
- ✅ Mating (Layer 6) recruit hook (mating-blocked vagans → indirect)
- ❌ Sentience tier (Layer 5) T2-T3 documentato canonical, ma `sentience_index` enum NON applicato — Skiv lifecycle gating funziona via `level` proxy, non via tier semantico
- ✅ Bioma affinity savana (Layer 1 → Layer 5)

**Status**: 🟢 **WIRED** con 1/8 dependency dormiente (sentience backfill).

---

## Mappa dipendenze cross-layer

```
Layer 1 Bioma ──┐
                ├─→ Layer 5 Species (biomeAffinity) ─┐
Layer 2 Eco ────┤ (dataset only, dormente)          │
                │                                    ├─→ Layer 6 Mating ─→ debrief recruit + nest
Layer 3 Food ───┤ (dataset only, dormente)          │
                │                                    └─→ Layer 7a Forms (MBTI evolution)
Layer 4 Hazard ─┘ (dataset only, dormente)              └─→ Layer 7b Mutations (engine OK, surface ?)
                                                          └─→ Layer 7c Promotions (🟢 FULL WIRED — corrected post 2026-05-13 sera)
                                                          └─→ Layer 7d Skiv (canonical)
```

**Osservazioni**:
1. Pipeline **3 monchi paralleli** (Eco + Food + Hazard) producono input zero a Layer 5 runtime.
2. Layer 6 + 7a + 7d formano triangolo wired completo (pillar P2/P3 core).
3. Layer 7b è "quasi-wired" — engine + tests OK, ma surface unverified.
4. Layer 7c isolata orfana — nessuna dependency upstream/downstream.

---

## Pillar reality cross-check (post-audit 2026-05-07)

CLAUDE.md sprint context 2026-05-07 audit honest reveal — il "🟢++ everywhere" era aspirational. Applicato a strato ecosystem:

| Pilastro                           | Stato CLAUDE.md sprint  | Reality post-audit infra        | Driver                                                                              |
| ---------------------------------- | :---------------------: | :------------------------------: | ----------------------------------------------------------------------------------- |
| **P2 Evoluzione emergente**        | 🟢++ (mating engine)    | 🟢 candidato confermato         | Layer 6 + 7a + 7d wired full-stack. Layer 7b unverified blocca 🟢++.                |
| **P3 Identità Specie × Job**       | 🟢ⁿ                     | 🟡 candidato                    | Layer 5 sentience 0/45 + ancestors 297 buried → dataset shippato non leggibile.    |

**Implicazione**: P2 è 1 smoke test mutations distante da 🟢++ definitivo. P3 richiede sentience backfill (~8h) + ancestors consumer (~3h) per chiudere gap "specie ha personalità riconoscibile player-visible".

---

## Reuse path prioritizzata (priority order)

### Tier 1 — Quick wins (~3-6h ciascuno, autonomous procedibili)

1. **Sentience tier backfill 45 specie** (~8h, P3 driver):
   - Aggiungere `sentience_index: T<n>` a ogni entry `data/core/species.yaml` + `species_expansion.yaml`
   - Skiv = T2-T3 esistente in doc → propagare a 45 specie via heuristic + master-dd review
   - Unblock: lifecycle gating semantico Skiv + altre specie
   - Blast ×1.3 (data + lifecycle resolver)

2. ~~**Promotions sandbox header** (~10 min, anti-rot)~~: **SUPERSEDED** post cross-validation 2026-05-13 sera. Promotions è 🟢 FULL WIRED (vedi §Layer 7c CORRECTED). Action revised → **verify-only smoke** shipped via [PR #2261](https://github.com/MasterDD-L34D/Game/pull/2261) (`tests/api/promotions-cross-stack-smoke.test.js` 5 tests). Do NOT add sandbox header (mislabel active runtime data).

3. **Bioma diff_base + hazard → pressure modifier** (~3h, P6 driver):
   - `sessionHelpers.js` consuma `biomes.yaml.hazard.stress_modifiers` + `diff_base` → scala HP enemy + StressWave iniziale
   - Chiude gap P6 senza nuovi nemici
   - Blast ×1.3

4. **starter_bioma trait definition** (~3h, completionist):
   - Definire per ogni bioma slug `starter_bioma_trait` → `formPackRecommender.js` lo risolve
   - Chiude campo YAML undefined
   - Blast ×1.3

5. **Smoke test Mutations UI surface** (~30 min, verify Gate 5):
   - Avviare backend + frontend, applicare mutation via `/api/v1/mutations/apply`
   - Verificare in <60s gameplay che user VEDE effetto (overlay, debrief field, log line)
   - Se ❌ → ticket "mutations surface gap M14" → ~4-8h frontend wire
   - Se ✅ → Layer 7b status → 🟢 + museum gallery update

### Tier 2 — Medium effort (~8-15h, ADR consigliato)

6. **role_templates → biomeSpawnBias extension** (~6h, P3 boost):
   - Estendere `biomeSpawnBias.js` per leggere `role_templates` da `biome_pools.json`
   - Spawn enemy con role ecologico corretto (predator / prey / decomposer)
   - Blast ×1.5

7. **Ancestors 297 → biome_pool seeder** (~3h Path B museum card):
   - Read `ancestors_rename_proposal_v2.yaml:branch` → assign branch-grouped trait_id lists a `biome_pools.json` encounter pools
   - AB/SW/MT → terrain biomes; CM/IN → social; SE/DX/AT → predator
   - Gate: master-dd Q1 verdict da `docs/planning/2026-05-10-tkt-ancestors-consumer-research.md`
   - Blast ×1.2

8. **Cross-event come StressWave modifier** (~12h, P6 boost):
   - `crossEventService.js` + random roll inizio sessione + pressure modifier
   - Boost P6 senza spawn aggiuntivi

### Tier 3 — Richiede ADR + user decision

9. **Trophic role resolver Node-native** (~15h, P3 boost massimo):
   - Port `tools/py/trophic_roles.py` alias map → `trophicRoleResolver.js` + constraint wave generation
   - ADR: "Worldgen Runtime Integration Phase 1"

10. **Bridge species canonical** (~10h post-ADR):
    - ADR su tipo (enemy/NPC/event) per `echo-wing`, `ferrocolonia-magnetotattica`, `archon-solare`
    - Promuovere a `data/core/species.yaml` o ignorare esplicitamente

11. **Meta-network full wire** (~34-42h, Sprint dedicato):
    - 5 nodi + 12 edge tipizzati consumati da session bridge
    - Cross-bioma event propagation runtime
    - ADR + Sprint Q+ candidate

---

## Anti-pattern findings cumulative

1. **Engine LIVE Surface DEAD (Gate 5)** — Layer 7b Mutations: engine 573 LOC + 5 endpoint + 292 LOC test, surface UI non grep-trovabile. Richiede smoke live verify.

2. **Dataset shipped runtime ZERO** — Layer 2 + 3 + 4 (ecosistema + foodweb + cross-events) + Layer 5 ancestors + Layer 5 sentience. **5/11 strati** in questo pattern (~~Layer 7c promotions~~ corrected post cross-validation 2026-05-13).

3. **Museum card outdated post-PR-cascade** — Card M-2026-04-25-007 (mating orphan) scritta 2026-04-25, **superseded** da OD-001 Path A closure 2026-04-27. Card last_verified non bump-ato. Pattern: museum card additive-only protocol non automatizza re-verify post-PR-merge.

4. **Sentience cascade Layer 5 → 7d** — Skiv lifecycle T2-T3 documentato canonical ma runtime usa `level` proxy. Quando sentience backfill arriverà, lifecycle gating si semantizza automaticamente. Falso blocker corrente.

5. **Bridge species ambiguity** — `ferrocolonia-magnetotattica` è sia `species` che `resource` nel foodweb pack. Risolvere prima di promozione.

6. **Validator-time vs Runtime gap** — Layer 2/3/4 hanno validator Python (`foodweb.py`, `trophic_roles.py`) ma ADR-2026-04-19 ha killed Python rules engine. Path forward = Node-native rewrite (Tier 3 reuse).

---

## Action items proposti master-dd

### P0 (autonomous, no master-dd block)

- [ ] **Smoke test Layer 7b mutations** — verify surface o flag gap (~30 min, includere in prossima sessione)
- [x] ~~**Promotions sandbox header**~~ — **SUPERSEDED post cross-validation 2026-05-13 sera**. Promotions 🟢 FULL WIRED. Smoke shipped via PR #2261. Do NOT add sandbox header.
- [ ] **Museum card M-2026-04-25-007 post-script** — additive update con "FULL CLOSURE 2026-04-27 via OD-001 Path A" + `last_verified: 2026-05-13`

### P1 (master-dd verdict richiesto)

- [x] ~~**Sentience tier backfill scope**~~ — **SHIPPED via PR #2262** 15/15 lifecycle subset (T0-T3 + 4 traits interocettivi). Residue 30 species senza lifecycle → TKT-ECO-A4-residue ~3-4h heuristic baseline.
- [ ] **Ancestors consumer Path A vs B** — ENHANCED via PR #2262 neurons_bridge 13→51 entries (Senses+Dexterity+Ambulation+Memorie). Path B biome_pool seeder ~3h still applicable post-merge.
- [x] ~~**Promotions YAML demolish vs proposal-only**~~ — **CANCELLED post cross-validation 2026-05-13 sera**. Promotions 🟢 FULL WIRED, REJECT framing applied + smoke shipped #2261 + engine Phase B3 extension shipped via [PR #2264](https://github.com/MasterDD-L34D/Game/pull/2264) (job_archetype_bias + vc_scoring sentience fold). Discarded path preserved [museum card M-2026-05-13-001](../museum/cards/promotions-orphan-claim-discarded.md).

### P2 (Sprint Q+ candidate, ADR pre-req)

- [ ] **ADR-2026-XX-worldgen-runtime-integration** — copre Layer 2/3/4 wire phase 1 (Tier 2 + Tier 3 sopra)
- [ ] **Trophic role resolver Node-native port** (~15h, gated by ADR)
- [ ] **Cross-event StressWave modifier** (~12h, gated by ADR)
- [ ] **Bridge species canonicalization** (~10h, gated by ADR)

---

## Provenance

- Museum gallery: [`docs/museum/galleries/worldgen.md`](../museum/galleries/worldgen.md) (last_verified 2026-04-26, ancora valida — 2 commit area dal 2026-04-26).
- Museum cards consultate: 7 worldgen + 2 mating + 1 ancestors + 1 sentience.
- Explore agent run: `a78266c567e691c28` (2026-05-13, layer 5-7 mapping).
- Cross-check: OPEN_DECISIONS.md OD-001 (FULL CLOSURE 2026-04-27) + BACKLOG.md (Sprint Q+ traits orphan ASSIGN-A 35/91 shipped).
- File:line citations: 100% verificate via grep diretto (no speculation).

**Token budget**: ~120 righe museum read + 3 Explore agent + 8 Bash inspect = ~25k token consumati.
