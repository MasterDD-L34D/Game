---
title: Hardcore_07 N=40 follow-up tighten — overturns N=10 in-band verdict
date: 2026-05-20
type: playtest-calibration
scenario: enc_tutorial_07_hardcore_pod_rush
sprint: post-v44.3-wave-6
pillar: [P6]
status: out-of-band-high
supersedes: docs/playtest/2026-05-20-hardcore-07-postwave57-report.md
last_verified: 2026-05-20
---

# Hardcore_07 N=40 follow-up — overturns N=10 verdict

## TL;DR (30s)

**N=40 WR 60% OUT-OF-BAND high** (target 30-50%, ceiling 50%). N=10 sample (40% in-band) era **lucky-low** false signal — N=40 reveals true population WR ~60%. Wave 5-7 nerf (PR [#2344](https://github.com/MasterDD-L34D/Game/pull/2344) `cost_ap 1→2` 6-trait) **insufficient**, needs additional ~10pp WR reduction.

**Supersedes** `2026-05-20-hardcore-07-postwave57-report.md` N=10 in-band claim.

## Run config

- Scenario: `enc_tutorial_07_hardcore_pod_rush`
- N: 40
- Host: `localhost:3334`
- Backend SHA: `a1936bd9`
- Player policy: greedy atk-closest, channel fisico
- MAX_ROUNDS: 15
- Elapsed: 1357.9s (~22.6min)
- Failures: 0

## Summary N=40

| Metric        | N=10       | N=40           | Target | Δ N=10→N=40   | Verdict N=40            |
| ------------- | ---------- | -------------- | ------ | ------------- | ----------------------- |
| **win_rate**  | 40.0%      | **60.0%**      | 30-50% | **+20pp**     | 🟡 **out-of-band high** |
| win_rate CI95 | [10, 70]   | **[45, 75]**   | —      | tighter ±15pp | —                       |
| defeat_rate   | 0%         | 0%             | —      | 0             | —                       |
| timeout_rate  | 60%        | **40.0%**      | —      | -20pp         | shifts to win           |
| timeout CI95  | [30, 90]   | [25, 55]       | —      | tighter       | —                       |
| rounds_avg    | 14.4       | 13.2           | —      | -1.2          | faster clears           |
| rounds CI95   | [13.6, 15] | [12.53, 13.85] | —      | tighter       | —                       |
| kd_avg        | 2.9        | **3.23**       | —      | +0.33         | better exchanges        |
| failures      | 0          | 0              | —      | —             | —                       |

## Critical reading

**N=10 sample was lucky-low**. Pre-Wave 5-7 baseline WR 80-100%. N=10 post-nerf snapshot caught 40% by chance. N=40 statistical authority reveals **true mean ~60%**. CI95 lower bound 45% just touches band ceiling 50%, but center 60% = 10pp above.

**Implication calibration P6**:

- Wave 5-7 nerf delivered **-20-40pp WR drop** (80-100% → 60%): partial success
- **STILL 10pp above target ceiling**: additional knob adjustment needed
- Defeat rate 0% — party never collapses, calibration knob remaining = win-rate-only

## Histogram outcomes (40 runs)

```
victory: 24/40 (60%)
timeout: 16/40 (40%)
defeat:   0/40 ( 0%)
```

Rounds avg 13.2 (median 14) = victories cluster around round 11-14, timeouts hit cap 15.

## Comparison post-Wave 5-7 cluster scenarios

| Scenario    | Pre-Wave 5-7 WR | Post-Wave 5-7 (N=10) | Post-Wave 5-7 (N=40) | Target | Final verdict     |
| ----------- | --------------- | -------------------- | -------------------- | ------ | ----------------- |
| hardcore_07 | 80-100%         | 40% (lucky-low)      | **60%**              | 30-50% | 🟡 OOB-high +10pp |
| hardcore_06 | 0%              | **0%**               | —                    | 15-25% | 🔴 RED blocker    |

## Recommendation master-dd (revised post-N=40)

**3 path candidate** hardcore_07 additional nerf:

1. **🎯 cost_ap 2→3 on 2-3 top picks** (~30min impl + N=40 verify): identify top-2 picked trait in N=40 + push cost further. Lowest blast-radius.
2. **HP nerf player party 5-10%** (~15min impl): reduce party survival window, drives some 60% wins into timeouts. Risk hardcore_06 regression worse.
3. **Reinforcement spawn rate +25% in hardcore_07** (~30min impl): add additional spawn waves, force party DPS exhaustion. Risk over-nerf.

**Recommended ordering**: 1 → N=40 verify → 50% in-band ceiling = ratify, 55%+ = escalate path 3.

**Cross-scenario conflict**: same trait nerf affecting hardcore_06 (already RED). Recommend **scenario-tagged cost_ap multipliers** (Wave 5-7 traits cost 2x in hardcore_06, 3x in hardcore_07).

## Statistical methodology note

**Lesson canonical** (memory `feedback_n_sample_authority.md` candidate):

- **N=10**: indicative direction, CI95 ±30pp on a 40% point estimate — too wide for in-band claim
- **N=40**: authoritative, CI95 ±15pp — sufficient for band placement
- **N=100**: forensic, CI95 ±10pp — required for fine ±5pp calibration

**Pattern**: N=10 batch = quick scan + direction signal. N=40 = ratification gate before claim. **Never ship calibration verdict based on N=10 alone if CI95 spans band ceiling**.

Add to anti-pattern catalog CLAUDE.md: "N=10 lucky-sample false in-band signal — always N=40 ratify before pillar status upgrade".

## Limitations + next

- **Greedy policy**: human party may optimize higher, push WR even more above ceiling
- **MBTI vc telemetry null**: vc_mbti=null all 40 runs (v44.3 open issue carryover)
- **Single scenario**: hardcore_07 only — hardcore_06 separate RED, hardcore_05 (if exists) not probed

## Artifacts

- JSON: [docs/playtest/2026-05-20-hardcore-07-postwave57-n40.json](./2026-05-20-hardcore-07-postwave57-n40.json)
- JSONL: [docs/playtest/2026-05-20-hardcore-07-postwave57-n40.jsonl](./2026-05-20-hardcore-07-postwave57-n40.jsonl)
- Log: [docs/playtest/2026-05-20-hardcore-07-postwave57-n40.log](./2026-05-20-hardcore-07-postwave57-n40.log)

## Pillar delta FINAL post-N=40

- **P6 Fairness**: v44.3 🟢 candidato → **🟡 split-verdict-worse** post N=40
  - hardcore_07: 🟢 candidato (N=10) → **🟡 OOB-high +10pp** (N=40 supersedes) — partial nerf
  - hardcore_06: 🔴 RED blocker (0% WR, boss invincible)

**Master-dd action required**: 2 fix path bundle

1. hardcore_07 additional ~10pp WR nerf (cost_ap 2→3 OR scenario-tagged multiplier)
2. hardcore_06 boss HP nerf OR Apex resistance reduction

## Bundle resume trigger next session

> _"hardcore_07 additional nerf path 1 (cost_ap 2→3 top-2 picks) + N=40 ratify verify + hardcore_06 boss HP nerf 20-25% Apex locale + N=10 verify"_
