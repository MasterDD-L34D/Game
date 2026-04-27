---
doc_status: active
doc_owner: claude-code
workstream: combat
last_verified: 2026-04-27
source_of_truth: false
language: it
review_cycle_days: 30
---

# Status Effects Phase A — Design Call (2026-05-09)

> Design spec per i 5 mini-PR sequenziali. Reference: roadmap §3 Tier 1.
> Ogni sezione = 1 PR autonomo.

## PR-1: `slowed` (Obstruction)

**Effetto**: -1 AP cap al reset turno (min 1). Rallenta movimento.

**Hook point**: `sessionHelpers.js:615` `applyApRefill`

```javascript
// dopo fracture + defy_penalty
if (Number(unit.status?.slowed) > 0) cap = Math.max(1, cap - 1);
```

**STATUS_DURATION_CAPS**: `slowed: 3`

**Trait esempio**: `tela_appiccicosa`

- tier: T1 / categoria: fisiologico / applies_to: actor
- trigger: action_type: attack, on_result: hit, melee_only: true
- effect: kind: apply_status, stato: slowed, turns: 2, target_side: target

**LOC**: ~6 sessionHelpers + ~1 STATUS_DURATION_CAPS + ~20 YAML + ~8 test

**Test plan** (2 test):

1. `applyApRefill` con slowed:2 → ap_remaining = ap - 1
2. `applyApRefill` con slowed:0 → nessun effetto (no regression)

**Anti-pattern**: slowed min 1 (non può azzerare AP completamente)

---

## PR-2: `marked` (Shaping)

**Effetto**: prossimo hit sul target dà +1 dmg all'attaccante, mark consumato.

**Hook point**: `session.js` damage block (dopo adjacencyBonus, prima di adjusted)

```javascript
let markedBonus = 0;
if (result.hit) {
  markedBonus = computeMarkedBonus(target); // set target.status.marked = 0
}
// adjusted += markedBonus
```

**Helper**: `computeMarkedBonus(target)` in sessionHelpers.js

```javascript
function computeMarkedBonus(target) {
  if (!target?.status || !(Number(target.status.marked) > 0)) return 0;
  target.status.marked = 0;
  return 1;
}
```

**STATUS_DURATION_CAPS**: `marked: 2`

**Trait esempio**: `marchio_predatorio`

- tier: T1 / categoria: comportamentale / applies_to: actor
- trigger: action_type: attack, on_result: hit
- effect: kind: apply_status, stato: marked, turns: 2, target_side: target

**LOC**: ~8 sessionHelpers + ~5 session.js + ~1 cap + ~20 YAML + ~10 test

**Test plan** (2 test):

1. target con marked:2 → computeMarkedBonus ritorna 1, marked azzerato
2. target senza marked → computeMarkedBonus ritorna 0

**Note**: mark consumato su hit (non su miss). Decay naturale del turns-countdown
come safety net (evita mark permanente su target mai colpito).

---

## PR-3: `burning` (Drain)

**Effetto**: 2 PT danno non riducibile a fine turno (vs bleeding=1 PT).

**Helper**: `applyBurningTick(unit)` in sessionHelpers.js

```javascript
function applyBurningTick(unit) {
  if (!unit?.status) return null;
  const burnTurns = Number(unit.status.burning) || 0;
  if (burnTurns <= 0) return null;
  unit.hp = Math.max(0, unit.hp - 2);
  return { damage: 2, killed: unit.hp === 0 };
}
```

**Hook points** (tutti e 3):

1. `session.js:1042` `advanceThroughAiTurns` → dopo applyBleeding
2. `sessionRoundBridge.js:647` `applyEndOfRoundSideEffects` → dopo bleeding loop
3. `session.js:2144` priority-queue path → dopo bleeding inline

**STATUS_DURATION_CAPS**: `burning: 3`

**Trait esempio**: `respiro_acido`

- tier: T1 / categoria: fisiologico / applies_to: actor
- trigger: action_type: attack, on_result: hit, min_mos: 5
- effect: kind: apply_status, stato: burning, turns: 2, target_side: target

**LOC**: ~10 sessionHelpers + ~20 session.js + ~15 sessionRoundBridge + ~1 cap + ~20 YAML + ~10 test

**Test plan** (2 test):

