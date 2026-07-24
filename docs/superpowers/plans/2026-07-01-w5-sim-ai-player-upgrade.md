---
title: 'W5 -- sim AI-player upgrade (objective-aware/positioning long-pole) implementation plan'
date: 2026-07-01
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-07-01'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags:
  [sim, ai-player, calibration, utility-ai, combat-policy, w5, n40, tdd, terrain-cost, form-pulse]
---

# W5 -- sim AI-player upgrade (implementation plan)

> Long-pole (weeks, project of its own). Recon: `docs/research/2026-07-01-w5-ai-player-recon.md`.
> Design decisions RATIFIED by master-dd 2026-07-01 (AskUserQuestion, research-backed by
> balance-illuminator). This plan is the SoT for the arc; increments ship reviewable + N=40-validated.
> **No prod flag flipped in W5.** All work in `tools/sim/` + the graded-metric read-side
> (`combat-adapter.js`); objectiveEvaluator is backend but read-only here.

## 0. Why (value it unblocks)

The sim AI-player's tactical/positioning weakness makes team-power deltas UNMEASURABLE on
hardcore + terrain + (hypothesised) non-elim scenarios. Fixing it unblocks:

- **form-pulse v2 W6 flip** (real N=40 cross-biome, today PARKED).
- **G6** (move-terrain Godot engine-AP enforcement -- needs a sim AI that values cheap tiles).
- **Rigorous re-ratify of D6 / D8 / ER6 PROVISIONAL bands** (shipped flag-OFF 2026-07-01 on passive-AI).
- **Tier-3 N=40 on non-elimination scenarios** (residual N3/N5/N7/N8 lane, all gated W5).

## 1. Ratified decisions (master-dd 2026-07-01)

1. **Approach = Utility-AI, incremental on the existing OA2 heuristic.** MCTS ruled OUT
   (no forward model: every state-step is a real HTTP call, no clone/rollback -> 100-1000x
   cost + nondeterministic; Hernandez CoG 2020). Utility-AI = deterministic, 1 HTTP/decision
   (same cost as today), a strict superset of closest-attack.
2. **Gap C (non-elim power-insensitivity) = graded metric FIRST.** Add
   `hp_remaining_pct` / `rounds_to_complete` / `units_lost` alongside binary `completion_rate`
   (combat-adapter already returns rounds + survivors). AI-independent, cheapest, high-signal.
   Power-coupled encounter redesign only later IF the graded metric alone falls short.
   A stronger AI would saturate C HARDER, not help -- the axes are orthogonal.
3. **Calibration = tune-to-band + skill sweep.** Bayes-optimize the utility weights to a target
   WR band (~0.3-0.7) per encounter-class (treat AI-strength as a knob like boss-HP), plus a
   periodic 3-tier Restricted-Play sweep (weak / mid / strong) as a stale-band sensitivity net.
   Reuses the existing BO + SPRT patterns.

## 2. Architecture -- the utility scorer

Replace the naive closest-enemy branch of `combat-policy.js selectPlayerAction` with a utility
scorer over the enumerable candidate action set for the active unit. **OA2 zone-pursuit
(capture/sabotage/escape/escort) is UNTOUCHED** -- it is a pathing problem, already solved +
tested 13/13. The scorer targets the `elimination` / `survival` / in-zone branch.

`utility(action) = sum_i (w_i * factor_i(action, actor, units, ctx))`, argmax with a fixed
tie-break (stable sort by candidate key) -> deterministic. Weights `w_i` are a named,
env/DI-overridable vector (so P1 Bayes-tuning has a clean surface; defaults are the v1 hand-set).

Factors (ship incrementally, each additive + tested):

| #   | Factor                                                                                                                | Closes                          | Increment |
| --- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------- | --------- |
| F1  | Target kill-priority / focus-fire (`expected_dmg / target_hp` + finish-off bonus + threat weight)                     | Gap A (saturation-low)          | inc-1     |
| F2  | Retreat / threat-avoidance (negative utility ending in high incoming-threat tile when own HP low + no kill available) | Gap A (never disengages)        | inc-2     |
| F3  | Positioning / terrain-cost (score candidate tile by `-moveCost` + flank bonus)                                        | Gap B (terrain blindness -> G6) | inc-2     |
| F4  | Ability / trait use (score each ability by value-per-AP, replace the single greedy-overcharge hook)                   | tactical depth                  | inc-3     |

Determinism guard: no `Math.random`; all factor math is pure over the fetched state; tie-break
is total-ordered. Keep the sim node-22-pinned (not bit-repro cross node-version; existing caveat).

## 3. Increments (each = reviewable PR, N=40-validated, master-dd merges)

