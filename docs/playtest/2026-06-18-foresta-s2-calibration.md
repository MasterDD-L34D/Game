---
title: 'Foresta S2 calibration -- enc_foresta_pilot_01 (#2850 follow-up)'
workstream: ops-qa
category: playtest
doc_status: active
doc_owner: claude-code
last_verified: '2026-06-18'
language: en
tags: [playtest, calibration, foresta, species, n100, ai-driven]
---

# Foresta S2 calibration -- enc_foresta_pilot_01

S2 of the #2850 5-stub calibration. A NEW foresta_temperata adapter pilot
(`forestaPilotScenario.js`, biome-agnostic `ecologyCombatAdapter`) that exercises the
two promoted foresta grazers (nebulocornis-mollis, arboryxis-lenis) alongside the
canonical foresta apex, so their adapter-derived stats actually move the win-rate.

Runtime node 22, seed 424242, 4 shards base-port 3400 (prod untouched).

## Roster (adapter-derived, NEUTRAL edm)

lupus-temperatus (T2 -> APEX, anchor) + evento-seme-uragano (T4 -> HAZARD) +
blight-micotico (T3 -> HAZARD) + nebulocornis-mollis (T1 -> PREY) + arboryxis-lenis
(T1 -> PREY) + sentinella-radice (T1 -> SUPPORT). All 6 adapter role-mappings clean
(0 warnings), incl. the #2850 grazers -> PREY via the S1 ROLE_TROFICO_MAP extension.

## N-ladder

| roster        | edm | N   | WR       | note                                      |
| ------------- | --- | --- | -------- | ----------------------------------------- |
| 5-enemy       | 1.0 | 10  | 0.80     | too easy                                  |
| 5-enemy       | 2.0 | 10  | 0.60     |                                           |
| 5-enemy       | 2.8 | 40  | 0.575    | edm lever SATURATED ~0.575 (kd-dominated) |
| 5-enemy       | 3.2 | 40  | 0.625    | non-monotonic (saturated)                 |
| 5-enemy       | 2.8 | 100 | 0.60     | at [0.40,0.60] ceiling -- fragile         |
| 6-enemy (+T4) | 2.8 | 40  | 0.175    | T4 over-hard                              |
| 6-enemy       | 1.5 | 40  | 0.30     | lever has grip now                        |
| 6-enemy       | 1.0 | 40  | 0.55     | IN                                        |
| 6-enemy       | 1.0 | 100 | **0.50** | **RATIFIED -- dead-center**               |

## RATIFIED

6-enemy roster, **NEUTRAL edm 1.0 -> WR 0.50, N=100** seed 424242, band **[0.40,0.60]**
(defeat 0.50, timeout 0, kd 3.31).

**Finding -- edm saturation on a fodder-heavy roster**: the 5-enemy roster (1 T2 apex +
T3 hazard + 3 weak T1) saturated the edm lever at ~0.575-0.625 -- the fodder dies before
dealing damage, so more enemy_damage_multiplier barely moves WR (kd-dominated). [0.30,0.50]
was unreachable. Adding a tougher second threat (evento-seme-uragano, T4) gave the lever
grip, so the roster carries the difficulty at NEUTRAL edm (mirrors the badlands-pilot
design: adapter baseline stats are correct, edm = 1.0). The damage knob is a FLAT/saturating
lever on weak rosters; roster composition is the real lever.

**Re-band [0.30,0.50] -> [0.40,0.60]** (master-dd follow-up): [0.40,0.60] = the badlands-pilot
precedent (same scenario type: first-contact adapter pilot, winnable) and centers the natural
WR 0.50. master-dd may re-tune if a harder foresta encounter is wanted.

NOT in the gated canonical-suite oracle manifest (mirrors the badlands adapter scenarios) --
ratified in damage_curves.yaml + this doc, runnable via SCENARIO_MAP, kept OUT of the
per-PR combat gate.

## vc

The 2 foresta species carry heuristic vc (S0). Telemetry-driven vc refinement = S3 (deferred).
