---
title: 'ER6 overrun carry-over paired N=40 band-safety evidence (SPEC-I, Tier-3)'
workstream: ops-qa
category: playtest
doc_status: active
doc_owner: claude-code
last_verified: '2026-06-30'
language: en
tags: [playtest, calibration, spec-i, er6, overrun, carryover, n40, ai-driven]
---

# ER6 overrun carry-over -- paired N=40 band-safety (Tier-3 N=40 lane, N6)

Tier-3 lane item N6 (SPEC-I ER6 overrun carry-over fork). Master-dd grilling
verdict (2026-06-30): the UNSPENT part of the overrun reinforcement budget bonus
must ACCUMULATE onto the next tick, instead of being discarded (the as-built
consume-once). BUILT flag-gated OFF (`REINFORCEMENT_OVERRUN_CARRYOVER_ENABLED`);
this is the paired band-safety N=40 the flip is gated on. The flag is NOT flipped
here.

> **Band PROVISIONAL (W5 not built).** This N=40 runs on the CURRENT passive-AI
> harness (closest-attack, elimination-only). The grilling explicitly flagged that
> power-sensitive flips need W5 (the objective-aware/positioning sim-harness) for a
> rigorous band. So this band is provisional; the flip stays OWNER-gated.

## Mechanic (verified vs code)

`apps/backend/services/combat/reinforcementSpawner.js`. The overrun bonus is armed
by `stressWave.js` (an `overrun` pressure-crossing event -> `+OVERRUN_BUDGET_BONUS`
= +1, consumed once by `sessionRoundBridge` as `opts.budgetBonus`). With the flag
ON, when a tick CANNOT spend the full `base + bonus` budget (no walkable entry tile
/ cooldown / pressure below min_tier), the unspent bonus is stored on
`session.reinforcement_state.overrun_carry` and folded into the NEXT tick's
effective bonus. A terminal `max_total` cap drops the carry (no unbounded leak).

Flag OFF -> `carriedIn=0`, no state writes, `budget = min(base + budgetBonus,
remaining)` == the prior consume-once value -> byte-identical.

## Mechanic-fires proof (unit)

`tests/services/reinforcementSpawnerOverrunCarryover.test.js` = 7/7:

- partial spawn (2 tiles, budget 4) -> carry 2 stored (flag ON);
- carried bonus lifts the NEXT tick budget 1 -> 3, then drains to 0;
- cooldown skip / tier-below-min skip both carry the bonus forward;
- max_total terminal drops the carry to 0;
- full spawn leaves 0 carry;
- flag OFF -> no `overrun_carry` field written (consume-once preserved).

Plus 32 existing spawner + aliena-enforcement regression = 39/39 green.

## Method

Paired A/B, same `--seed-base 7000`, `tools/sim/full-loop-batch.js` (in-process
`createApp` + supertest, NO prod-port, node 22, `--isolate` child-per-seed). The
ONLY difference between arms is `REINFORCEMENT_OVERRUN_CARRYOVER_ENABLED`.
`currentFlags()` records the flag (A/B discriminator) + the runs are pinned with
`GIT_COMMIT`.

- ARM OFF: `GIT_COMMIT=<sha> node tools/sim/full-loop-batch.js --runs 40 --branch cave_path --policy greedy --seed-base 7000 --isolate --out reports/sim/er6-carryover-n40-off`
- ARM ON: `GIT_COMMIT=<sha> REINFORCEMENT_OVERRUN_CARRYOVER_ENABLED=true node tools/sim/full-loop-batch.js --runs 40 --branch cave_path --policy greedy --seed-base 7000 --isolate --out reports/sim/er6-carryover-n40-on`

Provenance pinned to commit `f18170b1` (this PR's ER6 build commit). The OFF/ON
`summary.json` config blocks are self-distinguishing (same commit, flag false vs
true).

## Results (N=40, summary.json, commit `f18170b1`)

| metric                      | OFF           | ON           | in_band (OFF/ON) |
| --------------------------- | ------------- | ------------ | ---------------- |
| completion_rate             | 0.625 (25/40) | 0.65 (26/40) | true / true      |
| roster_attrition            | 0.480         | 0.442        | true / true      |
| economy_flow drift          | 1.095         | 1.095        | true / true      |
| relationship (recruit/mate) | 5.55 / 4.675  | 5.925 / 5.0  | true / true      |
| offspring_viability         | 4.675         | 5.0          | true / true      |
| lineage_diversity           | 5             | 5            | true / true      |
| roster_composition          | 5 roles       | 5 roles      | true / true      |

## Read

- **Band-SAFE**: every one of the 7 meta-metrics is in-band in BOTH arms. No OOB
  cratering. Deltas (completion +0.025 = 1 campaign; attrition -0.038; economy
  identical at 1.095) are within the run-to-run noise (this sim is NOT
  bit-reproducible even at the same commit; the STAMINA N=40 measured ~+-0.05
  completion variance run-to-run).
- **Near-neutral by construction**: the overrun bonus is `OVERRUN_BUDGET_BONUS = 1`
  (stressWave). A +1 bonus almost always converts to a spawn in the SAME tick (a
  free entry tile is normally available at min_distance), so carry-over rarely
  diverges from consume-once on the default `cave_path` content. The carry only
  bites when a tick under-spends AT overrun time (no walkable tile / cooldown /
  pressure-below-min) -- rare in the default flow -> the A/B is expectedly flat.
  (Mirrors the HA1 "inert on current content" finding: the mechanism is real,
  proven by the unit tests, but the current content rarely exercises the new path.)
- **Provisional (W5 not built)**: the band is from the passive-AI harness. A content
  pack that floods entry tiles / forces under-spend (or a positioning AI, W5) would
  exercise the carry meaningfully. The flip stays OWNER-gated.

Raw summaries committed under `reports/sim/er6-carryover-n40-{off,on}/`
(summary.json + report.md; runs.jsonl reproducible, not committed).

See [[project_closeout_master_plan]],
`docs/planning/2026-06-29-closeout-master-plan.md` (N6),
`docs/planning/2026-06-23-residual-gate-register.md`.
