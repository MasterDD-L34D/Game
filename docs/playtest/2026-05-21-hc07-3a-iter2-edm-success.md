---
title: Hardcore_07 3A iter2 SUCCESS — enemy_damage_multiplier_override 2.1 in-band
date: 2026-05-21
type: playtest-calibration
scenario: enc_tutorial_07_hardcore_pod_rush
sprint: v44.4
pillar: [P6]
status: in-band-ratified
supersedes: docs/playtest/2026-05-20-hardcore-07-3a-overshoot.md
last_verified: 2026-05-21
---

# Hardcore_07 3A iter2 — `enemy_damage_multiplier_override 2.1` IN-BAND

## TL;DR (30s)

3A iter1 (`enemy_count_modifier -1`) REJECTED — inverted direction (WR 60->70%).
iter2 Path B (`enemy_damage_multiplier_override`, REPLACES class hardcore 1.8):
2-point bisection landed **edm 2.1 -> N=40 WR 45% IN-BAND** [30-50%].

hardcore_07 fixed: 🟡 OOB-high 60% -> 🟢 in-band 45%.

## Calibration trail

| edm                 | Sample          | WR      | CI95     | Verdict                  |
| ------------------- | --------------- | ------- | -------- | ------------------------ |
| 1.8 (class default) | N=40            | 60%     | [45, 75] | OOB-high +10pp           |
| 2.2                 | N=10 probe      | 30%     | [10, 60] | direction toward (L-072) |
| 2.2                 | N=40 ratify     | 27.5%   | [15, 42] | OOB-low -2.5pp overshoot |
| **2.1**             | **N=40 ratify** | **45%** | [30, 60] | **IN-BAND** ✅           |

Slope ~8pp WR per 0.1 edm. 2.2 overshot floor; 2.1 lands upper-mid band.

## Method discipline applied

- **L-072 direction-test**: N=10 probe FIRST (WR 60->30 = toward target) before
  committing N=40. Avoided wasted ratify on wrong direction (the iter1 mistake).
- **L-069 N-sample**: N=10 probe = direction only; N=40 = ratify-grade placement.
- **L-070 single-knob**: one knob (edm) bisected, no multi-knob overshoot.
- **Method C parallel**: both N=40 ratifies ~6min (4x speedup vs ~24min serial).

## Engineering

### Infrastructure

- `damageCurves.js applyEnemyDamageMultiplier(unit, class, curves, scenarioId)`:
  scenario_overrides.enemy_damage_multiplier_override REPLACES class default
  (not stacked) when scenarioId provided.
- `session.js`: scenario_id passthrough at enemy spawn
  (`req.body.encounter.id || encounter_id || scenario_id`).
- `batch_calibrate_hardcore07.py`: sends `encounter.id = SCENARIO_ID` at /start
  so override resolves.
- `damage_curves.yaml`: `enc_tutorial_07_hardcore_pod_rush.enemy_damage_multiplier_override: 2.1`

### Verification

- Resolver unit smoke: edm 2.2 mod 3->7, class 1.8 mod 3->5, other-scenario inherits class
- N=40 ratify WR 45% in-band
- Services tests 1009/1009 PASS
- hardcoreScenario tests 7/7 PASS
- Format PASS
- trait_used telemetry captured (FASE B working: zampe_a_molla 18 in edm 2.2 run)

## Pillar P6 state

| Scenario    | Knob                                 | WR (N=40) | Status                                                               |
| ----------- | ------------------------------------ | --------- | -------------------------------------------------------------------- |
| hardcore_06 | boss_hp_multiplier 0.65              | 15%       | 🟢 candidato PARTIAL (primary in-band, secondary defeat 85% RED)     |
| hardcore_07 | enemy_damage_multiplier_override 2.1 | **45%**   | 🟢 **IN-BAND** (defeat 0% / timeout 55% — timer-driven scenario, OK) |

hardcore_07 secondary metrics (defeat 0% / timeout 55%) are scenario-appropriate:
pod-rush timer scenario expects timeouts (party can't always clear before timer).

## Outstanding next session

- hardcore_06 secondary band convergence (defeat 85% -> 40-55%): N=40-objective
  Optuna (now safe via staging-writer) OR MAP-Elites real run
- L-072 codify formally (anti-pattern catalog entry)

## Bundle resume trigger

> _"hardcore_06 secondary band Optuna N=40-objective (staging-writer safe) OR MAP-Elites real N=40 run + L-072 anti-pattern codify"_