1. `applyBurningTick` con burning:2, hp:5 → hp=3, damage=2, killed=false
2. `applyBurningTick` con burning:0 → null (no tick)

---

## PR-4: `chilled` (Obstruction soft)

**Effetti combinati**:

- -1 AP cap al reset (stessa logica slowed, additiva)
- -1 attack_mod_bonus per attacco (pre/revert pattern)

**Helper**: `applyStatusAttackPenalties(actor)` / `revertStatusAttackPenalties(actor, delta)` in sessionHelpers.js

```javascript
function applyStatusAttackPenalties(actor) {
  let delta = 0;
  if (Number(actor.status?.chilled) > 0) delta -= 1;
  actor.attack_mod_bonus = (actor.attack_mod_bonus || 0) + delta;
  return delta;
}
function revertStatusAttackPenalties(actor, delta) {
  if (delta === 0) return;
  actor.attack_mod_bonus = (actor.attack_mod_bonus || 0) - delta;
}
```

**AP hook**: `sessionHelpers.js:615` applyApRefill (dopo slowed check)

```javascript
if (Number(unit.status?.chilled) > 0) cap = Math.max(1, cap - 1);
```

**session.js**: prima di resolveAttack:

```javascript
const attackPenaltyDelta = applyStatusAttackPenalties(actor);
const result = resolveAttack({ actor, target, rng });
revertStatusAttackPenalties(actor, attackPenaltyDelta);
```

**STATUS_DURATION_CAPS**: `chilled: 3`

**Trait esempio**: `aura_glaciale`

- tier: T1 / categoria: fisiologico / applies_to: actor
- trigger: action_type: attack, on_result: hit, min_mos: 3
- effect: kind: apply_status, stato: chilled, turns: 2, target_side: target

**LOC**: ~15 sessionHelpers + ~8 session.js + ~1 cap + ~20 YAML + ~12 test

**Test plan** (3 test):

1. `applyApRefill` con chilled:1 → ap_remaining = ap - 1
2. `applyStatusAttackPenalties` con chilled:2 → delta = -1, actor.attack_mod_bonus -= 1
3. chilled+slowed stack: `applyApRefill` → max(1, ap - 2) = min 1

---

## PR-5: `disoriented` (Shaping)

**Effetto**: -2 attack_mod_bonus per il prossimo attacco (turns: 1 → auto-expire).

**Hook**: estende `applyStatusAttackPenalties` in sessionHelpers.js

```javascript
function applyStatusAttackPenalties(actor) {
  let delta = 0;
  if (Number(actor.status?.chilled) > 0) delta -= 1;
  if (Number(actor.status?.disoriented) > 0) delta -= 2; // aggiunto PR-5
  actor.attack_mod_bonus = (actor.attack_mod_bonus || 0) + delta;
  return delta;
}
```

**STATUS_DURATION_CAPS**: `disoriented: 1`

**Trait esempio**: `sussurro_psichico`

- tier: T1 / categoria: comportamentale / applies_to: actor
- trigger: action_type: attack, on_result: hit, min_mos: 5
- effect: kind: apply_status, stato: disoriented, turns: 1, target_side: target

**LOC**: ~3 sessionHelpers + ~1 cap + ~20 YAML + ~8 test

**Test plan** (2 test):

1. `applyStatusAttackPenalties` con disoriented:1 → delta = -2
2. chilled+disoriented stack → delta = -3 cumulativo

---

## Totale Phase A

| PR  | Stato       | LOC backend | LOC YAML | LOC test | File modificati                             |
| --- | ----------- | ----------- | -------- | -------- | ------------------------------------------- |
| 1   | slowed      | ~7          | ~22      | ~15      | sessionHelpers, session, YAML, test         |
| 2   | marked      | ~13         | ~22      | ~20      | sessionHelpers, session, YAML, test         |
| 3   | burning     | ~10         | ~22      | ~15      | sessionHelpers, session, bridge, YAML, test |
| 4   | chilled     | ~23         | ~22      | ~20      | sessionHelpers, session, YAML, test         |
| 5   | disoriented | ~4          | ~22      | ~15      | sessionHelpers, session, YAML, test         |
| Tot |             | ~57         | ~110     | ~85      | —                                           |

**Test target**: 311 + 10 = **321 test** (2 per stato × 5 stati)
