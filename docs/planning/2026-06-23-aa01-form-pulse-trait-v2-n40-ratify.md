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

`tools/sim/fp-trait-delta-probe.js` (sibling of the ratified `fp-delta-probe.js`): N=40
synthetic co-op teams (2-4 players, each 5 random bars in [-1,1], seeded LCG -> reproducible).
Each team is run through the REAL engine (`aggregateFormPulses` + `emergeBrancoTrait` +
`emergePlayerMinorTrait`) under BOTH arms; the only difference is the v2 flag (threshold 0 +
minor grants), so the measured delta IS the feature (paired, zero between-arm variance).
Combat power = a proxy from `active_effects.yaml` effect magnitudes (extra_damage /
damage_reduction / heal / buff_stat / attack_bonus = amount; apply_status = 1.5;
persistent_marker = 1; else 0.5). Branco trait counts once per creature (shared, N x); each
player's minor counts once.

## 3. Results (4 seeds, N=40 each)

| seed     | branco emergence (base -> v2) | minor/team | power added / team (CI95) | / creature (CI95) |
| -------- | ----------------------------- | ---------- | ------------------------- | ----------------- |
| 20260623 | 85.0% -> 100%                 | 3.08       | **4.31** (3.59 .. 5.03)   | 1.38 (1.21..1.54) |
| 7        | 95.0% -> 100%                 | 2.92       | 3.94 (3.40 .. 4.48)       | ~1.3              |
| 99       | 90.0% -> 100%                 | 3.00       | 4.04 (3.41 .. 4.67)       | ~1.3              |
| 2026     | 92.5% -> 100%                 | 2.85       | 3.65 (3.17 .. 4.13)       | ~1.3              |

## 4. Reading

- **Power added / team ~= 3.65 - 4.31, tight + overlapping CI95 (~3.2 .. 5.0) across seeds.**
  The effect is CONSISTENT, not a swingy outlier -- a calibratable constant.
- **Per creature ~= 1.3 - 1.4 power** = roughly **one extra T1 trait per creature**, almost
  entirely from the per-player MINOR trait (each creature gains one).
- **Always-emerge (threshold 0) is nearly free**: it only lifts branco coverage from ~85-95%
  to 100% (the +5-15% weak-lean teams), a small share of the total add.
- So the power source is the **per-player minor traits**, not the threshold change.

## 5. Recommendation (for the master-dd verdict)

- **Threshold -> 0 (always-emerge): LOW-RISK to ratify.** Marginal power, just removes the
  "indeciso -> nothing" dead-end.
- **Per-player minor traits: the real P6 lever.** ~+1 trait-equiv/creature is a MODERATE,
  PREDICTABLE buff (tight CI95). Two clean ways to ratify in balance:
  1. Pair the flag flip with an **encounter-difficulty offset** worth ~1.4 power/creature
     (the buff is a constant -> offsettable), OR
  2. Keep the minor-pool **genuinely minor** (cap effect magnitude; some current picks like
     `denti_seghettati`/`ali_fulminee` carry apply_status/extra_damage = on the higher end).
- Either path keeps the team's NET power near baseline while preserving the "every player
  leaves a personal mark" design.

## 6. Caveats

- The power-proxy is a **heuristic** (effect magnitude), NOT a live combat win-rate. It bounds
  the GRANT magnitude; a full combat A/B (`tests/smoke/ai-driven-sim.js` with the granted
  traits, N=40) would refine the win-rate delta -- a follow-up if master-dd wants win-rate, not
  just power.
- The minor-pool ids + the branco threshold stay **PROPOSED** until this verdict.
- N=40 per seed; 4 seeds shown for stability. Reproduce: `node tools/sim/fp-trait-delta-probe.js`.

## 7. Disposition

**Evidence delivered; ratification pending master-dd.** No flag is flipped on this report.
On ratify, set the encounter offset / minor-tier cap (sec.5) before `FORM_PULSE_TRAIT_V2_ENABLED`
is ever turned ON.
