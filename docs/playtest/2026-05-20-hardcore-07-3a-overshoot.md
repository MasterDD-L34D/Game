---
title: Hardcore_07 3A OVERSHOOT — enemy_count_modifier -1 inverted direction
date: 2026-05-20
type: playtest-retrospective
scenario: enc_tutorial_07_hardcore_pod_rush
sprint: post-v44.3-balance-fix-loop
pillar: [P6]
status: 3a-rejected-rollback
last_verified: 2026-05-20
---

# Hardcore_07 3A retrospective — `enemy_count_modifier -1` REJECTED inverted

## TL;DR (30s)

Hypothesis: hardcore_07 N=40 baseline WR 60% OOB-high. Remove 1 initial enemy (e_patrol_scout_3, M14-C iter1 addition) per restore 4v3 ratio. Expected WR shift 60% → 45-55% (toward center band).

**Actual N=40 (parallel C 4 shards, 359.6s vs 1440s serial = 4x speedup)**: **WR 70% MORE OOB-high** (was 60%, now +10pp worse). CI95 [55, 82]. Direction INVERTED.

**Root cause**: fewer initial enemies = less party time killing them = MORE party AP available for boss focus + earlier boss engagement = MORE wins. Subagent A research recommended this knob — but for "remove pod from spawn wave" (reinforcement, not initial spawn). My impl removed initial spawn (wrong layer).

**Action**: rollback enemy_count_modifier -1. Knob infra preserved in `damageCurves.js` for future use. Iter2 candidate path: damage_multiplier_override OR reinforcement_policy boost OR mission_timer tighter.

## Cascade comparison

| Sample                 | Knobs              | WR              | CI95     | Status                   |
| ---------------------- | ------------------ | --------------- | -------- | ------------------------ |
| Pre-Wave 5-7 (history) | none               | 80-100%         | wide     | OOB-high catastrophic    |
| Post-Wave 5-7 N=10     | cost_ap 1→2        | 40% (lucky-low) | [10, 70] | false in-band            |
| Post-Wave 5-7 N=40     | cost_ap 1→2        | 60%             | [45, 75] | OOB-high +10pp           |
| **3A N=40 ❌**         | cost_ap + enemy -1 | **70%**         | [55, 82] | OOB-high **+20pp WORSE** |

## 3A metrics

```
WR:           70.0% (28 wins / 40 runs)        target [30-50%] 🔴 OOB +20pp ceiling
defeat:        0.0% (0 defeats / 40 runs)      target [—] N/A scenario-spec
timeout:      30.0% (12 timeouts / 40 runs)    target [—] N/A
CI95 WR:      [55, 82] confident OOB high
rounds_avg:   12.1 (median 12)
kd_avg:       2.7
elapsed:      6.0min (parallel C 4x speedup) vs serial est 24min
player_actions: move=295, attack=1416, unknown=50
trait_used:   {} (backend gap)
```

## Root cause analysis

**3A design assumption (subagent A research)**:

> hardcore_07 = swarm + timer dominated. Reduce enemy count, tighten timer.

But subagent A spec said "remove 1 pod from spawn wave" (reinforcement, not initial spawn). My impl in `damageCurves.js applyScenarioEnemyCountModifier` removes from `enemies[]` initial spawn list.

**Empirical reality**:

- Initial spawn 4 → 3 (removed e_patrol_scout_3)
- Party clears initial faster (fewer targets)
- Reinforcements still spawn per `reinforcement_policy` (max_total_spawns 8)
- But party has MORE AP budget for boss focus (less drain on initial wave)
- Net effect: WR UP, not down

**Right direction**: ADD initial enemies OR ADD reinforcement spawn rate OR ADD enemy DPS OR REDUCE party AP.

## iter2 candidate paths (next session)

**Path A — reinforcement boost**:

```yaml
scenario_overrides:
  enc_tutorial_07_hardcore_pod_rush:
    reinforcement_policy_max_total_spawns_override: 12 # was 8
```

Requires new override key + damageCurves.js consumer + hardcoreScenario.js merge logic. Effort ~2h.

**Path B — enemy damage multiplier**:

```yaml
scenario_overrides:
  enc_tutorial_07_hardcore_pod_rush:
    enemy_damage_multiplier_override: 2.2 # was 1.8 (class hardcore)
```

Requires new override key. Effort ~1h.

**Path C — timer tighter**:

```yaml
scenario_overrides:
  enc_tutorial_07_hardcore_pod_rush:
    mission_timer_turn_limit_override: 6 # was 8
```

Requires new override key + mission_timer integration. Effort ~1.5h.

**Path D — enemy_count_modifier positive (add)**:

- Update `applyScenarioEnemyCountModifier` to support positive delta
- Add `enemy_spawn_pool` for cloning template
- Effort ~3h, more invasive

**Recommendation**: Path B (enemy damage multiplier) — simplest knob, predictable effect. Or Bayesian opt (Method A Optuna) on full knob surface — joint effect prediction.

## Lesson L-072 candidate — "direction-test smoke pre-N=40"

Sub-lesson of L-070 (multi-knob overshoot): when knob direction effect non-obvious, N=10 smoke FIRST per ground-truth direction. This iteration ran N=40 directly — saved no time vs N=10 + N=40 escalation, AND wasted full ratify budget on wrong direction.

**Fix**: integrate N=10 direction smoke into `calibrate_drift_verify.py` flow:

1. N=10 probe
2. Compare vs PRIOR baseline (not target band) — direction TOWARD or AWAY from target?
3. If AWAY → STOP, suggest knob delta reverse
4. If TOWARD → escalate N=40

Codify after iter4 + 3A both validated knob effect prediction failure.

## Method C parallel re-validated

- iter4 (hardcore_06): 642.7s N=40 = 4x exact
- 3A (hardcore_07): 359.6s N=40 = 4x exact
- Consistent across scenarios
- All 4 shards finish within 0.5s of each other (excellent load balance)
- Total parallel C smoke + use this session: ~30min compute vs ~115min serial = ~80min saved

## Artifacts

- Merged: `docs/playtest/parallel-hardcore_07-3a-enemy-count-minus1-merged.json`
- Shard reports: `parallel-hardcore_07-3a-enemy-count-minus1-shard{0,1,2,3}.{json,jsonl,log}`
- Backend logs: `parallel-hardcore_07-3a-enemy-count-minus1-shards/`

## Pillar P6 final state

- **hardcore_06**: 🟢 candidato PARTIAL (WR in-band primary only)
- **hardcore_07**: 🟡 STILL OOB-high (Wave 5-7 nerf only — 60% verified post-3A rollback)
- Next session: iter5 hardcore_06 path B OR Method A Bayesian OR 3A iter2 alt-knob

## Bundle resume trigger next session

> _"hardcore_07 3A iter2 path B enemy_damage_multiplier_override 2.2 + parallel C N=40 + Method A Optuna Bayesian opt joint-effect explore"_
