---
title: 'PE_ratio orthogonality experiment -- N=100 selection + instrumentation gap'
date: 2026-06-19
type: playtest-evidence
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-06-19'
source_of_truth: false
language: en
review_cycle_days: 30
tags: [evo-tactics, calibration, g2, pe-ratio, composite, n100]
---

# PE_ratio orthogonality experiment (PR2 selection step)

> Experiment for the composite `0.50*win_rate + 0.25*kd_ratio + 0.25*pe_ratio`
> (design `docs/superpowers/specs/2026-06-18-composite-pe-ratio-experiment-design.md`).
> N=100 seed-pinned (424242), node 22, backend on 127.0.0.1:3400 (NOT prod). Runner =
> calibrate_parallel per oracle -> pe_experiment.analyze_corpus.

## Result

| candidate          | aggregate form        | hc06-only \|corr\| | hc06 sd (variance) | verdict                        |
| ------------------ | --------------------- | ------------------ | ------------------ | ------------------------------ |
| A_sustained_threat | mean(frac_ge75)       | 0.074              | 0.009              | degenerate-flat (saturated)    |
| B_time_avg         | pressure_mean_avg/100 | 0.254              | **0.024**          | the only candidate with signal |
| C_apex_reach       | apex_reach_rate       | 0.000              | 0.000              | degenerate-flat (constant 1.0) |

**Selected (provisional): B_time_avg**, by ELIMINATION. hc06 starts at pressure 75
(Critical), so A (sustained-threat fraction) and C (apex-reach) SATURATE -- every run
sits at frac_ge75~1.0 / apex=1.0 (sd 0.009 / 0.000). Their |corr|~0 is the
"orthogonal-but-no-signal" artifact the design warns of (a constant correlates with
nothing but measures nothing). B (time-averaged pressure) is the ONLY candidate with
trajectory variance (sd 0.024). Pooled runs (hc06 + the uninstrumented oracles, see
below) ranked B first at |corr| 0.099-0.197; the negative-result threshold (min |corr|
above 0.6) did NOT fire, so pressure is not rejected as a PE source.

Win rates this run (all in their ratified bands): hc06 23%, badlands_elite 16%,
foresta_pilot 50% -- consistent with the #2850 / node-22 calibration.

## 🔴 Instrumentation gap (blocks the clean multi-oracle selection + the composite band)

Verify-first finding: the per-run pressure-trajectory stats (`pressure_mean`,
`pressure_frac_ge75`, `pressure_pmax`) are emitted ONLY by
`batch_calibrate_hardcore06.py`. The varied-pressure oracles that would BREAK hc06's
saturation -- `badlands_elite_01`, `foresta_pilot_01` -- emit only `pressure_final`;
`hardcore_07` emits none. So in those oracles every candidate (and the aggregate
`pe_ratio`) defaults to 0.0, and a pooled |corr| is really hc06's signal plus a block
of zeros (which is why pooling lowered |corr| from 0.197 to 0.099 -- an artifact, not a
cleaner measurement).

Consequences:

- The cross-oracle selection cannot be confirmed until the trajectory instrumentation
  is extended to the other pressure oracles (a low-saturation oracle is needed to
  separate A/B/C properly).
- The **composite band cannot be derived** cleanly: only hc06 carries a real `pe_ratio`
  (0.937); badlands_elite + foresta_pilot read `pe_ratio` = 0.0, so their composites
  (0.208 / 0.442 vs hc06 0.530) are deflated by the missing PE term. A band off those
  numbers would be wrong.

## What PR2 ships now (vs what is gated)

- SHIPPED (autonomous, tested): the composite WIRING -- `attach_composite_terms()`
  emits `kd_ratio` (= kd_avg/(kd_avg+1)) + `pe_ratio` (selected candidate) on every
  aggregate, so `objective.evaluate_metric` computes the composite instead of raising
  `KeyError`/returning None. `pe_ratio` is meaningful where the trajectory is emitted
  (hc06) and 0.0 elsewhere (honest, until the instrumentation is extended).
