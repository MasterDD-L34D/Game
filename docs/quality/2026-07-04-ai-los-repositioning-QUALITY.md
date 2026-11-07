# QUALITY -- AI LOS-repositioning (COMBAT_LOS_ENABLED, default OFF)

## Summary

A shared `stepToRegainLos` greedy 4-neighbor step-to-LOS helper
(`apps/backend/services/combat/losReposition.js`), wired into two AI seams:
the sim player-proxy (`tools/sim/combat-policy.js`, considers ALL live enemies
so it opens a shot on whoever becomes visible) and the production Sistema AI
(`apps/backend/services/ai/declareSistemaIntents.js`, repositions on the
CHOSEN target only, so a flanking Sistema keeps engaging the same foe instead
of switching prey mid-approach). Flag-dormant: `COMBAT_LOS_ENABLED` stays OFF
on this branch, and the helper itself no-ops (`return null`) when the flag is
unset, so both seams are byte-identical to pre-repositioning behavior. When
the flag is eventually flipped, the helper degrades gracefully (returns
`null`, caller falls back to its existing `stepToward`/`stepTowards` approach)
whenever no single legal step reopens a firing line -- never worse than
today.

Purpose: de-confound the LOS ratify. Slice-1 (COMBAT_LOS_ENABLED hard-block,
`docs/quality/2026-07-03-combat-los-slice1-QUALITY.md`) showed a large
win-rate gap when a wall obstructs a straight firing line, but that gap could
have been measuring "the sim/AI can't route around an obstacle" rather than
"terrain LOS changes the encounter's balance". This branch adds the missing
repositioning step so the eventual flip-decision ratify measures
terrain-balance, not dumb pathing.

## Step 1 -- Smoke (happy-path green + verifiable output)

Unit + integration suites (all green):

| Suite                        | File                                    | Pass  |
| ---------------------------- | --------------------------------------- | ----- |
| shared repositioning helper  | `tests/services/losReposition.test.js`  | 5/5   |
| sim player-proxy integration | `tests/sim/combatPolicy.test.js`        | 23/23 |
| prod Sistema AI integration  | `tests/services/aiLosDowngrade.test.js` | 7/7   |

Full flag-OFF regression gate:

- `npm run test:api` (two sub-suites): `tests/api` 77/77 pass, `tests/js`
  5/5 pass. Exit 0.
- `node --test tests/sim/*.test.js`: 225/225 pass on a clean run.
  Two of five repeated runs during this gate intermittently failed 1-2
  tests in `tests/sim/metaNetworkDriver.test.js` /
  `tests/sim/fullLoopBatch.test.js` / `tests/sim/fullLoopRunner.test.js`
  with `EADDRINUSE` on a fixed local port (49153-49156) -- a pre-existing
  test-infra port-collision flake in files this branch never touches (last
  modified in unrelated commit `495f855eb`, "meta-network expansion PR2").
  Confirmed NOT a regression: isolating the run to exclude
  `metaNetworkDriver.test.js` still reproduced the same EADDRINUSE pattern in
  the other two files, and the clean/flaky runs alternate with no code
  change in between. The final recorded run (below) is a clean 225/225 pass,
  0 fail:

  ```
  tests 225
  pass 225
  fail 0
  cancelled 0
  skipped 0
  todo 0
  ```

Flag OFF -> `stepToRegainLos` returns `null` unconditionally (first line of
the function body), so neither wired seam's repositioning branch executes;
both seams fall through to their pre-existing behavior unchanged.

## Step 2 -- Ricerca (edge cases covered, >=3)

