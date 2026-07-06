# QUALITY -- Budget-aware LOS repositioning + corrected-control measurements

Slice follow-up to `docs/quality/2026-07-04-ai-los-repositioning-QUALITY.md`
(PR #3210, merged) and to the corrected-control probe (PR #3212/#3213, merged).
Branch: `feat/combat-los-repos-budget`. Flag-dormant end to end:
`COMBAT_LOS_ENABLED` stays OFF; `COMBAT_LOS_REPOSITION_MODE` is a probe-only
knob nothing sets in production.

## Summary

Extends `stepToRegainLos` from the shipped greedy 1-tile step to a
budget-aware lookahead: any tile within `opts.budget` Manhattan steps (default
1 = byte-identical shipped behavior), metric = (move cost asc, distance to
nearest LOS-clear enemy asc, x, y) lexicographic -- the engine charges a move
AP = Manhattan distance in ONE action, so a budget-N tile is reachable in a
single move. Seams: sim player-proxy uses a two-phase budget (reserve 1 AP to
still shoot this turn, else full pool); prod Sistema uses its full pool (an
approach intent is a move-only round) and the move intent now carries
`ap_cost` = real distance (was hardcoded 1; the WEGO bridge resolver deducts
the field without recomputing). `combat-adapter` gains an opt-in
`allPlayersActPerRound` driver + `playerActionsByUnit` metric (the M17
active_unit freeze starves every roster unit but turn_order[0], so the old
probe could never measure multi-unit repositioning payoff). The isolation
probe gains a `wide` geometry (3-tile blocker segments: no 1-step reopening
exists, only a budget>=2 tile) to separate step-vs-budget.

## Step 1 -- Smoke (happy-path green + verifiable output)

| Suite | File | Pass |
| --- | --- | --- |
| repositioning helper (budget/mode/guard/knob) | `tests/services/losReposition.test.js` | 18/18 |
| prod Sistema AI seam | `tests/services/aiLosDowngrade.test.js` | 8/8 |
| declareSistemaIntents regression | `tests/ai/declareSistemaIntents.test.js` | green |
| sim player-proxy seam | `tests/sim/combatPolicy.test.js` | 24/24 |
| adapter multi-unit driver | `tests/sim/combatAdapter.test.js` | 6/6 |

TDD red-green per cycle; the two SDMG-fix tests (terrain guard, blocker knob)
were additionally verified RED retroactively (stash impl -> 2 fail -> pop ->
18/18). Prettier clean. Full flag-OFF regression on this worktree: `npm run
test:api` 77/77 + 5/5 pass, `node --test tests/sim` 227/227 pass, 0 fail. A
first regression attempt hit the documented EADDRINUSE ephemeral-port flake
family (fullLoopBatch/woundCutoverWire, files this branch never touches) while
~5k TIME_WAIT sockets drained from a concurrent sim batch; the recorded run
above is clean end-to-end, matching the alternate clean/flaky pattern already
documented in the 2026-07-04 QUALITY doc.

## Step 2 -- Ricerca (edge cases + SDMG falsification)

Edge cases covered by tests: default budget 1 byte-identical; budget <= 0
null (turn-starved guard); occupied multi-tile destination excluded;
attack_range re-checked from the candidate tile; deterministic at budget 3;
mode 'off'/'step' knob semantics; terrain-cost flag clamps budget to 1;
avoidBlockerTiles filters blocker-tile reopeners but keeps open-ground ones.

SDMG external falsification (both run on this branch's real code):

- **harsh-reviewer -- verdict: SOUND WITH FIXES.** P1 found and FIXED in this
  slice: with `MOVE_TERRAIN_COST_ENABLED` the engine's real move cost is the
  terrain-weighted path while the helper budgets by Manhattan, and the WEGO
  bridge resolver (`sessionRoundBridge.js:1926-1930`) deducts the intent's
  `ap_cost` field without recomputing -> a multi-tile reposition would
  silently under-charge AP. Guard shipped: both flags ON -> budget clamps to
  1 (test-locked). P2s: the metric is AP-only / THREAT-BLIND (no
  enemy-adjacency term -- a reposition may legally stand in melee reach; the
  ratify must stay scoped to ranged-LOS scenarios or add a safety term); K4
  commit-window does NOT recognize `_LOS_BLOCKED` moves (bridge
  `last_action_type` recognizer), so cross-round reposition oscillation is
  bounded-deterministic but NOT commit-window-damped -- open decision below.
- **game-design-validator -- verdict: BEHAVIOR COHERENT WITH CHANGES.**
  Flanking reads on-pillar (WEGO resolves the multi-tile reposition as one
  continuous move; cost-first hugs cover). Wall-standing (perched on roccia
  shooting over it -- mechanically legal, endpoints excluded) reads bimodal ->
  shipped as an A/B knob (`opts.avoidBlockerTiles`, default off), decide with
  the ratify, don't hard-code. Oscillation: deterministic metric + pressure
  cap bound it, but the sim seam has no K4 equivalent (parity risk R3);
  suggested mirror-wall probe boards recorded below. Prod full-pool budget =
  the speculative arm: hold it behind a demonstrated N=40 win.

## Step 3 -- Tuning + VALIDATION (corrected-control matrix, N=10 direction)

Instrument: `tools/sim/los-repos-probe.js` (merged #3212/#3213) + this
slice's `wide` geometry + `COMBAT_LOS_REPOSITION_MODE` env knob (children
inherit it; 'step' clamps the real helper to the shipped greedy). LOS ON in
BOTH arms of every measured pair (the v1 wrong-control defect is closed);
multi-unit coverage gate >= 2 acting units enforced per run (the v1
turn-starved defect is closed -- all runs drove 3/3 roster units).

| Geometry / scale | Arm pair | wr_delta | rounds_delta | Note |
| --- | --- | --- | --- | --- |
| lane 1.0 | budget vs off | 0 | -0.8 | wins 12% faster |
| lane 1.0 | step vs off | 0 | -0.8 | identical to budget (parity) |
| wide 1.0 | budget vs off | 0 | 0 | WR ceiling 1.00 everywhere |
| wide 1.0 | step vs off | 0 | 0 | greedy finds tiles mid-fight |
| lane 1.8 | budget vs off | 0 | **-3.0** | 9.6 vs 12.6 rounds, 24% faster |
| lane 1.8 | step vs off | 0 | **-3.0** | identical to budget |
| wide 1.8 | budget vs off | 0 | -0.1 | fire-rate 48% (56/117 calls) |
| wide 1.8 | step vs off | 0 | -0.2 | fire-rate 26% (53/207 calls) |

Timeouts: ZERO in all 16 arms (v1's 3/10 timeouts confirmed as fixture
artifact). Defeats only at scale 1.8 (1/10, both arms, wide) -- repositioning
never changed a win to a loss or vice versa.

**Honest findings:**

1. **Repositioning (any flavor) vs the CORRECT control: real, coherent PACE
   value, WR-neutral.** Up to -3.0 avg rounds on lane@1.8 with zero timeouts
   and zero WR cost. The v1 "-0.30 WR gap" is fully explained: wrong control
   (LOS-off ceiling) + turn-starved fixture. The mechanism (already merged as
   greedy) earns its owner-gated N=40 flip ratify.
2. **Budget vs step: NO outcome separation at N=10.** On lane they are
   literally identical (cost-first picks the same 1-step tiles -- a parity
   proof). On wide, budget fires ~2x more efficiently per call (48% vs 26%
   non-null) and solves the shadow in one move (unit-proven), but mid-fight
   mobility gives the greedy equivalent chances a round later and enemies
   crossing the wall reopen LOS anyway -- no wr/pace conversion on these
   boards. Per the design-validator cut-order: if N=40 confirms no
   separation, ship greedy and cut the budget arm; the pillar is served
   either way.

N=10 = direction probe only (paired-seed). N=40 ratify (owner-gated, Eduardo)
should run THREE arms (off / step / budget) on both geometries, crossed with
`avoidBlockerTiles` on/off, plus the validator's mirror-wall oscillation
boards (thin wall, two symmetric gaps, ranged units on opposite sides).

## Open decisions (Eduardo, pre-flip -- none block this merge)

1. **Prod default at flip time**: budget (as committed) vs step-clamped until
   N=40 proves the full-pool arm. Data so far: budget never worse, no
   measured gain.
2. **K4 recognizer**: add `_LOS_BLOCKED` to the bridge `last_action_type`
   recognizer (commit-window can lock repositions) vs accept documented
   bounded-deterministic oscillation for the first ratify.
3. **avoidBlockerTiles**: A/B in the ratify (knob shipped, default off).

## Environment caveat

All measurements ran on Ryzen (DESKTOP-T77TMKT), Node v24.11.0 (the only
runtime on this machine; nvm/Node-22 is the Lenovo setup). Arm-vs-arm
comparisons are same-node and internally valid; do not numerically compare
against Lenovo-run probe outputs without a same-node re-run. A concurrent
sim batch on the same machine can transiently exhaust the Windows ephemeral
port range (49152+): the probe's supertest wrapper retries EADDRINUSE /
ECONNRESET / EADDRNOTAVAIL up to ~4s cumulative.

## Flag / merge discipline

`COMBAT_LOS_ENABLED` ships OFF on every seam; the default `opts.budget` is 1,
so even a flag-ON deployment without seam changes behaves byte-identically to
the merged greedy. `COMBAT_LOS_REPOSITION_MODE` and `avoidBlockerTiles` are
measurement knobs, never set in production. The flip remains owner-gated
post-N=40 (Eduardo) per the SDMG governance in the 2026-07-04 QUALITY doc.
