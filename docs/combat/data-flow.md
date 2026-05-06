---
title: Combat Data Flow
description: Diagrammi end-to-end del flusso dati del rules engine — hydration, resolve, stacking status.
doc_status: active
doc_owner: combat-team
workstream: combat
last_verified: 2026-05-06
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Combat Data Flow

Questo documento mostra come i dati si muovono nel rules engine, dal payload JSON di un encounter all'entry del turn log finale. I diagrammi usano notazione ASCII per essere leggibili sia da umani che da agenti AI senza dipendenze da strumenti di rendering.

Per l'API puntuale delle funzioni citate, vedi [resolver-api.md](resolver-api.md).

## 1. Hydration: encounter JSON → CombatState iniziale

L'ingresso al rules engine è sempre un `CombatState`. Per ottenerlo a partire da un encounter definito dal designer, si usa `hydration.hydrate_encounter()`.

```
 encounter.json       party.json            trait_mechanics.yaml
 +------------+       +------------+        +--------------------+
 | hostile[]  |       | unit[]     |        | traits:            |
 |  - power   |       |  - id      |        |   artigli_...:     |
 |  - traits  |       |  - species |        |     attack_mod: 1  |
 +-----+------+       |  - traits  |        |     damage_step: 1 |
       |              +------+-----+        +----------+---------+
       |                     |                         |
       v                     v                         v
       +----------+----------+-------------------------+
                  |
                  v
        +--------------------------+
        | hydrate_encounter(       |
        |   encounter,             |       seed + session_id
        |   party,                 |  <---  encounter_id + overrides
        |   catalog,               |
        |   seed, ... )            |
        +------------+-------------+
                     |
                     | 1. build_party_unit() per ogni party member
                     |    - aggrega resistances dai trait
                     |    - deriva HP/armor/tier da defaults
                     |
                     | 2. build_hostile_unit_from_group() per ogni hostile
                     |    - deriva HP = 40 + 10*power
                     |    - deriva armor = clamp(2 + power//2, 2, 12)
                     |    - deriva init = 8 + power
                     |    - deriva tier = clamp((power//3)+1, 1, 5)
                     |
                     | 3. ordina units per initiative (desc, tiebreak alfabetico)
                     |
                     v
        +------------------------------------------+
        | CombatState {                            |
        |   session_id: "skydock-2026-04-14",      |
        |   encounter_id: "caverna-eco",           |
        |   seed: "42",                            |
        |   turn: 1,                               |
        |   initiative_order: ["h-01","p-02",..],  |
        |   active_unit_id: "h-01",                |
        |   units: [                               |
        |     { id, species_id, side, tier,        |
        |       hp{current,max}, ap{current,max},  |
        |       armor, initiative, stress,         |
        |       statuses[], resistances[],         |
        |       trait_ids[], pt, reactions }       |
        |     ...                                  |
        |   ],                                     |
        |   log: []                                |
        | }                                        |
        +------------------------------------------+
```

**Punti chiave:**

- **Tolleranza**: trait non presenti nel catalog vengono silenziosamente ignorati (non sollevano errore). Questo permette di hydratare encounter anche con trait deferred.
- **Determinismo**: la seed dell'encounter viene propagata allo state. Le azioni future useranno `namespaced_rng(seed, namespace)` sullo stesso seed.
- **Immutabilità**: `hydrate_encounter` non muta l'input, restituisce un nuovo dict. Il caller può serializzarlo direttamente in JSON.

## 2. Resolve action: CombatState → next_state + turn_log_entry

Una volta hydratato lo state, ogni turno di combattimento è una sequenza di `resolve_action` — una per ogni azione dichiarata da party/hostile AI.