- GATED (master-dd / follow-up): extend the per-run pressure instrumentation to
  badlands_elite / foresta_pilot (and hardcore_07 if it is kept as an oracle); re-run
  the multi-oracle experiment for a confirmed selection; derive + ratify the composite
  band into `canonical-suite.yaml` (SDMG, human-ratified per CANONICAL sec 9); then
  flip P4 gate-2/4b + P5 to consume the real composite band.

## Multi-oracle re-run (2026-06-19, instrumentation extended)

The per-run pressure trajectory was extended to the `badlands_elite_01` and
`foresta_pilot_01` batch modules (mirror hc06). Re-run N=40 seed-pinned, node 22, 3
oracles -- the pe_ratio is now REAL on all three (no longer 0.0):

| oracle            | win_rate | kd_ratio | pe_ratio | composite |
| ----------------- | -------- | -------- | -------- | --------- |
| hardcore_06       | 0.125    | 0.721    | 0.937    | 0.477     |
| badlands_elite_01 | 0.150    | 0.513    | 0.809    | 0.405     |
| foresta_pilot_01  | 0.550    | 0.778    | 0.903    | 0.695     |

**Composite band PROPOSED (master-dd ratifies, SDMG):** mean 0.526, range [0.405, 0.695];
k=2.0 -> **[0.236, 0.815]** (k=1.5 -> [0.309, 0.743]). Not yet written to the manifest.

🔴 **Honest finding -- the PE-from-pressure signal is MARGINAL.** All three ratified
balance oracles run at HIGH pressure (pe_ratio 0.81-0.94 everywhere), so the candidates
near-SATURATE even multi-oracle. The |corr| ranking is then noise between near-flat
candidates and is N-sensitive (B won the contaminated N=100 pool at 0.197; A won this
clean N=40 pool at 0.092; differences are 0.09-0.24). No robust |corr| winner exists.
`SELECTED_CANDIDATE` stays **B_time_avg** on a PRINCIPLED basis, not the noisy |corr|:
B (time-averaged pressure) is the only CONTINUOUS candidate, so it carries real variance,
whereas A (sustained-threat fraction) pins near 1.0 and C (apex-reach) is binary -- both
degenerate on high-pressure oracles. Consequence for the composite: because pe_ratio is
~0.8-0.94 for every in-band oracle, the PE term mostly shifts the composite up uniformly
and adds little DISCRIMINATION between healthy and unhealthy balance.

**Open for master-dd:** (a) ratify (or reject) the proposed composite band; (b) decide
whether the marginal pressure-PE signal is worth keeping in the composite as-is, OR switch
to the design's alternate tension source (turns-to-resolve + dmg_taken "contestedness",
sec 4.5) which is telemetered on every oracle and may avoid the high-pressure saturation;
(c) only after (a)+(b) flip P4 gate-2/4b + P5 to consume the real band.

## Decision (2026-06-20, master-dd)

**(b) SWITCH to contestedness.** PE-from-pressure REJECTED as the PE source (the
marginal/saturated signal IS the negative-result the design sec 4.5 anticipated). The
proposed pressure band `[0.236, 0.815]` is DROPPED -- NOT ratified, NOT written to the
manifest. The `attach_composite_terms` wiring (#2867) + the badlands/foresta
instrumentation (#2869) stay (the composite is still computable); only the PE SOURCE
changes. Execution plan (calib-session, single-owner) =
`docs/planning/2026-06-20-pe-ratio-contestedness-switch-handoff.md`: add turns-to-resolve

- dmg_taken candidates, re-run the orthogonality experiment, derive + (master-dd) ratify a
  band off contestedness, then flip P4/P5. If contestedness is ALSO materially collinear
  with WR, escalate to drop-PE or defer (valid negative result; do not force a marginal band).
