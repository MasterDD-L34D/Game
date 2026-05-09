---
title: K4 commit-window Approach B — implementation + N=40 sweep results
workstream: ops-qa
category: playtest
doc_status: active
source_of_truth: true
language: it
last_verified: '2026-05-09'
tags: [ai, balance, calibration, utility-brain, commit-window, fase2]
---

# K4 commit-window Approach B — implementation + N=40 sweep results

Resume PR #2147 K4 Approach A negative result. K4 Approach B implementation
(deterministic anti-flip commit-window guard) shipped + sweep N=40 vs 90% K3
utility-OFF baseline. **Result: 100% WR (40/40), +10pp vs baseline (capped),
zero timeouts, avg 24.2 rounds.**

## Hypothesis

Approach A (additive stickiness) failed perché lo score del utility brain
in 2-unit kite scenarios oscilla con ampiezza > 0.30 turno-su-turno: i pesi
TargetHealth/SelfHealth/Distance dominano lo stickiness additivo. Soluzione:
**guard deterministico** che ignora la nuova policy quando reverse-flip
detected, forzando l'intent precedente per N turni (=2 default).

## Implementation

### `apps/backend/services/ai/declareSistemaIntents.js`

Module-level helpers:

```js
function _moveDirection(from, to) {
  const dx = (Number(to.x) || 0) - (Number(from.x) || 0);
  const dy = (Number(to.y) || 0) - (Number(from.y) || 0);
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'E' : 'W';
  return dy > 0 ? 'S' : 'N';
}

function _isOppositeDir(a, b) {
  return (
    (a === 'N' && b === 'S') ||
    (a === 'S' && b === 'N') ||
    (a === 'E' && b === 'W') ||
    (a === 'W' && b === 'E')
  );
}

function _detectFlip(actor, newIntent, newDirection) {
  const lastKind = actor.last_action_type;
  const lastDir = actor.last_move_direction;
  if (!lastKind) return false;
  if (lastKind === 'retreat' && newIntent === 'approach') return true;
  if ((lastKind === 'move' || lastKind === 'approach') && newIntent === 'retreat') return true;
  if (
    lastDir &&
    newDirection &&
    _isOppositeDir(lastDir, newDirection) &&
    (newIntent === 'approach' || newIntent === 'retreat')
  )
    return true;
  return false;
}
```

In-loop guard, post `selectAiPolicy{,Utility}`:

```js
if (aiProfiles && aiProfiles.profiles && actor.ai_profile) {
  const prof = aiProfiles.profiles[actor.ai_profile];
  const cw = prof ? Number(prof.commit_window) || 0 : 0;
  if (cw > 0) {
    const remaining = Number(actor.commit_window_remaining) || 0;
    if (remaining > 0 && actor.commit_window_intent) {
      // Guard active — force saved intent
      policy = { rule: 'COMMIT_WINDOW', intent: actor.commit_window_intent };
      actor.commit_window_remaining = remaining - 1;
    } else if (actor.last_action_type) {
      // Detect flip vs last committed action
      const candidatePos =
        policy.intent === 'retreat'
          ? stepAway(actor.position, target.position, effectiveGrid)
          : policy.intent === 'approach'
            ? stepTowards(actor.position, target.position)
            : null;
      const candidateDir = candidatePos ? _moveDirection(actor.position, candidatePos) : null;
      if (_detectFlip(actor, policy.intent, candidateDir)) {
        const lastIntent =
          actor.last_action_type === 'attack'
            ? 'attack'
            : actor.last_action_type === 'retreat'
              ? 'retreat'
              : 'approach';
        policy = { rule: 'COMMIT_WINDOW_FLIP', intent: lastIntent };
        actor.commit_window_remaining = Math.max(0, cw - 1);
        actor.commit_window_intent = lastIntent;
      }
    }
  }
}
```

### `apps/backend/routes/sessionRoundBridge.js` — `realResolveAction`

State tracking added after attack/move commit. Critical: prima del fix
**lo state tracking esisteva solo in `sistemaTurnRunner.js` (legacy path,
DEAD per M17 ADR-2026-04-16)**. Nel round flow `actor.last_action_type`
non era mai impostato, rendendo K4 Approach A (sticky) un no-op.

```js
// After attack commit:
actor.last_action_type = 'attack';
actor.last_move_direction = null;

// After move commit:
const rule = action.source_ia_rule || '';
let kind = 'move';
if (rule === 'REGOLA_002') kind = 'retreat';
else if (rule === 'COMMIT_WINDOW' || rule === 'COMMIT_WINDOW_FLIP') {
  kind = actor.commit_window_intent === 'retreat' ? 'retreat' : 'move';
}
actor.last_action_type = kind;
const dxDir = actor.position.x - positionFrom.x;
const dyDir = actor.position.y - positionFrom.y;
if (dxDir !== 0 || dyDir !== 0) {
  actor.last_move_direction =
    Math.abs(dxDir) >= Math.abs(dyDir) ? (dxDir > 0 ? 'E' : 'W') : dyDir > 0 ? 'S' : 'N';
}
```

### `packs/evo_tactics_pack/data/balance/ai_profiles.yaml`