```
 CombatState + action                   trait_mechanics.yaml
 +-----------------+                    +---------------------+
 | state {         |                    | catalog = load_... |
 |   turn: 3       |                    +----------+----------+
 |   units: [...]  |                               |
 | }               |                               |
 | action {        |                               |
 |   type: attack  |    namespaced_rng(seed, ns)   |
 |   actor_id:...  |    +---------------------+    |
 |   target_id:... |    | rng per questa call |    |
 |   damage_dice   |    +----------+----------+    |
 |   pt_spend?     |               |               |
 |   parry_resp?   |               |               |
 | }               |               |               |
 +--------+--------+               |               |
          |                        |               |
          +---------+--------------+---------------+
                    |
                    v
          +------------------------+
          | resolve_action(        |
          |   state, action,       |
          |   catalog, rng         |
          | )                      |
          +-----------+------------+
                      |
                      | 1. deep copy state -> next_state
                      | 2. _consume_ap(actor)
                      | 3. apply_pt_spend() if pt_spend and !panic
                      | 4. aggregate_mod: attack_mod, defense_mod, damage_step
                      | 5. apply status modifiers (disorient/rage/panic/sbilanciato)
                      | 6. roll d20 -> natural + attack_mod vs CD
                      | 7. if hit: MoS, step_count, damage_dice, step_bonus
                      | 8. apply_resistance -> apply_armor -> clamp
                      | 9. perforazione (armor -2) or spinta (status sbilanciato)
                      |10. decrement HP target (clamp >= 0)
                      |11. check_stress_breakpoints (rage/panic auto-apply)
                      |12. if parry_response.attempt and hit: resolve_parry
                      |13. compute_pt_gained per attore
                      |14. build turn_log_entry
                      |
                      v
          +--------------------------------+
          | {                              |
          |   next_state: CombatState,     |  <- HP/PT/AP/statuses updated
          |   turn_log_entry: {            |
          |     turn: 3,                   |
          |     action: {...},             |
          |     roll: {                    |
          |       natural, modifier, total,|
          |       dc, success, mos,        |
          |       damage_step, pt_gained,  |
          |       is_crit, is_fumble,      |
          |       parry?, pt_spent         |
          |     },                         |
          |     damage_applied: 12,        |
          |     statuses_applied: [...],   |
          |     statuses_expired: []       |
          |   }                            |
          | }                              |
          +--------------------------------+
```

**Il caller** (tipicamente `demo_cli.run_combat` o il worker bridge) è responsabile di:

- Concatenare `turn_log_entry` in `state.log`.
- Aggiornare `active_unit_id` secondo l'initiative order.
- Chiamare `begin_turn(state, unit_id)` quando passa a una nuova unità (reset AP, decay status, bleeding tick).
- Verificare la condizione di fine combat (`is_combat_over`).

> **Nota (ADR-2026-04-15)**: il caller consigliato per i nuovi consumer è `services/rules/round_orchestrator.py`, che implementa il loop shared-planning → commit → ordered-resolution sopra `resolve_action`. Il resolver atomico resta invariato. Vedi [round-loop.md](round-loop.md) per il modello completo.

## 3. Round loop: planning → commit → ordered resolution

Il modulo `services/rules/round_orchestrator.py` (aggiunto in ADR-2026-04-15) estende il data flow sopra introducendo un round orchestrator che batche le intenzioni di tutte le unità e le risolve in ordine di reaction speed. Il resolver atomico (§2) resta il motore di singole intenzioni.

```
 CombatState                                  Caller (UI / test / session)
 +-------------+
 | turn, units |                              1. begin_round(state)
 | initiative  |  <-------------------------     refresh AP/reactions
 | log         |                                 decay statuses + bleeding
 +------+------+                                 round_phase = "planning"
        |                                        pending_intents = []
        v
 +------+------+                              2. planning (preview-only)
 | round_phase |                                 for each intent:
 |  planning   |  <-------------------------     declare_intent(state, uid, action)
 | pending_    |                                 * NO AP consumed
 | intents[]   |                                 * NO HP changes
 +------+------+                                 * latest-wins per unit
        |
        v
 +------+------+                              3. commit_round(state)
 | round_phase |  <-------------------------     round_phase = "committed"
 |  committed  |                                 intents locked
 +------+------+
        |
        |                                     4. resolve_round(state, catalog, rng)
        v
 +------+------+                                 build_resolution_queue
 | queue       |                                   sort by (-priority, id)
 |  [a,b,c...] |                                 for each entry:
 +------+------+                                   - skip actor_dead
        |                                          - skip target_dead (attack/parry)
        |                                          - resolve_action(state, action)
        v                                            thread state forward
 +------+------+                                 round_phase = "resolved"
 | round_phase |                                 pending_intents = []
 |  resolved   |                                 log extended
 | log[+N]     |  <-----------------------+
 +-------------+
```

