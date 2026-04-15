---
title: Combat Round Loop
description: Modello shared-planning → commit → ordered-resolution. Orchestratore Python sopra il resolver atomico.
doc_status: active
doc_owner: combat-team
workstream: combat
last_verified: 2026-04-15
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Combat Round Loop

Questo documento descrive il loop di round del rules engine di Evo-Tactics, introdotto in `services/rules/round_orchestrator.py`. Il modello è intenzionalmente costruito **sopra** il resolver atomico esistente (`services/rules/resolver.py`), senza modificarlo: il resolver resta il motore di singole intenzioni, l'orchestratore aggiunge la semantica di round simultaneo.

Per la decisione architetturale completa, vedi [ADR-2026-04-15-round-based-combat-model.md](../adr/ADR-2026-04-15-round-based-combat-model.md).

Per l'API puntuale delle funzioni atomiche, vedi [resolver-api.md](resolver-api.md). Per il flusso di hydration, vedi [data-flow.md](data-flow.md).

---

## 1. Perché cambiare il loop

Fino a sprint 023 il loop di combat era modellato come **turni individuali sequenziali**:

1. `session.turn_order = [u1, u2, u3, ...]` in ordine di `initiative` decrescente.
2. `session.active_unit = turn_order[turn_index]` — una singola unità agisce alla volta.
3. Su `POST /turn/end` il `turn_index` avanza all'unità successiva; se `controlled_by == 'sistema'` l'AI esegue il turno immediatamente.
4. `initiative` significava "chi gioca per primo".

Questo modello funziona per un combattente singolo ma crea attriti con la visione di design di Evo-Tactics:

- **Cooperazione sul divano**: la squadra player pianifica insieme, consulta device personali con informazioni rivelate individualmente, condivide le opzioni. Un loop "una-unità-alla-volta" non rappresenta questa fase.
- **Simultaneità narrativa**: nel fluff tattico le azioni del round avvengono in un arco di tempo comune, non in sequenza rigida. Un'unità veloce "reagisce prima", non "gioca prima".
- **Preview vs reale**: il player deve poter vedere i costi, i target, gli effetti di un'azione senza mai toccare lo stato canonico del combat. Il vecchio loop non aveva questa distinzione.

Il nuovo modello riflette la visione: **pianificazione condivisa, commit, risoluzione ordinata**.

---

## 2. Nuova semantica di `initiative`

Il campo `combat_unit.initiative` resta nello schema (`packages/contracts/schemas/combat.schema.json#/$defs/combat_unit`), ma il suo **significato** cambia:

- **Prima**: "chi agisce per primo nella sequenza di turni".
- **Ora**: **reaction speed** — velocità passiva di reazione dell'unità. Determina quanto presto l'unità risolve la sua intenzione nel round, a parità di azione scelta.

Non c'è un rename. L'intero sistema di valori (`DEFAULT_PARTY_INITIATIVE = 12`, `initiative = 8 + power` per hostile) resta compatibile. Solo la semantica del loop cambia.

### Formula di `resolve_priority`

```
resolve_priority = unit.initiative + action_speed(action) - status_penalty
```

| Variabile              | Semantica                                  |
| ---------------------- | ------------------------------------------ |
| `unit.initiative`      | Stat passiva di reaction speed dell'unità  |
| `action_speed(action)` | Modificatore di velocità per tipo d'azione |
| `status_penalty`       | Malus da stati mentali (panic, disorient)  |

**Tabella `ACTION_SPEED` (prima iterazione):**

| Action type | Modificatore | Motivazione                                |
| ----------- | -----------: | ------------------------------------------ |
| `defend`    |           +2 | Stance già mantenuta → reazione immediata  |
| `parry`     |           +2 | Pari al defend: intento reattivo preparato |
| `attack`    |            0 | Baseline                                   |
| `ability`   |           -1 | Azioni elaborate richiedono telegraph      |
| `move`      |           -2 | Movimento richiede commitment fisico       |

**Modificatori di status:**

| Status      | Effetto su resolve_priority                                   |
| ----------- | ------------------------------------------------------------- |
| `panic`     | -2 per intensity (panico rallenta le reazioni)                |
| `disorient` | -1 per intensity (disorientamento riduce prontezza)           |
| `rage`      | 0 (rabbia aumenta `attack_mod` nel resolver, non la velocità) |
| `stunned`   | non applicato — l'AI policy tratta `stunned` come skip intent |

Tiebreak nella resolution queue: **alfabetico su `unit_id`** (deterministico, testabile).

---

## 3. Il loop completo

