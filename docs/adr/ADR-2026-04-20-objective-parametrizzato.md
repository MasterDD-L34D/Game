---
title: 'ADR 2026-04-20 — Objective parametrizzato (Option C)'
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: 2026-04-18
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - 'docs/adr/ADR-2026-04-15-round-based-combat-model.md'
  - 'docs/adr/ADR-2026-04-19-reinforcement-spawn-engine.md'
  - 'schemas/evo/encounter.schema.json'
---

# ADR-2026-04-20 · Objective parametrizzato

**Stato**: 🟢 ACCEPTED
**Branch**: `docs/adr-reinforcement-spawn` + wiring `feat/wire-g-h-step1` (#1571) + `feat/wire-g-h-step2` (#1573)
**Implementazione**: `apps/backend/services/combat/objectiveEvaluator.js` (#1568) + wiring `sessionRoundBridge` + `/end` (#1571, #1573)
**Coverage encounter**: `enc_capture_01` + `enc_escort_01` + `enc_survival_01` + `enc_hardcore_reinf_01` (#1574)
**Harness**: `tools/py/batch_calibrate_non_elim.py` (#1575)

## Contesto

`schemas/evo/encounter.schema.json` dichiara 6 `objective.type` ammessi: `elimination`, `capture_point`, `escort`, `sabotage`, `survival`, `escape`. Oggi **solo `elimination` viene valutato a runtime** dal session engine (HP=0 per tutte le unità SIS → win). Le altre 5 sono **dead enum**: encounter authoring lascia i campi `target_zone`/`hold_turns`/`survive_turns`/`escort_target`/`time_limit` come decorazione non funzionante.

Conseguenza sul design:

- Pilastro 1 (Tattica leggibile FFT) impoverito: kill-all è una sola forma, niente capture-the-flag, niente defend-zone.
- Tutorial 01-05 sono tutti "elimina i nemici" → curva didattica ripetitiva.
- Level design (docs/core/15-LEVEL_DESIGN.md) prescrive scenari "defend data-center" e "escort scientist" senza supporto engine.
- SoT §pilastro 1 riga 180 (esplicito): _"L'obiettivo non è sempre 'kill them all'. Una missione può chiedere di sopravvivere, scortare, sabotare."_

Pattern di riferimento (`reference_tactical_postmortems.md`): Fallout Tactics usa 4 categorie (kill/retrieve/escort/survive) con evaluator ticker per-round. XCOM usa hold + evacuation. Nessuno di questi è hardcoded — sono data-driven.

## Decisione

Introdurre `services/combat/objectiveEvaluator.js` — pure module che **espone `evaluateObjective(session, encounter)` → `{ completed: bool, state: object, reason: string }`** invocato ad ogni `/turn/end` e `/round/execute` response.

Contratto per tipo:

| Tipo            | Input scenario                             | State tracked       | Condition                                                      |
| --------------- | ------------------------------------------ | ------------------- | -------------------------------------------------------------- |
| `elimination`   | (nessun param extra)                       | —                   | `sistema_alive == 0`                                           |
| `capture_point` | `target_zone: [x1,y1,x2,y2]`, `hold_turns` | `turns_held`        | PG inside zone ≥ 1 for `hold_turns` consecutive turns          |
| `escort`        | `escort_target: <unit_id>`                 | `escort_hp`         | `escort_target.hp > 0 AND escort.position in extract_zone`     |
| `sabotage`      | `target_zone`, `time_limit`                | `sabotage_progress` | PG inside zone ≥ `sabotage_turns_required` within `time_limit` |
| `survival`      | `survive_turns`                            | `turns_survived`    | `turn >= survive_turns AND player_alive > 0`                   |
| `escape`        | `target_zone`, `time_limit`                | `units_escaped`     | All PG moved into target_zone within `time_limit`              |

### Schema extensions

`encounter.schema.json` aggiunge (backward compatible, tutti optional):

```json
{
  "objective": {
    "type": "capture_point",
    "target_zone": [3, 3, 5, 5],
    "hold_turns": 3,
    "min_units_in_zone": 1,
    "loss_conditions": {
      "time_limit": 10,
      "player_wipe": true
    }
  }
}
```

`loss_conditions` (nuovo) disaccoppia "condizioni di vittoria" da "condizioni di sconfitta", oggi implicite. Default: `player_wipe: true`.

### Failure states

Nuovo outcome enum: `win` (objective completed), `wipe` (all PG KO), **`timeout`** (time_limit exceeded), **`objective_failed`** (e.g. escort_target KO), `abandon` (manual /end). Esteso in `/end` response + `vcScoring`.

### Round lifecycle hook

```
/round/execute → priority_queue_execute → evaluator.tick() → AI phase → evaluator.tick() → response
```

Doppia tick per scenari time-sensitive (capture_point: tick both phases per conteggio accurato `turns_held`).

### Session state

```
session.objective_state = {
  type: 'capture_point',
  completed: false,
  failed: false,
  progress: { turns_held: 2 },
  last_tick_turn: 4,
}
```

Esposto in `/state` payload + `raw_events` (`objective_progress_event`).

## Alternative valutate

### A. Mantenere elimination hardcoded, deprecare enum

- **Pro**: zero nuovo codice, schema più onesto
- **Contro**: tradisce SoT, level design bloccato, Pilastro 1 monocorde
- **Verdetto**: rigetto — regressione design

### B. Hardcode un evaluator per tipo, no pluggable

- **Pro**: implementazione rapida (switch/case)
- **Contro**: nuovo objective type = modifica codice; impossibile user-authored custom objectives per playtest modding
- **Verdetto**: rigetto — debt architetturale

### C. Pluggable evaluator registry (scelto)

- **Pro**: data-driven, registry evaluator per type, facile aggiungere type custom, testabile a unit level, pattern consistente con `abilityExecutor.js` (già pluggable)
- **Contro**: più boilerplate iniziale (registry + contract + 6 evaluator)
- **Verdetto**: 🟢 — ROI lungo periodo, pattern riconosciuto

### D. Finite state machine per objective lifecycle

- **Pro**: chiara transizione `idle → in_progress → completed | failed`
- **Contro**: overkill per MVP; basta stato flat `{ completed, failed, progress }`
- **Verdetto**: rigetto MVP, rivalutare post-playtest se emergono objective composti (multi-step)

## Conseguenze

**Positive**:

- 5 tipi di objective live dormienti diventano giocabili
- Tutorial arc diversificabile (T06 could be "survival 10 turns", T07 "escort NPC")
- Level design sblocca: defense encounter, capture flag, time-trial
- Outcome granulari (`timeout` vs `wipe`) per VC scoring differenziato (MBTI T/F si attiva su scelta "wipe per completare objective" vs "ritira per salvare escort")
- Unlocks co-op asymmetric (1 PG escort target, 3 PG bodyguard)

**Negative**:

- `/end` response shape extends: `outcome` enum cresce da 4 a 6 valori (backward compat via existing `win/wipe/draw/abandon` fallback)
- Encounter authoring più complesso (autori devono specificare `hold_turns`, `target_zone`, ecc.)
- Playtest calibration: bilanciare `hold_turns`/`time_limit` per ogni scenario che non è elimination
- Replay UI deve renderizzare "Zona capture 2/3 tenuta" + countdown — fuori scope ADR

**Neutrali**:

- Encounter `elimination` esistenti inalterati (fallback evaluator)
- VC scoring esistente compatibile (basta non-break esistenti raw event)
- AI SIS già data-driven (`ai_profiles.yaml`) — nessun cambio AI richiesto

## Integrazione con ADR-2026-04-19 (reinforcement)

Interazione: `pressure_relief` eventi. Quando PG completa un micro-objective (e.g. `capture_point` hold tick +1), `session.sistema_pressure -= 3`. Chiude loop reinforcement → pressure → objective che lo riduce. Hook naturale:

```js
if (objectiveEvaluator.tick(session).progress_delta > 0) {
  session.sistema_pressure -= PRESSURE_RELIEF_PER_OBJECTIVE_TICK;
}
```

Entry in `sistema_pressure.yaml.deltas`:

```yaml
pg_objective_tick: -3
pg_objective_completed: -20
```

## Test plan

- Unit: `tests/services/objectiveEvaluator.test.js` — 1 test per tipo + 6 edge cases (escort KO, survival exactly N, capture_point interrupted, escape partial, sabotage timeout, elimination fallback)
- Integration: `tests/api/objectiveCapturePoint.test.js` + `tests/api/objectiveSurvival.test.js`
- N=30 calibration sur un nuovo encounter `enc_capture_01` per baselinare win rate

## Rollback (03A)

Feature flag `OBJECTIVE_EVALUATOR_ENABLED=false` → fallback hardcoded elimination. Encounter schema extensions sono optional, nessun breakage su scenari esistenti. Revert commit dell'engine module, schema resta aggiunto (dormiente come oggi).

## Follow-up

- UI Replay: rendering zone capture + countdown
- Nuovi encounter authoring: `enc_capture_01`, `enc_escort_01`, `enc_survival_01` come coverage Pilastro 1 completo
- VC calibration: raw event `objective_progress_event` aggiunto a `vcScoring.yaml`
- ADR-2026-04-21 (eventuale): composite objectives (AND/OR di 2+ sub-objective)
