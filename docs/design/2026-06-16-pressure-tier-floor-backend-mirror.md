---
title: 'Pressure Tier Floor -- Backend Sistema Mirror (A2 di #2744)'
date: 2026-06-16
type: design-spec
doc_status: draft
doc_owner: master-dd
workstream: combat
last_verified: '2026-06-16'
source_of_truth: false
review_cycle_days: 30
language: it
tags:
  [evo-tactics, pressure-tier, sistema, ai-progress-meter, combat, cross-stack, backend-mirror, n40]
related: tkt-pressure-tier-encounter
---

# Pressure Tier Floor -- Backend Sistema Mirror (A2 di #2744)

## Contesto

#2744 A1 (PR #2769) ha portato il campo `pressure_tier_floor` (int 0-5) nello schema encounter + 10 YAML new-schema. Il campo e' una feature Godot-v2 (TKT-PRESSURE-TIER-ENCOUNTER, ADR vault 2026-05-10, risolve il conflitto pilastri P5<->P6): scala la pressione Sistema **per encounter** (early easier / late harder) invece di un buff globale che romperebbe la fairness del primo encounter (P6).

Lo stack Godot l'ha **gia' shipped** (engine + 24 test, PR #221). Lo stesso TKT prescrive il mirror Game/-side come sprint separato (sez. "Cross-stack mirror Game/ side"): `apps/backend/services/ai/aiProgressMeter.js` + `apps/backend/services/ai/declareSistemaIntents.js` devono ricevere la stessa signature `floor`. **Questa e' la spec A2.**

## Problema

Il backend ha gia' il Sistema pressure/tier (`apps/backend/services/ai/aiProgressMeter.js:22-100`: `tierForPressure`, `nextTier`, `getProgressMeterState`; tier identici a Godot -- thresholds 0/25/50/75/95 = Calm/Alert/Escalated/Critical/Apex) ma **ignora `pressure_tier_floor`**. Conseguenza: l'AI-sim canonico (il "Nord" della calibrazione) NON modella il floor per-encounter -> parita' cross-stack rotta + le bande di balance non riflettono la difficolta' reale che Godot applica a runtime.

## Design (mirror Godot, back-compat)

Pattern (dal TKT, "Memory hook"): helper puro `effective_X(value, override) -> X` + thread `floor` con default 0 (back-compat) + caller wire opzionale. Stesso pattern di BiomeResonance / TimeOfDayModifier.

Tier-floor mapping (dal TKT, identico Godot):

| floor | min effective pressure | tier      |
| ----- | ---------------------- | --------- |
| 0     | (nessun floor)         | dynamic   |
| 1     | 0                      | Calm      |
| 2     | 25                     | Alert     |
| 3     | 50                     | Escalated |
| 4     | 75                     | Critical  |
| 5     | 95                     | Apex      |

Changes:

1. `aiProgressMeter.js`:
   - `effectivePressure(p, floor)` = `max(p, FLOOR_MIN[floor])` (FLOOR_MIN = `{1:0, 2:25, 3:50, 4:75, 5:95}`; 0 / unset / out-of-range -> nessun floor).
   - thread `floor` in `tierForPressure(p, floor)`, `nextTier(p, floor)`, `getProgressMeterState(session)` (legge `session.pressure_tier_floor`).
2. `declareSistemaIntents.js`:
   - `intentsCapForPressure(p, floor)` + thread `floor` in `declareIntents(...)`.
3. Plumbing: al session-init copiare `encounter.pressure_tier_floor` -> `session.pressure_tier_floor` (sito: dove `session.js` carica l'encounter; passthrough come `difficulty_rating` / `encounter_class`).
4. **Back-compat invariant**: floor 0 / unset / out-of-range -> comportamento identico pre-A2. Tutti i test esistenti passano senza modifica.

## Test (mirror Godot)

- `effectivePressure` con floor (boundary 0 / 1 / 5 / out-of-range).
- `tierForPressure` / `nextTier` con floor.
- `intentsCapForPressure` con floor.
- `getProgressMeterState` con `session.pressure_tier_floor` injection.
- regression: floor unset -> identico (baseline AI test invariato).

## Gate balance (owner-gated, BLOCCANTE)

A1 (#2769) ha gia' settato floor 1-4 su 10 encounter. Cablare il consumer **attiva** quei floor -> alza la pressione effettiva -> encounter piu' difficili. I valori floor sono **NON calibrati** (TKT: "educated guesses, not calibrated"). Quindi:

- **Sequencing raccomandato**: ship engine + plumbing **flag-gated** (`PRESSURE_TIER_FLOOR_ENABLED` default OFF) -> zero impatto balance finche' master-dd non ratifica. Mirrors il pattern flag-gated ER1/ER6.
- **Gate flip-ON**: N=40 band-verify per `encounter_class` (tutorial floor 1 = no-op; standard / elite / hardcore) + ratifica master-dd dei valori floor. Target dal TKT (playtest #2): tutorial WR >=85%, hardcore WR 40-60%, no regression M1 baseline.
- Solo dopo gate verde -> flip `PRESSURE_TIER_FLOOR_ENABLED=true`.

## Rischi

- Combat-sensitive (guardrail sprint): N=40 obbligatorio pre-flip.
- Cross-stack drift: finche' il backend non porta il floor, la parita' gameplay Godot<->Game non e' garantita (TKT "Risks").
- Floor 5 (Apex) su early encounter romperebbe P6 -- nessun guard automatico, responsabilita' authoring (clamp 1-5 only).

## Scope / files

- `apps/backend/services/ai/aiProgressMeter.js` (engine).
- `apps/backend/services/ai/declareSistemaIntents.js` (intents).
- plumbing session-init (`session.js` / `sessionHelpers.js`).
- test `tests/ai/*` + harness N=40.
- Out of scope: ri-calibrazione dei valori floor (ratifica master-dd separata); HUD surface (gia' Godot-side).

## Riferimenti

- Godot canonical design: `Game-Godot-v2/docs/godot-v2/design/tkt-pressure-tier-encounter.md` (PR #221).
- ADR vault: `ADR-2026-05-10-pressure-tier-scaling-pillar-conflict`.
- A1: #2744 / PR #2769 (schema + 10 YAML).
- Backend Sistema: `apps/backend/services/ai/aiProgressMeter.js`, `apps/backend/services/ai/declareSistemaIntents.js`.
