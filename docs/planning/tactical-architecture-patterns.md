---
title: Pattern architetturali estratti — wesnoth, boardgame.io, xstate
doc_status: active
doc_owner: platform-docs
workstream: combat
last_verified: 2026-04-16
source_of_truth: false
language: it-en
review_cycle_days: 90
---

# Pattern architetturali estratti — Deep Dive

Analisi approfondita di 3 repo open-source con pattern concreti mappati su file Evo-Tactics. Ogni pattern include: descrizione, implementazione nel repo sorgente, mapping concreto, effort.

> Fonte: wesnoth/wesnoth, boardgameio/boardgame.io, statelyai/xstate. Vedi `docs/guide/external-references.md` sezione A.

---

## Riepilogo priorita

| #   | Pattern                          | Fonte        | Impatto | Effort    | File target                                                 |
| --- | -------------------------------- | ------------ | ------- | --------- | ----------------------------------------------------------- |
| 1   | Combat prediction distribution   | wesnoth      | Alto    | Medium    | `resolver.py`, nuovo endpoint session                       |
| 2   | Auto phase transitions (endIf)   | boardgame.io | Alto    | Small     | `roundOrchestrator.js`                                      |
| 3   | Centralized validation + stateID | boardgame.io | Alto    | Medium    | `session.js`, nuovo `sessionValidation.js`                  |
| 4   | Damage type / resistance matrix  | wesnoth      | Alto    | Medium    | `trait_mechanics.yaml`, `resolver.py`, `combat.schema.json` |
| 5   | AI intent score registry (YAML)  | wesnoth      | Medio   | Small     | nuovo `ai_intent_scores.yaml`, `policy.js`                  |
| 6   | Weighted objectives per AI       | boardgame.io | Medio   | Medium    | `policy.js`                                                 |
| 7   | Status effects as parallel FSM   | xstate       | Medio   | Small-Med | session engine                                              |
| 8   | Round orchestrator statechart    | xstate       | Medio   | Medium    | `roundOrchestrator.js`                                      |
| 9   | Terrain defense modifier         | wesnoth      | Medio   | Small     | biome YAML, `resolver.py`                                   |
| 10  | Delta log automatic flag         | boardgame.io | Medio   | Small     | event schema, `session.js`                                  |
| 11  | Micro-AI personality profiles    | wesnoth      | Medio   | Small     | nuovo `ai_profiles/`, `policy.js`                           |
| 12  | Movement profile archetypes      | wesnoth      | Medio   | Small     | nuovo `movement_profiles.yaml`, `grid_spatial.py`           |
| 13  | Sistema as actor model           | xstate       | Alto    | Med-Large | `policy.js`, `sistemaTurnRunner.js`                         |
| 14  | Turn order interface             | boardgame.io | Basso   | Trivial   | documentazione                                              |
| 15  | Scaling attacks (swarm)          | wesnoth      | Basso   | Small     | `trait_mechanics.yaml`, `resolver.py`                       |
| 16  | Terrain visual aliasing          | wesnoth      | Basso   | Trivial   | biome YAML                                                  |

---

## Da wesnoth/wesnoth (6.6k stars, GPL-2.0)

### W1. Combat Prediction Distribution

**Cosa**: calcolo distribuzione completa HP per entrambi i combattenti prima dell'attacco, non solo danno atteso. Wesnoth usa `attack_prediction.hpp` con Monte Carlo sopra 50k stati, calcolo esatto sotto.

**Come adottarlo**: aggiungere `predict_combat(attacker, defender, trait_ids)` in `resolver.py` che esegue N=1000 roll simulati. Restituisce: probabilita kill, range danno atteso, chance status effect. Esporre via `/session/:id/predict`.

**File**: `services/rules/resolver.py`, nuovo endpoint in `apps/backend/routes/session.js`
**Effort**: Medium (~100 LOC Python + ~30 LOC endpoint)

### W2. Damage Type / Resistance Matrix

**Cosa**: wesnoth usa 6 tipi danno (blade, pierce, impact, fire, cold, arcane) con % resistenza per-unita. Attacchi dichiarano tipo, unita dichiarano resistenze. Matrice e' leva di bilanciamento principale.

**Come adottarlo**: `trait_mechanics.yaml` ha gia 8 canali danno (elettrico, psionico, fisico, fuoco, gravita, mentale, taglio, ionico). Aggiungere mappa resistenze per-specie: `resistances: { elettrico: 90, fuoco: 110 }` (100 = neutro). Resolver applica `final_damage = base * (resistance_pct / 100)`.

