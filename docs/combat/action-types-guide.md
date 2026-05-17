---
title: Action Types Guide
description: Action types supportati dal rules engine d20, PT spend reference, parry response e ability stub.
doc_status: active
doc_owner: combat-team
workstream: combat
last_verified: 2026-05-06
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Action Types Guide

Ogni turno nel rules engine produce una o più `action` che vengono risolte da `resolve_action()`. Questo documento descrive i 5 tipi di action supportati, il meccanismo di **PT spend** (perforazione, spinta), il **parry response** opt-in, e lo stato attuale dell'**ability stub** (Fase 3 deferred).

## Anatomia di un'action

Uno `action` object ha questa shape (`$defs.action` in `combat.schema.json`):

```json
{
  "id": "act-042",
  "type": "attack",
  "actor_id": "party-01",
  "target_id": "h-03",
  "ap_cost": 1,
  "channel": "taglio",
  "damage_dice": { "count": 1, "sides": 8, "modifier": 2 },
  "pt_spend": { "type": "perforazione", "amount": 1 },
  "parry_response": { "attempt": true, "parry_bonus": 1 },
  "ability_id": null
}
```

Campi richiesti: `id`, `type`, `actor_id`, `ap_cost`. Tutti gli altri sono opzionali e dipendono dal `type`.

## I 5 action types

### `attack`

**Il tipo principale** — l'unico con logica completa nel resolver.

**Campi rilevanti**:

- `target_id` _(required)_: id dell'unità bersaglio.
- `damage_dice` _(required)_: `{count, sides, modifier}`. Se omesso, fallback a `{count: 1, sides: 6, modifier: 0}`.
- `channel` _(opzionale)_: canale di danno per l'applicazione di resistenze. Canoni: `elettrico, psionico, fisico, fuoco, gravita, mentale, taglio, ionico`. Se omesso, la resistenza non viene applicata (danno passa invariato).
- `pt_spend` _(opzionale)_: spesa PT per effetti aggiuntivi (vedi sotto).
- `parry_response` _(opzionale)_: tiro reattivo del target (vedi sotto).

