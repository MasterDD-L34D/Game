---
title: Combat Canon Spec
description: Specifica canonica unificata del sistema di combattimento d20. Indice autoritativo di formule, timing, action types, status e side-effects.
tags: [combat, rules-engine, d20, canon]
doc_status: active
doc_owner: combat-team
workstream: combat
last_verified: 2026-05-06
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

## 3b. PP (Power Points) — Combo Meter

PP e' un combo meter individuale che si carica con azioni di successo durante il combattimento.

### Regole PP

- Inizializzazione: `unit.pp = 0` a inizio combattimento
- Accumulo:
  - **+1 PP** per hit riuscito (attack roll >= CD)
  - **+2 PP** per kill (bersaglio portato a 0 HP)
  - **+1 PP** per assist (damage inflitto a un bersaglio ucciso entro 2 turni)
- PP persiste tra round nello stesso combattimento
- PP **NON** persiste tra combattimenti separati

### Soglie PP — Ability potenziate

| Soglia   | Tier | Effetto                                              |
| -------- | ---- | ---------------------------------------------------- |
| PP >= 3  | 1    | Ability base potenziata (empowered version, low)     |
| PP >= 6  | 2    | Ability forte potenziata (empowered version, strong) |
| PP >= 10 | 3    | Ultimate — consuma tutti i PP, reset a 0             |

Tier 1 e 2 non consumano PP (rimangono disponibili finche' PP >= soglia). Tier 3 consuma tutti i PP e resetta `unit.pp = 0`.

### Implementazione

- Campo: `unit.pp` (integer, >= 0)
- Incremento: in `resolve_action`, dopo conferma hit/kill/assist
- Check: in ability branch, `if unit.pp >= threshold` sblocca il tier corrispondente
- Assist tracking: mantenere `unit.recent_damage_dealt[target_id]` con timestamp turno; se target muore entro 2 turni e l'attaccante non e' il killer, +1 PP assist

> **Cap**: PP non ha cap di pool (serve accumulo a 10+ per Ultimate). Il gain per azione e' naturalmente limitato a 3 (1 hit + 2 kill).

## 3c. SG (Surge Gauge) — Stress-Linked Burst

SG e' un meter individuale derivato dallo stress della unit. Collega il sistema di stress/temperamento al combat, creando un trade-off tra potenza burst e rischio panic.

### Regole SG

- Derivazione: `unit.sg = Math.floor(unit.stress * 100)` — integer 0-100, mirror di stress float 0.0-1.0
- SG non si accumula indipendentemente: segue lo stress 1:1
- Quando `SG >= 75` (stress >= 0.75): la unit puo' attivare **Surge Burst**

### Surge Burst — Scelta al momento dell'attivazione

| Variante        | ability_id              | Effetto                                                   |
| --------------- | ----------------------- | --------------------------------------------------------- |
| Offensive burst | `surge_burst_offensive` | Prossimo attacco infligge **doppio danno** (1 uso)        |
| Defensive burst | `surge_burst_defensive` | Ignora la **prossima istanza di danno** subita (1 uso)    |
| Recovery burst  | `surge_burst_recovery`  | Heal **50% degli HP mancanti** + rimuove 1 status (1 uso) |

Dopo l'attivazione di qualsiasi variante: `unit.stress = 0.25`, `unit.sg = 25`.

### Trade-off design

Il trade-off fondamentale: stress alto = SG alto = burst potente, **ma** stress >= 0.75 attiva anche la soglia panic in `policy.js`. La unit rischia di entrare in panic (retreat forzato dall'AI policy) **prima** che il giocatore riesca ad attivare il Surge Burst.

Sequenza decisionale:

1. Stress sale → SG sale → si avvicina alla soglia 75
2. A SG 75+: il giocatore **deve scegliere** se usare Surge Burst immediatamente
3. Se non usa burst: l'AI policy puo' triggerare panic → la unit scappa invece di combattere
4. Se usa burst: potenza enorme ma stress resetta a 0.25 → deve riaccumulare

Questo crea tensione strategica: accumulare stress per burst piu' potenti vs rischio di perdere il controllo della unit.

### Implementazione

- Campo: `unit.sg` (derived, integer 0-100, = `Math.floor(stress * 100)`)
- Non serve storage separato: SG e' calcolato on-the-fly da stress
- Surge Burst: action type `ability` con `ability_id: "surge_burst_offensive|defensive|recovery"`
- Prerequisito: `unit.sg >= 75` check in ability branch
- Post-burst: `unit.stress = 0.25` (reset, NON a 0 — la unit resta leggermente stressata)
- Interazione panic: il check panic in `policy.js` ha priority sul burst — se panic triggera prima dell'azione del giocatore, la unit scappa

> **Cap damage step**: Surge Burst offensive imposta `damage_step: 99` come buff, ma il resolver clampa a `DAMAGE_STEP_CAP` (6) dopo tutti i modificatori. Il burst garantisce comunque step massimi indipendentemente dal MoS del roll.

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