**File**: `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`, `services/rules/resolver.py`, `packages/contracts/schemas/combat.schema.json`
**Effort**: Medium (schema change ripple)

### W3. AI Intent Score Registry

**Cosa**: wesnoth AI usa `candidate_action` con score numerico. Ogni turno tutte le CA vengono valutate, score piu alto vince. Score definiti centralmente, overridabili per-scenario.

**Come adottarlo**: estrarre pesi da `policy.js` in `data/core/balance/ai_intent_scores.yaml`. Ogni intent (attack, retreat, heal, advance, hold) ha base score + conditional modifier (hp < 30% boost retreat). `declareSistemaIntents.js` carica registry.

**File**: nuovo `data/core/balance/ai_intent_scores.yaml`, `apps/backend/services/ai/policy.js`, `apps/backend/services/ai/declareSistemaIntents.js`
**Effort**: Small (~50 LOC refactor)

### W4. Terrain Defense Modifier

**Cosa**: unita wesnoth hanno % difesa per-terreno separata da costo movimento. Nano si muove bene in montagna E e' difficile da colpire li. Crea gioco posizionale.

**Come adottarlo**: aggiungere `defense_modifier` per tipo terreno in dati bioma. Resolver applica come aggiustamento DC: `effective_DC = base_DC + terrain_defense_mod`.

**File**: biome YAML in `data/core/biomes/`, `services/rules/resolver.py`
**Effort**: Small (~15 LOC)

### W5. Micro-AI Personality Profiles

**Cosa**: `data/ai/micro_ais/` contiene ~30 script Lua per comportamenti specifici. Iniettati via tag `[micro_ai]` nel WML scenario, compongono con AI default.

**Come adottarlo**: profili personalita Sistema come YAML in `data/core/balance/ai_profiles/`. Es. `aggressive.yaml` boost attack score 1.5x, riduce soglia retreat. Caricati da `policy.js` a inizio sessione.

**File**: nuovo `data/core/balance/ai_profiles/`, `apps/backend/services/ai/policy.js`
**Effort**: Small (~40 LOC loader + YAML files)

### W6. Movement Profile Archetypes

**Cosa**: unita riferiscono `movement_type=elusivefoot` invece di embeddare costi terreno. ~400 file unita restano piccoli.

**Come adottarlo**: specie riferiscono `movement_profile` slug (aquatic, arboreal, burrowing) definito in `movement_profiles.yaml`. Grid spatial hydrata a resolution time.

**File**: nuovo `data/core/balance/movement_profiles.yaml`, `services/rules/grid_spatial.py`
**Effort**: Small

---

## Da boardgameio/boardgame.io (12.3k stars, MIT)

### B1. Auto Phase Transitions (endIf)

**Cosa**: `Process()` loop con triggers cascading. Fasi hanno `endIf` hook — check automatico dopo ogni mutazione. Se condizione vera, fase avanza senza chiamata API esplicita.

**Come adottarlo**: aggiungere `phaseTransitionRules` config a `createRoundOrchestrator()` con callback `shouldAdvancePhase(state)` per fase. Dopo ogni mutazione stato, eseguire chain di check.

**File**: `apps/backend/services/roundOrchestrator.js`
**Effort**: Small (~40 LOC)

### B2. Centralized Validation + StateID

**Cosa**: singolo reducer dove TUTTE le mutazioni passano per `MAKE_MOVE` o `GAME_EVENT`. Mosse invalide ritornano `INVALID_MOVE`. Server valida `stateID` match (optimistic locking).

**Come adottarlo**: estrarre validazione da session.js in `sessionValidation.js`. Check: sessione non terminata, attore attivo in fase corrente, tipo azione permesso, stateID match. Aggiungere `_stateID` a stato sessione, incrementare a ogni mutazione.

**File**: nuovo `apps/backend/services/sessionValidation.js`, `apps/backend/routes/session.js`
**Effort**: Medium (~60 LOC)

### B3. Weighted Objectives per AI

**Cosa**: MCTS bot usa `objectives` map: `{ checker: (G, ctx) => bool, weight: number }`. Personalita = set di pesi diverso.

**Come adottarlo**: refactorare scoring section di `policy.js` in objectives map caricata da config. Personalita aggressive/defensive/tactical = diversi weight set.

**File**: `apps/backend/services/ai/policy.js`
**Effort**: Medium (~50 LOC refactor)

### B4. Delta Log con Flag Automatic

