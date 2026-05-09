---
title: K3 fix shipped + K4 utilityBrain stickiness audit
workstream: ops-qa
category: playtest
doc_status: active
source_of_truth: true
language: it
last_verified: '2026-05-09'
tags: [ai, balance, calibration, utility-brain, fix, audit, fase2]
---

# K3 production fix shipped + K4 stickiness audit

Resume PR #2145 H1 validation. K3 ablation conferma utility brain root cause, ship production fix `aggressive use_utility_brain: false`. K4 audit `utilityBrain.js` propone stickiness term per future re-enable.

## K3 ablation result (live tunnel `rapids-penalty-mpegs-titled`)

N=40 batch, max_rounds=40, concurrency=2 (2026-05-09 batch dir `batch-2026-05-09T12-42-26-730Z`):

| Profile                              | Runs | Victory | Defeat | Timeout | **Win rate** | Avg rounds |
| ------------------------------------ | ---: | ------: | -----: | ------: | -----------: | ---------: |
| **aggressive** (utility ON)          |   20 |      13 |      0 |       7 |    **65.0%** |       29.5 |
| **aggressive_no_util** (utility OFF) |   20 |      19 |      1 |       0 |    **95.0%** |       24.8 |

**ΔWR = +30pp** (65% → 95%) when utility brain disabled.
**Timeout rate**: 35% → 0% (eliminated).
**Avg rounds**: 29.5 → 24.8 (-4.7).
**Defeat**: 0 → 1 (small risk increase, expected — no utility-driven retreat optimization).

**K3 verdict**: utility brain confirmed primary cause aggressive sottoperformance. Patch shipped.

## Production fix (this PR)

`packs/evo_tactics_pack/data/balance/ai_profiles.yaml` — flip `aggressive.use_utility_brain` from `true` to `false`. Comment block updated con K3 ablation history + cross-ref.

### Validation post-fix N=20 (live tunnel `chairs-environmental-rewards-johnson`)

| Profile                        | Runs | Victory | Defeat | Timeout | **Win rate** | Avg rounds |
| ------------------------------ | ---: | ------: | -----: | ------: | -----------: | ---------: |
| aggressive (utility OFF, prod) |   20 |      18 |      2 |       0 |    **90.0%** |        ~25 |

**ΔWR vs pre-fix N=43 baseline**: 53.5% → 90% = **+36.5pp**.
**Timeout rate**: 47% → 0% (eliminated).

Production state confirmed: `aggressive` profile now performant senza utility brain.

## K4 audit `utilityBrain.js` — stickiness term

### Findings

**File**: `apps/backend/services/ai/utilityBrain.js` (376 LOC)

Score architecture:

```js
function scoreAction(action, actor, state, considerations, weightOverrides) {
  let totalScore = 0;
  for (const [name, config] of Object.entries(considerations)) {
    const raw = config.evaluate(action, actor, state);
    const curved = CURVES[config.curve](raw);
    const weight = weightOverrides[name] ?? config.weight;
    totalScore += curved * weight; // ADDITIVE
  }
  return { score: totalScore, breakdown };
}
```

`selectAction` is pure argmax (with optional noise + weighted_top3 selection).

**Gap**: NO temporal memory between turns. Each tick re-scores from scratch. When 2 candidate actions (e.g., `approach` vs `retreat`) score nearly identical, micro-changes in position flip the winner → oscillation.

Specifically, observed pattern N=20 timeout runs:

```
(0,-1)/move/REGOLA_001 → (0,+1)/move/UTILITY_AI → (0,-1)/move/REGOLA_001 ...
```

Two Sistema units alternate via different rule paths producing 1-tile oscillation. Net displacement zero post-first-kill.

### Hypotheses for oscillation

1. **TargetHealth/SelfHealth swap signs based on relative HP**. After damage exchange, score gradient inverts → action flip.
2. **Distance scoring** with `quadratic_inverse` is too steep near range boundary → small position changes flip approach vs retreat sign.
3. **No tie-breaking heuristic**. Multiple actions can have score within 0.01% — noise + Math.random() in noisy mode flips arbitrarily.

### K4 proposal: stickiness term

#### Approach A — additive last-action bonus