```
 +-------------------+
 | round N avvia     |
 | begin_round(state)|       refresh AP + reactions
 +---------+---------+       tick bleeding + decay statuses
           |                 round_phase = "planning"
           v                 pending_intents = []
 +---------+---------+
 | 2. PLANNING       |
 |                   |
 |  player consulta  |       declare_intent(state, unit, action)
 |  device personali |  ---> preview-only: no AP, no HP, no log.
 |  condivide info   |       latest-wins per unit (si può cambiare idea).
 |  sceglie azione   |       clear_intent(state, unit) rimuove.
 +---------+---------+
           |                 (fase senza timer di default)
           v
 +---------+---------+
 | 3. COMMIT         |
 | commit_round(s)   |       round_phase = "committed"
 +---------+---------+       intents congelati
           |
           v
 +---------+---------+
 | 4. RESOLUTION     |
 | resolve_round(    |       build_resolution_queue: ordina per
 |   state, catalog, |       resolve_priority desc + tiebreak id asc
 |   rng             |
 | )                 |       per ciascun entry della queue:
 +---------+---------+         - skip se actor_dead
           |                   - skip se target_dead (solo attack/parry)
           | next_state        - else: resolve_action(state, action, ...)
           v                     → threading state forward
 +-------------------+           → accumulate turn_log_entries
 | ROUND RESOLVED    |
 | round_phase=      |       AP consumati solo sugli intent risolti.
 |   "resolved"      |
 | pending_intents=[]|
 | log esteso        |
 +-------------------+
           |
           v
     next round N+1
```

### Perché `begin_round` è per-unità

`resolver.begin_turn(state, unit_id)` è l'atomic che refreshna AP/reactions, decrementa status di 1 turno, applica bleeding tick per una singola unità. `round_orchestrator.begin_round(state)` lo invoca per ogni unità (ordine alfabetico, deterministico) prima di passare alla planning phase. Effetto: **una tick di statuses per round**, non per "turno individuale". Un `stunned` di durata 2 dura 2 round.

### Preview-only: cosa NON fa `declare_intent`

Garanzie della fase di planning:

- ❌ NON consuma AP (AP invariati fino a `resolve_round`)
- ❌ NON modifica HP (nessun combat, nessun damage)
- ❌ NON produce `turn_log_entry` nel log canonico
- ❌ NON applica status
- ❌ NON fa roll d20
- ✅ Accumula `{unit_id, action}` in `state.pending_intents`
- ✅ Supporta latest-wins (ri-dichiarare sovrascrive)
- ✅ Supporta `clear_intent` (rimozione)

Il client/UI può usare questa fase per:

- Mostrare cost preview degli AP dell'azione
- Proiettare traiettorie di movimento sulla griglia
- Calcolare probabilità di hit vs CD del target
- Permettere al player di cambiare idea quante volte vuole

Tutto senza toccare lo stato canonico.

### Consumo AP: al commit, non al dichiaramento

```
planning  → AP invariati
commit    → AP ancora invariati (solo lock degli intents)
resolve   → AP consumati dentro resolve_action (via _consume_ap)
```

Questo è intenzionale: un player può dichiarare 5 azioni diverse in planning e **nessuna** consuma AP finché non decide di fare commit e resolve. Solo l'ultima azione dichiarata per quell'unità verrà risolta nel round.

### Reazioni / interrupt