- **No-reopening-step -> null -> graceful fallback (both seams).** When no
  single 4-neighbor step reopens LOS to any candidate enemy (e.g. actor fully
  walled in), `stepToRegainLos` returns `null` and the caller falls back to
  its pre-existing approach logic: `stepToward` in the sim seam
  (`tests/sim/combatPolicy.test.js`, "flag ON: LOS-blocked but no reopening
  step -> graceful stepToward fallback (never worse than today)") and
  `stepTowards` in the prod seam (`tests/services/aiLosDowngrade.test.js`,
  "flag ON: LOS-blocked with no reopening step -> graceful stepTowards
  fallback").
- **Occupied / off-board candidate exclusion.** The 4-neighbor candidate set
  filters out grid-bounds violations and tiles occupied by another live unit
  before scoring (`tests/services/losReposition.test.js`, "flag ON: excludes
  occupied + off-board candidate tiles").
- **Determinism.** Same actor/enemies/grid input always returns the same
  candidate tile (tie-break x-then-y), verified directly
  (`tests/services/losReposition.test.js`, "flag ON: deterministic") and by
  the re-probe below (two runs of the N=10 probe reproduced byte-identical
  win/defeat/timeout splits per seed).
- **[Target]-scope difference between the two seams is intentional, not a
  bug.** The sim player-proxy passes ALL live enemies to `stepToRegainLos`
  (it will shoot whoever becomes visible); the prod Sistema AI passes only
  `[target]` (its already-chosen enemy) so a repositioning Sistema keeps
  pressuring the same foe instead of re-targeting mid-flank. Both documented
  inline in `losReposition.js` and covered by their respective seam tests.
- **Terrain-only LOS; unit-blocking is a separate, still-dormant axis.**
  `stepToRegainLos` checks `losClearOnGrid(grid, candidate, enemyPos)`
  without a `units` argument, so it never considers unit-body occlusion
  (`units_block_los`, default false) -- consistent with slice-1's scope. A
  live blocker unit would not affect the repositioning target choice in
  either seam today.
- **Investigated during re-probe (see Step 3): repositioning DOES engage in
  the full-encounter path.** Direct instrumentation of a live encounter
  (`losForGrid.js`/`losReposition.js`/`combat-policy.js`, reverted after use,
  confirmed clean via `git diff HEAD`) showed `stepToRegainLos` firing
  correctly and moving the actor along the wall until LOS reopened. The
  wiring itself is not the gap -- see the honest Step 3 finding below.

## Step 3 -- Tuning + VALIDATION (the re-probe)

The direction-probe script `tools/sim/los-n-probe.js` (owned by a separate,
unmerged branch/PR #3207) was materialized into the working tree ONLY to
re-run it, then removed -- it is not part of this branch's diff.

**Baseline (pre-repositioning, PR #3207, N=10):**

```
flag_on:  win_rate 0.70, 7 wins / 0 defeats / 3 timeouts, avg_rounds ~unreported-base
flag_off: win_rate 1.00, 10 wins / 0 defeats / 0 timeouts
wr_delta:         -0.30
avg_rounds_delta: +1.1
```

**This run (post-repositioning, N=10, two repeated runs, byte-identical
both times):**

```
flag_on:  win_rate 0.70, 7 wins / 0 defeats / 3 timeouts, avg_rounds 25.4
flag_off: win_rate 1.00, 10 wins / 0 defeats / 0 timeouts, avg_rounds 25.6
wr_delta:         -0.30
avg_rounds_delta: -0.20
```

Positive control (unchanged from baseline): 5/5 intended firing pairs
confirmed LOS-blocked by the real `losClearOnGrid` rule before the batch, so
the wall geometry does engage LOS as designed.

**Honest finding: the win-rate gap did NOT shrink.** `wr_delta` is identical
to the pre-repositioning baseline (-0.30, same 3/10 timeouts on flag ON).
Only `avg_rounds_delta` moved (from +1.1 to -0.20), a minor pacing shift, not
a WR-gap improvement.

Root-cause investigation (temporary source-level tracing in
`losForGrid.js`/`losReposition.js`/`tools/sim/combat-policy.js`, reverted
after use -- `git diff HEAD` clean before this doc's commit) found the
repositioning wiring itself is NOT the problem:

- `stepToRegainLos` fires correctly for `ranged_1` (the only roster unit
  that starts with an in-range-but-LOS-blocked target) and walks it along the
  wall's edge (`(2,0) -> (3,0) -> (3,1) -> (3,2) ...`), regaining LOS at each
  step exactly as designed.
- Both losing (timeout) seeds and winning seeds show the same repositioning
  behavior; the difference is action economy. In this synthetic scenario,
  only `ranged_1` ever becomes the `active_unit` across all 30 rounds
  (`ranged_2`/`ranged_3` never take a turn) -- a pre-existing turn-order
  characteristic of this specific 3-vs-3 fixture, reproduced identically
  with the flag OFF (flag OFF, seed 3: also only `ranged_1` acts, 21 attacks
  in 30 rounds, but wins because it never has to spend a turn on `move`
  instead of `attack`).
- With the flag ON, `ranged_1` spends some of its scarce turns moving
  (`action_type: 'move'`) to regain LOS instead of attacking. In an
  already turn-starved encounter (one active unit carrying the whole fight),
  that AP-economy cost is exactly enough to push 3 of 10 seeds past the
  30-round cap before the last enemy dies (timeout with `enemy_hp_remaining`
  0.12-0.39, i.e. very close to a kill, not a stalemate).

**Interpretation:** this is a real, honestly-reported finding, not a wiring
defect. The greedy one-tile step is functionally correct and de-confounds
"can the AI route around a wall at all" (it now can). But in this
turn-starved fixture, repositioning has a real opportunity cost
(move-instead-of-attack), and that cost alone reproduces the same win-rate
gap the un-repositioned baseline showed -- for a different reason. The
fixture's single-active-unit turn-order pattern (present with the flag OFF
too) means the probe may be measuring "cost of one fewer attack in a
tightly-timed fight" more than "cost of terrain LOS on balance". This is a
probe-fixture caveat worth flagging to whoever runs the eventual N=40 ratify,
not a regression on this branch (flag OFF ships band-neutral regardless).

NOTE per instructions: N=10 is a direction signal only (paired-seed, but the
encounter has randomness) -- both the baseline and this run are single N=10
samples; the byte-identical repeat (this run, twice) rules out RNG noise as
the explanation for the unchanged gap, but does not by itself rule out
fixture-specific artifacts becoming different at N=40 or with a different
board/roster geometry.

## Governance (SDMG)

The greedy step-to-LOS heuristic is self-designed (this branch) and is
therefore an ipotesi alto-errore, not a decision. Before any production flip
of `COMBAT_LOS_ENABLED` is ratified, external falsification is REQUIRED:

- **harsh-reviewer** on the method itself (is greedy-4-neighbor the right
  tool, or does the turn-starvation interaction found above call for a
  smarter step -- e.g. multi-tile lookahead, or excluding the repositioning
  branch when AP is already scarce).
- **game-design-validator** on the resulting AI behavior (does a flanking
  Sistema stay coherent, or does the target-scoped repositioning risk
  oscillation/degenerate pacing under other geometries not covered by this
  N=10 probe).

The flip stays owner-gated post N=40 (Eduardo), and this branch's honest
non-improvement finding should be carried into that N=40 review rather than
re-litigated from scratch.

## Follow-up noted (fast-follow, not a merge blocker)

Occupancy-set construction (`{x,y} -> Set` of live-unit tiles, excluding
self) is now duplicated ~4x across the combat stack:

- `tools/sim/combat-policy.js` (`occupiedSet`)
- `apps/backend/services/ai/declareSistemaIntents.js` (inline `new Set(...)`
  around the LOS-reposition call)
- `apps/backend/services/combat/losForGrid.js` (`_unitBlocker`)
- `apps/backend/services/abilityExecutor.js` (inline `new Set(...)`)

A shared `services/combat/occupiedSetFromUnits` helper is a low-risk
fast-follow, following the same pattern as the `losForGrid.js` shared-rule
extraction that closed the slice-1 LOS-predicate triplication.

## Flag / merge discipline

`COMBAT_LOS_ENABLED` ships OFF (band-neutral) on every wired seam on this
branch: the shared helper, the sim player-proxy, and the prod Sistema AI. The
flip to ON remains owner-gated post-N=40 (Eduardo) and now additionally
requires resolving the honest re-probe finding above (the WR gap did not
shrink, root-caused to a turn-starved fixture rather than a repositioning
defect) as part of that review, not as a merge blocker for this PR.
