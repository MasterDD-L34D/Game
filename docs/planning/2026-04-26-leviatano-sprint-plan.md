---
title: 'Sprint plan — Boss Leviatano Risonante (multi-stage + parley + world-state)'
doc_status: draft
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-26'
source_of_truth: false
language: it
review_cycle_days: 90
related:
  - docs/adr/ADR-2026-04-26-multi-stage-encounter-schema.md
  - docs/adr/ADR-2026-04-26-parley-outcome-enum.md
  - docs/adr/ADR-2026-04-26-cross-bioma-worldstate-persistence.md
  - docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html
  - docs/reports/2026-04-26-boss-leviatano-research-summary.md
---

# Sprint plan — Boss Leviatano Risonante

**Effort totale**: 40-52h (3 sprint, ~75-90h se include playtest cycle + balance iter)
**Pillars impattati**: P1 (tattica) 🟢→🟢+ · P4 (MBTI) 🟡→🟡+ · P6 (fairness) 🟢c→🟢

## Sequenza canonical

```
Sprint A (multi-stage)  ──prereq──→  Sprint B (parley)
    │                                    │
    └──parallel──────────────────────────┘
              ↓
       Sprint C (world-state)  [parallel-safe]
```

Sprint A è **prerequisito** Sprint B (phase finale = trigger window parley).
Sprint C è **parallel-safe** (no schema dependency con A/B).

Recommended: **A → B → playtest → C**. Alt: **A + C parallel → B → playtest**.

---

## Sprint A — Multi-stage encounter schema

**ADR**: `docs/adr/ADR-2026-04-26-multi-stage-encounter-schema.md`
**Effort**: 12-15h
**Owner**: backend + dataset

### Scope

| File                                                 | Modifica                             | LOC est |
| ---------------------------------------------------- | ------------------------------------ | ------- |
| `schemas/evo/encounter.schema.json`                  | `phases[]` array additive            | +60     |
| `apps/backend/services/combat/phaseEvaluator.js`     | NEW — phase transition runtime       | +180    |
| `apps/backend/services/combat/objectiveEvaluator.js` | phase-aware evaluation               | +40     |
| `apps/backend/routes/session.js`                     | `/round/execute` phase trigger check | +30     |
| `docs/planning/encounters/enc_frattura_03.yaml`      | migrate single → 3 phases            | +50/-10 |
| `apps/play/src/hudPhasePanel.js`                     | NEW — phase indicator HUD            | +120    |
| `tests/services/phaseEvaluator.test.js`              | NEW                                  | +250    |
| `tests/api/sessionPhaseTransition.test.js`           | NEW integration                      | +180    |

### Test expected

- Unit: 10 phaseEvaluator (encounter_start, hp_threshold, turn_count, phase_objective_completed, objective_zone_held)
- Integration: 1 full encounter playthrough enc_frattura_03 multi-phase
- Backward compat: tutti encounter senza `phases[]` continuano a funzionare invariati

### Rollback plan

- Schema additive → encounter senza `phases[]` resta single-stage
- Feature flag `ENCOUNTER_PHASES_ENABLED=false` (default true post-deploy)
- Revert: `git revert <sha>` + restore `enc_frattura_03.yaml` da git history → no DB migration needed

### DoD

1. Schema AJV register ✅ + format:check ✅
2. enc_frattura_03 migrato + 1 playthrough verde
3. HUD phase indicator visibile
4. Test 10+1 ≥250 LOC verdi
5. Balance N=10 sim 3-phase encounter (non degrada win rate baseline)
6. UX vertical slice match: 3 strati visibili in HUD + transition feedback

---

## Sprint B — Parley/accordo outcome enum

**ADR**: `docs/adr/ADR-2026-04-26-parley-outcome-enum.md`
**Effort**: 20-25h
**Owner**: backend + narrative + frontend
**Prereq**: Sprint A merged + verde

### Scope

| File                                                 | Modifica                                                | LOC est |
| ---------------------------------------------------- | ------------------------------------------------------- | ------- |
| `apps/backend/routes/session.js`                     | outcome enum extend `parley`/`retreat`                  | +60     |
| `apps/backend/services/combat/objectiveEvaluator.js` | enum JSDoc + outcome assign logic                       | +40     |
| `apps/backend/services/combat/parleyEvaluator.js`    | NEW — trigger window evaluation                         | +200    |
| `data/core/traits/active_effects.yaml`               | tag opzionale `effect_type` extension                   | +30     |
| `data/core/traits/active_effects.yaml`               | 5-8 trait tag `communication_action`/`symbiosis_action` | +50     |
| `services/narrative/narrativeEngine.js`              | 6 debrief variants (parley/retreat/win/wipe each)       | +180    |
| `services/narrative/qbnEngine.js`                    | branching multi-outcome                                 | +90     |
| `apps/play/src/debriefPanel.js`                      | outcome stamp + flint variants render                   | +130    |
| `apps/backend/services/combat/vcScoring.js`          | outcome → VC weighting (parley = high MBTI F-axis)      | +40     |
| `tests/services/parleyEvaluator.test.js`             | NEW                                                     | +320    |
| `tests/api/sessionOutcomeEnum.test.js`               | NEW integration                                         | +280    |

### Test expected

- Unit: 15 parleyEvaluator (5 outcome × 3 trigger paths each)
- Integration: 5 full path each outcome (win/parley/retreat/timeout/wipe)
- Balance: N=10 sim per outcome reachable, no degenerate strategy

### Rollback plan

- Outcome enum extend è additive in JSDoc, runtime branch su `if (outcome === 'parley')` → revert removes branches
- Trait `effect_type` tag opzionale → no schema break
- Narrative engine variants: fallback a `win` debrief se `parley` variant missing
- Revert: full revert PR, no DB migration needed (outcome è per-session non persistente cross-campaign)

