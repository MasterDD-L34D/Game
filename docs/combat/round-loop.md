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

### Reazioni come intent first-class (follow-up #1 + #3)

Dal patch di follow-up del 2026-04-15 le reazioni sono **cittadini di prima classe** del round orchestrator, con una shape dedicata e un meccanismo di trigger condizioni:

```python
declare_reaction(
    state,
    unit_id="bravo",
    reaction_payload={"type": "parry", "parry_bonus": 1},
    trigger={"event": "attacked", "source_any_of": None}
)
```

Le reaction intents:

- **Non compaiono nella main queue**: `build_resolution_queue` le esclude automaticamente.
- **Non consumano AP al commit**: restano preview-only finché non triggerate.
- **One-shot per round**: la prima volta che matchano, vengono segnate `_consumed=True` e non re-triggrano sullo stesso round anche se altri eventi matcherebbero.
- **Trigger conditions**:
  - `event`: per ora supportato solo `"attacked"` (vedi `SUPPORTED_REACTION_EVENTS`). Futuri: `damaged`, `moved_adjacent`, `healed`.
  - `source_any_of`: opzionale, lista di `unit_id` che triggerano la reazione. `None` o vuoto = qualsiasi sorgente.
- **Payload type**: per ora supportato solo `"parry"` (vedi `SUPPORTED_REACTION_TYPES`). Futuri: `counter` (contrattacco libero), `overwatch` (attacco opportunistico).

**Pipeline di trigger** (dentro `resolve_round`):

1. Il main intent di alpha risolve `attack` contro bravo.
2. Prima di chiamare `resolve_action`, l'orchestrator consulta `reactions_by_unit["bravo"]`.
3. Se trova una reaction con `event=attacked` e `source_any_of` che matcha (o è None), inietta `parry_response` nell'action clonata: `{attempt: true, parry_bonus: N}`.
4. Chiama `resolve_action` con l'action arricchita. Il resolver atomico gestisce la pipeline parry come in ogni altra action con `parry_response`.
5. Marca la reaction come consumata e registra l'evento in `result["reactions_triggered"]`.

Il budget `unit.reactions.current` resta la responsabilità del resolver atomico: se bravo ha 0 reactions disponibili, il parry viene registrato come `executed: false` (come nel modello pre-refactor). Una reaction intent dichiarata ma mai triggerata costa 0.

**Test di riferimento** in `tests/test_round_orchestrator.py`:

