---
title: 'Form-Pulse trait v2 -- N=40 grant-power ratify evidence (master-dd verdict pending)'
date: 2026-06-23
sprint: aa01-impronta-reconciliation
doc_status: review_needed
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-06-23'
source_of_truth: false
language: it-en
review_cycle_days: 90
---

# Form-Pulse trait v2 -- N=40 grant-power ratify evidence

> **L-069 posture: this REPORTS; the threshold/mapping ratification is a master-dd verdict
> (MA3 N=40).** Evidence for the P6-Fairness gate of the Form-Pulse trait v2 build
> ([Game PR #2992](https://github.com/MasterDD-L34D/Game/pull/2992), flag-gated
> `FORM_PULSE_TRAIT_V2_ENABLED` default OFF). Spec:
> [`2026-06-23-aa01-form-pulse-player-trait-spec-draft.md`](2026-06-23-aa01-form-pulse-player-trait-spec-draft.md).

## 1. Question

The spec flags one ratify-blocking concern: **how much combat power does v2 add per team?**
(shared branco trait + per-player minor traits + always-emerge). This N=40 quantifies it.

## 2. Method

`tools/sim/fp-trait-delta-probe.js` (sibling of the ratified `fp-delta-probe.js`): synthetic
co-op teams (2-4 players, each 5 random bars in [-1,1], seeded LCG -> reproducible). Each team
runs through the REAL engine (`aggregateFormPulses` + `emergeBrancoTrait` +
`emergePlayerMinorTrait`) under BOTH arms; the only difference is the v2 flag (threshold 0 +
minor grants), so the measured delta IS the feature (paired, zero between-arm variance).

Combat power = an **effective-power proxy** from `active_effects.yaml`: base effect magnitude,
then **gating-discounted** (a `min_mos>=5` gate x0.6; `requires: posizione_sopraelevata`
elevation x0.25; an unwired `requires_target_tag` -> x0 = engine-inert) and **tier-scaled**
(T2 x1.2, T3 x1.6); ally-synergy traits with no `.effect` (e.g. `legame_di_branco`) score ~2.
Branco counts once per creature (shared, N x); each player's minor counts once. The proxy was
hardened after the harsh review (PR #2992) which caught the flat-magnitude version over/under-
counting gated, inert, and synergy traits.

## 3. Results (improved proxy + fixed minor pool)

| sample                | branco emergence (base -> v2) | minor/team | power added / team (CI95) | / creature (CI95)       |
| --------------------- | ----------------------------- | ---------- | ------------------------- | ----------------------- |
| N=40 (probe)          | 85% -> 100%                   | 3.08       | 4.14 (3.26 .. 5.01)       | 1.31 (1.10 .. 1.51)     |
| **N=200 (canonical)** | --                            | --         | **3.72** (3.39 .. 4.05)   | **1.21** (1.14 .. 1.29) |

N=40 is a direction-probe (CI95 ~+-16% of mean); **N=200 is the canonical figure** (CI95 ~+-6%,
genuinely tight). The original N=40 4-seed table (older flat proxy, means 1.28-1.38/creature)
is superseded by this run.

## 4. Reading

- **Power added ~= 1.21 / creature (N=200, tight CI95 1.14 .. 1.29).** A MODERATE, PREDICTABLE
  buff -- a calibratable constant, not a swingy outlier.
- The granted traits span **T1-T3** (NOT "one T1 trait", a claim the harsh review corrected):
  the branco `memory_instinct +` pole is **T3** `cervello_predittivo` (2-turn stun), so a team
  leaning that axis gets a structurally stronger branco award than a `explore_caution +` team
  (double-gated T2). The proxy tier-scales for this; the per-axis spread is the residual risk.
- Almost all the add is the **per-player MINOR trait** (each creature gains one).
- **Always-emerge (threshold 0) is nearly free**: it only lifts branco coverage from ~85% to
  100% (the weak-lean teams), a small share of the total.

## 5. Recommendation (for the master-dd verdict)

- **Threshold -> 0 (always-emerge): LOW-RISK to ratify.** Marginal power; removes the
  "indeciso -> nothing" dead-end.
- **Per-player minor traits: the real P6 lever** (~1.2 power-equiv/creature). Two clean paths:
  1. Pair the flag flip with an **encounter-difficulty offset** worth ~1.2 power/creature
     (the buff is a near-constant -> offsettable; the offset is DIRECTIONAL, confirm with a
     real combat A/B before fixing the exact number), OR
  2. Keep the minor pool **genuinely minor** (cap effect magnitude / tier). The pool was
     already hardened in this PR (the inert `ancestor_autocontrollo...` + elevation-gated
     `ali_fulminee` picks replaced with reliable `sensori_planctonici` / `coda_prensile_muscolare`).
- Either path keeps NET team power near baseline while preserving "every player leaves a mark".

## 6. Caveats

- The proxy is gating-discounted + tier-scaled but STILL a heuristic -- it cannot model
  encounter terrain / enemy composition, so the offset is **directional**. A full combat A/B
  (`tests/smoke/ai-driven-sim.js` with the granted traits) is the follow-up if master-dd wants
  a win-rate, not a power estimate.
- The branco threshold + both mappings (branco + minor) stay **PROPOSED** until this verdict.
- Edge: a player with all-zero bars gets a deterministic first-axis fallback minor (not null);
  bars are continuous so exact-0 is rare (test documents it).

## 7. Disposition

**Evidence delivered; ratification pending master-dd.** No flag is flipped on this report.
On ratify, set the encounter offset / minor-tier cap (sec.5) before `FORM_PULSE_TRAIT_V2_ENABLED`
is ever turned ON. Reproduce: `node tools/sim/fp-trait-delta-probe.js --n 200`.