**Pipeline**: vedi [data-flow.md](data-flow.md#2-resolve-action-combatstate--next_state--turn_log_entry) per la sequenza completa di 14 step.

**Test ref**: ~50 test in `tests/test_resolver.py` coprono scenari di hit/miss/crit/fumble, resistenze, armor, pt_spend, parry, stress breakpoint, status stacking.

### `defend`, `move`, `ability`, `parry` _(NOOP_ACTION_TYPES)_

Questi 4 tipi sono in `NOOP_ACTION_TYPES = frozenset({"defend", "parry", "ability", "move"})`. Il resolver li gestisce così:

- **Consumo AP**: `actor.ap.current -= action.ap_cost` (clamp a 0)
- **Turn log**: produce una `turn_log_entry` con `roll: null`, `damage_applied: 0`, `statuses_applied: []`.
- **Nessuna logica di risoluzione**: non c'è difesa attiva, non c'è movimento sulla griglia, non ci sono ability.

**Perché?** La Fase 2 si è concentrata sul combat loop core (attack + status + parry response opt-in). Le altre action type sono contratti stabili — i client possono dichiararle — ma la logica di risoluzione è deferita:

- **`defend`**: probabile implementazione Fase 3 come "+1 defense_mod per il turno", con nuovo status `defending`.
- **`move`**: deferred fino a quando la griglia tattica esiste. Il contratto esiste per non dover fare breaking change quando si aggiungerà.
- **`ability`**: **centrale per Fase 3**. Attiverà `active_effects` dei trait (attualmente NOOP nel catalog).
- **`parry`**: distinto dal `parry_response` opt-in. Il `parry` come action type indipendente sarà implementato quando le reactions avranno un proprio timing (fuori dal turn dell'attore).

## AP budget per turno (canonico)

> **FRICTION #2+#3 resolution** dal playtest 2026-04-17 (vedi `docs/playtests/2026-04-17/notes.md`).

Regola canonica: **AP è un budget azioni per turno, spendibile liberamente** secondo il costo di ciascuna action. Non esiste un template fisso "1 move + 1 attack" — qualunque combinazione di azioni che somma ≤ `ap_remaining` è valida.

### Refresh AP

- A inizio turno: `actor.ap_remaining = actor.ap_max` (default 2 per tutte le unità base)
- Eccezione status `fracture`: `ap_remaining = min(1, ap_max)` (vedi `combat-canon.md` §status effects)

### Costo per action type

| Type      |       AP cost       | Note                                                  |
| --------- | :-----------------: | ----------------------------------------------------- |
| `attack`  |        **1**        | per attack roll, indipendente dal damage              |
| `move`    |        **N**        | N = celle Manhattan spostate (`dist ≤ ap_remaining`)  |
| `ability` | **ability.ap_cost** | per-ability dichiarato in `action_effects` trait YAML |
| `defend`  |          1          | NOOP (Fase 2) — consumo AP senza logica               |
| `parry`   |          1          | NOOP come action type (reactive via `parry_response`) |

### Combinazioni valide (ap_max=2)

- ✅ **2 attack**: `1 AP + 1 AP = 2 AP` → **doppio attacco = valid**
- ✅ 1 attack + 1 move 1-cell: `1 + 1 = 2 AP`
- ✅ 1 move 2-cell + 0 action: `2 + 0 = 2 AP`
- ✅ 1 ability(ap_cost=2): consuma tutto il budget
- ❌ 1 move 3-cell: `3 > 2` → rigettato con errore
- ❌ 3 attack: 3° attack rigettato a `ap_remaining < 1`

### Enforcement

- `POST /api/session/action` verifica `ap_remaining >= action_cost` prima di eseguire (session.js:717+)
- Errori espliciti: `"AP insufficienti per attaccare (termina il turno)"`, `"AP insufficienti per muoversi (termina il turno)"`, `"AP insufficienti per muoversi di N celle (ap residui: M)"`

### Ability override AP

Abilità con `ap_cost` esplicito in `data/core/jobs.yaml` o `data/core/traits/active_effects.yaml` possono costare più di 1 AP. Il resolver lo legge dal dataset, non hardcoded.

Esempio Skirmisher `hit-and-run` (spec in arrivo, vedi FRICTION #4 roadmap):

```yaml
abilities:
  hit_and_run:
    ap_cost: 2 # attack + reposition atomico
    effect_type: compound
```

---

## PT spend: perforazione e spinta

Il campo `action.pt_spend` permette all'attore di consumare PT dal proprio pool per ottenere effetti aggiuntivi su un attack. Supportato solo per `type: "attack"`.

Shape:

```json
"pt_spend": {
  "type": "perforazione",
  "amount": 1
}
```

Tipi supportati (`SUPPORTED_PT_SPEND_TYPES`):

### `perforazione`

**Effetto**: armor effettiva del target ridotta di `PERFORAZIONE_ARMOR_REDUCTION = 2` per questo attack.

**Formula**: durante il pipeline step 10, `apply_armor(damage, max(0, target.armor - 2))` invece di `apply_armor(damage, target.armor)`.

**Quando usarlo**: contro target con armor alta (≥ 4) dove il damage rolled supera la resistenza ma viene mangiato dall'armor. Es: damage 8, armor 4 → damage_applied=4. Con perforazione: damage 8, armor 2 → damage_applied=6.

**Costo**: `amount` PT dal pool dell'attore (minimo 1). Il resolver non impone un costo fisso, ma per convenzione `amount=1` è sufficiente per il boost base.

### `spinta`

**Effetto**: applica un nuovo status `sbilanciato` sul target per la durata specificata.

**Implementazione attuale**: durante il pipeline step 11, se `pt_spend.type == "spinta"` e l'attack ha hittato, viene chiamato `apply_status(target, "sbilanciato", duration=1, intensity=1, source_unit_id=actor.id, source_action_id=action.id)`.

> **Nota**: `sbilanciato` NON è nell'enum ufficiale dei 5 status (bleeding/fracture/disorient/rage/panic). È un **6° status informale** consumato direttamente dal pipeline nel calcolo di `defense_mod_target`. Se lo schema viene esteso in Fase 3, `sbilanciato` andrà formalizzato. Per ora è tollerato dal validator perché lo schema enum è meno restrittivo delle costanti del resolver.

**Quando usarlo**: contro target con `defense_mod` alto. Il `sbilanciato` riduce `defense_mod_target` di `intensity * 1` al prossimo attack, rendendo più facile hittare il target al turno successivo.

### Panic blocca la spesa

Se l'attore ha lo status `panic`, qualsiasi `pt_spend` viene **silent-droppato**:

```python
# Pipeline step 3 (da resolver.py)
actor_panic = get_status(actor, "panic")
if pt_spend:
    if actor_panic is not None:
        pass  # silent drop, no PT consumed
    else:
        pt_spent = apply_pt_spend(actor, pt_spend)
        # ... apply effect based on pt_spend.type
```

Nessuna eccezione sollevata, nessun PT consumato, l'azione continua come attack normale. Questo è documentato in `turn_log_entry.roll.pt_spent` che sarà 0 in caso di silent drop.

### Errori

`apply_pt_spend` solleva `ValueError` in 3 casi:

1. `pt_spend.type` non in `SUPPORTED_PT_SPEND_TYPES` (es. `"combo"` o `"condizioni"` — deferred)
2. `pt_spend.amount <= 0`
3. `actor.pt < amount`

Un `ValueError` qui **blocca l'intera `resolve_action`** prima che il roll avvenga. Nessun side effect sullo state. Il caller deve gestire l'errore (tipicamente presentando un messaggio utente in modalità interactive, o loggando in modalità auto).

### Tipi deferred

Il doc `10-SISTEMA_TATTICO.md` cita 4 tipi di PT spend totali:

- ✅ `perforazione` — implementato
- ✅ `spinta` — implementato
- ⏳ `condizioni` — deferred (applicazione di status condizionali)
- ⏳ `combo` — deferred (chain di attack multipli nello stesso turno)

L'ADR-2026-04-13 registra i tipi deferred come scope di Fase 3. Quando verranno implementati, dovranno essere aggiunti a `SUPPORTED_PT_SPEND_TYPES` e al match-case nel pipeline step 3 del resolver.

## Parry response (opt-in)

Il campo `action.parry_response` permette al target di tentare un tiro reattivo di parata **opt-in** quando viene colpito. Il parry è distinto dall'action type `parry` (che è NOOP).

Shape:

```json
"parry_response": {
  "attempt": true,
  "parry_bonus": 2
}
```

Campi:

- `attempt` _(bool, default false)_: se `true`, il target tenta la parata quando subisce l'attack.
- `parry_bonus` _(int, default 0)_: bonus additivo al tiro d20 di parata, tipicamente aggregato dai trait difensivi del target in una future iterazione (attualmente va passato dal client).

### Come funziona

Durante pipeline step 12 di `resolve_action`, se l'attack ha hittato E `action.parry_response.attempt == true`, il resolver chiama `resolve_parry(target, rng, parry_bonus, attack_total)`:

```python
parry_dc = attack_total if attack_total is not None else PARRY_CD
natural = roll_die(rng, 20)
total = natural + int(parry_bonus)
success = natural == NATURAL_MAX or total >= parry_dc
pt_gained = 0
step_reduced = 0
if success:
    step_reduced = 1
    pt_gained = PARRY_PT_CRIT if natural == NATURAL_MAX else PARRY_PT_BASE
```

**Success condition**: nat 20 auto-success, oppure `total >= attack_total` (parata batte l'attack). Se `attack_total` non è passato, fallback a `PARRY_CD = 12` (modalità legacy).

### Effetti sul damage

Se la parata ha successo, `step_reduced = 1` e `pt_defensive_gained = 1` (o 2 su nat 20).

Il caller applica `step_reduced` al `step_count` prima di calcolare `step_bonus`:

```
step_count_finale = max(0, step_count - step_reduced)
```

Questo riduce il danno flat, ma **non azzera l'attack**: il dado base continua a rollare. Un parry riuscito mitiga, non annulla.

I PT difensivi guadagnati vanno sommati al pool del target (che tipicamente li userà in un turn successivo per perforazione/spinta).

### Costo in reactions

Per convenzione, `parry_response.attempt = true` consuma 1 `reactions` del target. Attualmente il resolver **non enforce** il check (`target.reactions.current > 0`). È una gap della Fase 2: dovrebbe essere aggiunto in Fase 3 per evitare che un target con 0 reactions continui a parare.

### Fallback PARRY_CD

Quando il caller non passa `attack_total` (es. per test isolati di `resolve_parry` senza un attack reale), il resolver usa `PARRY_CD = 12` come CD fissa. Questa era l'implementazione Fase 1 (parata non contestata). La Fase 2 ha aggiunto la parry contestata passando `attack_total`, ma il fallback è mantenuto per retrocompat e per i test unitari.

**Test ref**: `tests/test_resolver.py::test_resolve_parry_contested_*` e `tests/test_resolver.py::test_resolve_parry_fallback_cd_*`.

## Ability stub (Fase 3)

Il campo `action.ability_id` esiste nello schema ma **non ha logica di risoluzione** nel resolver Fase 2. Un'action con `type: "ability"` cade nel ramo NOOP: consuma AP, produce turn_log entry, fine.

Il piano per Fase 3 (dall'ADR):

1. Il catalog `trait_mechanics.yaml` ha un campo `active_effects: []` per-trait, attualmente sempre vuoto.
2. Quando popolato, conterrà identifier come `"apply_disorient_on_hit"`, `"bleeding_on_crit"`, `"summon_meteor"`.
3. Un nuovo registry `services/rules/effects/` (ancora da creare) mapperà `effect_id → handler_function`.
4. Il resolver, per `action.type == "ability"`, cercherà l'handler e lo eseguirà con `(state, action, actor, catalog, rng)`.
5. L'handler restituirà modifiche al `next_state` e entry da aggiungere al `turn_log`.

Per ora, chi sviluppa trait content può **popolare** `active_effects` come preparazione, ma il resolver ignorerà i valori.

## Esempio completo

Un'action `attack` con tutti i campi opzionali:

```json
{
  "id": "act-007",
  "type": "attack",
  "actor_id": "party-02",
  "target_id": "h-03",
  "ap_cost": 1,
  "channel": "taglio",
  "damage_dice": { "count": 1, "sides": 8, "modifier": 2 },
  "pt_spend": { "type": "perforazione", "amount": 1 },
  "parry_response": { "attempt": true, "parry_bonus": 1 },
  "ability_id": null
}
```

Interpretazione: party-02 attacca h-03, 1 AP, dado d8+2, canale taglio (per resistenze), spende 1 PT per penetrare armor (-2 effective), h-03 tenta una parata reattiva con +1 bonus (contestata sul total dell'attack).

Vedi [data-flow.md](data-flow.md#3-esempio-worked-attacco-con-parry-response-e-stress-breakpoint) per un walk-through di questa action con tutti i valori intermedi.

## Riferimenti

- Schema completo `$defs.action`: `packages/contracts/schemas/combat.schema.json`
- Implementazione pipeline attack: `services/rules/resolver.py::resolve_action`
- `apply_pt_spend`, `resolve_parry`: [resolver-api.md](resolver-api.md#apply_pt_spend-actor-pt_spend--amount_consumed)
- Constanti esportate (`SUPPORTED_PT_SPEND_TYPES`, `PARRY_CD`, `PERFORAZIONE_ARMOR_REDUCTION`, ecc.): [resolver-api.md](resolver-api.md#costanti-esportate)
- Status consumati dalla pipeline: [status-effects-guide.md](status-effects-guide.md)
- ADR con scope Fase 2 vs Fase 3: [ADR-2026-04-13: Rules Engine d20](../adr/ADR-2026-04-13-rules-engine-d20.md)
