---
title: 'ADR 2026-04-19 — Reinforcement spawn engine (Option B)'
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: 2026-04-18
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - 'docs/adr/ADR-2026-04-15-round-based-combat-model.md'
  - 'docs/adr/ADR-2026-04-17-coop-scaling-4to8.md'
  - 'docs/hubs/combat.md'
---

# ADR-2026-04-19 · Reinforcement spawn engine

**Stato**: 🟢 ACCEPTED
**Branch**: `docs/adr-reinforcement-spawn` + wiring `feat/wire-g-h-step1` (#1571) + `feat/wire-g-h-step2` (#1573)
**Implementazione**: `apps/backend/services/combat/reinforcementSpawner.js` (#1567) + wiring `sessionRoundBridge` (#1571, #1573)
**Coverage encounter**: `enc_hardcore_reinf_01` (#1574)
**Harness**: `tools/py/batch_calibrate_non_elim.py` (#1575)

## Contesto

`packs/evo_tactics_pack/data/balance/sistema_pressure.yaml` definisce `reinforcement_budget` per tier (Calm 0 → Apex 4), e `apps/backend/routes/sessionHelpers.js` lo caricava in `SIS_TIERS`. Oggi il campo è **dichiarato ma mai consumato**: nessun engine spawna unità SIS durante il round. Conseguenza:

- Encounter authored (tutorial 01-06, hardcore06) sono stati a N unità fisso dall'inizio. Pacing piatto nel mid-game.
- Pattern AI War "reinforcement via AI Progress" (Park) citato in `docs/hubs/combat.md:65` è implementato a metà.
- `ADR-2026-04-17-coop-scaling-4to8` porta fino 8 PG senza meccanica bilanciante SIS dinamica: encounter spawn curve è piatta e la pressure sale senza output visibile.

Playtest 2026-04-17 (sweep Master DD 10 run × 5 scenari): nessun "wave" percepita. T04 e T05 hanno pressure >=50 nel late game ma nessun nuovo nemico compare → il feedback loop tension-escalation manca l'ultimo step.

## Decisione

Introdurre `services/combat/reinforcementSpawner.js` — pure module che:

1. **Legge** `session.sistema_pressure` + tier corrente (già esposto da `computeSistemaTier`)
2. **Consuma** `reinforcement_budget` del tier per spawnare 0..N unità SIS per round
3. **Seleziona** la forma unità da un **pool scenario-definito** (`encounter.reinforcement_pool: [{ unit_id, weight, max_spawns }]`)
4. **Piazza** l'unità su un **entry_tile** scenario-definito (`encounter.reinforcement_entry_tiles: [[x,y], ...]`) filtrando per far-from-PG (Manhattan >= 3) + walkable
5. **Emette** raw event `reinforcement_spawn` con `{ actor_id, spawn_tile, wave_index, tier_at_spawn }` per VC + replay
6. **Decrementa** `session.reinforcement_spent_this_round` per rispetto budget

Integrazione round lifecycle (ADR-2026-04-15):

```
/round/execute →
  priority_queue_execute →
    [intents resolved] →
      [NEW] reinforcementSpawner.tick(session, encounter)  ← qui
    [AI declares next intents]
  → response
```

Hook single: `tick()` invocato dopo resolve di tutte intent del round, prima della declaration phase del next round. Così l'unità nuova è presente al prossimo `/declare-intent` (planning del round successivo).

### Schema dati

`encounter.schema.json` estende:

```json
{
  "reinforcement_pool": [
    { "unit_id": "minion_01", "weight": 0.6, "max_spawns": 3 },
    { "unit_id": "elite_01", "weight": 0.3, "max_spawns": 1 },
    { "unit_id": "assassin_01", "weight": 0.1, "max_spawns": 2 }
  ],
  "reinforcement_entry_tiles": [
    [0, 0],
    [9, 9],
    [0, 9],
    [9, 0]
  ],
  "reinforcement_policy": {
    "trigger": "tier_gate",
    "min_tier": "Alert",
    "cooldown_rounds": 2,
    "max_total_spawns": 6
  }
}
```

### Feature flag

`REINFORCEMENT_SPAWN_ENABLED=false` (default OFF). Scenari opt-in via `encounter.reinforcement_policy.enabled: true`. Consente rollout incrementale: prima hardcore06, poi BOSS scenari, poi tutorial avanzati.

## Alternative valutate

### A. Status quo — encounter fisso

- **Pro**: zero nuovo codice, nessun rischio balance
- **Contro**: pacing piatto, `reinforcement_budget` dead data, pressure senza escalation visibile
- **Verdetto**: rigetto — user-facing feedback manca

### B. Engine scenario-authored (scelto)

- **Pro**: data-driven, non invasivo (feature flag + opt-in), preserva encounter esistenti, budget già in YAML
- **Contro**: richiede pool + entry_tiles per ogni encounter che opta in; autoring overhead
- **Verdetto**: 🟢 — authoring overhead mitigato da template

### C. Procedural spawn (no scenario pool)

- **Pro**: plug-and-play su qualunque encounter
- **Contro**: spawna unità random (probabilmente "sempre minion") → noioso; nessun controllo autoriale
- **Verdetto**: rigetto — peggior UX narrativa

### D. Solo BOSS scenari (wave hardcoded in Python)

- **Pro**: facile da implementare come script per hardcore06
- **Contro**: non riutilizzabile, non data-driven, duplica logica tra scenari
- **Verdetto**: rigetto — debt immediato

## Conseguenze

**Positive**:

- `reinforcement_budget` diventa vivo, non più dead field
- Pacing encounter 6+ round diventa escalante
- Facilita design BOSS multi-wave (`max_total_spawns: 10` + `cooldown_rounds: 3`)
- Co-op 8p più bilanciato: pressure → spawn compensa superiorità numerica PG

**Negative**:

- Complica balance: calibrare `weight`/`max_total_spawns` per ogni scenario opt-in
- VC scoring: raw event `reinforcement_spawn` va pesato in aggregate (alto = "gioco difficile" vs basso = "gioco fiacco")
- Replay UI: deve renderizzare spawn animato (fuori scope ADR)

**Neutrali**:

- Encounter esistenti inalterati (flag OFF)
- AI intent budget (già implementato) invariato

## Test plan

- Unit: `tests/services/reinforcementSpawner.test.js` — tick con budget 0/1/2, filter occupied tiles, max_spawns cap, cooldown
- Integration: `tests/api/hardcore06Reinforcement.test.js` — run hardcore06 con flag ON, verify spawn_tile + raw event
- N=30 calibration run hardcore06 pre/post per regressione win rate (target 15-25% in-band)

## Rollback (03A)

Feature flag `REINFORCEMENT_SPAWN_ENABLED=false` + revert encounter opt-in. Engine resta a disco ma non viene chiamato. Zero impatto dati su scenari esistenti.

## Follow-up

- ADR-2026-04-20 (objective-parametrizzato) — dovrà interagire con pressure_relief per chiudere loop (obiettivo completato → pressure-15 → tier scende → budget cala)
- Milestone M4: UI Replay render animazione spawn
