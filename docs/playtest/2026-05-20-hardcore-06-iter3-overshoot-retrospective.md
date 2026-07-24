---
title: Hardcore_06 iter3 OVERSHOOT — turn_limit_defeat_override null rejected
date: 2026-05-20
type: playtest-retrospective
scenario: enc_tutorial_06_hardcore
sprint: post-v44.3-balance-fix-loop
pillar: [P6]
status: iter3-rejected-rollback
supersedes: docs/playtest/2026-05-20-hardcore-06-scenario-overrides-iter1to3-final.md
last_verified: 2026-05-20
---

# Iter3 retrospective — `turn_limit_defeat_override: null` REJECTED overshoot

## TL;DR (30s)

Iter3 hypothesis: disable `turn_limit_defeat` (hardcore class default 25) per scenario hardcore_06 to convert defeats → timeouts (boss residual 13.8 = boss almost-dead in iter2 N=40 ratified). Expected secondary band convergence (WR 17-22%, defeat 55%, timeout 20%).

**Actual result N=40**: catastrophic OOB-HIGH overshoot. **WR 85%, defeat 0%, timeout 15%**. Removing turn limit + boss HP 26 = trivial encounter (party always wins given enough rounds).

**Action**: rollback iter3 (revert `turn_limit_defeat_override`). Ship iter2 (boss_hp_multiplier 0.65 alone) as production fix. iter4 candidate `turn_limit_defeat_override: 30-35` (intermediate, not null) deferred next session.

## Iter3 N=40 metrics

| Metric        | Iter3 N=40                   | Iter2 N=40 (baseline) | Target   |
| ------------- | ---------------------------- | --------------------- | -------- |
| win_rate      | **85.0%**                    | 15.0%                 | [15-25%] |
| defeat_rate   | **0.0%**                     | 85.0%                 | [40-55%] |
| timeout_rate  | 15.0%                        | 0.0%                  | [15-25%] |
| W/L/T         | 34/0/6                       | 6/34/0                | —        |
| turns_avg     | 32.65                        | 24.55                 | —        |
| turns_median  | 30.5                         | 25                    | —        |
| dmg_dealt_avg | 55.3                         | 43.8                  | —        |
| dmg_taken_avg | 31.6                         | 26.1                  | —        |
| KD_avg        | 2.19                         | 2.58                  | —        |
| elapsed       | 47.9 min                     | 36.8 min              | —        |
| turns_hist    | 21-30: 19, 31-40: 13, 41+: 7 | 21-30: most           | —        |

**Verdict harness**: RED — 2/3 band violations.

```
"verdict_reasons": [
  "win_rate=0.85 out of band [0.15,0.25] (red)",
  "defeat_rate=0.00 out of band [0.4,0.55] (red)"
]
```

## Root cause analysis

**Hypothesis (iter3 design)**:

- iter2 N=40 boss residual 13.8 = boss almost-killed in many defeats
- Defeats hit hardcore class `turn_limit_defeat: 25` cap
- Disabling cap should allow 5-10 more rounds → ~15-20% of defeats become victories
- Expected WR 15% → 20%, defeat 85% → 55%, timeout 0% → 20%

**Reality**:

- Disabling cap allowed runs to extend 25 → 32.6 avg, 41+ for 7/40 runs
- Party can ALWAYS focus-fire boss to death given unlimited rounds (no enrage escape)
- 100% of defeats converted to victories
- Only 6/40 runs hit MAX_ROUNDS=40 (timeouts)

**Causal gap**: missed that turn_limit_defeat is the ONLY pressure mechanism beyond enemy DPS. Without it, party survivability (HP > 0 = win condition) trivially achieved at boss HP 26. Boss enrage threshold 40% HP doesn't add enough pressure.

**Right intermediate iter4**: `turn_limit_defeat_override: 30` (extension +5 rounds vs class 25). Expected to convert ~5-10 defeats to wins/timeouts but preserve majority defeats. Target: WR ~22-25%, defeat 50-60%, timeout 15-20%.

## Decision — rollback + ship iter2

Revert iter3 in `data/core/balance/damage_curves.yaml`:

```diff
   enc_tutorial_06_hardcore:
     boss_hp_multiplier: 0.65
-    turn_limit_defeat_override: null
```

iter2 N=40 ratified state restored:

- **WR 15% IN-BAND floor** ✅ (primary metric pass)
- Defeat 85% RED (acceptable for partial fix)
- Timeout 0% RED (acceptable for partial fix)

## iter4 recommendation (next session)

Two paths candidate:

**Path A — turn_limit extension**:

```yaml
scenario_overrides:
  enc_tutorial_06_hardcore:
    boss_hp_multiplier: 0.65
    turn_limit_defeat_override: 30 # +5 rounds vs class 25
```

Expected: convert some late-stage defeats. WR ~20-25%, defeat 50-60%, timeout 15-25%. Test N=40.

**Path B — boss enrage tighter**:

```yaml
scenario_overrides:
  enc_tutorial_06_hardcore:
    boss_hp_multiplier: 0.65
    boss_enrage_threshold_override: 0.55 # was 0.40, trigger earlier
```

Requires new override key + damageCurves.js consumer. Adds enrage damage earlier → some defeats restored. WR ~20%, defeat 55%, timeout 25%.

**Recommended**: Path A (simpler, single knob already in infra).

## Pillar P6 final state (post rollback)

- **hardcore_06 partial fix**: 🟡 split-band (WR primary pass, defeat/timeout secondary RED)
- iter4 next session candidate for full band convergence
- **hardcore_07 deferred**: still 🟡 OOB-high +10pp (N=40 60%)

## Lesson L-070 candidate

**Sequential single-knob iter without composite-knob predictive model = trap**:

iter3 changed 1 knob (turn_limit_defeat). Iter2 already pushed primary WR into band. Adding a second knob without predicting joint effect on multi-knob surface = overshoot.

**Anti-pattern**: changing knob A to fix metric M2 when knob B already optimized metric M1 — without simulating joint effect.

**Mitigation**:

- N=10 probe between knob changes (cheap direction check)
- Pattern A (Bayesian optimization) from research doc — auto-suggests knob delta sized to expected effect
- MAP-Elites QD grid (P1 deferred) — pre-explores joint effect surface

**Codify**: extend museum card M-2026-05-20-003 or add new card M-2026-05-20-004 "Multi-knob sequential overshoot anti-pattern".

## Artifacts

- iter3 N=40 v1 (batch bug, capped at 25 client-side, killed early): `2026-05-20-hardcore-06-iter3-turnlimitnull-n40.{json,jsonl,log}` (partial 6 runs)
- iter3 N=40 v2 (batch script fixed): `2026-05-20-hardcore-06-iter3-turnlimitnull-n40v2.{json,jsonl,log}` (40 runs full)
- Batch script fix: `tools/py/batch_calibrate_hardcore06.py:99-185` (added `_load_scenario_turn_limit_override`, `scenario_id` param to `load_turn_limit_defeat`)
- Method F telemetry working: `player_action_distribution` captured (move/attack/unknown). `trait_used_distribution` empty (backend doesn't expose trait_id in action.result — separate gap).

## Bundle resume trigger next session

> _"hardcore_06 iter4 path A (turn_limit_defeat_override 30) + N=40 ratify secondary band convergence + ship iter2 as production OR escalate iter4 if secondary band still RED"_
