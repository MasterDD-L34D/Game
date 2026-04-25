---
title: HC07 Iter1 vs Iter2 Calibration Report
workstream: ops-qa
category: playtest
doc_status: active
doc_owner: claude-code
last_verified: '2026-04-25'
source_of_truth: false
language: it
review_cycle_days: 30
tags:
  - calibration
  - hardcore-07
  - m14-c
  - iter2
related:
  - docs/playtest/2026-04-26-M14-C-elevation-calibration.md
  - docs/process/2026-04-26-calibration-harness-policy.md
  - docs/playtest/2026-04-25-hardcore-07-iter1-N10.json
  - docs/playtest/2026-04-25-hardcore-07-iter2-N10.json
---

# HC07 Iter1 vs Iter2 Calibration — N=10 Pre-Wednesday Playtest

## TL;DR

Eseguito HC07 calibration N=10 iter1 + iter2 autonomous 2026-04-25 sera. Iter1 90% WR → iter2 80% WR (-10pp improvement). **Both out band** target 30-50% (gap 30-40pp). Per policy `harness ≠ merge gate` ([PR #1744](https://github.com/MasterDD-L34D/Game/pull/1744)) accettato come AMBER + flag human playtest oracolo vero.

## Iter1 baseline (HC07 PR #1739 + #1744 state)

```json
{
  "n": 10,
  "win_rate": 90.0,
  "defeat_rate": 0.0,
  "timeout_rate": 10.0,
  "timer_expire_rate": 0.0,
  "rounds_avg": 11.4,
  "rounds_median": 12.0,
  "kd_avg": 3.9,
  "target_band": "win 30-50%",
  "in_band": false
}
```

Configurazione iter1:

- `mission_timer.turn_limit: 10`
- `reinforcement_policy.cooldown_rounds: 1`
- `reinforcement_policy.min_distance_from_pg: 4`
- `reinforcement_policy.max_total_spawns: 6`
- `patrol_leader.hp: 15`

## Iter2 tune

5 knob:

- `mission_timer.turn_limit: 10 → 8` (stringe finestra success)
- `reinforcement_policy.cooldown_rounds: 1 → 0` (spawn immediato eligible)
- `reinforcement_policy.min_distance_from_pg: 4 → 2` (spawn più vicino)
- `reinforcement_policy.max_total_spawns: 6 → 8` (più pressure totale)
- `patrol_leader.hp: 15 → 18` (regge altri 1-2 round)

## Iter2 result

```json
{
  "n": 10,
  "win_rate": 80.0,
  "defeat_rate": 0.0,
  "timeout_rate": 20.0,
  "timer_expire_rate": 0.0,
  "rounds_avg": 12.5,
  "rounds_median": 12.0,
  "kd_avg": 3.8,
  "target_band": "win 30-50%",
  "in_band": false
}
```

## Diff iter1 → iter2

| Metric     | Iter1 | Iter2 | Delta |
| ---------- | ----: | ----: | ----: |
| WR         |   90% |   80% | -10pp |
| Defeat     |    0% |    0% |   0pp |
| Timeout    |   10% |   20% | +10pp |
| Rounds avg |  11.4 |  12.5 |  +1.1 |
| KD         |   3.9 |   3.8 |  -0.1 |
| In band    |    ❌ |    ❌ |     — |

## Findings

1. **Direzione corretta**: WR -10pp, timeout +10pp = encounter più stretto.
2. **`timer.expired: false` in TUTTI 20 run** nonostante turn_limit 10 / 8 — mission timer applica `escalate_pressure +30 + extra_spawns` ma NON termina encounter. Comportamento atteso (escalate, non force-defeat).
3. **KD ratio 3.8-3.9 invariato** = harness greedy-player policy domina enemy aggressive AI a prescindere knob. Single-policy bias ([PR #1744 Restricted Play](https://github.com/MasterDD-L34D/Game/pull/1744)).
4. **0% defeat in 20 run** — party non muore mai, solo timeout. Tank vanguard pattern troppo robusto vs current enemy mod.

## Iter3 candidate (NON shipped)

Per chiudere band 30-50%:

- Enemy `mod` raise: patrol_leader 3→4, scouts 2→3 (Lethal Hit Rate +)
- Player HP slight nerf: scout 10→8, support 11→9
- Reinforcement weight predone_agile +50%
- Eligibility expand: `min_tier: Calm → null` (always-on)

Iter3 effort: ~30min tune + ~5min N=10 sim. **Skip** per ora — stessa single-policy bias caps below 70% WR comunque.

## Decision

**Accept iter2** as AMBER ship per [`docs/process/2026-04-26-calibration-harness-policy.md`](../process/2026-04-26-calibration-harness-policy.md):

> "RED ≠ blocker se AI 307/307 verde + direzione coerente. Oracolo vero = TKT-M11B-06 playtest live umano."

Direzione corretta (-10pp), AI 311/311 ✅, AMBER acceptable.

## Wednesday playtest implication

HC07 quartet (4p timer 8t pod_rush) playable mercoledì come stretch encounter:

- Player win expectation ≈ 60-80% (real players slower than greedy harness)
- Real friction emerges: target priority decisions, hazard awareness, timer pressure
- Fall-back: skip rule "HC dopo 1:20 → Debrief" (vedi playbook 90-min)

## Files generated

- `docs/playtest/2026-04-25-hardcore-07-iter1-N10.json` — raw N=10 iter1
- `docs/playtest/2026-04-25-hardcore-07-iter2-N10.json` — raw N=10 iter2
- `docs/playtest/2026-04-25-hardcore-07-iter1-iter2-calibration.md` — questo report

Code: `apps/backend/services/hardcoreScenario.js` HARDCORE_SCENARIO_07_POD_RUSH iter2 5 knob (turn_limit 8 + cooldown 0 + min_distance 2 + max_spawns 8 + leader hp 18).

## Validations

- `node --test tests/ai/*.test.js` → 311/311 (regression preserved)
- `python tools/check_docs_governance.py --strict` → 0/0
- Backend backend health probe verde port 3342 (LOBBY_WS_PORT 3343 fallback)
