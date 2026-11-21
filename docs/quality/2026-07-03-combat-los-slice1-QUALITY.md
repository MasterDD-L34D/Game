# QUALITY -- Combat LOS slice 1 (COMBAT_LOS_ENABLED, default OFF)

## Summary

A backend square-grid integer line-of-sight primitive, flag-gated
(`COMBAT_LOS_ENABLED`, default OFF) as a hard-block on ranged attacks, wired at
4 seams: the human single-attack handler (`apps/backend/routes/session.js`,
`losGateBlocks`), the human round-dispatch attack path (`POST /round/execute`,
same file, `handleLegacyAttackViaRound` caller), AI intent selection
(`apps/backend/services/ai/declareSistemaIntents.js`, attack->approach
downgrade via `losClearForAi` in `apps/backend/services/ai/policy.js`), and sim
parity (`tools/sim/combat-policy.js`). Flag OFF = byte-identical / band-neutral
on every seam. A shared golden-vector fixture pins the rule for a later
Godot/GDScript port.

## Step 1 -- Smoke (happy-path green + verifiable output)

LOS-suite results (all green):

| Suite                         | File                                      | Pass             |
| ----------------------------- | ----------------------------------------- | ---------------- |
| square-grid LOS primitive     | `tests/services/squareLos.test.js`        | 11/11            |
| blocker-terrain predicate     | `tests/services/losBlockers.test.js`      | 6/6              |
| golden-vector parity          | `tests/services/losGoldenVectors.test.js` | 1/1 (15 vectors) |
| human attack-handler gate     | `tests/api/losAttackGate.test.js`         | 4/4              |
| human round-dispatch gate     | `tests/api/losRoundDispatchGate.test.js`  | 3/3              |
| AI target filter              | `tests/services/aiLosFilter.test.js`      | 3/3              |
| AI attack->approach downgrade | `tests/services/aiLosDowngrade.test.js`   | 4/4              |
| sim combat-policy parity      | `tests/sim/combatPolicy.test.js`          | 20/20            |

Total LOS-suite: 52/52 passing, 0 failing.

Full backend gate (`npm run test:api`, `node scripts/run-test-api.cjs`):
exit code 0, every sub-suite block reports `fail 0`. Aggregate across all
sub-suites: 5138 tests, 5137 pass, 1 skipped (pre-existing, unrelated to this
slice), 0 failed, 0 cancelled.

