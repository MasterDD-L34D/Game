---
title: 'W5 sim AI-player recon -- objective-aware / positioning long-pole (corrected premise)'
date: 2026-07-01
sprint: closeout-w5-sim-harness
doc_status: review_needed
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-07-01'
source_of_truth: false
language: it-en
review_cycle_days: 90
---

# W5 -- sim AI-player recon

> Kick-off recon for W5 (the sim-harness long-pole). Maps the current AI-player + objective
> system against git-truth, CORRECTS the "passive closest-attack / never wins non-elim"
> premise the chip + register carried, and frames the design-call for master-dd.
> **Nothing built here** -- recon + design-fork only. Bands stay PROVISIONAL until W5 lands.

## 0. TL;DR (verify-first correction, anti-pattern #19)

The premise "the sim AI-player is passive closest-attack and never wins capture/escort/escape/
survival" is **PARTLY STALE**. Ground-truth (code + tests, not markers):

- **Objective-awareness ALREADY EXISTS.** `tools/sim/combat-policy.js` has OA2/SPEC-O
  zone-pursuit: for `capture_point / sabotage / escape / escort` it drives units toward the
  objective `target_zone`, routes around occupied tiles, satisfies `min_units_in_zone > 1`,
  and HOLDS in-zone (never chases a far foe out). `tests/sim/combatPolicy.test.js` = **13/13
  pass**, incl. "two units from adjacent spawns BOTH reach the zone (min_units=2)".
  `tools/sim/scenario-enemies.js` gives all 6 objective types their authored scaled roster so
  "completion_rate is a meaningful band metric". The non-elim encounters (`enc_capture_01`
  etc, in `docs/planning/encounters/`) ARE loadable by `encounter_id` (encounterLoader reads
  that dir) and DO complete in the sim.
- So W5 is **NOT** "teach the AI to reach the zone". That is done.

The **real** W5 problem is **calibration SIGNAL**, not "winning". A team-power delta (the
form-pulse +1.2, the D6/D8/ER6 mechanics, volo/radici) is only measurable when the AI plays
the encounter in a power-DISCRIMINATING regime. Today it does not, for three distinct reasons
(sec.2). This reframes W5 from one problem ("upgrade the AI") into three (sec.2) -- and one of
them is arguably encounter/metric design, not AI at all.

## 1. Current AI-player map (what exists)

| Piece              | File                                                       | Role                                                                                                                                                                                            |
| ------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Combat move policy | `tools/sim/combat-policy.js` `selectPlayerAction`          | closest-enemy attack-or-approach + OA2 zone-pursuit. **THE thing W5 upgrades.** 146 LOC.                                                                                                        |
| Combat driver      | `tools/sim/combat-adapter.js` `runEncounter`               | boots a session (roster+enemies via /start), fetches objective ONCE, drives the round loop, polls objective completion for non-elim, returns outcome. In-process (supertest) or tunnel (fetch). |
| Meta policy        | `tools/sim/greedy-policy.js`                               | recruit / route / courtship / mating (NOT combat moves -- easy to confuse).                                                                                                                     |
| Personality policy | `tools/sim/mbti-policy.js`                                 | MBTI temperament overlay for full-loop batch.                                                                                                                                                   |
| Objective logic    | `apps/backend/services/combat/objectiveEvaluator.js`       | 6 evaluators: elimination, capture_point, escort, sabotage, survival, escape. Pure fn of (session, encounter, objective) -> {completed, failed, outcome}.                                       |
| Objective staging  | `tools/sim/scenario-enemies.js`                            | `SUPPORTED_OBJECTIVES` all 6; builds the authored wave-1 roster; clamps to on-grid.                                                                                                             |
| Batch (full-loop)  | `tools/sim/full-loop-batch.js` + `meta-band-aggregator.js` | N-run band batch; metric `completion_rate` band [0.4,0.7]; `--isolate` per-seed process; `--gate` warn-only.                                                                                    |
| Flip A/B           | `tools/sim/batch-ai-runner.js` + `fp-trait-ab-analyze.js`  | paired rounds-to-victory A/B (the form-pulse offset used this).                                                                                                                                 |

Movement primitives (`stepToward`, `stepTowardZone`) are **pure Manhattan** -- one-tile greedy
step, x-axis tie-break, occupancy-avoidance. No move-cost / terrain consult. No focus-fire.
No ability/trait use (only a `combat-adapter` "greedy overcharge" hook). No retreat/kite.

## 2. The real W5 gaps (each with git evidence)

**Gap A -- tactical weakness -> saturation-LOW (measured).**
On hardcore elimination the closest-attack AI is too weak to win: `enc_badlands_foodweb_pilot_01`
(hardcore diff4) control scored **0/16 victories, 0 both-victory pairs -> no signal**
(`docs/planning/2026-06-24-...-encounter-offset.md` sez.4). No both-win pairs = a power delta
cannot be measured. Root: nearest-target attack, no kill-priority/focus-fire, no ability use,
no threat weighting.

**Gap B -- terrain-cost blindness (confirmed by code).**
`combat-policy.js stepToward/stepTowardZone` never reference move-cost. A move-cost engine
(`moveCost.js`, the move-terrain substrate merged 2026-06-29) exists and is enforced server-side,
but the sim AI walks Manhattan straight through costly tiles. So the power-sensitivity of
flight/burrow (terrain-cost-avoiding) traits is invisible in sim. This is the **G6 / X1 / #3053**
link -- move-terrain Godot engine-AP enforcement needs a sim AI that actually values cheap tiles.

