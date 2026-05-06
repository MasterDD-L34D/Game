---
title: Resolver API Reference
description: API reference del modulo services/rules/resolver.py con signature, semantica e constanti esportate.
doc_status: active
doc_owner: combat-team
workstream: combat
last_verified: 2026-05-06
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Resolver API Reference

API reference del modulo `services/rules/resolver.py`. Il resolver è **puro**: nessun I/O, nessuno stato globale, nessun randomness interno (l'RNG è passato come argomento). Ogni funzione che "muta" lo stato in realtà produce una deep copy.

Per il flusso end-to-end vedere [data-flow.md](data-flow.md). Per la shape dei payload (CombatState, action, turn_log, status_effect, roll_result) vedere `packages/contracts/schemas/combat.schema.json`.

## Entry points principali

### `resolve_action(state, action, catalog, rng) → {next_state, turn_log_entry}`

Risolve una singola azione e restituisce il prossimo stato + entry del turn log. Non muta gli argomenti.

- **state**: `CombatState` conforme a `combat.schema.json`.
- **action**: dict con `id`, `type`, `actor_id`, `ap_cost` (e opzionali `target_id`, `damage_dice`, `pt_spend`, `parry_response`, `channel`, `ability_id`).
- **catalog**: mapping `{trait_id: mechanics_entry}` — tipicamente ottenuto da `hydration.load_trait_mechanics()`.
- **rng**: `RandomFloatGenerator` (da `game_utils.random_utils.namespaced_rng`).

Pipeline per `action.type == "attack"`:

1. Deep copy dello state.
2. Consumo AP dell'attore (`_consume_ap`).
3. Applicazione `pt_spend` se presente e se l'attore non ha `panic` (altrimenti silent-drop).
4. Aggregazione `attack_mod` (attore) + `defense_mod` (target) dal catalog sui rispettivi `trait_ids`.
5. Applicazione malus/bonus da status: disorient, rage (su attore), panic, rage (su target difesa), sbilanciato (su target difesa).
6. Tiro d20 attack: `natural + attack_mod` vs `CD = 10 + target.tier + defense_mod_target`.
7. Se nat 1 → fumble auto-miss. Se nat 20 → auto-hit.
8. Se hit: calcolo MoS, `step_count = compute_step_count(mos, trait_damage_step_bonus)`.
9. Tiro `damage_dice` + `step_bonus = compute_step_flat_bonus(count, sides, modifier, step_count)`.
10. `apply_resistance` (canale) → `apply_armor` → clamp a 0.
11. Applicazione `perforazione` (armor -2 effective) o `spinta` (status `sbilanciato` al target).
12. Decremento HP del target (clamp a 0).
13. Check breakpoints stress (rage/panic auto-apply se stress_before/after attraversa soglie).
14. Se `parry_response.attempt` e hit → `resolve_parry` del target, applica `step_reduced` e somma `pt_defensive_gained`.
15. Calcolo `pt_gained` attaccante (`compute_pt_gained`).
16. Produzione `turn_log_entry` con `action`, `roll`, `damage_applied`, `statuses_applied`, `statuses_expired`.

Per `action.type == "heal"`: pipeline dedicata. Richiede `target_id`, rolla `heal_dice` (shape `{count, sides, modifier}`), applica `healing = min(roll, hp_max - hp_current)` clampato a 0, aggiorna `target.hp.current`, registra `turn_log_entry.healing_applied`. Nessun d20, nessun MoS, nessun canale di resistenza. Panic NON blocca heal base. Self-heal consentito (`target_id == actor_id`). Consuma AP come le altre azioni.

Per `action.type` in `{defend, parry, ability, move}` (`NOOP_ACTION_TYPES`): consumo AP + turn_log_entry senza `roll`. La logica reale di queste azioni è deferita a iterazioni future (tranne `parry` che è implementata come **parry response** opt-in in attack).

**Raises**: `ValueError` se `action.target_id` manca su un attack, se `pt_spend.type` non è in `SUPPORTED_PT_SPEND_TYPES`, se `amount` non è positivo, se PT insufficienti.

**Test ref**: 40+ test in `tests/test_resolver.py` (fumble, crit, miss, hit con resistenze, armor, pt_spend, parry, stress breakpoints).

### `begin_turn(state, unit_id) → {next_state, expired, bleeding_damage}`

Inizio turno di una unità: reset AP + reactions, decay status, tick bleeding.

- **next_state**: deep copy con AP e reactions refreshati al `max`, `remaining_turns` decrementato di 1 su ogni status, status con `remaining_turns <= 0` rimossi, HP ridotto di `intensity` per ogni `bleeding` attivo (clamp ≥ 0).
- **expired**: lista di `{unit_id, status_id}` per gli status decaduti questo turno. Il caller può inserirli nel turn_log.
- **bleeding_damage**: int totale di HP perso per bleeding in questo tick.

**Test ref**: `tests/test_resolver.py::test_begin_turn_*`.

### `resolve_parry(target, rng, parry_bonus=0, attack_total=None) → parry_result`

Tiro reattivo di parata contestata per il target.

- **parry_dc**: `attack_total` se fornito (parry contestata vera), altrimenti fallback a `PARRY_CD = 12` (retrocompat).
- **natural**: d20.
- **success**: `natural == 20 OR natural + parry_bonus >= parry_dc`.
- Se success: `step_reduced = 1`, `pt_defensive_gained = 2` (nat 20) o `1` altrimenti.

Restituisce dict con shape `$defs.parry_result` dello schema combat. **Non muta il target**. Il caller applica `step_reduced` al damage rollato e somma `pt_defensive_gained` al pool PT del target.

**Test ref**: `tests/test_resolver.py::test_resolve_parry_*`.

### `apply_pt_spend(actor, pt_spend) → amount_consumed`

Consuma PT dal pool dell'attore per una spesa dichiarata.

- **actor**: dict dell'attore (mutato in-place, ma sempre su deep copy).
- **pt_spend**: dict `{type, amount}`. Tipi supportati: `"perforazione"`, `"spinta"`.

**Raises**: `ValueError` se `type` non supportato, se `amount <= 0`, se `actor.pt < amount`.

La spesa avviene **prima** del roll, quindi un raise blocca l'intera `resolve_action` senza side effect sullo stato.

**Nota**: il caller (`resolve_action`) verifica `panic` sull'attore prima di chiamare `apply_pt_spend`; se l'attore è in panic, la spesa viene silent-droppata (non sollevata).

### `apply_status(unit, status_id, duration, intensity, source_unit_id, source_action_id) → status_effect`

Applica o refresha uno status effect su una unità (in-place).

Semantica refresh: se lo status esiste già, `remaining_turns = max(old, duration)` e `intensity = max(old, intensity)`. Questo garantisce che un secondo proc di rage non "indebolisca" un rage esistente.

Restituisce il dict dello status effect applicato (shape `$defs.status_effect`), utile per inserirlo in `turn_log.statuses_applied`.

**Test ref**: `tests/test_resolver.py::test_apply_status_*`.

### `check_stress_breakpoints(target, stress_before, stress_after, source_unit_id, source_action_id) → applied_statuses`

Applica rage/panic se lo stress del target ha attraversato i breakpoint durante l'azione.

Breakpoint:

- `STRESS_BREAKPOINT_RAGE = 0.5` → applica `rage` con `RAGE_DEFAULT_INTENSITY=1`, `RAGE_DEFAULT_DURATION=3`.
- `STRESS_BREAKPOINT_PANIC = 0.75` → applica `panic` con `PANIC_DEFAULT_INTENSITY=1`, `PANIC_DEFAULT_DURATION=2`.

Ogni breakpoint si attiva **una sola volta** per transizione `stress_before < breakpoint <= stress_after`. Se il target aveva già lo status, `apply_status` esegue il refresh invece di aggiungere una seconda copia.

Restituisce la lista degli status applicati (stessa shape di `turn_log.statuses_applied`).

**Test ref**: `tests/test_resolver.py::test_check_stress_breakpoints_*`.

### `get_status(unit, status_id) → status_effect | None`

Helper lookup: restituisce il dict dello status se presente sull'unità, `None` altrimenti.

## Helper di formule

### `aggregate_mod(trait_ids, catalog, field) → int`

Somma un campo intero (`attack_mod` / `defense_mod` / `damage_step`) sui trait attivi. Trait sconosciuti al catalog vengono ignorati silentemente.

### `compute_pt_gained(natural, mos) → int`

Formula del doc `10-SISTEMA_TATTICO`:

- `natural == 20` → +2 PT
- `natural 15..19` → +1 PT
- `+1 PT ogni +5 di MoS` (floor division)

### `compute_step_count(mos, trait_damage_step_bonus) → int`

Step danno totali dell'attacco:

```
step_count = max(0, mos // MOS_PER_STEP) + max(0, trait_damage_step_bonus)
```

Dove `MOS_PER_STEP = 5`. Il bonus trait è un "extra step già maturato" sommato a quelli derivati dal MoS.

### `compute_step_flat_bonus(count, sides, modifier, step_count) → int`

Bonus flat da `step_count` step, calcolato sul danno medio del `damage_dice`:

```
avg_base = count * (sides + 1) / 2 + modifier
bonus = floor(avg_base * 0.25 * step_count)
```

**Deterministico, indipendente dal tiro**: somma una quantità fissa al danno rollato per mantenere la varianza del dado preservando la scala con `step_count`. Se `step_count <= 0`, il bonus è 0.

### `apply_resistance(damage, resistances, channel) → int`

Resistenza moltiplicativa con floor:

```
factor = (100 - modifier_pct) / 100
result = floor(damage * factor)
```

Se il canale non matcha nessuna resistenza del target, il danno passa invariato. Un `modifier_pct` negativo amplifica il danno (vulnerabilità). `modifier_pct` è clampato a `[-100, 100]`.

### `apply_armor(damage, armor) → int`

Armor DR-style: `max(0, damage - max(0, armor))`. Applicata **dopo** la resistenza.

### `roll_damage_dice(dice, rng) → int`

Rolla `count` dadi a `sides` facce + `modifier`. `dice` è il dict `{count, sides, modifier}` del contratto `action.damage_dice`.

## Costanti esportate

| Nome                                    | Valore                                           | Significato                                                                                   |
| --------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `ATTACK_CD_BASE`                        | 10                                               | Base d20 prima di `tier` e `defense_mod`                                                      |
| `CRIT_PT_THRESHOLD`                     | 15                                               | Nat ≥ 15 → +1 PT                                                                              |
| `NATURAL_MAX`                           | 20                                               | Nat 20 → +2 PT, auto-hit, crit parry                                                          |
| `NATURAL_FUMBLE`                        | 1                                                | Nat 1 → auto-miss                                                                             |
| `MOS_PER_STEP`                          | 5                                                | Ogni +5 MoS = +1 step danno                                                                   |
| `NOOP_ACTION_TYPES`                     | `frozenset({"defend","parry","ability","move"})` | Action che consumano AP ma non hanno logica di risoluzione in questa iterazione               |
| `PARRY_CD`                              | 12                                               | Fallback CD per parry quando `attack_total` non fornito                                       |
| `PARRY_PT_BASE`                         | 1                                                | PT difensivi su parry riuscita normale                                                        |
| `PARRY_PT_CRIT`                         | 2                                                | PT difensivi su parry riuscita con nat 20                                                     |
| `SUPPORTED_PT_SPEND_TYPES`              | `frozenset({"perforazione","spinta"})`           | Tipologie di spesa PT supportate (le altre 2 citate nel doc 10-SISTEMA_TATTICO sono deferred) |
| `PERFORAZIONE_ARMOR_REDUCTION`          | 2                                                | Armor -2 applicata da perforazione sul target                                                 |
| `STRESS_BREAKPOINT_RAGE`                | 0.5                                              | Soglia stress per auto-applicare rage                                                         |
| `STRESS_BREAKPOINT_PANIC`               | 0.75                                             | Soglia stress per auto-applicare panic                                                        |
| `RAGE_DEFAULT_INTENSITY`                | 1                                                | Intensity di default rage da breakpoint                                                       |
| `RAGE_DEFAULT_DURATION`                 | 3                                                | Turni di default rage da breakpoint                                                           |
| `PANIC_DEFAULT_INTENSITY`               | 1                                                | Intensity di default panic da breakpoint                                                      |
| `PANIC_DEFAULT_DURATION`                | 2                                                | Turni di default panic da breakpoint                                                          |
| `DISORIENT_ATTACK_MALUS_PER_INTENSITY`  | 2                                                | Malus attack_mod per intensity di disorient                                                   |
| `FRACTURE_STEP_REDUCTION_PER_INTENSITY` | 1                                                | Riduzione step_count per intensity di fracture                                                |
| `RAGE_ATTACK_BONUS_PER_INTENSITY`       | 1                                                | Bonus attack_mod per intensity di rage                                                        |
| `RAGE_DAMAGE_STEP_BONUS_PER_INTENSITY`  | 1                                                | Bonus damage_step per intensity di rage                                                       |
| `RAGE_DEFENSE_MALUS_PER_INTENSITY`      | 1                                                | Malus defense_mod per intensity di rage (furia cieca)                                         |
| `PANIC_ATTACK_MALUS_PER_INTENSITY`      | 2                                                | Malus attack_mod per intensity di panic                                                       |

## Contract di purezza

Il modulo `resolver.py` garantisce:

- **Nessun I/O**: no file read/write, no network, no print, no logging.
- **Nessuno stato globale**: nessuna variabile mutabile modulo-level (solo costanti immutabili).
- **Deep copy semantica**: `resolve_action` e `begin_turn` clonano lo state in input e restituiscono una nuova copia. Lo state originale non viene mai mutato.
- **RNG iniettato**: nessun `random.random()` interno. Il caller passa un `RandomFloatGenerator` (tipicamente da `namespaced_rng(seed, namespace)`).

Questo rende il resolver **deterministico** dato un `(state, action, catalog, rng)` e ne semplifica test e reproducibilità. Vedi [determinism.md](determinism.md) per i dettagli sul namespacing RNG.

## Riferimenti

- Schema CombatState, action, turn_log, status_effect, roll_result: `packages/contracts/schemas/combat.schema.json`
- Catalog trait mechanics: `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` (vedi [trait-mechanics-guide.md](trait-mechanics-guide.md))
- Namespaced RNG helper: `tools/py/game_utils/random_utils.py` (`namespaced_rng`, `roll_die`, `RandomFloatGenerator`)
- Worker bridge Node ↔ Python: `services/rules/worker.py` (vedi [worker-bridge.md](worker-bridge.md))
- ADR di riferimento: [ADR-2026-04-13: Rules Engine d20](../adr/ADR-2026-04-13-rules-engine-d20.md)