**Cosa**: ogni transizione stato appende a `deltalog[]` con flag `automatic` per distinguere azioni player da trigger sistema (bleed tick, status expiry).

**Come adottarlo**: aggiungere `automatic: boolean` e `stateId: number` a raw event schema. Taggare auto-eventi round orchestrator con `automatic: true`.

**File**: schema eventi in `apps/backend/routes/session.js`, `apps/backend/services/roundOrchestrator.js`
**Effort**: Small (~15 LOC)

---

## Da statelyai/xstate (29.5k stars, MIT)

### X1. Round Orchestrator come Statechart

**Cosa**: xstate v5 `setup()` + `createMachine()` per modellare fasi round come stati gerarchici. Guards tipizzati, `assign()` per mutazione context, `always` per transizioni automatiche.

**Come adottarlo**: roundOrchestrator gia implementa FSM hand-rolled con string check (`PHASE_PLANNING`, `PHASE_COMMITTED`, etc.). Migrare a xstate rende transizioni illegali impossibili, aggiunge inspection via devtools.

**Design**:

```
round (machine)
├── planning
│   ├── on: DECLARE_INTENT, CLEAR_INTENT, DECLARE_REACTION
│   └── on: COMMIT → committed (guard: allIntentsDeclared)
├── committed
│   └── entry: buildQueue → always → resolving
├── resolving
│   ├── always → resolved (guard: queueEmpty)
│   └── on: RESOLVE_NEXT → resolveHead → resolving
├── resolved
│   ├── always → victory (guard: hasVictory)
│   └── always → planning (action: advanceRound)
└── victory (final)
```

**File**: `apps/backend/services/roundOrchestrator.js`
**Effort**: Medium (reshaping ~600 LOC in xstate API)
**Dipendenza**: `xstate@5.x` (~45KB gzip, zero deps, pure JS Node)

### X2. Status Effects come Parallel State Machines

**Cosa**: `type: 'parallel'` per regioni indipendenti simultanee. Ogni status effect (panic, rage, stunned, focused, confused, bleeding, fracture) diventa regione parallela con stati `inactive`/`active`.

**Come adottarlo**: round machine invia `TICK` a `beginRound` �� tutte le regioni parallele processano simultaneamente. `APPLY_PANIC` / `APPLY_BLEEDING` target regioni specifiche. Entry/exit actions applicano/rimuovono stat modifier.

**Stacking**: context traccia `{ duration, stacks }` per effetto. Guard `panicExpired` check `duration <= 0`. Re-apply refresha o incrementa stacks.

**File**: session engine status tracking
**Effort**: Small-Medium (~15 LOC per regione, 7 regioni)

### X3. Sistema come Actor Model

**Cosa**: `spawnChild` + `sendTo` + `fromPromise`. Parent machine spawna un actor Sistema per unita AI-controlled. Comunicazione via eventi.

**Come adottarlo**: Sistema osserva → pianifica (invoke `fromPromise` per `selectAiPolicy()`) → dichiara intent (sendTo parent round machine) → attende risoluzione. Ogni unita AI diventa indipendente, testabile in isolamento.

**File**: `apps/backend/services/ai/policy.js`, `apps/backend/services/ai/sistemaTurnRunner.js`
**Effort**: Medium-Large (decomposizione logica sequenziale in stati actor)

**Ordine adozione raccomandato**: X2 (status effects, scope minimo) → X1 (round orchestrator, mapping 1:1) → X3 (Sistema actors, refactor piu ampio).

---

## Roadmap consigliata

### Sprint prossimo (impatto/effort ottimale)

1. **W3 — AI intent score registry** (Small) + **W5 — Micro-AI profiles** (Small) → Sistema data-driven
2. **B1 — Auto phase transitions** (Small) → round orchestrator piu robusto
3. **B4 — Delta log automatic flag** (Small) → VC scoring piu preciso
4. **W4 — Terrain defense modifier** (Small) → profondita tattica posizionale

### Sprint successivo (medium effort, high impact)

5. **W1 — Combat prediction** (Medium) → UX tattica drasticamente migliore
6. **B2 — Centralized validation** (Medium) → robustezza architetturale
7. **W2 — Damage type/resistance matrix** (Medium) → bilanciamento leva principale

### Lungo termine (architettura)

8. **X2 → X1 → X3** — migrazione progressiva a xstate ✅ COMPLETATO

---

## Round 2 — Deep Dive: OpenRA, bevy, ink, langium

