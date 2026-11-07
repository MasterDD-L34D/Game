---
title: Hardcore_06 post-Wave 5-7 nerf calibration verify (N=10) — RED verdict
date: 2026-05-20
type: playtest-calibration
scenario: enc_tutorial_06_hardcore
sprint: post-v44.3-wave-6
pillar: [P6]
status: red-blocker
last_verified: 2026-05-20
---

# Hardcore_06 post-Wave 5-7 nerf — N=10 RED blocker

## TL;DR (30s)

**WR 0% (10/10 defeats)**. Wave 5-7 cluster nerf (PR [#2344](https://github.com/MasterDD-L34D/Game/pull/2344) 6 trait `cost_ap 1→2`) **NO change** hardcore_06 (still 0% pre vs post). Party DPS insufficient vs Apex+Critical boss kit — boss survives every run with avg 22.4 HP remaining after 25 rounds cap.

**Verdict harness**: `RED` (3/3 band violations).

**Pillar P6 delta**: 🟢 candidato → 🟡 **split-verdict** (hardcore_07 ✅ in-band 40%, hardcore_06 🔴 broken).

## Run config

- Scenario: `enc_tutorial_06_hardcore`
- N: 10
- Host: `localhost:3334`
- Backend SHA: `a1936bd9` (post Wave 5-7 nerf PR #2344)
- Encounter class: `hardcore`
- Player count: 8 (scout × 4 + support × 2 + tank × 2)
- Enemy count: 6 (apex boss + elite hunter × 2 + 3 others)
- Probe N=1: PASS (schema validated 14 units total, AI engages)
- Elapsed: 559.9s (~9.3min)
- Failures: 0

## Summary

| Metric                        | Value          | Target       | Δ band                             |
| ----------------------------- | -------------- | ------------ | ---------------------------------- |
| win_rate                      | **0.00**       | [0.15, 0.25] | -15pp below floor                  |
| defeat_rate                   | **1.00**       | [0.40, 0.55] | +45pp above ceiling                |
| timeout_rate                  | **0.00**       | [0.15, 0.25] | -15pp below floor                  |
| turns_avg                     | 25 (median 25) | —            | 25 cap hit every run               |
| kd_avg                        | 2.575          | —            | players favorable but insufficient |
| dmg_dealt_avg (party)         | 47.3           | —            | DPS budget insufficient            |
| dmg_taken_avg (party)         | 24.1           | —            | survivable not winning             |
| boss_hp_remaining_avg_on_loss | 22.4           | —            | boss survives every defeat         |
| players_alive_avg_on_win      | null           | —            | zero wins                          |

## Verdict harness

```
"verdict": "RED",
"verdict_reasons": [
  "win_rate=0.00 out of band [0.15,0.25] (red)",
  "defeat_rate=1.00 out of band [0.4,0.55] (red)",
  "timeout_rate=0.00 out of band [0.15,0.25] (red)"
]
```

## Per-run breakdown

| Run | Outcome | Rounds | P alive/dead | E alive/dead | DPS | Boss HP left | Pressure |
| --- | ------- | ------ | ------------ | ------------ | --- | ------------ | -------- |
| 0   | defeat  | 25     | 6/2          | 1/5          | 49  | 21           | 80       |
| 1   | defeat  | 25     | 6/2          | 1/5          | 45  | 25           | 100      |
| 2   | defeat  | 25     | 6/2          | 1/5          | 48  | 22           | 80       |
| 3   | defeat  | 25     | 5/3          | 1/5          | 41  | 29           | 90       |
| 4   | defeat  | 25     | 7/1          | 1/5          | 45  | 25           | 100      |
| 5   | defeat  | 25     | 4/4          | 1/5          | 55  | 15           | 70       |
| 6   | defeat  | 25     | 5/3          | 1/5          | 54  | 16           | 80       |
| 7   | defeat  | 25     | 6/2          | 2/4          | 27  | 40           | 100      |
| 8   | defeat  | 25     | 7/1          | 1/5          | 61  | 9            | 90       |
| 9   | defeat  | 25     | 5/3          | 1/5          | 48  | 22           | 80       |

**Pattern dominante**: Party clears 5/6 enemies (elite hunters + critical adds). Apex boss survives every run with 9-40 HP remaining. Player DPS exhausted vs boss kit before AP budget allows kill.

## AI intent distribution

| Tier     | Action  | Count          |
| -------- | ------- | -------------- |
| Apex     | attack  | 126 (dominant) |
| Critical | move    | 72             |
| Apex     | move    | 66             |
| Apex     | unknown | 24             |
| Critical | unknown | 21             |
| Critical | attack  | 13             |
| High     | move    | 3              |
| High     | attack  | 1              |

Apex|attack 126 = boss engages aggressively, party tanks adequate (dmg_taken 24.1) ma return DPS 47.3 insufficiente.

## Root cause hypothesis

**Wave 5-7 nerf side-effect on hardcore_06**:

PR #2344 raised `cost_ap 1→2` on 6 trait cluster. Effect:

- ✅ **hardcore_07** (snowball scenario): cost increase abbatte spam → in-band 40% WR
- 🔴 **hardcore_06** (boss-rush): cost increase **reduces party damage budget** vs Apex absorbing entire pool → 0% WR

**Calibration tension**: stesso knob (`cost_ap`) push hardcore_07 in-band MA mantiene hardcore_06 broken. Single-knob recalibration insufficient.

**Reading P6 pillar**: Wave 5-7 era calibrato per snowball scenari. Apex-tank scenari richiedono **dedicated knob**.

## Recommendation master-dd

**4 path candidate** (in priority order):

1. **🎯 Boss HP nerf locale** (~30min impl): Apex boss HP scale-down 20-25% solo in hardcore_06. Lowest blast-radius. Verify via N=10 batch post-fix.
2. **Party DPS buff via trait synergy** (~1-2h): expose Wave 5-7 6-trait pre-nerf cost SOLO contro Apex boss (resistance debuff vs apex tag). Mantiene snowball nerf hardcore_07.
3. **Boss Apex resistance reduction** (~30min impl): reduce Apex archetype damage resistance against `cost_ap=2` trait tier in damage_curves.yaml.
4. **Encounter timer expansion** (~15min impl): MAX_ROUNDS 25 → 35-40, give party more AP budget windows. Risk: snowball regression on hardcore_07 timeout band.

**Recommended ordering**: 1 → verify N=10 → if still RED, escalate to 3 → if still RED, 2 (most complex).

## Limitations + next

- **N=10 small**: CI95 wide, ma 10/10 defeat = clear signal, no false-negative risk.
- **Greedy policy only**: human party may optimize boss focus-fire pattern auto-policy misses.
- **MBTI vc telemetry null**: `vc_mbti=null` in 10/10 runs (open issue per v44.3 — vc scoring not firing batch path).
- **N=40 follow-up not necessary**: 100% defeat rate too strong signal to need tighten.

## Artifacts

- JSON: [docs/playtest/2026-05-20-hardcore-06-postwave57.json](./2026-05-20-hardcore-06-postwave57.json)
- JSONL: [docs/playtest/2026-05-20-hardcore-06-postwave57.jsonl](./2026-05-20-hardcore-06-postwave57.jsonl)
- Log: [docs/playtest/2026-05-20-hardcore-06-postwave57.log](./2026-05-20-hardcore-06-postwave57.log)

## Pillar delta

- **P6 Fairness**: v44.3 🟢 candidato → **🟡 split-verdict**
  - hardcore_07: 🟢 candidato HARD reinforced (40% WR in-band)
  - hardcore_06: 🔴 RED blocker (0% WR, boss invincible)
- Master-dd action required: pick recommendation path 1-4 + ship fix + N=10 verify

## Bundle resume trigger next session

> _"hardcore_06 path 1 boss HP nerf 20-25% Apex locale + N=10 verify post-fix + ratify or escalate path 3 resistance reduction"_
