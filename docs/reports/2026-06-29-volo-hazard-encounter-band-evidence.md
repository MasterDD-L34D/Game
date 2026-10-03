---
title: 'Volo hazard encounter -- N=40 band evidence (bocche vulcaniche)'
date: 2026-06-29
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-06-29'
source_of_truth: false
review_cycle_days: 90
tags: [combat, move-terrain, volo, hazard, n40, evidence]
---

# Volo hazard encounter -- N=40 band evidence

Content under test: `docs/planning/encounters/enc_deserto_caldo_bocche_vulcaniche_01.yaml`
(loadable, full-height lava(x=3)+roccia(x=4) wall on 8x8) + the mixed volo-graded roster
`apps/backend/services/worldgen/desertoCaldoHazardScenario.js` (player g3 flyer + heavy
ground; sistema g1 + g2 flyers + ground). Flag `MOVE_TERRAIN_COST_ENABLED` stays OFF in prod;
this measures the worst case (flag flipped ON) for flip-safety.

## 1. N=40 ON-vs-OFF band (paired-seed, in-process, node 22)

Probe: `tools/sim/move-terrain-hazard-encounter-probe.js 40 1.0`.

**Engine fix note**: the original N=40 run (avg_rounds 24.52) was measured with a bug in
`clampPosition` (sessionHelpers.js ~line 31) that clamped all unit x/y positions to
`GRID_SIZE-1` (=5) regardless of the encounter's declared grid. Units authored at x=7
(right edge of the 8x8 grid) were silently moved to x=5, meaning the probe was effectively
running on a 6-wide grid. The fix (`normaliseUnit`/`normaliseUnitsPayload` now accept an
optional `bounds` parameter threaded from `req.body.encounter.grid` at `/start`) restores
the authored 8x8 geometry. Numbers below are from the corrected run.

```json
{
  "N": 40,
  "scenario": "bocche-vulcaniche (lava x3 + roccia x4, mixed volo roster, 8x8)",
  "flag_on":  { "wins": 39, "defeats": 0, "timeouts": 1, "win_rate": 0.975, "avg_rounds": 25.07 },
  "flag_off": { "wins": 39, "defeats": 0, "timeouts": 1, "win_rate": 0.975, "avg_rounds": 25.07 },
  "wr_delta": 0,
  "avg_rounds_delta": 0,
  "node": "v22.22.3"
}
```

The encounter RESOLVES (39/40 wins, not a timeout-null) and the flip is band-NEUTRAL
(wr_delta 0, rounds_delta 0). avg_rounds is slightly higher than the pre-fix run (25.07
vs 24.52) -- expected: units now start at their authored right-edge positions (x=7),
adding ~1 tile of crossing distance.

## 2. Deterministic cost ladder (the "exercised" proof)

`tests/services/combat/voloHazardEncounterCost.test.js` loads the encounter's real
`grid.terrain_features` and computes the wall-crossing cost (heavy profile), per grade:

| grade | lava | roccia | default | crossing cost |
|-------|------|--------|---------|---------------|
| g0 (no volo) | 2.0 | 2.0 | 1.0 | 5.0 |
| g1 | 2.0 | 1.0 | 1.0 | 4.0 |
| g2 | 1.5 | 1.0 | 1.0 | 3.5 |
| g3 | 1.0 | 1.0 | 1.0 | 3.0 |

Strictly decreasing g0 > g1 > g2 > g3. The grades fire on this content (g1 frees the roccia,
g2 halves the lava, g3 frees the lava).

## 3. AI crossing witness (volo advantage manifests in play)

A single instrumented AI run (seed 3, flag ON) over the loaded terrain: the g3 flyer
(`p_noctule`) crosses the lava wall (reaches x=4, having stepped over the x=3 lava column)
and engages; identical ON vs OFF (g3 frees lava == Manhattan). The heavy ground unit
(`p_corazza`) holds back -- an AI-policy artifact (the flyer carries the fight), not a
substrate effect.

## 4. Reading

The substrate FIRES on this content -- the g3 flyer crosses the hazard wall, and the cost
ladder (sec.2) proves the grade differential -- but the flip is outcome-NEUTRAL: g3 makes
lava free (== Manhattan), and the grade-paying combatants are not on the critical path of a
flyer-decided fight. This confirms the canonical finding: the move terrain-cost substrate is
a terrain-DESIGN lever (flyers get a real traversal edge over hazard), NOT a passive win-rate
shifter. Flip-safe.

Caveat (SDMG): WR sits at a ceiling (0.975, player-favoured to guarantee resolution), so this
reads as "the flip does not break a winnable fight" rather than a neutral measurement at a 50%
margin; the roster is hand-built (direction probe, not a prod-balanced encounter); the heavy
ground unit idles under the greedy policy. Band ratification (and any prod flip of
`MOVE_TERRAIN_COST_ENABLED`) remains owner-gated -- this is band evidence only.
