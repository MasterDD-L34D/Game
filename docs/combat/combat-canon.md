---
title: Combat Canon Spec
description: Specifica canonica unificata del sistema di combattimento d20. Indice autoritativo di formule, timing, action types, status e side-effects.
tags: [combat, rules-engine, d20, canon]
doc_status: active
doc_owner: combat-team
workstream: combat
last_verified: 2026-04-17
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Combat Canon Spec

Documento unico di riferimento per il sistema di combattimento d20 di Evo-Tactics. Unisce e indirizza le specifiche distribuite in round-loop.md e resolver-api.md, dichiarando esplicitamente scope shipping, timing, side-effects e non-scope.

## 1. Action types shipping

| Action type | Risoluzione                                                | Implementazione                            | Note                                                           |
| ----------- | ---------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| `attack`    | d20 + mod vs CD, MoS, damage step, resist, armor           | `resolver.py` STEP 1-4                     | Pipeline completa con parry, PT, on_hit_status, active_effects |
| `heal`      | Auto-success, roll heal_dice, clamp hp_max                 | `resolver.py` heal branch                  | Panic NON blocca heal base                                     |
| `ability`   | Auto-success, effect garantito (damage/heal/status/buff)   | `resolver.py` ability branch (Fase 3b)     | Lookup ability_id in trait active_effects[]                    |
| `defend`    | NOOP (AP consumed)                                         | `resolver.py` NOOP                         | Logica difensiva deferred                                      |
| `parry`     | NOOP (AP consumed); parry reattiva via reaction intent     | `resolver.py` NOOP + orchestrator reaction | Parry contestata d20 iniettata dall'orchestrator               |
| `move`      | NOOP (AP consumed); posizione gestita da session engine JS | `resolver.py` NOOP                         | Python resolver position-agnostic                              |

## 2. Status effects shipping

| Status        | Effetto meccanico                                           | Durata  | Implementazione             |
| ------------- | ----------------------------------------------------------- | ------- | --------------------------- |
| `bleeding`    | -1 HP/turno (tick in begin_turn, non riducibile)            | N turni | `resolver.py` begin_turn    |
| `fracture`    | AP reset a 1 (invece di max) a inizio turno                 | N turni | Session engine JS           |
| `disorient`   | -2 attack_mod per intensity                                 | N turni | `resolver.py` aggregate_mod |
| `rage`        | +1 attack_mod, +1 damage_step, -1 defense_mod per intensity | N turni | `resolver.py` aggregate_mod |
| `panic`       | -2 attack_mod per intensity, blocca PT spend                | N turni | `resolver.py` + policy.js   |
| `stunned`     | Skip turno (gestito da AI policy, non dal resolver)         | N turni | `policy.js` STATO_STUNNED   |
| `focused`     | Nessun effetto meccanico diretto (placeholder)              | N turni | —                           |
| `sbilanciato` | Nessun effetto meccanico diretto (da spinta PT)             | 1 turno | `resolver.py` apply_status  |

**Dichiarazione shipping**: i primi 6 status (bleeding→stunned) sono **shipping**. `focused` e `sbilanciato` sono **placeholder** con effetti deferred.

## 3. Buff system (Fase 3b)

Buff temporanei via `unit.buffs[]`: `{stat, amount, remaining_turns, source_ability}`.

Stat supportate: `attack_mod`, `defense_mod`, `damage_step`. Decay in `begin_turn`. Sommati in attack pipeline dopo `aggregate_mod`.

## 4. Timing: ordine di risoluzione

Riferimento completo: [round-loop.md §3](round-loop.md).

```
begin_round
  per ogni unit (ordine alfabetico):
    refresh AP a max
    refresh reactions a max
    bleeding tick (HP -= intensity)
    status decay (remaining_turns -= 1, remove se 0)
    buff decay (remaining_turns -= 1, remove se 0)
    reaction cooldown decrement
  → round_phase = 'planning'

planning phase
  declare_intent / declare_reaction (preview-only, no AP/HP mutato)
  timer opzionale: planning_deadline_ms + is_planning_expired()

commit_round → round_phase = 'committed'

resolve_round (priority desc, unitId asc)
  per ogni intent nella queue:
    skip se actor_dead / target_dead
    reaction injection pre-hit (attacked → parry)
    resolve_action (attack/heal/ability/move/defend)
    reaction injection post-hit (damaged → trigger_status/counter)
    reaction injection post-move (moved_adjacent → trigger_status/overwatch)
    reaction injection post-ability (ability_used → trigger_status)
    reaction injection post-heal (healed → trigger_status)
  → round_phase = 'resolved'
```

## 5. Formule chiave

Riferimento completo: [resolver-api.md](resolver-api.md).

- **Attack roll**: `total = d20 + attack_mod + buff_attack_mod`
- **CD**: `ATTACK_CD_BASE(10) + target.tier + defense_mod + buff_defense_mod`
- **MoS**: `total - CD` (≥0 = hit)
- **Damage step**: `floor(MoS / MOS_PER_STEP) + trait_damage_step + buff_damage_step + rage_bonus`
- **Damage**: `roll_damage_dice(dice) + step_bonus → apply_resistance(channel) → apply_armor → clamp ≥0`
- **PT gained**: `+1 se nat 15-19, +2 se nat 20, +floor(MoS/5)`
- **Resolve priority**: `unit.initiative + action_speed(type) - status_penalty(panic*2 + disorient*1)`

## 6. Non-scope (deferred esplicitamente)

- Grid/position tracking nel Python resolver (solo JS)
- Multi-target abilities (AoE)
- PP / SG resource systems
- Ability cooldown (distinct from reaction cooldown)
- Status stacking rules (oggi: max duration wins)
- Combo / chain actions
- Environmental effects

## 7. Documenti collegati

- [round-loop.md](round-loop.md) — round lifecycle completo, reaction system, predicates DSL
- [resolver-api.md](resolver-api.md) — API reference del resolver atomico
- [combat hub](../hubs/combat.md) — ingresso canonico al workstream combat
- [ADR-2026-04-15](../adr/ADR-2026-04-15-round-based-combat-model.md) — decisione architetturale round model
- [ADR-2026-04-16](../adr/ADR-2026-04-16-session-engine-round-migration.md) — migrazione Node session engine
