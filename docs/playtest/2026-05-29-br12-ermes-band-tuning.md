# TKT-BR-12 -- ERMES bridge band tuning + calibration scope

Date: 2026-05-29
ADR: ADR-2026-05-29-ermes-runtime-bridge
Branch: chore/2026-05-30-ermes-bridge-fase2b

## Problem (handoff finding)

FASE 2 shipped the ERMES bridge plumbing (BR-02..08, BR-10, BR-13). Verification
found it functionally INERT: all 4 pilot biomes produced `eco_pressure_score` in
0.42-0.66, which is the MED band `[0.33, 0.66)` of
`data/core/balance/ermes_bucket_thresholds.yaml`. MED `delta_mod` is 0, so
`applyErmesBiomeTraitCosts` applied zero delta on every biome. Plumbing SOUND,
output zero -> bridge not demonstrable.

## Root cause

`ermes_sim.build_report` derives `eco = clamp(food_p*.35 + pred_p*.4 + temp_p*.25)`
with `food_p = 1-food`, `pred_p = predators`, `temp_p = abs(temp-.5)*2`. The four
pilot biome environments in `prototypes/ermes_lab/configs/multi_biome.json` all
happened to land in the mid range after the 50-generation env random walk
(seed 7).

## Fix -- config tuning (two biomes pushed to band extremes)

Tuned `multi_biome.json` so the pilot set spans LOW + MED + HIGH. Pushed values
hard so the per-generation random walk (volatility 0.04-0.06) cannot flip the band.

| biome | env before (temp/food/pred) | env after | eco before | eco after | band |
|---|---|---|---|---|---|
| rovine_planari | 0.5 / 0.45 / 0.4 | 0.5 / 0.85 / 0.15 | 0.424 | 0.164 | LOW |
| cryosteppe_convergence | 0.15 / 0.4 / 0.5 | 0.05 / 0.2 / 0.85 | 0.659 | 0.876 | HIGH |
| savana | unchanged | unchanged | 0.449 | 0.449 | MED |
| caverna_risonante | unchanged | unchanged | 0.598 | 0.598 | MED |

Narrative-coherent: ancient `rovine` = calm (abundant food, few predators);
`cryosteppe convergence` = harsh (scarce food, many predators, extreme cold).

## Verification -- bridge now demonstrable

Bridge run on the regenerated report (`getErmesBucketed` -> `applyErmesBiomeTraitCosts`,
fresh unit each biome):

| biome | band | attack_mod_bonus | defense_mod_bonus | buckets_applied |
|---|---|---|---|---|
| rovine_planari | low | -1 | -1 | 1 |
| savana | med | 0 | 0 | 0 |
| caverna_risonante | med | 0 | 0 | 0 |
| cryosteppe_convergence | high | +1 | +1 | 1 |

The bridge now applies -1 / 0 / +1 by band (capped +/-2 per ADR-21c). MED stays
neutral by design. Guarded by `test_multi_biome_exercises_low_and_high_bands`
(prototypes/ermes_lab/tests) -- a revert to an all-MED config fails CI.

## Combat win-rate N=40 calibration -- DEFERRED (with reason)

The handoff listed an N=40 `calibrate_drift_verify.py` run (WR shift < 5pp gate).
Ground-truth check before running: `applyErmesBiomeTraitCosts` has NO live caller
(grep repo-wide: only definition + export + a doc comment). `getErmesBucketed` is
called only by it. The bridge is NOT wired into the combat / encounter loop --
FASE 2 is plumbing by design (handoff title).

`calibrate_drift_verify.py` measures combat win-rate for hardcore scenarios via a
running server. With the bridge absent from the combat path, an N=40 run would
exercise nothing and report ~0pp shift by construction -- ~24min of compute that
measures a dead bridge, and a false "WR-ratified" claim (anti-pattern #8/#19,
G2 over-claim).

Decision: the WR-impact N=40 calibration is deferred to the FASE 3 ticket that
wires `applyErmesBiomeTraitCosts` into live combat. The < 5pp gate becomes
meaningful only once the bridge actually applies deltas in scored combat. The
demonstrable bridge output above (capped +/-1/+/-2) is the FASE 2 deliverable.

## Quality Gate

- Smoke: `python ermes_sim.py --multi-biome` regenerates report, 4 biomes, bands span low/med/high.
- Research: band edge cases + drift robustness (values pushed clear of band boundaries).
- Tuning: before/after eco + delta documented above (inert -> -1/0/+1).
