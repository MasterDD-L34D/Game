---
title: 'Composite PE_ratio -- experiment-first definition + composite wiring'
doc_status: draft
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-06-18'
source_of_truth: false
language: en
review_cycle_days: 30
---

# Composite PE_ratio -- experiment-first definition + composite wiring

> Brainstormed 2026-06-18 (G2 follow-up, unblocks the deferred composite gate). The
> per-template calibration composite `0.50*win_rate + 0.25*kd_ratio + 0.25*pe_ratio`
> (canonical-suite.yaml:29, CANONICAL-AI-PLAYTEST.md:79) is UNCOMPUTABLE today: `pe_ratio`
> is undefined anywhere, `kd_ratio` is emitted only as an unnormalized `kd_avg`, and the
> scalar composite has no band. That gap is why P4 gate-2/gate-4b fail-closed and P5 only
> checks WR-band drift. This spec defines PE_ratio **by experiment, not by armchair**, then
> wires the computable composite. Input to `writing-plans`.

## 1. Problem / current state (verified on origin/main `24fbe86b`)

- **`pe_ratio` is undefined.** It appears ONLY in the composite formula (manifest:29,
  CANONICAL:79) and in G2 code comments noting its absence. No computation exists
  (grep: no `pe_ratio` / `pressure_efficiency` / `pressure_ratio`).
- **`kd_ratio` != what is emitted.** `batch_calibrate_*.py aggregate()` emits `kd_avg`
  (mean of per-run kill/death), not a normalized `kd_ratio`; the orchestrator maps
  `kd_avg -> kd_ratio` as a stopgap. `kd_avg` is ~0.8 typical, not 0..1.
- **No composite band.** The scalar composite has no target range in the manifest (the
  dimensional gap flagged in the P4 spec): "composite in-band" is undefined.
- **Consequence:** `objective.evaluate_metric` raises `KeyError` on `pe_ratio`/`kd_ratio`,
  so the composite is `None`; P4 gate-2/4b abort fail-closed, P5 degrades to WR-only.

### 1.1 The `sistema_pressure` mechanic (grounded, 2026-06-18)

PE was intended as **Pressure-Efficiency** (owner, 2026-06-18): a tension/engagement signal
orthogonal to WR (outcome) and KD (combat efficiency). Ground truth of the mechanic:

- `sistema_pressure` is a 0-100 AI-escalation threat gauge (start 75 = Critical). Tiers:
  Calm(0-24)/Alert(25-49)/Escalated(50-74)/Critical(75-94)/Apex(95-100). Pressure controls
  AI intents-per-round (1->4) and reinforcement budget (0->4). HIGH pressure = BAD for the
  player (sessionHelpers.js:771-777).
- Evolution per round: +20 player-kills-Sistema, -10 Sistema-kills-player, -1 natural decay,
  +-biome multiplier, +-Defy (sessionRoundBridge.js:803-815, defyEngine.js).
- **Load-bearing finding -- collinearity.** Because pressure rises +20 on player kills,
  it is positively correlated with winning: empirically WINS end at ~99.6 pressure (apex),
  LOSSES at ~69. So `pressure_final` (and any pressure-MAGNITUDE metric) partly re-measures
  WR -- the opposite of the orthogonal third axis the composite wants. Perfect orthogonality
  from pressure alone is NOT achievable; the extractable orthogonal signal is mainly the
  "too-easy / low-engagement" case (pressure stays low = AI never threatened, trivial
  encounter even at in-band WR).
- Only `pressure_final` is emitted per run today; the full per-round trajectory
  (`pressure_samples`) exists internally but is not surfaced (batch_calibrate_hardcore06.py:743).

## 2. Goal / scope

Define `pe_ratio` (a 0..1, higher=healthier tension signal) **empirically** -- pick the
formula that is the LEAST collinear with WR on real run data, rather than guessing -- then
make the composite computable and derive its band. Negative-result is a valid outcome: if
every pressure-derived candidate is too collinear, say so and reconsider the signal source.