Flag-OFF regression: the full API suite and the full sim suite pass unchanged
with `COMBAT_LOS_ENABLED` unset -- every LOS-gated branch (`losGateBlocks`,
`losClearForAi`, the sim's LOS-aware target pick) short-circuits to its
pre-slice behavior when the flag is off, so the change is band-neutral by
construction, not just by test result.

The AI and sim suites assert both flag states in pairs: flag ON blocks the
human attack / downgrades the AI intent / redirects the sim's target pick when
LOS is obstructed; flag OFF attacks/targets exactly as before slice 1.

## Step 2 -- Ricerca (edge cases covered, >=3)

- Corner-grazing single-blocker (LOS passes) vs strict-diagonal-squeeze with
  two blockers (LOS blocks).
- Endpoints excluded: a blocker sitting on the `from` or `to` cell does not
  self-block.
- `from == to`: always clear.
- Symmetry: `clear(A,B) == clear(B,A)` (unit-tested; additionally verified by
  a 5000-trial randomized fuzz during review).
- Axis-aligned ray with a mid-path blocker.
- Negative coordinates.
- Oblique 2:1 and 3:2 rays -- the Bresenham unequal-error-stepping class,
  the highest port-divergence risk for a future GDScript re-implementation.
- Non-blocker terrain (lava) between attacker and target does NOT block LOS --
  proves the predicate consults the blocker SET, not "any terrain present".
- Coordinate bounds `[0, 64]`.

## Step 3 -- Tuning (>=1 delta / design choice)

- Blocker set = `roccia`, `vegetazione_densa`, `obstacle` (NOT `elevation`,
  NOT transparent hazards like `lava` / `acqua_profonda`).
- `units_block_los: false` in slice 1 (see known-gap ledger below).
- AI behavior tuned to downgrade attack->approach when LOS-blocked: a blocked
  AI actor ADVANCES to gain sight rather than freezing in place or shooting
  through the blocker.
- `losBlockers` config hardened to soft-fail to a no-blocker default plus a
  shape-guard, so flag-ON degrades band-neutral on a missing/malformed config
  instead of throwing a 500.
- The golden-vector test reports EVERY divergence in one run (not
  fail-on-first), to give a future divergent GDScript port a full diff instead
  of one failure at a time.
- T0 ratify-corpus finding: see Ratify prerequisite below.

## Ratify prerequisite (T0 finding)

Flipping the flag to ON is owner-gated post N=40 (N=10 probe -> N=40 ratify),
and is blocked until the LOS N=40 ratify runs on an encounter that actually
carries blocker terrain -- otherwise "% shots blocked" is noise (see
`moveCost.js`: an all-default-terrain encounter is band-neutral even with the
flag ON, because there is nothing to block).

Finding: blocker terrain IS already authored in the corpus
(`data/encounters/standard_01.yaml` has `roccia` + `vegetazione_densa`,
`elite_01.yaml` has `roccia`, `enc_foresta_temperata_radici.yaml` has
`roccia`), and `tools/sim/move-terrain-n40-probe.js` already ratifies on
terrain-bearing encounters. Remaining pre-flip step: point the LOS N=40 ratify
at one of these terrain encounters. This slice's merge is band-neutral
regardless of that follow-up, since the flag ships OFF.

## Known-gap ledger (declared degraded interims, NOT silent)

- **Shoot-through-allies** (`units_block_los: false`): with endpoints
  excluded, an interposed UNIT does not block LOS in slice 1. Follow-up:
  unit-blocking. (spec sec 2.1)
- **Reaction / bond / intercept / terrain-burst paths ungated**
  (`session.js` reactionEngine ~:1001, bondReactionTrigger ~:1011,
  terrainReactTile ~:1309) bypass the LOS gate in slice 1. Follow-up: extend
  the gate to these paths or accept the gap explicitly. (spec sec 2.1)
- **Second human ranged seam -- `POST /round/execute`: CLOSED.** Originally
  discovered during Task 4 as an open gap (the round-dispatch loop resolved
  human `body.player_intents` attacks through a second
  `handleLegacyAttackViaRound` with only a range check, no LOS gate -- not
  covered by the AI pre-filter, so a player using `/round/execute` could shoot
  through a rock once the flag flipped ON). This has since been fixed and
  committed on this branch (commit `7da239864`, "feat(combat): flag-gated LOS
  on /round/execute human attack path"), test
  `tests/api/losRoundDispatchGate.test.js`, 3/3 passing, included in the
  full-gate green above. No longer a flip prerequisite.
- **LOS-rule wrapper triplication (in progress, uncommitted at time of this
  gate)**: the ~2-line flag-guarded wrapper originally existed independently
  in `session.js` (`losGateBlocks`) and `policy.js` (`losClearForAi`), with
  the sim reusing policy.js's copy. A shared
  `apps/backend/services/combat/losForGrid.js` extraction is underway in the
  working tree as a fast-follow but is NOT part of this slice's 7 committed
  commits and is deliberately excluded from this PR to keep the diff tight.
  Tracked as a follow-up, not a merge blocker (flag ships OFF either way).

## Flag / merge discipline

`COMBAT_LOS_ENABLED` ships OFF (band-neutral) on every wired seam, including
the round-dispatch path added after the original Task 4 gap was found. The
flip to ON remains owner-gated post-N=40 and is now blocked on a single
remaining prereq: ratify-on-terrain (pointing the LOS N=40 ratify at a
terrain-bearing encounter; the `/round/execute` gap that was the other prereq
is now closed). Config files `data/core/balance/los.yaml` and
`data/core/balance/los_golden_vectors.json` live in the master-dd-gated
`data/core/balance/` path -- Eduardo sign-off applies (as with #3197).
