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

## 3. Calibration A/B (enc_savana_01, paired N=12/arm, aggressive, 2p)

Control = flag OFF + no grant. Treatment = flag ON (offset) + the v2 grant
(`AI_SIM_FORM_PULSE_V2_GRANT=1`). Paired by seed (`fp-trait-ab-analyze.js`), so the only
between-arm difference is the grant + its offset.

| offset           | paired delta rounds (treat - ctrl) | reading                                                    |
| ---------------- | ---------------------------------- | ---------------------------------------------------------- |
| 1.0 (grant only) | **-1.82** (CI95 -2.93 .. -0.70)    | buff wins -- treatment clears faster (matches #3017 -1.63) |
| **1.3**          | **+0.42** (CI95 -1.47 .. +2.31)    | **CI95 crosses 0 = net-neutral -> CALIBRATED**             |
| 1.5              | +1.42 (CI95 +0.22 .. +2.61)        | over-corrects -- offset wins                               |

**Default set to 1.3.** Key finding: enemy-HP -> rounds-to-clear is **sub-linear** (last-hit
overkill + fixed wave-trigger timing dampen it), so the naive ~+8% (1.08) moved the delta ~0;
the grant's ~1.8-round edge needs ~+30% enemy HP to cancel.

## 4. Caveats / before the flip

- **N=12 is a direction probe** (CI95 ~+-1.9 rounds). Confirm with a full **N=40** A/B (the
  #3017 standard) before `FORM_PULSE_TRAIT_V2_ENABLED` is flipped ON in prod.
- Calibrated on **enc_savana_01** only. The offset is a GLOBAL enemy-HP scalar (composes
  multiplicatively with each biome's `hp_mult`); a cross-biome sweep is the N=40 follow-up.
- AI-policy sim (passive closest-attack player AI) -> directional, not a human-play win-rate.

## 5. Disposition

PROPOSED. Tests: `tests/services/combat/formPulseV2EnemyHpOffset.test.js` (6/6 -- flag gate,
env override, enemy-only + idempotent fold). `prettier --check` clean. After this + the N=40
confirm, the FORM_PULSE flip is a single deploy step: set `FORM_PULSE_TRAIT_V2_ENABLED=true`
in the deploy `.env` (the offset rides the same flag). See
`Game-Godot-v2/docs/godot-v2/qa/2026-06-23-prod-flag-flip-readiness.md`. Reproduce: boot two
backends (control: no flag; treatment: `FORM_PULSE_TRAIT_V2_ENABLED=true`), run
`tools/sim/batch-ai-runner.js --scenarios enc_savana_01 --profiles aggressive --seed-count 12`
against each (treatment with `AI_SIM_FORM_PULSE_V2_GRANT=1`), then
`tools/sim/fp-trait-ab-analyze.js <control_dir> <treatment_dir>`. Cross-ref #2992 / #3016 / #3017.
