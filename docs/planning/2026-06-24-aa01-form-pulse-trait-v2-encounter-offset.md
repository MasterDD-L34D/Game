---
title: 'Form-Pulse trait v2 -- encounter-difficulty offset (ratify path-1, flag-gated enemy-HP)'
date: 2026-06-24
sprint: aa01-impronta-reconciliation
doc_status: review_needed
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-06-24'
source_of_truth: false
language: it-en
review_cycle_days: 90
---

# Form-Pulse trait v2 -- encounter-difficulty offset

> The LAST code/calibration blocker before the `FORM_PULSE_TRAIT_V2_ENABLED` prod flip.
> Implements ratify path-1 (the encounter-difficulty offset) from
> [`2026-06-23-aa01-form-pulse-trait-v2-n40-ratify.md`](2026-06-23-aa01-form-pulse-trait-v2-n40-ratify.md)
> sec.5 + the [PR #3017](https://github.com/MasterDD-L34D/Game/pull/3017) combat A/B.
> Coverage + cap-tier (the other ratify items) shipped in
> [#3016](https://github.com/MasterDD-L34D/Game/pull/3016). PROPOSED until master-dd ratifies.

## 1. Problem

The v2 grant (always-emerge branco + per-player minor) adds ~1.2 power/creature. The #3017
combat A/B measured that as a real pace advantage: the team clears `enc_savana_01` ~1.6-1.8
rounds FASTER. Ratify path-1: pair the flag flip with an encounter-difficulty offset worth
~that, so NET team power stays near baseline.

## 2. Mechanism (flag-gated enemy-HP, ONE flag gates buff + offset)

- `services/combat/biomeModifiers.js`: new `formPulseV2EnemyHpOffset(env)` -> returns the
  offset multiplier (default `FP_V2_ENEMY_HP_OFFSET_DEFAULT`) when `FORM_PULSE_TRAIT_V2_ENABLED`
  is ON, else `1.0` (strict no-op). Env-overridable via `FORM_PULSE_V2_ENEMY_HP_OFFSET` for
  re-calibration.
- `routes/session.js` `/start`: the offset is FOLDED into the existing biome enemy-HP step --
  `effective = biomeModifiers.hp_mult * formPulseV2EnemyHpOffset()`, applied via the existing
  `applyEnemyHpMultiplier` (idempotent per unit, so it must be ONE call). Enemy (`controlled_by:
'sistema'`) units only; players untouched.
- **One flag** (`FORM_PULSE_TRAIT_V2_ENABLED`) gates BOTH the team grant AND this enemy offset:
  flipping it ON turns on the buff + its counter together. Flag OFF = byte-identical to today.
- Co-op AND the A/B sim both route enemy build through `/api/session/start`, so the offset
  applies in real play and is measured by the harness.

## 3. Calibration A/B (enc_savana_01, aggressive, 2p)

Control = flag OFF + no grant. Treatment = flag ON (offset) + the v2 grant
(`AI_SIM_FORM_PULSE_V2_GRANT=1`). Paired by seed (`fp-trait-ab-analyze.js`), so the only
between-arm difference is the grant + its offset. An N=12/arm probe bracketed the value;
**N=40/arm** (tight CI) ratified it:

| offset           | N   | paired delta rounds (treat - ctrl)  | reading                                                   |
| ---------------- | --- | ----------------------------------- | --------------------------------------------------------- |
| 1.0 (grant only) | 12  | -1.82 (CI95 -2.93 .. -0.70)         | buff wins (matches #3017 -1.63)                           |
| 1.3              | 40  | -0.80 (CI95 -1.49 .. -0.11)         | EXCLUDES 0 -- small residual player edge (under-corrects) |
| **1.4**          | 40  | **+0.68** (CI95 **-0.14 .. +1.51**) | **CROSSES 0 = statistically net-neutral -> ADOPTED**      |
| 1.5              | 12  | +1.42 (CI95 +0.22 .. +2.61)         | over-corrects                                             |

**Default set to 1.4.** Key finding: enemy-HP -> rounds-to-clear is **sub-linear** (last-hit
overkill + fixed wave-trigger timing dampen it), so the naive ~+8% (1.08) moved the delta ~0;
the grant's ~1.8-round edge needs ~+40% enemy HP to reach statistical neutrality (1.3
under-corrected by -0.80r at N=40; 1.4's CI95 includes 0).

## 4. Caveats / before the flip

- **N=40 confirm DONE** (sec.3): 1.4 lands the paired round delta at +0.68 (CI95 -0.14..+1.51,
  crosses 0 = statistically net-neutral). 1.3 left a -0.80r residual (excluded 0).
- Calibrated on **enc_savana_01** only. The offset is a GLOBAL enemy-HP scalar (composes
  multiplicatively with each biome's `hp_mult`); the offset slightly leans toward harder on this
  scenario -- the safe direction for a buff.
- **Cross-biome sweep ATTEMPTED (2026-06-24) -- HARNESS-LIMITED, not feasible as-is.** Of the 14
  encounters, only `enc_savana_01` (standard + elimination + diff2) yields a clean
  rounds-to-victory A/B. The one other elimination scenario, `enc_badlands_foodweb_pilot_01`
  (hardcore diff4), saturates the timeout/defeat floor (control 0/16 victories, **0 both-victory
  pairs** -> no signal); the remaining 12/14 are non-elimination (capture / escort / escape /
  sabotage / survival) which the passive closest-attack player-AI never wins. So 1.4 stays
  savana-calibrated (the representative standard-elimination case). A true cross-biome validation
  needs an objective-aware / positioning player-AI policy or human playtests (a sim-harness
  upgrade). Residual risk is safe-direction (the offset only adds difficulty; the grant offsets
  player-side -- on badlands the treatment still scored 1 win + fewer defeats than control).
- AI-policy sim (passive closest-attack player AI) -> directional, not a human-play win-rate.

## 5. Disposition

PROPOSED. Tests: `tests/services/combat/formPulseV2EnemyHpOffset.test.js` (6/6 -- flag gate,
env override, enemy-only + idempotent fold). `prettier --check` clean. The N=40 confirm is DONE
(sec.3); after this merges the FORM_PULSE flip is a single deploy step: set `FORM_PULSE_TRAIT_V2_ENABLED=true`
in the deploy `.env` (the offset rides the same flag). See
`Game-Godot-v2/docs/godot-v2/qa/2026-06-23-prod-flag-flip-readiness.md`. Reproduce: boot two
backends (control: no flag; treatment: `FORM_PULSE_TRAIT_V2_ENABLED=true`), run
`tools/sim/batch-ai-runner.js --scenarios enc_savana_01 --profiles aggressive --seed-count 12`
against each (treatment with `AI_SIM_FORM_PULSE_V2_GRANT=1`), then
`tools/sim/fp-trait-ab-analyze.js <control_dir> <treatment_dir>`. Cross-ref #2992 / #3016 / #3017.