```yaml
aggressive_commit_window:
  label: 'Aggressivo (utility ON + K4 commit-window 2)'
  description: 'Aggressive utility ON con anti-flip guard deterministico
    (forza intent precedente 2 turni dopo flip detection).'
  use_utility_brain: true
  commit_window: 2
  overrides:
    retreat_hp_pct: 0.15
    kite_buffer: 0
    default_attack_range: 2
    threat_passivity_threshold: 2
```

## N=40 sweep results

Live tunnel `retro-wave-stat-solving`. Concurrency 2, max_rounds 40.

| Profile                                          | Runs |      V |   D |   T | **Win rate** | Avg rounds |
| ------------------------------------------------ | ---: | -----: | --: | --: | -----------: | ---------: |
| aggressive (K3 prod baseline, PR #2146)          | N=20 |     17 |   2 |   1 |          85% |       26.4 |
| aggressive (K3 baseline re-validate, this batch) | N=20 |     18 |   2 |   0 |      **90%** |       25.0 |
| aggressive_with_stickiness 0.15 (PR #2147)       | N=20 |     11 |   0 |   9 |          55% |       31.5 |
| aggressive_sticky_30 (PR #2147)                  | N=20 |     12 |   1 |   7 |          60% |       30.0 |
| **aggressive_commit_window**                     | N=40 | **40** |   0 |   0 |     **100%** |   **24.2** |

**Trend**: commit-window = +10pp absolute (cap 100%) vs K3 baseline,
+45pp vs K4 sticky 0.15, +46.5pp vs original utility-ON oscillation
state (53.5% pre-K3). **Zero timeouts, zero defeats**. Avg rounds
**diminuiti** (24.2 vs baseline 26.4) — 2.2 rounds faster victory.

## Guard activity stats (40 runs aggregate)

```
COMMIT_WINDOW          32 firings (sustained guard, turn 2 of window)
COMMIT_WINDOW_FLIP     58 firings (initial flip detection, turn 1)
PRESSURE_CAP          314 firings
REGOLA_001             80 firings (attack/approach pre-utility)
UTILITY_AI           1118 firings (un-guarded utility decisions)
```

90 commit-window-driven decisions / 1208 SIS decisions = **7.4%
guard footprint**. 9/40 runs had ZERO firings (target didn't oscillate
in those scenarios → guard dormant, pure utility brain still won).

## Hypothesis confirmed

Anti-flip guard deterministico beats additive stickiness perché:

1. **Determinismo**: guard ignora score weighting del utility brain.
   Quando flip detected, override hard-coded del policy.intent.
2. **Window persistence**: 2 turni di commit forzano traversal di almeno
   2 celle in stessa direzione, rompendo il ciclo 1-tile up/down.
3. **State tracking fix**: prima del PR, K4 sticky era no-op nel round
   flow. Lo stesso side-fix abilita Approach A retroattivamente — sticky
   variants potrebbero rispondere differente in re-test (out of scope
   PR corrente).

## Production state ai_profiles.yaml

- `aggressive` profile: `use_utility_brain: false` (K3 fix #2146) — **kept as default until master-dd verdict on commit-window swap**
- `aggressive_no_util`: K3 ablation reproduction (preserved)
- `aggressive_with_stickiness` (0.15): K4 sticky failed (PR #2147)
- `aggressive_sticky_30` (0.30): K4 sticky failed (PR #2147)
- **`aggressive_commit_window` (cw=2)**: K4 Approach B **PASS — 100% WR N=40**

## Recommended next step

1. **Master-dd verdict** swap default `aggressive` profile to
   `use_utility_brain: true + commit_window: 2`?
   - PRO: +10pp WR vs K3 baseline (capped), -2.2 avg rounds, more
     interesting AI behavior (utility brain explores weighted considerations
     while guarded against oscillation).
   - CONTRA: 100% WR potrebbe essere troppo dominante per playtest LIVE
     (player feels overwhelmed). N=40 enc_tutorial_01 only — need
     scenario diversity sweep prima di production swap.
2. **Scenario diversity sweep**: run commit_window across enc_tutorial_02
   ÷ enc_tutorial_05 + hardcore-\* per validare consistency.
3. **MAP-Elites combo grid**: stickiness × commit_window × softmax cells
   per esplorare Pareto frontier between determinism (commit) and
   exploration (softmax temperature). ~150 runs, ~2-3h.

## Files patched this PR

- `apps/backend/services/ai/declareSistemaIntents.js` — helpers + commit-window guard
- `apps/backend/routes/sessionRoundBridge.js` — state tracking (last_action_type/direction) post-commit in round flow
- `packs/evo_tactics_pack/data/balance/ai_profiles.yaml` — new `aggressive_commit_window` profile
- `docs/research/2026-05-09-k4-commit-window-implementation.md` (this doc)

## Cross-ref

- PR #2147 K4 Approach A negative result + handoff
- PR #2146 K3 prod fix (utility OFF baseline 90% WR)
- PR #2145 H1 validation (oscillation root cause confirmed)
- PR #2143 balance-illuminator RCA
- K4 commit-window batch: `C:/tmp/ai-sim-runs/batch-2026-05-09T14-02-58-288Z/`

## Resume triggers

> _"esegui scenario diversity sweep aggressive_commit_window — enc_tutorial_02..05 + hardcore-\* per validare consistency pre production swap"_

> _"esegui MAP-Elites K4 grid — sticky × commit-window × softmax cells, 150 runs"_

> _"swap default aggressive profile a commit_window+utility ON post-playtest LIVE confirmation balance_"