**Gap C -- power-insensitive objectives -> saturation-HIGH (HYPOTHESIS, to verify in the plan).**
OA2 makes non-elim encounters COMPLETE, but "walk-to-zone-and-hold" may complete at ~100%
regardless of team combat power (you reach the zone and the fixed roster can't stop you) ->
`completion_rate` saturates high -> a power buff is invisible. NOT yet empirically measured (the
offset-doc cross-biome sweep stopped at "non-elim never wins", which is now stale). This may be
an **encounter-design / metric** problem: the fix could be power-coupled objectives (holding
requires winning contested fights) and/or a **graded power-proxy metric** (margin, HP-remaining,
rounds-to-hold) instead of binary completion -- possibly cheaper than a smarter AI.

**Gap D -- the flip A/B measures elimination only.**
The form-pulse flip used `batch-ai-runner` + `fp-trait-ab-analyze` = paired rounds-to-victory,
and "only `enc_savana_01` (standard + elimination + diff2) yields a clean rounds A/B"; badlands
elim saturated, the 12 non-elim gave no rounds signal. So the flip lane's metric is
elimination-shaped. Cross-biome / non-elim / terrain signal needs BOTH a stronger AI (A,B) AND a
signal path for non-elim (C).

## 3. Constraints that bound the design (load-bearing)

1. **No cheap forward model.** The only way to advance/evaluate game state is a real,
   side-effecting HTTP round-trip through the Express backend (in-process supertest). State
   cannot be cheaply cloned/forked/rolled-back. => per-move deep search (MCTS/rollout) is
   very expensive and arguably infeasible without a separate lightweight forward model.
2. **Determinism / low variance.** N=40 bands need low run-to-run variance (today ~+-0.05,
   sim is NOT bit-reproducible cross node-version -> calibrate + gate on node 22). A stochastic
   planner would widen CI and need larger N.
3. **Calibration fidelity, NOT superhuman play.** The AI's job is to make balance changes
   MEASURABLE. Too strong -> wins everything -> masks balance holes; too weak -> loses
   everything -> Gap A. The target is the discriminating middle. "How strong is enough" is
   itself a fork.
4. **Path discipline.** All work stays in `tools/sim/` (NOT forbidden-path). objectiveEvaluator
   is `apps/backend/services/combat/` (backend, allowed but ripples tests).
5. **Long-pole, incremental.** Weeks. Ship reviewable increments each validated by N=40 on an
   encounter the current AI fails/saturates.

## 4. Design-call for master-dd (the fork to decide BEFORE the big build)

**Question 1 -- how much AI?** heuristic/behavior-tree vs **utility-AI (weighted action
scoring)** vs MCTS/rollout.

- Preliminary recommendation: **utility-AI, incremental on the existing OA2 heuristic.**
  Rationale: MCTS needs a cheap forward model we do NOT have (constraint 1); it is also
  stochastic (constraint 2). Utility-AI is deterministic, cheap (one scored decision per move,
  no rollouts), a strict superset of the current closest-attack heuristic, and naturally
  extends to terrain-cost (Gap B) as just another scored factor. Factors to score: kill-priority
  / focus-fire, positioning (incl. terrain move-cost), ability/trait use, retreat/kite,
  objective-zone value. **RATIFIED by master-dd 2026-07-01** (utility-AI; MCTS ruled out --
  balance-illuminator brief: no forward model -> 100-1000x cost + nondeterministic, Hernandez
  CoG 2020). Full plan: `docs/superpowers/plans/2026-07-01-w5-sim-ai-player-upgrade.md`.

**Question 2 -- is Gap C an AI problem or an encounter/metric problem?** Options: (a) rely on a
stronger AI to expose power on non-elim, (b) add power-coupled objective variants + a graded
power-proxy metric (margin/HP/rounds), (c) both. Preliminary lean: **(c)** -- the metric side
(graded proxy) may be the cheaper high-signal win and is worth a spike before over-investing in
AI strength for non-elim.

**Question 3 -- "how strong is enough" / masking risk.** Options: calibrate the AI to a target
win-rate band on a reference set, OR run **multiple AI skill tiers as a sensitivity sweep** (weak
/ mid / strong) so balance findings are reported across skill, not at one arbitrary point.
Preliminary lean: **skill-tier sweep** -- it turns the masking risk into an explicit axis.

## 5. What W5 unblocks (value -- name this when surfacing)

- **form-pulse v2 W6 flip** (the real N=40 cross-biome, today PARKED) -- gated on a non-elim /
  cross-biome power signal.
- **G6** (move-terrain Godot engine-AP enforcement) -- needs a sim AI that values cheap tiles.
- **Rigorous re-ratify of D6 / D8 / ER6 PROVISIONAL bands** (shipped flag-OFF 2026-07-01) --
  their current bands are passive-AI provisional.
- **Tier-3 N=40 on non-elimination scenarios** (the residual N3/N5/N7/N8 lane, all gated W5).

## 6. Next step

1. balance-illuminator research brief (running) -> fold into the fork above.
2. **AskUserQuestion to master-dd** on Q1-Q3 (recommendation + reversibility) BEFORE big build.
3. Per his verdict: write the detailed plan (`docs/superpowers/plans/`), then a first reviewable
   increment (likely: utility-AI target-selection + a graded power-proxy metric spike) validated
   by N=40 on an encounter the current AI saturates. Do NOT flip anything in W5.

## Cross-reference

- Register row: `docs/planning/2026-06-23-residual-gate-register.md` sez.1 (W5 row).
- Close-out X1: `docs/planning/2026-06-29-closeout-master-plan.md` (X1 / nuance note sez.1).
- Build-spec W5: `docs/planning/2026-06-30-form-pulse-trait-v2-flip-readiness-build-spec.md` sec.W5.
- Stale premise source: `docs/planning/2026-06-24-aa01-form-pulse-trait-v2-encounter-offset.md` sez.4.
- Entry handoff: `docs/planning/2026-07-01-session-handoff-grilling-value-picks-drained.md`.
