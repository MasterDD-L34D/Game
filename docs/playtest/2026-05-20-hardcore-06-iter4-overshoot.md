---
title: Hardcore_06 iter4 OVERSHOOT — turn_limit_defeat_override 30 rejected
date: 2026-05-20
type: playtest-retrospective
scenario: enc_tutorial_06_hardcore
sprint: post-v44.3-balance-fix-loop
pillar: [P6]
status: iter4-rejected-rollback
last_verified: 2026-05-20
---

# Iter4 retrospective — `turn_limit_defeat_override: 30` REJECTED OOB-high

## TL;DR (30s)

Iter4 hypothesis: limit 25 (class default, iter2) too tight per secondary band coverage; limit null (iter3) too lenient (WR 85%). Try +5 intermediate (limit 30) per shift defeats → timeouts senza overshoot.

**Actual N=40 (via parallel C 4 shards, 642.7s vs 2571s serial = 4x speedup)**: **WR 47.5%, defeat 52.5%, timeout 0%**. Defeat NOW in-band ✅ ma WR overshoots target ceiling 25% by 22.5pp. Timeout still RED 0%.

**Action**: rollback iter4 → ship iter2 (boss 0.65 alone). Iter5 candidate deferred next session: `turn_limit_defeat_override: 26` (just +1 over class) per shift fine.

## Cascade comparison

| Iter              | Boss         | TurnLimit       | WR        | Def   | Timeout | W/L/T   | Verdict        |
| ----------------- | ------------ | --------------- | --------- | ----- | ------- | ------- | -------------- |
| Baseline          | 1.0 (HP 40)  | 25 class        | 0%        | 100%  | 0%      | 0/40/0  | RED            |
| iter2 N=40 ✅     | 0.65 (HP 26) | 25 class        | **15%**   | 85%   | 0%      | 6/34/0  | **WR IN-BAND** |
| iter3 N=40 ❌     | 0.65         | null (disabled) | 85%       | 0%    | 15%     | 34/0/6  | OOB-high       |
| **iter4 N=40 ❌** | 0.65         | **30** (+5)     | **47.5%** | 52.5% | 0%      | 19/21/0 | OOB-high       |

**Pattern**: limit knob has STEEP non-linear effect. Each +5 round shifts WR ~30pp.

## Iter4 metrics

```
WR:           47.5% (19 wins / 40 runs)        target [15-25%] 🔴 OOB-high +22.5pp ceiling
Defeat:       52.5% (21 defeats / 40 runs)     target [40-55%] ✅ IN-BAND
Timeout:       0.0% (0 timeouts / 40 runs)     target [15-25%] 🔴 -15pp floor
Boss res:     10.4 HP avg on loss              iter2: 13.8 (boss closer to dead)
Turns avg:    28.0                             iter2: 24.55
Turns median: 30.0
KD avg:       2.08                             iter2: 2.58 (worse exchanges per turn)
elapsed:      10.7 min (parallel C 4 shards)   serial est: 42.85 min (4x)
AI intent:    Apex|attack dominant
```

## Root cause analysis

**Hypothesis (iter4 design)**:

- iter2 N=40 boss residual 13.8 = boss almost-killed in ~85% of defeats
- Adding +5 rounds (25→30) should convert ~20-30% of those defeats to wins+timeouts
- Expected WR 15% → 20-25%, defeat 85% → 55%, timeout 0% → 20%

**Reality**:

- Conversion rate MUCH higher than predicted: 70% of defeats converted to wins
- 0 timeouts at all (party always finishes within 30 rounds when allowed)
- Turn limit removal effect: party CAN consistently kill boss given +5 rounds + boss HP 26

**Causal gap**: missed that boss HP 0.65 already reduced kill threshold significantly. With +5 rounds, party has time to finish boss in most defeats. Knob interaction = multiplicative not additive.

## iter5 candidate (next session)

**Path A — limit 26 (very small extension)**:

```yaml
scenario_overrides:
  enc_tutorial_06_hardcore:
    boss_hp_multiplier: 0.65
    turn_limit_defeat_override: 26 # +1 vs class 25
```

Expected: convert ~5-10% defeats. WR 15% → 20-25%, defeat 85% → 60-70%, timeout 0% → 5-15%.

**Path B — multi-knob composite**:

```yaml
scenario_overrides:
  enc_tutorial_06_hardcore:
    boss_hp_multiplier: 0.70 # raise back (was 0.75 iter1 = WR 10%)
    turn_limit_defeat_override: 28 # mid-range
```

Expected: WR 18-22%, defeat 55-65%, timeout 15-20%. Needs joint N=40.

**Path C — accept iter2 PRODUCTION** (recommended):
Ship iter2 boss_hp_multiplier 0.65 alone. Accept secondary metrics partial fix. Defer secondary band convergence to Sprint M14 Bayesian optimization (Method A Optuna).

**Recommendation**: C ship iter2 + B/A explore next session. Path A risks similar overshoot (limit knob non-linear).

## Lesson L-070 reinforced (multi-knob overshoot)

iter3 OOB-high WR 85% (boss + limit null)
iter4 OOB-high WR 47.5% (boss + limit 30)

Both overshoot when adding limit knob on top of boss HP nerf. **Single-knob iteration safer**. Multi-knob composite needs Bayesian optimizer (Method A) for joint effect prediction.

## Method C parallel validated empirical

- Smoke earlier: N=8/4 shards → 111.6s
- Iter4 N=40/4 shards → **642.7s actual vs 2571s serial est = 4x exact**
- Shard health ~2s each
- All 4 shards completed within 22s of each other (good load balancing)

## Artifacts

- Merged report: `docs/playtest/parallel-hardcore_06-iter4-turnlimit30-merged.json`
- Shard outputs: `parallel-hardcore_06-iter4-turnlimit30-shard{0,1,2,3}.{json,jsonl,log}`
- Backend logs: `parallel-hardcore_06-iter4-turnlimit30-shards/shard-{3341,3342,3343,3344}.log`

## Pillar P6 final state (post iter4 rollback)

- **hardcore_06**: 🟢 candidato PARTIAL — WR in-band primary (boss 0.65 ship), secondary defeat 85% / timeout 0% RED
- **hardcore_07**: ⏳ pending 3A iter1 enemy_count -1 verify
- iter5 hardcore_06 secondary band convergence: deferred Sprint M14 (Bayesian opt)

## Bundle resume trigger next session

> _"hardcore_06 iter5 path B multi-knob (boss 0.70 + limit 28) OR Sprint M14 Method A Optuna Bayesian opt joint-effect explore — hardcore_07 3A result driver"_