**Determinism contract**: stesso `state` + stessi `intents` + stesso `rng` + stesso `catalog` → stesso `next_state`. 29 test unitari in `tests/test_round_orchestrator.py` coprono phase transitions, preview-only planning, queue ordering (priority + tiebreak), skip actor/target dead, e end-to-end determinism.

## 4. Esempio worked: attacco con parry response e stress breakpoint

Scenario: party-02 (umano con `artigli_sette_vie`) attacca h-03 (drone con difesa aumentata). Il drone ha `parry_response` attiva. Lo stress del drone sale sopra 0.5 durante l'attack.

**Input:**

```json
{
  "state": {
    "turn": 4,
    "units": [
      {
        "id": "party-02",
        "side": "party",
        "tier": 2,
        "hp": { "current": 28, "max": 35 },
        "ap": { "current": 2, "max": 2 },
        "armor": 3,
        "initiative": 12,
        "stress": 0.1,
        "pt": 2,
        "reactions": { "current": 1, "max": 1 },
        "trait_ids": ["artigli_sette_vie"],
        "statuses": [],
        "resistances": []
      },
      {
        "id": "h-03",
        "side": "hostile",
        "tier": 3,
        "hp": { "current": 22, "max": 60 },
        "ap": { "current": 2, "max": 2 },
        "armor": 4,
        "initiative": 10,
        "stress": 0.45,
        "pt": 1,
        "reactions": { "current": 1, "max": 1 },
        "trait_ids": ["criostasi_adattiva"],
        "statuses": [],
        "resistances": [{ "channel": "gelo", "modifier_pct": 15 }]
      }
    ]
  },
  "action": {
    "id": "act-007",
    "type": "attack",
    "actor_id": "party-02",
    "target_id": "h-03",
    "ap_cost": 1,
    "damage_dice": { "count": 1, "sides": 8, "modifier": 2 },
    "parry_response": { "attempt": true, "parry_bonus": 1 }
  }
}
```

**Pipeline**:

1. AP attore: 2 → 1.
2. No `pt_spend`.
3. `attack_mod` = +1 (artigli_sette_vie). `defense_mod_target` = +2 (criostasi_adattiva). `trait_damage_step` = +1 (artigli).
4. Nessun status attivo su party-02 o h-03 → nessun modificatore aggiuntivo.
5. CD = 10 + tier(3) + defense_mod(2) = **15**.
6. Tiro d20: `natural = 18`, `total = 18 + 1 = 19`. **Hit** (19 ≥ 15). `mos = 4`. **Non crit** (crit è nat 20, non MoS).
7. `step_count = (4 // 5) + 1 = 0 + 1 = 1`. `avg_base = 1 * (8+1)/2 + 2 = 6.5`. `step_bonus = floor(6.5 * 0.25 * 1) = 1`.
8. `damage_rolled` = 5 (dal d8) + 2 (modifier) + 1 (step_bonus) = **8**.
9. Resistenza: action senza `channel` esplicito → resist non applicata → damage = 8.
10. Armor: 8 - 4 = **4**.
11. `parry_response.attempt = true` → `resolve_parry(target=h-03, rng, parry_bonus=1, attack_total=19)`:
    - Natural = 14, total = 15. `parry_dc = 19`. **Fail** (15 < 19). `step_reduced = 0`, `pt_defensive_gained = 0`.
12. `damage_applied = 4 - 0 = 4`. HP h-03: 22 → 18.
13. Stress check: `stress_before = 0.45`, `stress_after = 0.45` (azione attack non modifica stress direttamente in questa iterazione) → nessun breakpoint attraversato → `statuses_applied = []`.
14. `pt_gained` = compute_pt_gained(natural=18, mos=4) = +1 (nat 15-19) + 0 (mos < 5) = **1**. PT party-02: 2 → 3.