Analisi approfondita di 4 repo aggiuntivi. Pattern estratti con effort e priorita.

### Da OpenRA/OpenRA (16.6k stars, GPL-3.0)

| #   | Pattern                                                        | Effort | Priorita |
| --- | -------------------------------------------------------------- | ------ | -------- |
| O1  | Template inheritance YAML (`^Abstract`, `Inherits:`, `-Trait`) | 2d     | Media    |
| O2  | Pack manifest (`pack_manifest.yaml`) per content isolation     | 1d     | Alta     |
| O3  | Auto-generated trait docs da YAML (`gen_trait_docs.py`)        | 0.5d   | Alta     |

**O1 — Template Inheritance**: trait_mechanics.yaml supporta `inherits:` per condividere baseline tra trait della stessa classe. `_defaults:` sezione per offensive/defensive/hybrid/mobility/utility. `hydration.py` risolve merge depth-first.

**O2 — Pack Manifest**: `pack_manifest.yaml` alla root del pack lista tutti i file dati. Validator legge manifest, non glob — cattura drift. Rimuove accoppiamento implicito.

**O3 — Auto-Generated Trait Docs**: script Python `gen_trait_docs.py` legge `trait_mechanics.yaml`, emette Markdown con tabella per trait (name, class, mods, resistances, abilities). Output in `docs/generated/trait-reference.md`. Wire in `npm run sync:evo-pack`.

### Da bevyengine/bevy (45.6k stars, Apache-2.0)

| #   | Pattern                                                | Effort | Priorita |
| --- | ------------------------------------------------------ | ------ | -------- |
| V1  | Plugin `register(app)` per modularita servizi          | 2d     | Media    |
| V2  | Actor bundle schema (JSON Schema per actor validation) | 1d     | Media    |
| V3  | Phase pipeline con run conditions                      | 3d     | Bassa    |

**V1 — Plugin Registration**: ogni servizio esporta `register(app)` che auto-registra route, middleware, state. `index.js` li carica in loop. Disaccoppia wiring.

**V2 — Actor Bundle Schema**: `actor_bundle.schema.json` in contracts che valida {base_stats, job_slot, trait_slots, temperament} su `/start`. Garantisce actor completi.

**V3 — Phase Pipeline**: round orchestrator come array di {phase, systems[], runCondition}. Gia coperto da X1 (xstate statechart).

### Da inkle/ink (4.7k stars, MIT)

| #   | Pattern                                             | Effort | Priorita |
| --- | --------------------------------------------------- | ------ | -------- |
| I1  | Briefing/debrief narrativo con inkjs                | 3d     | Media    |
| I2  | External functions binding (VC scores, trait names) | incl.  | Media    |
| I3  | Variable observation per combat modifiers           | incl.  | Bassa    |

**I1 — Narrative Service**: `npm install inkjs` (zero deps). Nuovo `services/narrative/`. Endpoints `/api/v1/narrative/briefing/:missionId`, `/api/v1/narrative/debrief/:sessionId`. Knots = missioni, stitches = fasi tattiche.

**I2 — External Functions**: `story.BindExternalFunction("getVCScore", ...)` per leggere dati sessione viva. Tags `# speaker:commander` per UI rendering.

### Da eclipse-langium/langium (991 stars, MIT)

| #   | Pattern                                                     | Effort | Priorita          |
| --- | ----------------------------------------------------------- | ------ | ----------------- |
| L1  | YAML-to-multi-target codegen (alternativa pragmatica a DSL) | 2d     | Alta              |
| L2  | DSL completo con LSP (Langium)                              | 2-3w   | Bassa (prematura) |

**L1 — Codegen da YAML**: script che genera TS types + Python dataclasses + JSON Schema da `trait_mechanics.yaml`. Elimina drift manuale tra 4 sources. ROI immediato.

**L2 — DSL Langium**: grammatica + parser + LSP + Monaco per Trait Editor. ROI solo a 80+ trait. Prematura ora.

### Roadmap Round 2

**Quick wins (questa sessione)**:

1. **O3** — Auto-generated trait docs (0.5d)
2. **O2** — Pack manifest (1d)
3. **L1** — YAML codegen multi-target (2d)

**Prossimo sprint**: 4. **I1+I2** — Narrative service inkjs (3d) 5. **O1** — Template inheritance YAML (2d) 6. **V1** — Plugin registration (2d)

**Lungo termine**: 7. **V2** — Actor bundle schema 8. **L2** — DSL Langium (quando trait > 80)
