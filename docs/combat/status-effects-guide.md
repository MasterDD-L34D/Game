---
title: Status Effects Guide
description: Catalog dei 5 status effect implementati e procedura per aggiungerne di nuovi al rules engine d20.
doc_status: active
doc_owner: combat-team
workstream: combat
last_verified: 2026-05-06
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Status Effects Guide

Il rules engine supporta **5 status effect** nella Phase 2: `bleeding`, `fracture`, `disorient`, `rage`, `panic`. Questo documento li cataloga uno per uno, spiega come vengono triggerati e consumati, e fornisce la procedura per aggiungerne di nuovi.

## Anatomia di uno status effect

Uno `status_effect` nel `CombatState` ha questa shape (`$defs.status_effect` in `combat.schema.json`):

```json
{
  "id": "rage",
  "intensity": 2,
  "remaining_turns": 3,
  "source_unit_id": "h-01",
  "source_action_id": "act-014"
}
```

- **id**: uno di `{bleeding, fracture, disorient, rage, panic}` nell'enum attuale.
- **intensity**: int ≥ 1, scala l'effetto (es. `rage intensity=2` → `+2 attack_mod`, `+2 damage_step`, `-2 defense_mod`).
- **remaining_turns**: int ≥ 0, decrementato di 1 ad ogni `begin_turn()` dell'unità. Quando raggiunge 0, lo status viene rimosso.
- **source_unit_id** / **source_action_id**: audit trail opzionale (who/what applied this), utile per log e replay.

## Catalog dei 5 status

### `bleeding`

**Semantica**: danno ricorrente a inizio turno del target. Simula emorragie, tossine, bruciature persistenti.

**Trigger**: applicato manualmente dal caller (future ability) o dai contract dei trait con `active_effects`. Non è auto-triggered dal resolver in Fase 2.

**Effetto**: in `begin_turn(state, unit_id)`, prima del decay status, viene eseguito un tick: `unit.hp.current -= sum(status.intensity for status in unit.statuses if status.id == "bleeding")`, clamp a 0.

**Implementazione**: `services/rules/resolver.py` — cerca `bleeding` in `begin_turn`. Il tick avviene **prima** del decay `remaining_turns`, quindi uno status con `remaining_turns=1` fa un ultimo tick prima di essere rimosso.

**Test ref**: `tests/test_resolver.py::test_begin_turn_bleeding_*`.

### `fracture`

**Semantica**: riduzione dello `step_count` degli attack del portatore. Simula ossa rotte, armature compromesse, mobilità ridotta.

**Trigger**: applicato manualmente (no auto-trigger in Fase 2).

**Effetto**: in `resolve_action()` durante il calcolo dello step_count dell'attore:

```
step_count = max(0, step_count - intensity * FRACTURE_STEP_REDUCTION_PER_INTENSITY)
```

Costante: `FRACTURE_STEP_REDUCTION_PER_INTENSITY = 1`. Quindi `fracture intensity=2` → `-2 step_count`, con floor a 0.

**Test ref**: `tests/test_resolver.py::test_resolve_attack_with_fracture_*`.

### `disorient`

**Semantica**: malus al tiro di attack del portatore. Simula stordimento, accecamento, confusione percettiva.

**Trigger**: applicato manualmente (no auto-trigger).

**Effetto**: in `resolve_action()`:

```
attack_mod -= intensity * DISORIENT_ATTACK_MALUS_PER_INTENSITY
```

Costante: `DISORIENT_ATTACK_MALUS_PER_INTENSITY = 2`. Quindi `disorient intensity=2` → `-4 attack_mod`.

**Test ref**: `tests/test_resolver.py::test_resolve_attack_with_disorient_*`.

### `rage`