Le reazioni restano nel modello esistente del resolver (`parry_response` nell'action), non sono cittadini di prima classe del round orchestrator in questa iterazione:

- L'attaccante dichiara nella sua action un `parry_response: {attempt: true, parry_bonus: N}` se il difensore ha scelto di parare.
- `resolve_action` consuma una `reaction` del target e tira il parry contestato dentro la pipeline dell'attacco.
- Il difensore ha già consumato la sua reaction prima del proprio intent di round.

Un'evoluzione futura (vedi [Follow-ups](#6-follow-ups)) potrà modellare le reazioni come intent separati con priorità propria nella queue, ma per ora il pattern è conservativo.

---

## 4. Struttura dati

### CombatState esteso (nuovi campi)

Schema: `packages/contracts/schemas/combat.schema.json` ha `additionalProperties: true` al livello di `CombatState`, quindi i nuovi campi non richiedono schema bump.

```json
{
  "session_id": "...",
  "seed": "...",
  "turn": 1,
  "initiative_order": ["alpha", "bravo"],
  "active_unit_id": "alpha",
  "units": [...],
  "log": [...],

  "round_phase": "planning",
  "pending_intents": [
    {
      "unit_id": "alpha",
      "action": {
        "id": "act-alpha-01",
        "type": "attack",
        "actor_id": "alpha",
        "target_id": "bravo",
        "ap_cost": 1,
        "damage_dice": {"count": 1, "sides": 8, "modifier": 3}
      }
    },
    {
      "unit_id": "bravo",
      "action": {
        "id": "act-bravo-01",
        "type": "defend",
        "actor_id": "bravo",
        "ap_cost": 1
      }
    }
  ]
}
```

### Campi legacy: strategia di compatibilità

| Campo                 | Stato                | Nuova semantica                                                                                                          |
| --------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `session_id`          | ✅ mantenuto         | invariato                                                                                                                |
| `seed`                | ✅ mantenuto         | invariato                                                                                                                |
| `turn`                | ✅ mantenuto         | ora rappresenta il numero di round (incrementale)                                                                        |
| `initiative_order`    | ⚠️ legacy, mantenuto | rappresenta l'ordine di default per la queue a parità di azione (utile per UI/tooltip) ma NON guida più il flusso        |
| `active_unit_id`      | ⚠️ legacy, mantenuto | advisory: durante `resolve_round` punta all'unità in corso di risoluzione; altrimenti può essere null o l'ultimo risolto |
| `units[i].initiative` | ✅ mantenuto         | **semantica cambiata**: ora è "reaction speed"                                                                           |
| `log`                 | ✅ mantenuto         | invariato, ogni round aggiunge gli entry dei soli intent risolti                                                         |
| `round_phase`         | ➕ nuovo             | `planning` / `committed` / `resolving` / `resolved`                                                                      |
| `pending_intents`     | ➕ nuovo             | lista di `{unit_id, action}` dichiarati nel round corrente                                                               |

**Nessun campo è deprecato in questa patch**. Il vecchio flusso basato su `initiative_order + active_unit_id` continua a funzionare in parallelo (il Node session engine in `apps/backend/routes/session.js` non è stato modificato). La migrazione del session engine Node è un follow-up tracciato.

---

## 5. API Python

Tutte le funzioni sono pure: nessun I/O, nessuna mutazione degli argomenti, nessuna variabile globale.

### `begin_round(state) → {next_state, expired, bleeding_total}`

Avvia un nuovo round. Per ogni unità (ordine alfabetico): `begin_turn` per refresh AP/reactions, decay statuses, bleeding tick. Imposta `round_phase = 'planning'` e svuota `pending_intents`.

### `declare_intent(state, unit_id, action) → {next_state}`

Registra un intent nella planning phase. Preview-only. Raises `ValueError` se `round_phase != 'planning'`, `KeyError` se `unit_id` inesistente. Latest-wins per unit.

### `clear_intent(state, unit_id) → {next_state}`

Rimuove l'intent precedentemente dichiarato per `unit_id`. No-op se assente.

### `commit_round(state) → {next_state}`

Transita a `'committed'`. Raises `ValueError` se `round_phase != 'planning'`.

### `build_resolution_queue(state) → list[{unit_id, action, priority}]`

Costruisce la queue ordinata per `resolve_priority` desc + id asc. Chiamabile indipendentemente (utile per UI preview).

### `resolve_round(state, catalog, rng) → {next_state, turn_log_entries, resolution_queue, skipped}`

Risolve tutti gli intent committed. Per ciascun entry della queue: skip se actor/target morti, altrimenti `resolve_action`. Thread lo state. Alla fine: `round_phase = 'resolved'`, `pending_intents = []`, `log` esteso. Il rng è consumato solo dagli intent effettivamente eseguiti.

### `compute_resolve_priority(unit, action) → int`

Helper puro: `initiative + action_speed - status_penalty`. Esportato per testing e UI preview.

### `action_speed(action) → int`

Helper puro: lookup nella tabella `ACTION_SPEED`, default 0 per tipi sconosciuti.

---

## 6. Follow-ups

Questa iterazione è intenzionalmente conservativa. Le evoluzioni pianificate:

1. **Reazioni come intent first-class**: modellare parry/counter/overwatch come intent separati con priorità propria, anziché come flag `parry_response` sull'action dell'attaccante.
2. **Action speed calibrato dal balance pack**: oggi `ACTION_SPEED` è hardcoded nel modulo. In futuro caricarlo da `packs/evo_tactics_pack/data/balance/action_speed.yaml` per tuning senza commit Python.
3. **Interrupt window**: supportare intent che si attivano **solo** se triggerati da un altro intent nello stesso round (es. "contromossa se sono bersagliato"). Richiede un concetto di `trigger_condition` nella declaration.
4. **Migrazione Node session engine**: portare `apps/backend/routes/session.js` allo stesso modello. Oggi il session engine è separato dal rules engine Python; il loro allineamento è un sprint dedicato (rischio alto, molti test da aggiornare).
5. **Preview-safe resolve**: esporre una funzione `preview_round(state, catalog, rng) → expected_outcome` che applichi `resolve_round` su una deep copy senza mai restituire il next_state — utile per UI di "cosa succederebbe se...". Deve usare un rng dedicato a preview per non consumare il rng canonico.
6. **Timer opzionale di planning phase**: oggi la planning phase non ha timer. Aggiungere un `planning_deadline_ms` opzionale nel state per i tavoli che vogliono pressione temporale. Il scheduler resta fuori dal rules engine (responsabilità del session engine Node).

---

## 7. Vedi anche

- [data-flow.md](data-flow.md) — hydration e resolve_action atomico
- [resolver-api.md](resolver-api.md) — reference API del resolver
- [ADR-2026-04-15-round-based-combat-model.md](../adr/ADR-2026-04-15-round-based-combat-model.md) — decisione architetturale completa
- [combat hub](../hubs/combat.md) — ingresso canonico al workstream combat
- `services/rules/round_orchestrator.py` — implementazione
- `tests/test_round_orchestrator.py` — 29 test unitari
