---
title: 'PE_ratio contestedness orthogonality (N=100) -- selection + proposed band (master-dd ratify)'
date: 2026-06-23
type: playtest-evidence
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-06-23'
source_of_truth: false
language: en
review_cycle_days: 30
tags: [evo-tactics, calibration, pe-ratio, contestedness, orthogonality, n100, composite]
related: docs/planning/2026-06-20-pe-ratio-contestedness-switch-handoff.md
---

# PE_ratio contestedness orthogonality (N=100)

> The handoff's keystone experiment (step 3-5), executed as a **deterministic
> re-analysis** of the committed N=100 oracle corpora -- NO backend run, NO prod
> (the corpora are seed-pinned 424242, node 22, from the 2026-06-18 PR2 run; the
> analysis is pure Python). Runner: `tools/py/run_pe_contestedness_experiment.py`.
> **PROPOSED only -- master-dd ratifies the selection AND the band (SDMG, human-only).**

## Method

`pe_experiment.run_to_stats` now surfaces per-run `rounds`/`dmg_taken_player`/
`dmg_dealt_player`; `pe_candidates` adds per-run contestedness forms D/E/F (mirror
of the aggregate forms shipped #3000). Orthogonality = `|Pearson(candidate, won)|`
per run -- LOWER = less collinear with win-rate = better anti-false-balance.
Threshold `DEFAULT_MAX_CORR = 0.6` (>= 0.6 -> reject the source). 3 ratified balance
oracles (hardcore_06, badlands_elite_01, foresta_pilot_01); badlands_ambient
excluded (designed-winnable, not an oracle).

## Result (|corr(candidate, won)|, lower = better)

| candidate | hc06 | badlands_elite | foresta_pilot | **POOLED (n=240)** |
| --- | --- | --- | --- | --- |
| **E_dmg_margin** | 0.403 | 0.478 | 0.464 | **0.499** |
| D_turns_contest | 0.725 | 0.542 | 0.705 | 0.562 |
| F_contest_combined | 0.469 | 0.651 | 0.677 | 0.660 |
| A/B/C (pressure) | -- | -- | -- | 0.000* |

\* pressure candidates are DEGENERATE on these corpora (they saved `pressure_final`,
not the `frac_ge75`/`mean`/`pmax` trajectory keys `run_to_stats` reads -> constant 0).
Not a regression: PE-from-pressure was already REJECTED in PR2 (saturated ~0.81-0.94).

## Selection

**E_dmg_margin** = least-collinear contestedness candidate, pooled **|corr| = 0.499 < 0.6**
(NOT rejected), consistent across all 3 oracles (0.40-0.48). It beats F (0.66, which WOULD
be rejected) and D (0.56). E is self-normalizing (`dmg_taken / (dmg_taken + dmg_dealt)`),
needs no arbitrary constant, and -- unlike pressure -- does NOT saturate: it discriminates
(hc06 0.32 / badlands_elite 0.54 / foresta_pilot 0.35 aggregate values span real range).

**Contestedness works where pressure failed**: pressure was rejected for ~zero
discrimination (saturated); E has real spread AND clears the formal collinearity threshold.

## Proposed composite band (E_dmg_margin)

Per-oracle aggregate value (what the composite consumes, `dmg_taken_avg / (dmg_taken_avg +
dmg_dealt_avg)`): hc06 **0.316** / badlands_elite **0.541** / foresta_pilot **0.351**.
mean = 0.403, sd = 0.099, k = 2.0 ->

> **PROPOSED band: [0.205, 0.600]**

## Caveats (for the ratification call)

- **Moderate collinearity**: E's |corr| = 0.499 is below 0.6 but NOT low -- E partly tracks
  outcome (a wipe = the party absorbed a high damage fraction). It is a tension signal, not
  a WR-independent one. master-dd decides whether 0.499 is acceptable as the PE source, OR
  escalates to **(c) drop the PE term** (composite = re-weighted win_rate + kd_ratio) per the
  handoff's negative-result branch. This is a judgment call, not a hard pass/fail.
- **Pressure not re-measured here** (corpora lack the trajectory keys); the pressure rejection
  stands from PR2.
- **3-oracle band** -- a low-pressure / easier oracle would widen the evidence; none was added.

## If ratified

Write `E_dmg_margin` + the band into `canonical-suite.yaml`; set `SELECTED_CANDIDATE` in
`pe_candidates.py`; update CANONICAL + the composite spec; flip P4 gate-2/4b + P5 to consume
the real composite band. That unblocks the SPEC-J + SPEC-H flips (the band is the gate).
