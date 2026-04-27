---
doc_status: active
doc_owner: claude-code
workstream: combat
last_verified: 2026-04-27
source_of_truth: false
language: it
review_cycle_days: 30
---

# Status Effects Phase A — Audit Pipeline (2026-05-09)

> Audit pre-implementation per STEP 3 Phase A: 5 stati Tier 1
> (slowed, marked, burning, chilled, disoriented).

## 1. Baseline test

- AI tests: **311/311** ✅ (post `npm ci`)
- Traits in active_effects.yaml: **449**
- Stati apply_status esistenti: rage(13), bleeding(13), stunned(17), panic(8),
  fracture(9), focused(58), healing(24), fed(21), linked(20), telepatic_link(1),
  sensed(1), attuned(1)
- Stati Tier 1 target NON ancora in codebase: slowed, marked, burning,
  chilled, disoriented ✅ confermato via grep

## 2. Pipeline status corrente

```
Trait YAML → loadActiveTraitRegistry() → traitRegistry dict
    ↓
performAttack(session, actor, target, action)
    ↓
[pre-resolveAttack] apply temp modifiers (biome, time, statusMods)
    ↓
resolveAttack({ actor, target }) → { die, roll, mos, hit, dc, pt }
    ↓
[post-resolveAttack] revert temp modifiers
    ↓
[if hit] damage = 1 + pt + damageModifier + adjacencyBonus + rageBonus
         + backstabBonus + perkBonus + parryDelta
    ↓
evaluateStatusTraits() → status_applies[]
    ↓
mutate unit.status[stato] = max(current, turns) capped by STATUS_DURATION_CAPS
    ↓
return { damageDealt, status_applies, ... }
```

### End-of-round tick (3 path esistenti)

1. `advanceThroughAiTurns` in `session.js:1042` — `applyBleeding(unit)` inline
2. `applyEndOfRoundSideEffects` in `sessionRoundBridge.js:597` — bleeding loop
3. Priority-queue path in `session.js:2144` — bleeding inline minimal

### AP reset

`applyApRefill(unit)` in `sessionHelpers.js:615`:

- `fracture` → cap = min(1, ap)
- `defy_penalty` → cap = max(0, ap - 1)
- Base: `unit.ap_remaining = cap`

### Attack modifier pattern (pre/revert)

```javascript
// Apply
actor.attack_mod_bonus += delta;
// resolveAttack reads actor.attack_mod_bonus
const result = resolveAttack({ actor, target });
// Revert
actor.attack_mod_bonus -= delta;
```

Pattern usato da: biomeAffActor, timeMods, statusMods (enrage), defenderAdv.

### STATUS_DURATION_CAPS (session.js:88)

```javascript
{ rage: 5, frenzy: 5, panic: 4, stunned: 3, confused: 3, bleeding: 5 }
```

## 3. Punti di hook per i 5 stati Tier 1

| Stato       | File(s)                                            | Hook point                                    |
| ----------- | -------------------------------------------------- | --------------------------------------------- |
| slowed      | sessionHelpers.js:615 applyApRefill                | cap = max(1, cap - 1) se slowed > 0           |
| marked      | session.js damage block ~528                       | +1 bonus se target.status.marked > 0, consuma |
| burning     | sessionRoundBridge.js:647 + session.js:1042 + 2144 | DoT tick 2 PT/turno (≥bleeding)               |
| chilled     | sessionHelpers.js:615 + session.js performAttack   | -1 AP + -1 attack_mod_bonus (pre/revert)      |
| disoriented | session.js performAttack                           | -2 attack_mod_bonus (pre/revert), turns: 1    |

## 4. Dipendenze sequenziali

- PR-4 (chilled) introduce `applyStatusAttackPenalties` helper
- PR-5 (disoriented) estende lo stesso helper → dipende da PR-4
- PR-1, PR-2, PR-3 sono indipendenti tra loro e da PR-4/PR-5

## 5. Rischi identificati

| Rischio                                      | Probabilità | Mitigazione                                           |
| -------------------------------------------- | ----------- | ----------------------------------------------------- |
| double-apply chilled+disoriented             | bassa       | helper condiviso, revert simmetrico                   |
| burning DoT in 3 path                        | media       | helper `applyBurningTick` exportato da sessionHelpers |
| marked cancellato da status decay            | nulla       | consumed on hit (set=0), non decays naturalmente      |
| STATUS_DURATION_CAPS mancante → cap infinito | alta        | aggiungere in ogni PR                                 |
| AI test regression da attack_mod_bonus       | media       | revert obbligatorio post-resolveAttack                |