**Semantica**: "furia cieca". Bonus offensivi ma malus difensivo (l'unità in rage si espone a contrattacchi).

**Trigger**: **auto-triggered** da `check_stress_breakpoints` quando lo stress del target attraversa la soglia `STRESS_BREAKPOINT_RAGE = 0.5` durante l'azione. Applicato con `RAGE_DEFAULT_INTENSITY=1` e `RAGE_DEFAULT_DURATION=3`.

**Effetto**: in `resolve_action()`:

- Sull'attore (pipeline step 5): `attack_mod += intensity * 1`, `damage_step += intensity * 1`
- Sul target (quando è il difensore, pipeline step 5): `defense_mod -= intensity * 1`

Costanti: `RAGE_ATTACK_BONUS_PER_INTENSITY = 1`, `RAGE_DAMAGE_STEP_BONUS_PER_INTENSITY = 1`, `RAGE_DEFENSE_MALUS_PER_INTENSITY = 1`.

**Test ref**: `tests/test_resolver.py::test_resolve_attack_with_rage_*`, `tests/test_resolver.py::test_check_stress_breakpoints_rage_*`.

### `panic`

**Semantica**: terrore. Blocca la spesa di PT (azioni concentrate) e riduce l'accuratezza.

**Trigger**: **auto-triggered** da `check_stress_breakpoints` quando lo stress attraversa `STRESS_BREAKPOINT_PANIC = 0.75`. Applicato con `PANIC_DEFAULT_INTENSITY=1` e `PANIC_DEFAULT_DURATION=2`.

**Effetto**: in `resolve_action()`:

- Pipeline step 3 (**prima** del roll): se `get_status(actor, "panic")` è truthy, `action.pt_spend` viene **silent-droppato** (nessun PT consumato, nessun effetto di perforazione/spinta applicato). Non solleva eccezione.
- Pipeline step 5: `attack_mod -= intensity * PANIC_ATTACK_MALUS_PER_INTENSITY` (costante = 2).

Costante: `PANIC_ATTACK_MALUS_PER_INTENSITY = 2`.

**Test ref**: `tests/test_resolver.py::test_resolve_attack_with_panic_*`, `tests/test_resolver.py::test_panic_blocks_pt_spend`.

## Refresh semantics

Quando `apply_status` riceve un `status_id` che l'unità ha già, viene eseguito un **refresh con max**, non un'aggiunta:

```python
# Stato esistente:
# {id: rage, intensity: 1, remaining_turns: 2}

apply_status(unit, "rage", duration=3, intensity=2, ...)

# Stato dopo refresh:
# {id: rage, intensity: 2, remaining_turns: 3}
#             ^^^                     ^^^
#             max(1, 2) = 2           max(2, 3) = 3
```

Il `source_unit_id` e `source_action_id` **vengono sovrascritti** con i nuovi valori (non accumulati). Questo significa che la "colpa" di uno status è sempre attribuita all'ultimo trigger.

Il refresh garantisce che:

- Status di durata diversa non si sovrappongano (non hai 2 entry di rage).
- Un secondo proc "peggiorativo" (intensity maggiore) upgrada l'effetto.
- Un secondo proc con intensity minore **non degrada** lo status esistente.

## Stress breakpoints

Gli unici status auto-applicati dal resolver sono `rage` e `panic`, e solo via `check_stress_breakpoints()`. Vedi `services/rules/resolver.py` per la logica:

```python
def check_stress_breakpoints(target, stress_before, stress_after, ...):
    applied = []
    if stress_before < STRESS_BREAKPOINT_RAGE <= stress_after:
        applied.append(apply_status(target, "rage", duration=3, intensity=1, ...))
    if stress_before < STRESS_BREAKPOINT_PANIC <= stress_after:
        applied.append(apply_status(target, "panic", duration=2, intensity=1, ...))
    return applied
```

Il check "attraversa la soglia" (`<` stretto a sinistra, `<=` chiuso a destra) garantisce che ogni breakpoint scatti **una sola volta** durante la singola azione.

**Caveat Fase 2**: il resolver non modifica direttamente lo `stress` per attack base. Gli unici triggers di stress nel Frattura draft sono hazard ambientali e forme attivate, non attack. Quindi nella Fase 2 gli status rage/panic si auto-applicano solo se un altro sistema (hazard engine, form activation, demo CLI) ha modificato lo stress prima di chiamare `resolve_action`.

## Aggiungere un nuovo status effect

Procedura step-by-step per aggiungere uno status, ad esempio `poisoned`.

### 1. Aggiungere all'enum dello schema

Edita `packages/contracts/schemas/combat.schema.json`, sezione `$defs.status_effect`:

```json
"$defs": {
  "status_effect": {
    "type": "object",
    "properties": {
      "id": {
        "enum": ["bleeding", "fracture", "disorient", "rage", "panic", "poisoned"]
      },
      ...
    }
  }
}
```

### 2. Definire le costanti in `resolver.py`

Aggiungi le costanti di effetto in testa al modulo:

```python
#: Effetto di poisoned: -intensity al damage_step del portatore per ogni intensity
POISONED_DAMAGE_STEP_MALUS_PER_INTENSITY = 1

#: Se poisoned ha una meccanica di tick (come bleeding), aggiungi anche:
POISONED_HP_TICK_PER_INTENSITY = 1
```

### 3. Consumare lo status nella pipeline

Apri `resolve_action()` e aggiungi il consumo nel punto appropriato. Per un malus offensivo:

```python
# Pipeline step 5: apply status modifiers
actor_poisoned = get_status(actor, "poisoned")
if actor_poisoned is not None:
    trait_damage_step -= int(actor_poisoned.get("intensity", 1)) * POISONED_DAMAGE_STEP_MALUS_PER_INTENSITY
    trait_damage_step = max(0, trait_damage_step)  # clamp
```

Per un tick HP come bleeding, aggiungi in `begin_turn()`:

```python
# Dentro begin_turn, prima del decay
poisoned_damage = sum(
    int(s.get("intensity", 1)) * POISONED_HP_TICK_PER_INTENSITY
    for s in unit.get("statuses", [])
    if s.get("id") == "poisoned"
)
if poisoned_damage:
    current_hp = int(unit["hp"]["current"])
    unit["hp"]["current"] = max(0, current_hp - poisoned_damage)
```

### 4. Aggiungere test unitari

In `tests/test_resolver.py`, per ogni meccanica:

```python
def test_resolve_attack_with_poisoned_reduces_damage_step():
    state = make_state(...)
    actor = state["units"][0]
    actor["statuses"].append({
        "id": "poisoned",
        "intensity": 2,
        "remaining_turns": 3,
        "source_unit_id": None,
        "source_action_id": None,
    })
    result = resolve_action(state, attack_action, catalog, rng=fixed_rng(0.5))
    # ... asserzioni sul damage_applied
```

Aggiungere almeno 1 test per:

- Trigger meccanico corretto (intensity=1, intensity=2)
- Stacking con altri status (es. disorient + poisoned)
- Decay corretto via `begin_turn` → rimozione a `remaining_turns=0`

### 5. Aggiornare i contract test se necessario

Se aggiungi un nuovo `id` all'enum, `tests/api/contracts-combat.test.js` dovrebbe accettarlo senza modifiche perché valida contro lo schema aggiornato. Se hai aggiunto constraint specifici (es. un nuovo campo sullo status), aggiungi un test che verifica l'accettazione.

### 6. Documentare qui

Aggiungi una nuova sottosezione nel [catalog](#catalog-dei-5-status) di questo documento con: semantica, trigger, effetto, costanti, test ref.

### 7. Verifica end-to-end

```bash
# Schema validation
node --test tests/api/contracts-combat.test.js

# Unit test resolver
PYTHONPATH=services/rules pytest tests/test_resolver.py -k poisoned

# Governance strict (i doc modificati non devono rompere nulla)
python tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict
```

## Antipatterns da evitare

- **Hardcodare intensity o duration nel resolver**: usa sempre le costanti (es. `RAGE_DEFAULT_INTENSITY`). Rende il balancing testabile senza toccare la logica.
- **Duplicare status con lo stesso id**: sempre passare da `apply_status` che fa refresh. Non fare `unit["statuses"].append(...)` a mano.
- **Leggere `remaining_turns <= 0` come "status attivo"**: lo schema richiede `remaining_turns >= 0`, ma un valore 0 è ambiguo tra "scaduto" e "perenne". La convenzione: status con `remaining_turns > 0` sono attivi, e `begin_turn` li rimuove quando raggiungono 0. Un "status perenne" dovrebbe avere `remaining_turns: 999` o una costante `STATUS_PERENNE`.
- **Modificare `source_unit_id` dopo l'applicazione**: è parte dell'audit trail, non un campo di lavoro. Se serve cambiarlo, chiama `apply_status` con i nuovi valori (che sovrascrive anche gli altri campi via refresh).

## Riferimenti

- Schema: `$defs.status_effect` in `packages/contracts/schemas/combat.schema.json`
- Implementazione status: `services/rules/resolver.py` (cerca `apply_status`, `get_status`, `check_stress_breakpoints`, e le costanti `*_PER_INTENSITY`)
- Test di riferimento: `tests/test_resolver.py` (44+ test su status e scenari misti)
- Flow di stress e breakpoint: [data-flow.md](data-flow.md#4-stacking-degli-status-effect)
- API dettagliata di `apply_status` / `check_stress_breakpoints`: [resolver-api.md](resolver-api.md#apply_status)