**In scope:** pressure-trajectory instrumentation; candidate PE formulas; an orthogonality
experiment + selection report; `kd_ratio` normalization; empirical composite-band derivation;
wiring the computable composite into the existing P4/P5 consumers.

**Out of scope (YAGNI):** changing the pressure mechanic (the +20-on-kill direction is an
intentional AI-War contract, not a bug); auto-ratifying the composite band (human-only, per
CANONICAL sec 9); promoting any gate from advisory (separate SDMG track).

## 3. Design (design-for-isolation)

### 3.1 Sim instrumentation (additive, deterministic)
`batch_calibrate_*.py aggregate()` gains per-scenario pressure-trajectory stats, aggregated
over the run set (the per-run `pressure_samples` are surfaced, not just `pressure_final`):
- `pressure_mean` (mean over all rounds of all runs),
- `pressure_tier_fractions` (share of rounds in each tier: calm/alert/escalated/critical/apex),
- `apex_reach_rate` (fraction of runs that touched pressure >= 95).
Additive keys; no behavior change; seed-pinned -> deterministic.

### 3.2 PE candidates (`tools/py/pe_candidates.py`, pure)
Each maps the trajectory stats -> a 0..1 value (higher = more sustained tension):
- **A -- sustained-threat fraction:** share of rounds with pressure >= 75 (Critical+Apex).
- **B -- time-averaged pressure:** `pressure_mean / 100` (trajectory, not endpoint-biased).
- **C -- apex-reach rate:** fraction of runs that reached Apex (>= 95).
Pure functions, unit-tested on synthetic trajectory dicts. New candidates are easy to add.

### 3.3 Orthogonality analysis (`tools/py/pe_orthogonality.py`, pure)
Given a per-run corpus `[(candidate_value, won_bool), ...]` for each candidate:
- `abs(pearson(candidate, won))` -- the collinearity score; LOWER is better (more orthogonal).
  This is the PRIMARY selection criterion.
- a SECONDARY discrimination check: run each oracle once more at a deliberately-EASED knob
  (low difficulty, e.g. boss_hp at its `knob_space` min) and confirm the candidate scores
  LOWER tension on that trivialized run than on the ratified-knob run (correct direction +
  a meaningful gap). This guards against a candidate that is orthogonal-but-flat (no signal).
