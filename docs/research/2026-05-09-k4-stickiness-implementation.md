---
title: K4 stickiness Approach A — implementation + sweep results
workstream: ops-qa
category: playtest
doc_status: active
source_of_truth: true
language: it
last_verified: '2026-05-09'
tags: [ai, balance, calibration, utility-brain, stickiness, fase2]
---

# K4 stickiness Approach A — implementation + sweep results

Resume PR #2146 K3 fix. K4 implementation Approach A (additive last-action stickiness) shipped + sweep N=40 vs 90% utility-OFF baseline.

## Implementation

### `apps/backend/services/ai/utilityBrain.js`

`scoreAction` accepts new `options = { stickinessWeight, stickinessDirectionWeight }`:

```js
function scoreAction(action, actor, state, considerations, weightOverrides, options = {}) {
  // ... existing additive consideration loop ...
  const stickWeight = options.stickinessWeight ?? 0;
  const stickDirWeight = options.stickinessDirectionWeight ?? stickWeight * 0.5;
  if (stickWeight > 0 && actor && actor.last_action_type) {
    if (action.type === actor.last_action_type) {
      totalScore += stickWeight;
      breakdown.push({ name: 'StickyAction', raw: 1, curved: 1, weighted: stickWeight });
    }
  }
  if (stickDirWeight > 0 && action.type === 'move' && actor && actor.last_move_direction) {
    const newDir = _moveDirection(actor.position, action.target_position);
    if (newDir && newDir === actor.last_move_direction) {
      totalScore += stickDirWeight;
      breakdown.push({ name: 'StickyDirection', raw: 1, curved: 1, weighted: stickDirWeight });
    }
  }
  return { score: totalScore, breakdown };
}
```

`selectAction` reads `stickiness_weight` + `stickiness_direction_weight` da `difficultyProfile` parameter and forwards via options.

### `apps/backend/services/ai/declareSistemaIntents.js`

`selectAiPolicyUtility` invocation merges per-profile stickiness into difficultyProfile:

```js
let stickyDifficulty = difficultyProfile;
if (aiProfiles?.profiles?.[actor.ai_profile]) {
  const prof = aiProfiles.profiles[actor.ai_profile];
  if (
    typeof prof.stickiness_weight === 'number' ||
    typeof prof.stickiness_direction_weight === 'number'
  ) {
    stickyDifficulty = {
      ...difficultyProfile,
      ...(typeof prof.stickiness_weight === 'number'
        ? { stickiness_weight: prof.stickiness_weight }
        : {}),
      ...(typeof prof.stickiness_direction_weight === 'number'
        ? { stickiness_direction_weight: prof.stickiness_direction_weight }
        : {}),
    };
  }
}
policy = selectAiPolicyUtility(actor, target, {}, stickyDifficulty);
```

### `apps/backend/services/ai/sistemaTurnRunner.js`

Track `actor.last_action_type` + `actor.last_move_direction` post-commit each turn (attack, move, retreat branches).

### YAML profile schema

`packs/evo_tactics_pack/data/balance/ai_profiles.yaml` — new optional fields:

```yaml
<profile>:
  use_utility_brain: true
  stickiness_weight: 0.15 # additive bonus to last_action match
  stickiness_direction_weight: 0.075 # additive bonus to last_move_direction match (default = stickiness_weight * 0.5)
  overrides: { ... }
```

## Sweep results

Live tunnel `remaining-guidance-jan-number` + `distinction-harper-seems-desktops`. N=20 per profile, max_rounds=40.

| Profile                                     | Sticky w | Sticky dir w | Runs |   V |   D |   T | **Win rate** | Avg rounds |
| ------------------------------------------- | :------: | :----------: | ---: | --: | --: | --: | -----------: | ---------: |
| aggressive (utility OFF, **prod baseline**) |    —     |      —       |   20 |  17 |   2 |   1 |      **85%** |       26.4 |
| aggressive_with_stickiness (0.15)           |   0.15   |    0.075     |   20 |  11 |   0 |   9 |      **55%** |       31.5 |
| aggressive_sticky_30                        |   0.30   |     0.15     |   20 |  12 |   1 |   7 |      **60%** |        ~30 |

**Trend**: stickiness 0.15 → 0.30 improves +5pp ma rimane **-25pp dal baseline 85%**. Sweep candidate 0.50 disponibile ma trend asintotico suggerisce limite Approach A.

**Conclusion**: K4 Approach A NOT SUFFICIENT to recover utility brain performance vs OFF baseline. Stickiness weight bump improves marginally but cannot overcome score gradient flip-flop in two-unit kite scenarios.

## Hypothesis update

Score gradient analysis suggests TargetHealth/SelfHealth/Distance considerations swap signs based on micro-position changes faster than additive stickiness can compensate. Specifically:

- **Distance quadratic_inverse** at range boundary (range=2) produces steep score gradient
- **TargetHealth swap** post damage exchange flips approach/retreat preference
- Two Sistema units score differently → one approaches while other retreats → no mutual reinforcement

Stickiness 0.15-0.30 cannot dominate weighted sum (other considerations 0.4-0.8 each).

## Next steps

| Option                                                                                | Effort  | Expected ΔWR                         |
| ------------------------------------------------------------------------------------- | ------- | ------------------------------------ |
| **Approach A** sticky 0.50                                                            | minimal | +5-10pp marginal                     |
| **Approach B** commit-window guard (deterministic anti-flip in declareSistemaIntents) | ~1h     | +15-25pp likely                      |
| **Approach C** softmax + temperature (selectAction stochastic)                        | ~1h     | uncertain (introduces stochasticity) |
| **Stay with K3 prod fix** (utility OFF on aggressive)                                 | 0       | baseline 85-90% WR                   |

**Recommendation**: ship K4 negative result + maintain K3 prod fix. Test Approach B next cycle.

## Production state confirmed

- `aggressive` profile: `use_utility_brain: false` (K3 fix #2146)
- `aggressive_no_util`: ablation reproduction profile (preserved)
- `aggressive_with_stickiness` (0.15): K4 sticky failed
- `aggressive_sticky_30` (0.30): K4 sticky failed
- Default Sistema balance unchanged for `balanced` (no overrides) + `cautious` (utility OFF)

## Files patched this PR

- `apps/backend/services/ai/utilityBrain.js` — stickiness branch in scoreAction + selectAction wiring
- `apps/backend/services/ai/sistemaTurnRunner.js` — last_action_type + last_move_direction state tracking
- `apps/backend/services/ai/declareSistemaIntents.js` — per-profile stickiness merge into difficultyProfile
- `packs/evo_tactics_pack/data/balance/ai_profiles.yaml` — 2 new sweep profiles (aggressive_with_stickiness + aggressive_sticky_30)
- `docs/research/2026-05-09-k4-stickiness-implementation.md` (this doc)

## Cross-ref

- PR #2146 K3 prod fix (utility OFF baseline 90% WR)
- PR #2145 H1 validation (oscillation root cause confirmed)
- PR #2143 balance-illuminator RCA
- K4 sticky 0.15 batch: `C:/tmp/ai-sim-runs/batch-2026-05-09T13-02-20-362Z/`
- K4 sticky 0.30 batch: `C:/tmp/ai-sim-runs/batch-2026-05-09T13-08-45-689Z/`

## Resume triggers

> _"esegui K4 sticky 0.50 sweep — final extreme test Approach A"_

> _"esegui K4 Approach B commit-window — declareSistemaIntents.js anti-flip guard"_

> _"esegui K4 Approach C softmax temperature — selectAction stochastic"_

> _"esegui MAP-Elites K4 grid — sticky × commit-window × softmax cells"_