```js
function scoreAction(action, actor, state, ...) {
  let totalScore = 0;
  // ... existing consideration loop ...
  // K4 stickiness: bonus if action_type matches actor.last_action_type
  const STICKINESS_WEIGHT = 0.15;
  if (actor.last_action_type && action.type === actor.last_action_type) {
    totalScore += STICKINESS_WEIGHT;
  }
  // Direction stickiness: bonus if move direction matches last move
  if (action.type === 'move' && actor.last_move_direction) {
    const newDir = computeDirection(actor.position, action.target_position);
    if (newDir === actor.last_move_direction) totalScore += STICKINESS_WEIGHT * 0.5;
  }
  return { score: totalScore, breakdown };
}
```

State tracking: caller updates `actor.last_action_type` + `actor.last_move_direction` post-commit each turn.

**Pro**: minimal change, preserves additive scoring.
**Con**: tunable weight (0.15 too high → static, too low → no effect).

#### Approach B — commit-window guard

```js
// In declareSistemaIntents.js after selectAction:
if (
  actor.commit_window_remaining > 0 &&
  actor.last_action_type &&
  chosenAction.type !== actor.last_action_type &&
  isDirectionReversal(actor, chosenAction)
) {
  // Force previous action repeat for 1-2 turns
  return { ...prevAction, _commit_forced: true };
}
actor.commit_window_remaining = COMMIT_WINDOW_TURNS; // e.g., 2
```

**Pro**: deterministic anti-flip.
**Con**: harder to tune, can cause sub-optimal stuck behavior in genuine retreat scenarios.

#### Approach C — softmax + temperature

Replace argmax with softmax(scores / T) where T temperature controls determinism. High T = exploration, low T = greedy. Less aggressive flip-flop because near-tie actions sample with similar probability across turns.

**Pro**: probabilistically smooth.
**Con**: introduces stochasticity, may hurt determinism in test seeds.

### Recommendation

**Approach A** stickiness additive. Implement + N=40 SPRT vs current legacy:

```yaml
# new aggressive_with_stickiness profile
aggressive_with_stickiness:
  use_utility_brain: true
  stickiness_weight: 0.15
  overrides: { ... aggressive overrides ... }
```

Compare:

- aggressive (utility OFF, current prod) baseline 90% WR
- aggressive_with_stickiness (utility ON + sticky) target 90%+ WR

If sticky achieves parity, re-enable utility brain. If sub-90, escalate to Approach B or C.

## SPRT plan (FASE 2.next)

```bash
# K4 stickiness implementation + add new profile
# vim apps/backend/services/ai/utilityBrain.js   (add stickiness branch)
# vim packs/.../ai_profiles.yaml                 (add aggressive_with_stickiness)
TUNNEL=https://... node tools/sim/batch-ai-runner.js \
  --seed-count 40 --concurrency 2 \
  --profiles aggressive,aggressive_with_stickiness \
  --max-rounds 40

# Compare profile.aggressive_with_stickiness WR vs 90% baseline.
# >= 88% → ship sticky as default → deprecate aggressive_no_util ablation
# < 80%   → fall back, K4 needs commit-window OR softmax variant
```

## Files patched this PR

- `packs/evo_tactics_pack/data/balance/ai_profiles.yaml` — `aggressive.use_utility_brain` true → false + comment block extended con K3 history
- `docs/research/2026-05-09-k3-fix-shipped-k4-audit.md` (this doc)

## Cross-ref

- PR #2145 H1 validation (utility brain oscillation confirmed)
- PR #2143 balance-illuminator initial RCA (3 knobs)
- PR #2142 FASE 2 batch runner
- `apps/backend/services/ai/utilityBrain.js` (K4 audit target)
- K3 ablation batch dir: `C:/tmp/ai-sim-runs/batch-2026-05-09T12-42-26-730Z/`
- Prod fix validation batch: `C:/tmp/ai-sim-runs/batch-2026-05-09T12-48-56-524Z/`

## Resume triggers

> _"esegui K4 stickiness implementation — patch utilityBrain.js + add aggressive_with_stickiness profile + N=40 SPRT"_

> _"esegui Approach B commit-window — anti-flip guard declareSistemaIntents.js"_

> _"esegui Approach C softmax temperature — replace argmax with stochastic"_