- emits a ranked **selection report** (each candidate's |corr|, discrimination gap, verdict).
Pure (numpy-free; hand-rolled Pearson), unit-tested with synthetic correlated/uncorrelated data.

### 3.4 Experiment runner (maintainer/backend)
A thin CLI that, for each ratified balance-oracle, runs the existing seed-pinned N=100
harness on **node 22** (CANONICAL sec 3 rule 8), collects per-run `(pressure trajectory,
won)`, computes A/B/C via 3.2, and feeds 3.3 -> prints the selection report. BACKEND-DEPENDENT
(needs the Game backend), so the actual run is owner/maintainer-validated; the tooling it
calls is fully unit-tested without a backend.

### 3.5 kd_ratio normalization
`kd_ratio = kd_avg / (kd_avg + 1)` -- bounded (0,1), monotonic increasing, 0.8 -> ~0.44. Makes
all three composite terms 0..1 and same-direction (higher=healthier). Pure + tested.

### 3.6 Composite band (human-ratified)
Once `pe_ratio` (the selected candidate) + normalized `kd_ratio` are emitted, compute the
composite on the in-band ratified oracles at N=100; the band = `[mean - k*half, mean + k*half]`
derived from those healthy values (proposed, with the numbers shown). The band is
**human-ratified, never auto-derived in CI** (CANONICAL sec 9); the tool proposes, the owner
ratifies into the manifest.

## 4. Experiment protocol + selection criterion

1. Run N=100 seed-pinned (canonical_seed 424242), node 22, on each ratified oracle (hc06, hc07).
2. For each run capture the pressure trajectory + the won/lost outcome.
3. For each candidate A/B/C compute the per-run value, then `|pearson(value, won)|` across runs.
4. **Select** the candidate with the LOWEST `|corr|` (most orthogonal to WR) that also shows
   positive discrimination (separates too-easy from balanced). Document all three numbers.
5. **Negative-result branch:** if `min |corr| > 0.6` (all candidates strongly collinear),
   record it (the experiment FALSIFIED pressure-as-PE-source) and PR2 switches the tension
   signal to the alternate already-telemetered source (turns-to-resolve + dmg_taken
   "contestedness"), re-running 3.2-3.4 with those candidates. `0.6` is a starting threshold,
   ratified with the data.

## 5. Wiring (PR2, post-selection)

- Emit the selected `pe_ratio` + normalized `kd_ratio` in `aggregate()` (and surface them
  through `calibrate_parallel` / the orchestrator runner -> `evaluate_metric` now computes the
  composite instead of `None`).
- Derive + propose the composite band (sec 3.6); owner ratifies into `canonical-suite.yaml`
  (a new per-scenario `composite_band`, or a global default).
- **Unblock:** P4 gate-2/gate-4b can now evaluate the composite (no longer fail-closed on
  `None`); P5 can add composite-drift to its WR-drift check. Update those modules + their
  tests to consume the real composite + band.
- Update `CANONICAL-AI-PLAYTEST.md` + the calibration spec with the ratified PE_ratio
  definition + the selection evidence.

## 6. Testing (TDD)

- `pe_candidates` unit tests: each formula on synthetic trajectory dicts; boundary (all-calm,
  all-apex, empty) -> defined 0..1 outputs.
- `pe_orthogonality` unit tests: a perfectly-correlated synthetic corpus -> |corr| ~ 1; an
  uncorrelated one -> |corr| ~ 0; discrimination separates a seeded too-easy set.
- kd normalization: monotonic, bounded, known points (0 -> 0, 0.8 -> ~0.444, large -> ~1).
- aggregate instrumentation: a run-fixture -> the new pressure keys present + correct (no
  backend; feed synthetic per-run `pressure_samples`).
- No backend/network in any test; the real N=100 run is the owner's experiment step.

## 7. Risks / open questions

- **Collinearity (load-bearing):** pressure tracks kills/winning; the experiment may show even
  the best candidate is materially collinear. The selection report makes this explicit and the
  negative-result branch (sec 4.5) handles "PE-from-pressure rejected". Either outcome is a
  result, not a failure.
- **Composite band = a self-designed threshold on the balance authority (SDMG).** It is
  human-ratified, never auto; the tool only proposes with the numbers. A harsh-review of the
  band derivation precedes ratification.
- **N=100 cost.** The experiment is one N=100 sweep per oracle on node 22 -- a maintainer run,
  not per-PR.
- **kd_ratio semantics.** Normalizing `kd_avg` (mean-of-per-run-ratios) is the chosen
  definition; ratio-of-totals (sum kills / sum deaths) is a documented alternative if the
  normalized mean proves unstable.

## 8. Delivery (2 sequenced PRs)

1. **PR1 -- experiment harness:** pressure-trajectory instrumentation in `aggregate()` +
   `pe_candidates.py` + `pe_orthogonality.py` + the experiment-runner CLI + full hermetic
   tests. Ships the harness; the owner runs the N=100 experiment + the selection report.
2. **PR2 -- wire the winner:** emit the selected `pe_ratio` + normalized `kd_ratio`; derive +
   ratify the composite band; unblock P4 gate-2/4b + P5 composite-drift; update CANONICAL +
   spec with the ratified definition + evidence. (Or, on a negative result, switch the tension
   source per sec 4.5.)

Each PR is owner-gated (merge = Eduardo), TDD, and gets its own `writing-plans`. PR1 is the
recommended first implementation; the formula choice is the EXPERIMENT's output, not a guess.