**Output `turn_log_entry`**:

```json
{
  "turn": 4,
  "action": {"id": "act-007", "type": "attack", ...},
  "roll": {
    "natural": 18, "modifier": 1, "total": 19, "dc": 15,
    "success": true, "mos": 4, "damage_step": 1, "pt_gained": 1,
    "is_crit": false, "is_fumble": false,
    "parry": {
      "attempted": true, "executed": true,
      "natural": 14, "total": 15, "success": false,
      "step_reduced": 0, "pt_defensive_gained": 0
    },
    "pt_spent": 0
  },
  "damage_applied": 4,
  "statuses_applied": [],
  "statuses_expired": []
}
```

## 5. Stacking degli status effect

Gli status applicati da diverse fonti usano una semantica di **refresh con max**, non di accumulo.

```
 Turn 3: party-02 è colpito da disorient (intensity=1, duration=2)
         apply_status(party-02, "disorient", duration=2, intensity=1)

 Stato disorient dopo apply:
 [ {id: disorient, intensity: 1, remaining_turns: 2, source_unit_id: "h-03", ...} ]


 Turn 4: party-02 è colpito di nuovo da disorient (intensity=2, duration=1)
         apply_status(party-02, "disorient", duration=1, intensity=2)

 Stato disorient dopo refresh:
 [ {id: disorient, intensity: 2, remaining_turns: 2, source_unit_id: "h-03", ...} ]
                    ^^^                  ^^^
                    max(1,2) = 2         max(1,2) = 2
```

**Effetti cumulativi dei 5 status** (vedi `services/rules/resolver.py` per le formule esatte):

| Status    | Effetto                                                                                                             | Applicato in                          |
| --------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| bleeding  | `-intensity` HP all'inizio del turno del target                                                                     | `begin_turn()`                        |
| fracture  | `-intensity` step_count degli attack del portatore                                                                  | `resolve_action()` pipeline step 7    |
| disorient | `-intensity * 2` attack_mod del portatore                                                                           | pipeline step 5                       |
| rage      | `+intensity * 1` attack_mod, `+intensity * 1` damage_step del portatore, `-intensity * 1` defense_mod (furia cieca) | pipeline step 5 / defense aggregation |
| panic     | `-intensity * 2` attack_mod, **blocca PT spend**                                                                    | pipeline step 3 e step 5              |

`rage` e `panic` sono **auto-triggered** da `check_stress_breakpoints` quando lo stress attraversa 0.5 o 0.75 rispettivamente (le fonti di stress sono hazard ambientali / forme attivate — non dagli attack base).

## 6. Turn loop completo

Il loop di un combat completo, tipicamente orchestrato da `demo_cli.run_combat()`:

```
 begin_turn(state, initiative_order[i])
           |
           v
 get_action(active_unit)          <- party: interactive / hostile: ai_action
           |
           v
 resolve_action(state, action, catalog, rng)
           |
           v
 state = next_state               <- side effect del caller
 state.log.append(turn_log_entry)
           |
           v
 is_combat_over(state)? ---yes--> return (winner, final_state)
           |
           no
           |
           v
 advance active_unit_id to next in initiative_order
           |
           v
 (next iteration)
```

**Condizione di fine combat**: `is_combat_over()` restituisce `(over, winner)` dove `winner ∈ {"party", "hostile", None}` in base a quale side ha ancora almeno una unità con `hp.current > 0`.

## Riferimenti

- Schema completo dei payload: `packages/contracts/schemas/combat.schema.json`
- Signature e semantica delle funzioni citate: [resolver-api.md](resolver-api.md)
- Come popolare `trait_mechanics.yaml`: [trait-mechanics-guide.md](trait-mechanics-guide.md) _(PR B2)_
- Status effects in dettaglio: [status-effects-guide.md](status-effects-guide.md) _(PR B2)_
- Protocollo worker Node ↔ Python: [worker-bridge.md](worker-bridge.md) _(PR B3)_
