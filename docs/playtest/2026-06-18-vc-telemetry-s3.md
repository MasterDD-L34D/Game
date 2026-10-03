---
title: 'VC telemetry refine S3 -- 5 stub species (#2850 follow-up)'
workstream: ops-qa
category: playtest
doc_status: active
doc_owner: claude-code
last_verified: '2026-06-18'
language: en
tags: [playtest, calibration, vc, telemetry, species, n60, ai-driven]
---

# VC telemetry refine S3 -- 5 stub species

S3 of the #2850 5-stub calibration (master-dd ratified plan:
`docs/planning/2026-06-18-species-calib-5stub-ratification.md`; master-dd chose
"build the PARTIAL refine"). The 5 species carried HEURISTIC VC vectors authored
in S0; S3 replaces the telemetry-DERIVABLE vectors with values aggregated from
real combat sessions, and documents exactly which vectors are NOT derivable.

## Method

Harness `tools/py/vc_telemetry_harness.py` runs N sessions per ratified
calibration scenario, then captures `vc_per_actor` from
`GET /api/session/:id/debrief` -- a non-destructive read taken AFTER combat
resolves but BEFORE `POST /api/session/end` finalizes (a new `vc_per_actor`
field added to that endpoint this PR). Each enemy unit is mapped to its species
via the unit's `species` field, and the per-session `aggregate_indices` are
pooled per species (mean of non-null values).

- N = 60 sessions per scenario (180 total), seed 424242, modulation `full`
  (10x10 grid -- the ratified config), base-port 3400 (never prod 3334/3341).
- Player policy `greedy`, AI auto -- identical to the S1/S2 calibration runs, so
  the enemy AI behavior the VC is scored on matches the calibration that set the
  bands.
- Each of the 5 target species appears in exactly ONE scenario, so its pool is
  the 60 sessions of that scenario.

Per-scenario outcomes (consistency check vs ratified bands):

| scenario                | encounter_class  | V / D / T   | win_rate | ratified band     |
| ----------------------- | ---------------- | ----------- | -------- | ----------------- |
| enc_badlands_ambient_01 | badlands_ambient | 60 / 0 / 0  | 1.00     | designed-winnable |
| enc_badlands_elite_01   | badlands_elite   | 9 / 51 / 0  | 0.15     | [0.15, 0.30]      |
| enc_foresta_pilot_01    | foresta_pilot    | 31 / 29 / 0 | 0.52     | [0.40, 0.60]      |

## Derivability (verified against vcScoring.js + telemetry.yaml)

The VC aggregate index for a vector is built from weighted raw metrics; a raw is
usable only if it is in `DERIVABLE_RAW_KEYS` (vcScoring.js:51) AND non-null for
that unit. `computeAggregateIndex` renormalizes over the derivable subset and
returns `null` when no weighted raw is derivable. Mapping `data/core/telemetry.yaml`
weights against the derivable set:

| index    | weighted raws                                             | derivable?                                           | S3 action      |
| -------- | --------------------------------------------------------- | ---------------------------------------------------- | -------------- |
| aggro    | attacks_started, first_blood, close_engage, kill_pressure | all 4 -> **full**                                    | **refine**     |
| risk     | damage_taken, 1vX, low_hp_time, self_heal, overcap_guard  | 3/5 -> **partial**                                   | **refine**     |
| explore  | new_tiles, time_in_fow, optionals                         | 1/3 (new_tiles) -> **partial**                       | **refine**     |
| setup    | overwatch_turns, trap_value, cover_before_attack          | 0/3 -> **null**                                      | keep heuristic |
| cohesion | formation_time, assists, support_actions                  | 1/3 (assists only); defining raws null -> degenerate | keep heuristic |
| tilt     | window-based (baseline/post-event window)                 | snapshot path returns null (vcScoring.js:566)        | keep heuristic |

Live N=60 confirmed this exactly: `aggro` returned `full` coverage; `risk` and
`explore` returned `partial`; `setup` and `tilt` never produced a value (0
samples); `cohesion` produced only a degenerate partial (mean ~0.0-0.08, driven
by `assists` alone with its two defining raws null).

**Caveat (master-dd "partial refine"):** telemetry refines only
**aggro / risk / explore**. `cohesion`, `setup`, `tilt` stay at their S0
heuristic values. This narrows the brief's optimistic "aggro/risk/setup/explore/tilt"
list: `setup` (all weighted raws non-derivable) and `tilt` (window-based, not
snapshot-applicable) turned out non-derivable from current sim logs, alongside
the already-flagged `cohesion`.

## Per-species aggregate (heuristic -> telemetry)

Refined vectors rounded to 2 decimals, clamped [0,1]. Kept (heuristic) vectors
shown for completeness. N = 60 samples per species per refined index.

| species             | scenario | aggro (was->now) | risk (was->now) | explore (was->now) | cohesion\* | setup\* | tilt\* |
| ------------------- | -------- | ---------------- | --------------- | ------------------ | ---------- | ------- | ------ |
| rubrospina-velox    | ambient  | 0.5 -> 0.28      | 0.5 -> 0.39     | 0.8 -> 0.00        | 0.4        | 0.4     | 0.3    |
| ferriscroba-detrita | ambient  | 0.2 -> 0.26      | 0.2 -> 0.36     | 0.4 -> 0.02        | 0.7        | 0.6     | 0.2    |
| ferrimordax-rutilus | elite    | 0.8 -> 0.73      | 0.7 -> 0.46     | 0.5 -> 0.07        | 0.2        | 0.4     | 0.5    |
| nebulocornis-mollis | foresta  | 0.2 -> 0.39      | 0.3 -> 0.41     | 0.5 -> 0.05        | 0.6        | 0.5     | 0.2    |
| arboryxis-lenis     | foresta  | 0.2 -> 0.22      | 0.2 -> 0.36     | 0.7 -> 0.05        | 0.4        | 0.6     | 0.2    |

`*` kept heuristic (non-derivable; see Derivability table).

Coverage per refined index (live): `aggro` = full; `risk` = partial (missing
self_heal, overcap_guard); `explore` = partial (missing time_in_fow, optionals).
Dispersion: `aggro` pstdev ~0.10-0.24 (highest for the foresta grazers, whose
engagement varies with the apex anchor); `risk` ~0.00-0.10; `explore` ~0.00-0.05
(enemy AI beelines / dies fast -> few new tiles, hence the low explore floor).

## Notes / honesty

- The telemetry reflects the enemy AI behavior under the calibration harness
  (greedy player, AI auto). That is the intended signal for a sim-derived VC --
  it is what these creatures actually do in the combat the bands were set on, not
  a hand-authored personality guess.
- `explore` lands near zero across the board: the index reduces to `new_tiles`
  only, and AI enemies move toward players or are eliminated before roaming. This
  is a faithful (if low) telemetry value, not a bug.
- Band impact: VC vectors are descriptive telemetry metadata, not combat inputs
  to the resolver -- this change is band-neutral (no win-rate effect). The S1/S2
  ratified bands are unchanged.

## Reproduce

```
PORT=3400 LOBBY_WS_ENABLED=false node apps/backend/index.js   # never prod 3334/3341
python tools/py/vc_telemetry_harness.py --host http://127.0.0.1:3400 --n 60 --seed 424242
```
