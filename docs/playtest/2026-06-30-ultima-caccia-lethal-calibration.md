---
title: "L'Ultima Caccia -- first lethal-mission calibration (SPEC-J)"
workstream: ops-qa
category: playtest
doc_status: active
doc_owner: claude-code
last_verified: '2026-06-30'
language: en
tags: [playtest, calibration, badlands, lethal, spec-j, ai-driven]
---

# L'Ultima Caccia -- first lethal-mission band probe (SPEC-J)

Direction-probe evidence for `enc_badlands_ultima_caccia_01`, the FIRST
`lethal: true` encounter of the SPEC-J lethal-wounds suite. The encounter ships
flag-OFF (`LETHAL_MISSIONS_ENABLED` unset + no consent producer) -- this probe
measures the combat band the lethal mission would run at, it never produces
permadeath.

## Design-call (master-dd 2026-06-30, AskUserQuestion)

- **Vehicle**: a NEW dedicated lethal encounter (not flagging an existing one) --
  clean "opt-in dangerous mission" framing, does not retro-change a played scenario.
- **Band target**: hardcore opt-in -- party win-rate 25-40%, creature-KO-rate
  25-40%.
- **Fiction**: the party confronts the apex Skiv (dune-stalker) in its ferrous
  badlands -- the hunt where the stakes are real. Ties permadeath to attachment
  (creature dossier #2856): a creature can fall for good.

## Method

In-process probe `tools/sim/ultima-caccia-band-probe.js` (`createApp` supertest,
NO prod backend, node 22, seeds 1..N), elimination, grid 10x10, maxRounds 40.

- **Enemies** = the encounter WAVE 1, expanded with the SAME tier->stat table the
  canonical AI-sim harness uses (`tests/smoke/ai-driven-sim.js buildEnemiesFromYaml`:
  base hp7/mod1, elite hp10/mod2, apex hp14/mod4, damage {1,3}, ap 2, range 1).
  Midfield spawn (x~5-6) mirrors the badlands-pilot engagement distance.
- **Party** = the CANONICAL badlands tier party, fetched from
  `GET /api/tutorial/enc_badlands_pilot_01` (the same source the canonical Python
  harness uses -- `batch_calibrate_badlands_pilot_01.py:run_one`). NOT hand-built,
  so the only difference vs the badlands-pilot calibration is the enemy roster.

Roster variants: `pilot` = apex + 2 elite (the pilot wave-1, [0.40,0.60] reference);
`minus_base` = + 1 base; `full` = + 2 base (the authored wave 1).

Codex #3107 P2 corrections (applied): the probe now (1) emits the authored
`ai_profile` per enemy (flanking apex + aggressive pack) and (2) spawns enemies at
the encounter's authored `spawn_points` -- which were aligned to midfield (x~5-6,
the canonical badlands engagement) so probe and shipped mission are identical.

## Results

Authoritative (corrected probe -- ai_profile emitted + spawn == encounter):

| variant  | N   | creature_KO_rate | win_rate | timeouts | avg_rounds |
| -------- | --- | ---------------- | -------- | -------- | ---------- |
| full (5) | 40  | **0.356**        | 0.025    | 39/40    | 39.8       |

Pre-correction sweep (midfield spawn, ai_profile dropped) -- for direction only:

| variant       | N   | creature_KO_rate | win_rate | timeouts | avg_rounds |
| ------------- | --- | ---------------- | -------- | -------- | ---------- |
| pilot (3)     | 12  | 0.396            | 0.083    | 11/12    | 39.6       |
| minus_base(4) | 24  | 0.302            | 0.125    | 21/24    | 39.5       |
| full (5)      | 24  | 0.344            | 0.000    | 24/24    | 40.0       |
| full (5)      | 40  | 0.344            | 0.000    | 40/40    | 40.0       |

## Read

**Primary metric = creature-KO-rate** (the permadeath-relevant one: under
LETHAL+consent every player KO becomes a real death, so the KO-rate IS the
death-rate). The authored **full** roster lands at **0.356 (N=40, corrected probe)** --
squarely inside the hardcore target band [0.25, 0.40]. (Pre-correction it was 0.344
at N=24/40; emitting the authored flanking/aggressive profiles nudged it up slightly
-- the enemies are marginally more lethal with their real behavior, as expected.)
The roster is in the right ballpark for hardcore opt-in.

**Win-rate is NOT reliably measurable in this in-process probe.** The
`combat-adapter` player policy grinds to the 40-round cap (avg_rounds ~40,
~90% timeouts) where the canonical Python harness (`plan_player_intents`
focus-fire + `turn_limit_defeat` semantics) resolves the fight. So the WR column
here is timeout-dominated and is NOT the band signal -- only the KO-rate is.

## Decision

- **Keep the authored 5-enemy wave-1** (apex dune-stalker + 2 echo-wing elite +
  2 rust-scavenger base). Its creature-KO-rate centers the hardcore band.
- The encounter ships **flag-OFF** -- band-neutral by construction.

## Owner-gated next (NOT this session)

The absolute **win-rate band ratification + the permadeath flip** are owner-gated
(N-sample discipline: N=24/40 here = direction, ratify = owner; SDMG: even a
canonical-party in-process probe is a hypothesis, the specialist harness decides):

1. Run the canonical N=40 WR-band via the G2 / Python harness. This needs either
   (a) a scenario-builder + `/api/tutorial/enc_badlands_ultima_caccia_01` wiring
   (mirror `badlandsPilotScenario.js`) so the harness materializes party+enemies,
   OR (b) a live backend + a `batch_calibrate_ultima_caccia_01.py` driver (clone
   `batch_calibrate_badlands_pilot_01.py`, retarget SCENARIO_ID + encounter_class
   hardcore).
2. If in band -> master-dd flips `LETHAL_MISSIONS_ENABLED=true` (the irreversible
   step) once the Godot consent UI (DONE, GGv2 #477) + a lethal data path are live.

See [[project_spec_j_lethal_wounds]], `docs/design/evo-tactics-lethal-wounds-rituals.md`.
