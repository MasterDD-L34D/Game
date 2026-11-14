---
title: "L'Ultima Caccia -- canonical WR (round-model) + the WR/KO incompatibility (SPEC-J)"
workstream: ops-qa
category: playtest
doc_status: active
doc_owner: claude-code
last_verified: '2026-06-30'
language: en
tags: [playtest, calibration, badlands, lethal, spec-j, wr, ai-driven]
---

# L'Ultima Caccia -- canonical WR + WR/KO incompatibility (Tier-3 N1)

Follow-up to the first-lethal calibration (#3107). #3107 measured the
creature-KO-rate via the in-process `combat-adapter` path; this doc measures the
canonical **win-rate** with a validated harness and surfaces a design finding: the
two band targets from the design-call (party-WR 25-40% AND creature-KO-rate 25-40%)
are **mutually incompatible**, so master-dd must pick ONE gating metric.

## Method (validated)

Probe `tools/sim/ultima-caccia-wr-probe.js` -- in-process (`createApp` supertest, no
prod-port), **ROUND model** (`/api/session/round/execute`) driven by a faithful JS
port of the canonical Python calibrator's `plan_player_intents` (focus-fire greedy),
`turn_limit_defeat=37` (timeout -> defeat). Enemies use the **canonical adapter
stats** (`deriveCombatStats` from species YAML), the real-play representation -- NOT
the tier-table approximation the ai-driven-sim / #3107 band-probe used.

**Validate-first (anti-SDMG)**: the probe is first run on the RATIFIED pilot
(`enc_badlands_pilot_01`, ratified WR ~0.51). It reproduces **WR 0.55 (N=40), in the
ratified band [0.40,0.60]** -> the harness + WR convention are trustworthy.

> Why not the earlier in-process path: the `combat-adapter` per-unit `/action` loop
> does NOT resolve -- it gave WR 0 (40/40 timeout) on the RATIFIED pilot. The round
> model + focus-fire planner is what reproduces the canonical band. (Caught by the
> validate-first step.)

## The WR/KO tradeoff (N=40 each, canonical adapter stats)

| roster (apex first)                                 | WR    | creature-KO-rate |
| --------------------------------------------------- | ----- | ---------------- |
| dune + ferro + nano + rust + sand (WR-tuned)        | 0.275 | 0.72             |
| dune + ferro + nano + echo + rust                   | 0.475 | 0.65             |
| dune + echo + echo + rust + rust (**#3107 roster**) | 0.825 | 0.40             |

WR and KO-rate are **anti-correlated**: a fight hard enough to sit at WR 25-40% kills
~70% of the party (KO 0.72); a fight whose KO-rate is ~40% has WR ~0.82. There is no
single roster with BOTH metrics in [0.25,0.40] -- they describe different difficulty
levels. (Also position-sensitive: the SAME five species reordered gave KO 0.57 vs
0.72, so enemy spawn slots are a real difficulty lever.)

## Read

- **The design-call's dual target is unsatisfiable.** For a PERMADEATH encounter the
  meaningful metric is the **creature-KO-rate = the death-rate** (under LETHAL +
  consent every player KO is a real death). A WR-25-40% roster (KO 0.72) would wipe
  ~3 of 4 creatures every mission -- far past "hardcore opt-in".
- **The authored #3107 roster is ~right for a KO-gate.** Its canonical KO-rate is
  **0.40** (round model, adapter stats) -- corroborating #3107's 0.344 (combat-adapter,
  tier-table). That sits at the TOP edge of [0.25,0.40]. Its WR is ~0.82: the party
  usually CLEARS the mission but loses ~40% of its creatures -- real permadeath stakes
  without a guaranteed wipe.

## Owner-gate (master-dd) -- RATIFIED 2026-06-30

**Verdict (AskUserQuestion)**: gate the lethal flip on **creature-KO-rate 25-40%**
(NOT win-rate), and **KEEP the #3107 roster** (dune-stalker apex + 2 echo-wing + 2
rust-scavenger). Its canonical KO-rate ~0.40 sits at the top edge of [0.25,0.40];
WR ~0.82 -- the party usually clears the mission but ~40% of its creatures fall
(real permadeath stakes without a guaranteed wipe). No roster change.

**Remaining LETHAL flip-prereqs**:

1. **Real-play scenario-builder -- DONE (this PR)**: `ultimaCacciaScenario.js` +
   `GET /api/tutorial/enc_badlands_ultima_caccia_01` materialize the #3107 roster with
   canonical adapter stats (the `encounter_id` path only supplies metadata; the caller
   provides the combat units). The lethal mission is now playable at the calibrated
   difficulty (and a live-backend Python re-confirm is unblocked).
2. **master-dd flips** `LETHAL_MISSIONS_ENABLED=true` (irreversible) -- the only
   remaining step. Scenario-builder DONE (this PR) + Godot consent UI DONE (GGv2 #477).

See [[project_spec_j_lethal_wounds]], `docs/playtest/2026-06-30-ultima-caccia-lethal-calibration.md` (the #3107 KO-rate),
`docs/planning/2026-06-29-closeout-master-plan.md` (N1).
