---
title: 'Per-template / per-objective calibration orchestrator (auto-tune knob to band)'
doc_status: draft
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-06-17'
source_of_truth: false
language: en
review_cycle_days: 30
---

# Per-template calibration orchestrator

> Brainstormed 2026-06-17 (gap-audit G2, cross-repo AI-gamedev-standards report). The AI-driven
> batch-sim machinery already exists (Optuna, SPRT, parallel harness, N-ladder, multi-policy
> bands, `canonical-suite.yaml`). The gap is NOT a missing optimizer: it is (a) **band/knob/
> objective duplication** across YAML + Python (the #2719 stale-band footgun class), (b) a
> **manual escalation loop** (probe -> read -> hand-edit YAML -> restart -> re-run, 30-50min/
> scenario), and (c) no **stale-band detector**. This spec defines a manifest-driven
> orchestrator that auto-tunes a scenario's KNOB to its existing band, with a **safety-gated**
> production write and an **advisory** stale-band detector. Optuna becomes first-class
> (dep approved 2026-06-17). Delivered as **5 sequenced PRs**. Input to `writing-plans`.

## 1. Problem / current state (verified on origin/main `8d9a68be`)

The calibration stack is mature but the pieces are not coupled declaratively, and the loop is
manual. Confirmed via gap-audit (paths + lines in that report):

- **Optimizers exist**: `calibrate_optuna.py` (Bayesian TPE, knob ranges in a hardcoded
  `SCENARIO_CFG` dict, research-tier, Optuna not yet an approved dep), `calibrate_sprt.py`
  (Wilson-CI early stop), `calibrate_map_elites.py` (QD, **stub** with synthetic sin/cos
  objective), `calibrate_parallel.py` (4-shard harness, production), `calibrate_policies.py`
  (multi-policy band), `playtest_canonical.py` (suite runner reading `canonical-suite.yaml`).
- **Manifest exists**: `docs/playtest/canonical-suite.yaml` declares per-scenario
  `target_band`, `ratified_knob`, `status`, `tool`, `port`; global `n_ladder`, `policies`,
  `composite_metric`, `repro`, and the `band_invalidation_protocol` pointer.
- **Duplication (the footgun)**:
  - `target_band` lives in the manifest AND is hardcoded again in `batch_calibrate_hardcore0X.py`.
  - knob ranges live ONLY in `calibrate_optuna.py SCENARIO_CFG` (not in the manifest).
  - `composite_metric` is global, not per-scenario.
  - Change the manifest band and the Python script silently keeps the old one -> the class of
    stale/divergent state behind #2719.
- **Manual loop** (CANONICAL-AI-PLAYTEST.md sec 1.4): probe N=10 -> diagnose metric-first ->
  hand-edit `damage_curves.yaml` knob -> restart backend -> re-probe -> escalate N=40, with
  multi-knob discipline (L-070: probe between knob changes). ~3-5 iters, ~30-50min/scenario.
- **No stale-band detector**: OA2 cascade (#2719/#2764) showed a *correct* code change can shift
  a ratified band OOB; today a human must notice + re-baseline manually. CANONICAL sec 9
  (`band_invalidation_protocol`): such a shift = **block + human re-ratify, NEVER auto-update
  the band**.

## 2. Goal / scope

A manifest-driven **calibration orchestrator** that, given a scenario, auto-tunes its KNOB to
the scenario's existing band using the existing optimizers, plus an advisory stale-band detector.

**Load-bearing distinction (reconciles with CANONICAL sec 9):**
- The orchestrator auto-tunes the **KNOB** (e.g. `boss_hp_multiplier`) to land WR inside the
  **existing ratified BAND**. The knob write to production is **safety-gated** (sec 5).
- The orchestrator NEVER auto-updates a **BAND**. A band shift is detected (advisory) and routed
  to a human re-ratify, per sec 9. Knob != band.

**In scope** (user-selected ambitious version, reconciled):
1. Manifest extension: per-scenario `knob_space`, `objective_metric`, `escalation_policy`,
   optional `meta_bands` -> single SoT for band+knob+objective (kills duplication).
2. Refactor existing scripts to READ band/knob/objective from the manifest (remove hardcoded
   `SCENARIO_CFG` + duplicated bands).
3. Orchestrator `calibrate_orchestrator.py`: escalation state-machine (probe -> ratify ->
   Optuna -> re-verify), composite-objective aware, writes staging + structured report.
4. Optuna first-class (dep approved 2026-06-17): knob_space from manifest, staging-writer.
5. Safety-gated auto-ratify of the KNOB to production (sec 5).
6. Advisory stale-band detector (sec 6): flags + opens issue, never auto-acts.

**Out of scope (YAGNI / deferred)**: replacing the per-PR `combat-balance-gate.yml` (stays the
gate); MAP-Elites real integration (stub stays research); meta-loop 7-metric auto-tuning (v1
covers combat WR + composite; meta_bands declared but tuned later); auto-updating any band.

## 3. Architecture

### 3.1 Manifest extension (`canonical-suite.yaml`) -- the single SoT

Per scenario, additive fields (back-compatible; absent -> current behavior):

```yaml
- id: enc_tutorial_06_hardcore
  target_band: [0.15, 0.30]          # existing (WR band)
  ratified_knob: { boss_hp_multiplier: 1.02 }   # existing
  knob_space:                         # NEW: search space (was in SCENARIO_CFG)
    boss_hp_multiplier: { type: float, min: 0.50, max: 1.30, step: 0.02 }
  objective_metric: '0.50*win_rate + 0.25*kd_ratio + 0.25*pe_ratio'  # NEW: per-scenario, defaults to global
  escalation_policy:                  # NEW (defaults from global)
    probe_n: 10
    ratify_n: 40
    forensic_n: 100
    oob_escalate_pp: 0.15             # if N=40 OOB by > this -> Optuna
    optuna_trials: 8
    optuna_n_per_trial: 20
```

Refactor: `batch_calibrate_*` + `calibrate_optuna` read band / knob_space / objective from the
manifest (one loader, `suite_manifest.py`). No band/knob constant duplicated in Python.

### 3.2 Orchestrator (`tools/py/calibrate_orchestrator.py`)

Pure-ish state machine; all sim runs delegated to existing tools (parallel harness, optuna).

```
load scenario from manifest (band, knob_space, objective, escalation_policy, seed)
PROBE  : run N=probe_n multi-policy -> WR band + composite + Wilson CI
  in-band & CI tight        -> goto RATIFY
  OOB                       -> goto OPTUNA
RATIFY : run N=ratify_n     -> composite in-band?
  yes                       -> candidate := current knob ; goto FINALIZE
  OOB by <= oob_escalate_pp -> bisection nudge 1 knob (L-070 single-knob) ; goto RATIFY (max k)
  OOB by >  oob_escalate_pp -> goto OPTUNA
OPTUNA : calibrate_optuna (knob_space, optuna_trials x optuna_n) -> best knob ; goto RATIFY
FINALIZE:
  write candidate knob -> damage_curves.staging.yaml (always)
  emit structured report (knob, band, composite, CI, n_used, seed, false_band_risk)
  if --auto-ratify  -> goto AUTO-RATIFY-GATE (sec 5)
  else              -> STOP (human ratifies from staging)
```

Determinism: `--seed` pins (canonical 424242) for bit-identical runs; `--no-seed` for fresh
statistical sample. Reuses the repro contract (host 127.0.0.1, lobby_ws off, DAMAGE_CURVES_PATH).

### 3.3 Modules (design-for-isolation)

- `tools/py/suite_manifest.py` -- load/validate manifest; single accessor for band/knob/objective.
- `tools/py/calibrate_orchestrator.py` -- the state machine (no sim logic inline).
- `tools/py/objective.py` -- parse + evaluate `objective_metric` string against a run's metrics.
- `tools/py/detect_stale_bands.py` -- advisory detector (sec 6).
- existing `calibrate_parallel.py` / `calibrate_optuna.py` -- called as libraries (refactored to
  read knob_space/band from `suite_manifest`).

## 4. Escalation ladder (summary)

| stage | N | action | exit |
|-------|---|--------|------|
| probe | 10 | multi-policy WR + composite + Wilson CI | in-band -> ratify; OOB -> optuna |
| ratify | 40 | composite in-band check | in-band -> finalize; near-OOB -> 1-knob bisection (<=k); far-OOB -> optuna |
| optuna | 8 x 20 | Bayesian search over knob_space | best knob -> ratify |
| forensic | 100 | only under --auto-ratify (sec 5) | composite in-band -> production write |

L-070 multi-knob discipline encoded: bisection nudges ONE knob at a time; multi-knob scenarios
go to Optuna (joint search) rather than sequential hand-tuning.

## 5. Safety-gated auto-ratify (KNOB to production)

`--auto-ratify` is a maintainer-invoked flag, NEVER set in CI. It produces a fully-gated
PROPOSAL (staging write + report + provenance sidecar); the actual production write requires a
SECOND explicit `--confirm-prod` (owner decision 2026-06-17: proposal + 2nd-confirm keeps the
human commit as the SDMG falsifier). Production write of the KNOB happens only if ALL hold:
1. N=100 forensic run completed (not just N=40).
2. composite_metric computable AND in-band at N=100 (not WR-only -- anti false-balanced,
   CANONICAL sec 1.3). **FAIL-CLOSED**: today the batch aggregate emits neither `pe_ratio` nor
   `kd_ratio`, so the composite is `None` and this gate aborts. No WR-only fallback inside the
   gate (that would silently diverge from the manifest contract, the #2719 class). Unblock = a
   follow-up wires `pe_ratio` + `kd_ratio` into the aggregate (and defines a composite band --
   the scalar composite has no band in the manifest today; see P4 PR note).
3. seed-pinned bit-identical re-verify passes -- FAIL-CLOSED: requires a stored baseline, the
   canonical node 22 (determinism is within-runtime only, CANONICAL sec 3 rule 8), and an
   identical run plan (shards + N, since seed offsets are cumulative-N).
4. **band-invalidation check -- STRUCTURAL, P5-independent (P4 ships before P5)**: the write
   surface is knob-only BY CONSTRUCTION (it can write `ratified_knob` + the `scenario_overrides`
   knob field; it is statically incapable of writing `target_band` -- asserted in code + test).
   AND it aborts unless, at the SAME forensic N=100 run, WR (gate-4b) AND composite (gate-2) land
   inside the EXISTING band. If the freshly-tuned knob cannot reach the band, that inability IS
   the stale-band signal (#2719) -> abort + route to human re-ratify, band NOT modified. P5's
   `detect_stale_bands.py` later adds the PROACTIVE/nightly advisory issue-filing; P4's per-write
   safety does NOT depend on it. (Authority: assert against the machine-readable contract
   `canonical-suite.yaml` `band_invalidation_protocol` + spec sec 2/5, which reconcile TO
   CANONICAL sec 9 -- sec 9 literally bans auto-updating `target_band` IN CI.)
5. atomic write to `damage_curves.yaml` + `ratified_knob` updated in the manifest (comment-
   preserving, two-phase tmp + `os.replace` with a post-write read-back reconcile that both files
   agree), plus a provenance SIDECAR JSON (never inline in the runtime-parsed YAML). Stamp:
   seed, n, named composite (formula + value, `null` if uncomputable -- surfaced not faked), CI
   (real Wilson interval on the N=100 win count, or `null` + reason -- never a fabricated
   placeholder), git_commit, Coding-Agent/Trace-Id (captured fresh -- no reusable producer exists).

Default (no flag): staging write + report only; human ratifies. This is the CANONICAL-compliant
default; auto-ratify is the opt-in, evidence-heavy fast path -- and even then a second
`--confirm-prod` is required to touch production.

**SDMG gate**: before `--auto-ratify` + `--confirm-prod` is enabled for real use, the gate logic
gets a harsh-reviewer falsification pass (ADR-0026 #7). Until then it ships behind the flags, off,
and -- because gate-2 fail-closes on the `None` composite -- the live prod write is unreachable by
design (P4 = honest gate machinery + atomic writer; the metrics wiring is a follow-up).

## 6. Advisory stale-band detector (`detect_stale_bands.py`)

Runs on-demand and nightly (extend `ai-sim-nightly.yml`, advisory job). For each ratified
scenario: run N=40 (seed-pinned) -> if WR/composite OOB AND AI regression tests green (i.e. a
*correct* change shifted the band, the #2719 signature):
- Open a GitHub issue using the CANONICAL sec 9 band-invalidation template (scenario, old band,
  observed WR/composite, suspected culprit via git-bisect hint, N used, seed).
- NEVER edits the band or the knob. Pure signal.
- Label `sot-drift-candidate` / `band-invalidation` for human triage + re-ratify.

**SDMG gate**: detector is advisory-only until a harsh-reviewer falsification pass validates its
true/false-positive behavior on known cases (#2719, #2764, iter3-overshoot). Only then could a
future ADR consider promoting any of its signals to a gate.

## 7. Optuna integration (first-class, dep approved 2026-06-17)

- Add `optuna` to `tools/py/requirements.txt` (dep approved by owner 2026-06-17, CLAUDE.md gate
  satisfied). CI installs it; the orchestrator's OPTUNA stage requires it.
- `calibrate_optuna.py` refactored: knob_space + objective from `suite_manifest` (delete the
  hardcoded `SCENARIO_CFG`). Staging-writer pattern retained (#2356): trials write
  `damage_curves.staging.yaml`, never production.
- Optuna runs are NOT in the per-PR gate (too slow); orchestrator is a maintainer/nightly tool.

## 8. Testing (TDD)

- `suite_manifest` unit tests: load/validate, defaults fallback, malformed knob_space rejection.
- `objective.py` unit tests: parse + evaluate composite strings on synthetic metric dicts.
- Orchestrator state-machine unit tests with a **synthetic objective** (deterministic fake sim,
  like the map_elites stub's sin/cos): assert ladder transitions (probe->optuna->ratify) without
  a live backend.
- **Negative control (L-041)**: a scenario seeded OOB MUST drive the ladder to Optuna + produce a
  non-in-band finalize when the knob_space cannot reach band (no vacuous PASS).
- Auto-ratify-gate unit test: production write blocked unless all 5 gates pass (assert each gate
  independently blocks).
- Smoke (QG Step-1, output captured per L-038): `calibrate_orchestrator.py --scenario
  hardcore_06 --dry-run` then a live `--probe-only --n 10`.

## 9. CI integration

- The existing `combat-balance-gate.yml` (per-PR, phase-2 blocking) **stays the gate**; the
  orchestrator does NOT replace it and is NOT added to the per-PR path (too slow).
- `detect_stale_bands.py` runs as an advisory job in `ai-sim-nightly.yml` (issue-on-drift, never
  blocking). No path-filter footgun (L-039): advisory, separate from required checks.
- Manifest refactor (P1) is covered by the existing data/test gates (band still read, now from
  one place); a test asserts manifest<->script band parity (the anti-duplication invariant).

## 10. Risks / open questions

- **SDMG (load-bearing)**: both the auto-ratify gate and the stale-band detector are
  self-designed methods touching the balance authority. Both ship behind flags / advisory-only
  until a harsh-reviewer falsification pass (ADR-0026 #7) validates them on the known cases.
- **Optuna determinism**: TPE sampler seeded; document that Optuna search is reproducible only
  with a pinned sampler seed + the run seed.
- **Composite objective gaming**: optimizing composite (not WR-only) is the guard against
  false-balanced; verify the weights per-scenario don't let a degenerate knob satisfy composite
  while WR is OOB (add a hard WR-in-band precondition alongside composite).
- **Field-name discovery**: knob names per scenario confirmed against `damage_curves.yaml`
  `scenario_overrides` during P1; the manifest becomes the SoT after.
- **node-22 canonical**: orchestrator + CI calibration MUST run node 22 (the steep hc06 lever is
  V8-cliff-sensitive, CANONICAL sec 3 rule 8). Enforce in the tool's repro check.

## 11. Delivery (5 sequenced PRs)

1. **P1 manifest + refactor (kill duplication)**: add knob_space/objective/escalation_policy to
   `canonical-suite.yaml`; `suite_manifest.py` + `objective.py`; refactor batch scripts to read
   band/knob from manifest; parity test. (Closes the #2719 stale-divergence footgun. Highest
   value, lowest risk.)
2. **P2 orchestrator + escalation** (no Optuna yet; probe/ratify/bisection + staging + report).
3. **P3 Optuna first-class** (dep add + SCENARIO_CFG removal + OPTUNA stage).
4. **P4 safety-gated auto-ratify** (the 5-gate production write, behind `--auto-ratify`, off;
   harsh-review falsification before enabling).
5. **P5 advisory stale-band detector** (nightly advisory + issue; harsh-review falsification).

Each PR is owner-gated (merge = Eduardo), TDD, and gets its own `writing-plans`. P1 is the
recommended first implementation.