### DoD

1. Outcome enum esteso + AJV register telemetry
2. parleyEvaluator + 15 unit verdi
3. 6 narrative variants (3 outcome × 2 sub-branches min)
4. debriefPanel render 3 outcome distinct (stamp colour + headline + flint)
5. Balance: parley reachable in 35-55% playthrough, retreat 15-25%, combat 30-50%
6. Userland playtest 4-8p live richiesto **prima** di mark ADR `accepted`

---

## Sprint C — Cross-bioma world-state persistence

**ADR**: `docs/adr/ADR-2026-04-26-cross-bioma-worldstate-persistence.md`
**Effort**: 8-12h
**Owner**: backend + Prisma
**Parallel-safe** con A/B

### Scope

| File                                                           | Modifica                                                  | LOC est |
| -------------------------------------------------------------- | --------------------------------------------------------- | ------- |
| `apps/backend/prisma/schema.prisma`                            | `WorldState` model additive                               | +30     |
| `apps/backend/prisma/migrations/0005_worldstate/`              | NEW migration up/down                                     | +60     |
| `apps/backend/services/world/worldStateService.js`             | NEW load/apply/merge                                      | +240    |
| `apps/backend/services/world/crossEventsLoader.js`             | NEW — port `foodweb.py:collect_event_propagation` to Node | +120    |
| `apps/backend/routes/session.js`                               | hook `/end` apply + `/start` load                         | +50     |
| `apps/backend/routes/world.js`                                 | NEW — GET /api/world/:campaign_id (read-only debug)       | +40     |
| `tests/services/worldStateService.test.js`                     | NEW                                                       | +250    |
| `tests/api/campaignWorldStateDivergence.test.js`               | NEW integration multi-session                             | +200    |
| `docs/museum/cards/worldgen-cross-bioma-events-propagation.md` | status `curated` → `revived`                              | +5      |

### Test expected

- Unit: 10 worldStateService (load/apply/merge/cache/propagation)
- Integration: 5 campaign multi-session divergence (2-run sequenze con outcome diversi → world state divergent)
- Migration round-trip: up/down/up con dati seed

### Rollback plan

- Prisma migration **down** documented + tested (rollback to 0004)
- Feature flag `WORLDSTATE_ENABLED=false` (default true post-deploy)
- World state load failure → graceful fallback (session start senza biases applicati, log warning)
- Revert: feature flag off + schedule migration down in maintenance window

### DoD

1. Prisma migration up/down round-trip ✅
2. worldStateService 10 unit verdi
3. Multi-session divergence test integration
4. cross_events YAML port Node verde con 3 events seed
5. Museum card M-014 status update + last_verified bump
6. Documented in handoff next-session

---

## Risk register

| #   | Risk                                                                         | Severity | Mitigation                                                                                          |
| --- | ---------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| 1   | Schema `phases[]` ripple su `packages/contracts` → mock parity break         | High     | Schema additive optional, test contract registry pre-merge                                          |
| 2   | Frontend HUD complexity (phase indicator + outcome variants) → UI tech debt  | Med      | Riusa pattern progressionPanel/formsPanel, non reinventare overlay                                  |
| 3   | AI behavior multi-stage (apex form switch) → AI policy break                 | High     | Sprint A include AI policy regression test, apex form change = re-evaluate utility scores           |
| 4   | Test surface explosion (3 outcome × 3 phases × 4-8p) → CI time               | Med      | Tier test (fast unit always, slow integration nightly)                                              |
| 5   | Vertical slice match-fidelity gap (UX promette troppo) → user disappointment | High     | UX review checkpoint post Sprint B prima di playtest live, vertical slice come acceptance criterion |
| 6   | Parley balance: troppo facile o troppo difficile                             | Med      | Balance harness N=10 per outcome, target 35-55% parley reach                                        |
| 7   | World state cross-PC sync (campaign_id stability)                            | Low      | Document constraint in ADR, blocked on Game-Database sync (out of scope)                            |
| 8   | Museum card M-014 revival without ADR + user OK                              | Low      | ADR Sprint C **è** quel decision document                                                           |

---

## Dependencies

- **ADR firmati** prima di ogni sprint (user verdict required su 5 decision points → vedi research summary)
- **Vertical slice consultato** come UX reference (`docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html`) — link in ogni PR description
- **Museum card M-014** consultata + status update Sprint C
- **Sprint A → B**: Sprint B blocca finché A non merged + balance N=10 verde
- **Userland playtest** richiesto post Sprint B prima di accept ADR parley enum

## DoD per sprint (general)

1. ADR firmato (status `proposed` → `accepted`)
2. Impl + format:check verde
3. Test count target raggiunto
4. Balance N=10 sim non-degrade win rate baseline
5. UX vertical slice match (visual + behavior)
6. Handoff doc aggiornato + memory save

## Userland validation

- **Post Sprint A**: smoke test enc_frattura_03 multi-phase in dev locale
- **Post Sprint B**: playtest live 4-8p co-op (chiude P5 confirm, valida parley reachability)
- **Post Sprint C**: campagna 2-3 run consecutive con outcome diversi → world state divergence visible

## Reference

- ADR-A: `docs/adr/ADR-2026-04-26-multi-stage-encounter-schema.md`
- ADR-B: `docs/adr/ADR-2026-04-26-parley-outcome-enum.md`
- ADR-C: `docs/adr/ADR-2026-04-26-cross-bioma-worldstate-persistence.md`
- Vertical slice: `docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html` (2128 LOC, 3-strati design 1:1)
- Museum M-014: `docs/museum/cards/worldgen-cross-bioma-events-propagation.md`
- Research summary: `docs/reports/2026-04-26-boss-leviatano-research-summary.md`