- `test_declare_reaction_registers_reaction_intent`
- `test_declare_reaction_rejects_unsupported_event`
- `test_declare_reaction_rejects_unsupported_payload_type`
- `test_build_resolution_queue_excludes_reaction_intents`
- `test_reaction_triggers_parry_on_matching_attack`
- `test_reaction_source_filter_matches_allowed_attacker`
- `test_reaction_source_filter_rejects_other_attacker`
- `test_reaction_consumed_after_first_trigger`
- `test_reaction_unused_if_target_not_attacked`
- `test_reaction_does_not_consume_ap_if_not_triggered`

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
        "damage_dice": { "count": 1, "sides": 8, "modifier": 3 }
      }
    },
    {
      "unit_id": "bravo",
      "reaction_trigger": {
        "event": "attacked",
        "source_any_of": null
      },
      "reaction_payload": {
        "type": "parry",
        "parry_bonus": 1
      }
    }
  ]
}
```

**Due shapes di intent** coesistono in `pending_intents`:

- **Main intent** (con `action`): va nella main queue, consuma AP, risolve in ordine di priority.
- **Reaction intent** (con `reaction_trigger` + `reaction_payload`): non va in queue, resta come "listener" e triggera se qualcuno la matcha.

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

### `declare_reaction(state, unit_id, reaction_payload, trigger) → {next_state}`

Registra una reaction intent. Preview-only (nessun AP). Valida `trigger.event ∈ SUPPORTED_REACTION_EVENTS` e `reaction_payload.type ∈ SUPPORTED_REACTION_TYPES`. Raises `ValueError` su payload/event non supportati o fase sbagliata.

### `build_resolution_queue(state, speed_table=None) → list[{unit_id, action, priority}]`

Costruisce la main queue ordinata per `resolve_priority` desc + id asc. **Esclude reaction intents** automaticamente. Accetta `speed_table` opzionale per override della tabella ACTION_SPEED (utile per test).

### `resolve_round(state, catalog, rng) → {next_state, turn_log_entries, resolution_queue, reactions_triggered, skipped}`

Risolve tutti i main intents committed. Per ciascun entry della queue: skip se actor/target morti, altrimenti `resolve_action`. Durante il loop, check reaction matching: se il target di un attack ha una reaction intent con trigger che matcha, inietta `parry_response` nell'action clonata e marca la reaction come consumata. Thread lo state. Alla fine: `round_phase = 'resolved'`, `pending_intents = []`, `log` esteso, `reactions_triggered` riporta le reazioni effettivamente eseguite.

### `preview_round(state, catalog, rng) → {next_state, turn_log_entries, resolution_queue, reactions_triggered, skipped}`

What-if: simula `resolve_round` su una deep copy dello state, **non muta l'input**. Accetta fase `planning` o `committed` (auto-commita sulla copy se planning). Il `rng` deve essere dedicato alla preview (es. namespaced con namespace diverso dal canonical) per non consumare il rng canonico.

### `compute_resolve_priority(unit, action, speed_table=None) → int`

Helper puro: `initiative + action_speed - status_penalty`. Esportato per testing e UI preview. `speed_table` opzionale.

### `action_speed(action, table=None) → int`

Helper puro: lookup nella tabella passata (o in `ACTION_SPEED` modulo-level), default 0 per tipi sconosciuti.

### `load_action_speed_table(path=None) → dict`

Carica la tabella di speed da un YAML del balance pack. Default path: `packs/evo_tactics_pack/data/balance/action_speed.yaml`. Fallback tollerante a `DEFAULT_ACTION_SPEED` se il file manca, è malformato, o mancano le chiavi attese. Non solleva eccezioni: sempre ritorna un dict valido.

### `reload_action_speed_table(path=None) → dict`

Ricarica `ACTION_SPEED` dal filesystem (hot reload) e muta il dict modulo-level in-place. Utile nei test per override temporaneo.

---

## 6. Follow-ups

**Completati nel patch del 2026-04-15**:

- ✅ **#2** `ACTION_SPEED` da YAML di balance pack: `load_action_speed_table()` + `packs/evo_tactics_pack/data/balance/action_speed.yaml`.
- ✅ **#5** `preview_round(state, catalog, rng)`: what-if su deep copy, non muta l'input.
- ✅ **#1** Reazioni come intent first-class: `declare_reaction()` + partizionamento in `resolve_round`.
- ✅ **#3** Interrupt window con trigger conditions: `reaction_trigger.event` + `reaction_trigger.source_any_of`.

**Ancora aperti** (evoluzioni future):

1. **Counter e overwatch**: oltre a `parry`, supportare altri payload type nel sistema di reaction (`counter` = contrattacco libero, `overwatch` = attacco opportunistico su movimento).
2. **Eventi di trigger aggiuntivi**: oltre a `attacked`, supportare `damaged` (dopo il damage step), `moved_adjacent` (quando un'unita' entra in mischia), `healed`, `ability_used`.
3. **Migrazione Node session engine**: portare `apps/backend/routes/session.js` allo stesso modello. Oggi il session engine è separato dal rules engine Python; il loro allineamento è un sprint dedicato (rischio alto, molti test da aggiornare).
4. **Timer opzionale di planning phase**: oggi la planning phase non ha timer. Aggiungere un `planning_deadline_ms` opzionale nel state per i tavoli che vogliono pressione temporale. Il scheduler resta fuori dal rules engine (responsabilità del session engine Node).
5. **Reaction con cooldown multi-round**: oggi le reactions sono one-shot per round. Future: cooldown persistenti fra round (`cooldown_rounds: 2`) per reactions potenti.
6. **Trigger predicate avanzati**: oltre a `source_any_of`, supportare condizioni come `damage_threshold` (triggera solo se il damage in arrivo supera X), `hp_threshold` (triggera solo se HP sotto Y).

---

## 7. Vedi anche

- [data-flow.md](data-flow.md) — hydration e resolve_action atomico
- [resolver-api.md](resolver-api.md) — reference API del resolver
- [ADR-2026-04-15-round-based-combat-model.md](../adr/ADR-2026-04-15-round-based-combat-model.md) — decisione architetturale completa
- [combat hub](../hubs/combat.md) — ingresso canonico al workstream combat
- `services/rules/round_orchestrator.py` — implementazione
- `tests/test_round_orchestrator.py` — 29 test unitari