- **inc-1 -- graded metrics + focus-fire scaffold (THIS SESSION, DONE). PR-ready.**
  - `combat-adapter.js`: return `hp_remaining_pct` (mean survivor HP fraction), `units_lost`, keep
    `rounds` (graded metrics, AI-independent -- the Gap C measurement surface, master-dd Q2). PROVEN
    live (populate correctly in the probe).
  - `combat-policy.js`: F1 focus-fire (among IN-RANGE enemies target lowest-HP; opt `opts.focusFire`,
    default OFF = byte-identical). First utility-scorer factor (Q1 foundation). OA2 branch untouched.
  - Tests: `tests/sim/combatPolicy.test.js` (5 focus-fire cases, RED-GREEN) + `combatAdapter.test.js`
    (graded metrics). 214/214 sim suite green.
  - Evidence: `tools/sim/focus-fire-ab-probe.js` (paired-seed OFF vs ON, hardcore + synthetic modes).
  - **FINDING (reshapes the plan): focus-fire is band-NEUTRAL on both tested setups** (N=20 hardcore
    `enc_badlands_ultima_caccia_01`: WR/KO delta 0, timeout-bound, survivors ~96% HP; N=20 synthetic
    elimination: avg_rounds 27.2 vs 27.25, players 0 damage). Root cause: **focus-fire is a
    SURVIVAL/attrition lever, not a speed lever** -- killing all N foes needs the same total damage
    regardless of order; it only helps by removing INCOMING damage sooner, so it moves a metric ONLY
    when the party is under sustained attrition. On the tested encounters the party was not being
    ground down -> kill-order was outcome-neutral. => the Gap-A saturation on these encounters is
    TIMEOUT/POSITIONING-driven, NOT target-selection-driven.
- **inc-2 -- graded metrics VALIDATED + PIVOT (THIS SESSION, DONE).** Master-dd ratified the
  **graded-metric re-ratify** direction (AskUserQuestion 2026-07-01) over more AI-tactics factors.
  Evidence: [`2026-07-01-w5-graded-metric-power-validation.md`](../../playtest/2026-07-01-w5-graded-metric-power-validation.md).
  - Added `enemy_hp_remaining_pct` (damage-OUTPUT channel) to `combat-adapter.js` + test; probe
    `PROBE_MOD_BUFF` synthetic power delta + engagement/output summary. 216/216 sim green.
  - **KEY FINDING: the graded metrics ARE the Gap-C win.** On the WR-saturated hardcore a team-power
    delta moves `enemy_hp_remaining` 0.71 -> 0.21 (and ko_rate 0.42 -> 0.13) while binary WR barely
    twitches. And the hardcore timeout is **DPR/hit-rate-bound, not positioning-bound** (24 attacks
    land but enemies stay at 74% HP). => the AI-tactics levers (F1 focus-fire, F3 positioning) are
    band-neutral/irrelevant because the encounters are **power/DPR-bound, not tactics-bound**. The AI
    already reaches + swings; the signal was always the metric.
- **inc-3 -- graded re-ratify D6 / D8 / ER6 (NEXT, the W5 payload).** Run flag-ON vs OFF N=40 on
  each mechanic reading the GRADED metrics (enemy_hp_remaining / ko_rate / hp_remaining, not just
  WR) on their relevant encounters -> REAL bands (vs the passive-AI WR-only PROVISIONAL bands) ->
  master-dd ratifies (owner-gated). The sim produces the evidence.
- **inc-4 -- form-pulse W6 graded measurement.** Same graded harness -> the N=40 cross-biome
  power measurement the WR-only path could not produce -> feeds the W6 flip decision.
- **DEPRIORITIZED (evidence: encounters are power-bound not tactics-bound):**
  - **F3 terrain positioning** -- only real target is Gap B / volo-radici / G6, and the server
    already enforces terrain move-cost, so a terrain-aware sim AI adds little measurement value
    (may even shrink the signal). Build ONLY if a G6-specific terrain signal proves it needs it.
  - **F4 ability use / tune-to-band / skill-sweep** -- diminishing value once the graded metrics
    read power directly. Revisit only if WR (not graded metrics) must become the discriminator.

## 4. Then (post-W5, gated on the above)

- **W6** form-pulse: N=40 cross-biome on the graded/terrain-capable harness -> ratify offset/`w`/picks
  -> flip (operator Ryzen). PARKED until inc-1..inc-2 land a cross-biome signal.
- **Re-ratify D6 / D8 / ER6** provisional bands on the upgraded AI.
- **Tier-3 N=40** non-elim lane (N3 ER7 / N5 A2 / N7 interoception / N8 DR2).

## 5. Non-goals / out of scope (explicit)

- **No prod flag flipped in W5** (form-pulse, D8 chain-lightning, terrain-cost stay as-is).
- **No MCTS / RL / LLM-as-policy** (ruled out sec.1; LLM-as-critic stays a separate P2 qualitative
  tool, not a decision-maker). MCTS revisit ONLY if an in-process forward model is ever built.
- **No objectiveEvaluator behavior change** (read-only from the sim; changing it ripples backend tests).
- **No forbidden-path** (`.github/workflows/`, `packages/contracts/`, `services/generation/`,
  `migrations/`, `services/rules/`).

## 6. References

- Recon: `docs/research/2026-07-01-w5-ai-player-recon.md`.
- Register W5 row: `docs/planning/2026-06-23-residual-gate-register.md` sez.1.
- Close-out X1: `docs/planning/2026-06-29-closeout-master-plan.md`.
- Build-spec W5: `docs/planning/2026-06-30-form-pulse-trait-v2-flip-readiness-build-spec.md` sec.W5.
- Research (MCTS ruled out, utility-AI, graded metric, tune-to-band): balance-illuminator brief 2026-07-01
  (Hernandez CoG 2020; Tactical Troops CoG 2021; EA/SEED CoG 2023; Sims/XCOM utility-AI patterns).
