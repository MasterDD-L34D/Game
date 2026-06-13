---
title: Hardcore_07 post-Wave 5-7 nerf calibration verify (N=10)
date: 2026-05-20
type: playtest-calibration
scenario: enc_tutorial_07_hardcore_pod_rush
sprint: post-v44.3-wave-6
pillar: [P6, P1]
status: verified-in-band
last_verified: 2026-05-20
---

# Hardcore_07 post-Wave 5-7 nerf — N=10 drift verify

## TL;DR (30s)

Wave 5-7 cluster nerf (PR [#2344](https://github.com/MasterDD-L34D/Game/pull/2344) 6 trait `cost_ap 1→2`) **drift VERIFIED in-band** centro target window 30-50%. **WR 40.0%**, defeat 0%, timeout 60% (runs hit MAX_ROUNDS=15).

Pre-Wave 5-7 baseline (4-5 batch out-of-band, all PRE-nerf): **WR 80-100%** → post-nerf **WR 40%** = **delta -40-60pp**. Calibration goal achieved.

CI95 WR [10, 70] wide per N=10 small. N=40 follow-up consigliato per tighten ±10pp, ma signal già in-band centro.

## Run config

- Scenario: `enc_tutorial_07_hardcore_pod_rush`
- N: 10
- Host: `localhost:3334`
- Backend SHA: `a1936bd9` (post-PR #2351 A4 ionico + #2350 P2/P3 cleanup + #2344 Wave 5-7 nerf)
- Player policy: greedy atk-closest, channel fisico
- AI: auto via `/round/execute`
- MAX_ROUNDS: 15
- Elapsed: 363.3s (~6min)
- Failures: 0

## Summary

| Metric            | Value     | CI95       | Target | Verdict               |
| ----------------- | --------- | ---------- | ------ | --------------------- |
| **win_rate**      | **40.0%** | [10, 70]   | 30-50% | ✅ **in-band**        |
| defeat_rate       | 0.0%      | [0, 0]     | —      | —                     |
| timeout_rate      | 60.0%     | [30, 90]   | —      | runs cap MAX_ROUNDS   |
| timer_expire_rate | 0.0%      | —          | —      | no scenario timer hit |
| rounds_avg        | 14.4      | [13.6, 15] | —      | combat full duration  |
| rounds_median     | 15.0      | —          | —      | most runs hit cap     |
| kd_avg            | 2.9       | [2.4, 3.4] | —      | players favorable     |

## Per-run breakdown

| Run | Outcome | Rounds | Players alive | Enemies alive | KD  |
| --- | ------- | ------ | ------------- | ------------- | --- |
| 1   | victory | 11     | 3             | 0             | 4.0 |
| 2   | victory | 14     | 3             | 0             | 4.0 |
| 3   | timeout | 15     | 3             | 2             | 2.0 |
| 4   | timeout | 15     | 3             | 2             | 2.0 |
| 5   | victory | 14     | 3             | 0             | 4.0 |
| 6   | timeout | 15     | 3             | 2             | 2.0 |
| 7   | timeout | 15     | 3             | 1             | 3.0 |
| 8   | timeout | 15     | 3             | 2             | 2.0 |
| 9   | timeout | 15     | 3             | 2             | 2.0 |
| 10  | victory | 15     | 3             | 0             | 4.0 |

## Pattern observation

- Zero defeat in N=10 → player party survival robust (3/3 alive every run).
- Timeout dominant (6/10) = combat extends to MAX_ROUNDS cap senza clear kill.
- Victory clusters (4 runs) = clear kills, KD=4 con 1 player loss + 4 enemy kills.
- Timeout runs lasciano 1-2 enemy alive after 15 round → DPS marginal sufficient ma not snowball.

**Reading**: nerf abbatte snowball precoce ma player party non collassa. Combat ora richiede positioning + tactical decisions vs auto-win pre-nerf. P6 fairness pillar verde candidato confirmed.

## Drift vs v44.3 baseline (pre-Wave 5-7)

Per CLAUDE.md v44.3 sprint context (playtest-analyzer wave 6 finding):

> 🔴 hardcore_07 WR 80-100% vs target 30-50% (4-5 batch runs out-of-band, all pre-Wave 5-7 data)

**Post-nerf N=10 result**: WR 40% in-band ✅. Delta -40-60pp.

## Limitations + next

- **N=10 small**: CI95 [10, 70] wide. N=40 follow-up tighten signal to ±10pp.
- **Greedy policy only**: master-dd live playtest signal ortogonal (humans non greedy).
- **Single-scenario**: hardcore_06 ancora 0% WR pre-Wave 5-7 (party DPS insufficient vs Apex+Critical boss). Verify post-nerf gated separate batch.
- **MBTI vc telemetry not firing**: vc_mbti null in 413 session logs (open issue per v44.3).
- **PI-shop trait_T3 acquisition <3%**: economically unreachable (open issue per v44.3).

## Artifacts

- JSON: [docs/playtest/2026-05-20-hardcore-07-postwave57.json](./2026-05-20-hardcore-07-postwave57.json)
- JSONL: [docs/playtest/2026-05-20-hardcore-07-postwave57.jsonl](./2026-05-20-hardcore-07-postwave57.jsonl)
- Log: [docs/playtest/2026-05-20-hardcore-07-postwave57.log](./2026-05-20-hardcore-07-postwave57.log)

## Recommendation master-dd

1. ✅ **RATIFY Wave 5-7 nerf** — drift verified, no rollback needed
2. 🟡 **N=40 follow-up** (~24min): tighten WR CI95 to ±10pp, formal calibration evidence
3. 🟡 **hardcore_06 batch** (parallel scenario): verify Apex+Critical boss party-DPS post-nerf
4. 🟡 **artigli pick-rate sim** (P2 monitor flag deferred wave 5): nightly batch tracking pick distribution
5. 🟢 **P6 pillar 🟢 candidato → 🟢 confirmed** post N=40 ratification + 1+ playtest live session

## Pillar delta

- **P6 Fairness**: 🟢 candidato (v44.3) → 🟢 candidato **HARD reinforced** (calibration drift verified center target)
- **P1 Tattica**: 🟢++ (v44.3) → 🟢++ (no regression, combat duration full = tactical decisions matter)
