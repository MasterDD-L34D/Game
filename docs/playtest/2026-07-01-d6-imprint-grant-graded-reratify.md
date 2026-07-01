---
title: 'D6 imprint axis->trait grant -- graded re-ratify (W5): REAL band, mapping validated (8/8 live)'
workstream: ops-qa
category: playtest
doc_status: review_needed
doc_owner: claude-code
last_verified: '2026-07-01'
language: en
tags:
  [playtest, calibration, d6, imprint, aa01, trait-grant, n40, graded, w5, ai-driven, fire-count]
---

# D6 imprint axis->trait grant -- graded re-ratify (W5)

W5 continuation, third graded lane after **D8 (NULL by non-exercise)** and **W6 (form-pulse, the
power-differential payoff)**. D6 is the imprint 4-tuple's branco-slot trait grant (`selectImprintAxis`
over `PROPOSED_IMPRINT_TRAIT_MAPPING`, 8 wired cells; `apps/backend/services/imprint/imprintTraitGrant.js`

- `apps/backend/services/identity/brancoTraitProducer.js`). The N=40 ratify the mapping stays PROPOSED
  pending (spec `2026-06-23-aa01-imprint-axis-trait-grant-spec-draft.md` sec.0, mirror MA3).

## TL;DR verdict

**REAL band -- the mapping is a validated live power lever (8/8 picks live, 7 strong).** Unlike D8/ER6
(structurally inert nulls), every one of the 8 imprint picks FIRES in the AI sim and moves the graded
channel beyond the drift floor (which is **exactly 0** on paired numeric seeds). This includes the three
**situational `min_mos`-gated picks** (RAPIDA/VELOCE/LONTANO) that the #3083 verify-first note flagged as
possibly near-inert: they fire abundantly and move `enemy_hp_remaining` -0.08..-0.16 -- **the near-inert
worry is REFUTED**. The one weak cell is **`ferocia` (PROFONDA)**: it is `on_kill`-gated, and the passive
AI in a WR-0 hardcore fight rarely kills, so it fires only ~0.16x per party hit (45 fires / N=40) for a
small -0.014 graded delta -- LIVE but exercise-limited (it strengthens in any fight the party actually
wins / under the W5-upgraded AI). Nothing here re-derives a value: **the mapping + imprint weight `w`
POWER ratify is the owner's W6 decision** (the imprint grant rides the same `FORM_PULSE_TRAIT_V2_ENABLED`
flag -- see recon), already staged-latent. This doc confirms the picks feeding that decision are real.

## Recon finding (load-bearing) -- D6's own flag is DEAD

D6 was shipped (#3083) with its own flag `IMPRINT_TRAIT_GRANT_ENABLED`, but the W4 grilling
(2026-06-30) **collapsed it into `FORM_PULSE_TRAIT_V2_ENABLED`**: the unified producer
`brancoTraitProducer.produceBrancoTrait` takes `combined = isFormPulseTraitV2Enabled()`
(`coopOrchestrator._applyBrancoTraitEmergence`), and `isImprintTraitGrantEnabled` now survives **only in
comments** (grep: no live caller). So the imprint grant is a **SUBSET of the W6 form-pulse-v2 bundle
already measured** (#3139): the W6 net-flip includes imprint-winning teams (~30-40% `imprint_win_rate`)
with these very picks in the branco slot. D6 is therefore **not a separately flippable flag**; the
residual, isolatable question this probe answers is the pick-LIVENESS one -- are the 8 mapping picks
genuine combat power in the sim, or would an inert pick pass a WR-only ratify falsely at ~0 delta?

The spec doc (`2026-06-23-aa01-imprint-axis-trait-grant-spec-draft.md` sec.0) still describes the
pre-W4 design (locomotion-only, own flag); it is stale relative to the current code (all 8 cells wired,
tuple-determined selection, collapsed flag). This doc is the current ground-truth.

## Measurement design

`tools/sim/d6-imprint-grant-graded-probe.js` (reuses the W6 probe geometry -- canonical badlands party
`enc_badlands_pilot_01` vs the hardcore roster, in-process `createApp` + one persistent 127.0.0.1
listener, node 22). The trait synthesis is pure, so the probe grants a pick **directly onto the roster**,
bypassing `coopOrchestrator` + every flag (no env flag is needed -- `evaluateAttackTraits` evaluates a
roster trait regardless of `FORM_PULSE_TRAIT_V2`; that flag only gates the coopOrchestrator grant + the
`/start` enemy-HP offset, neither exercised here -- this measures the trait's RAW power, not the W6
offset).

Arms (paired; a **numeric** seed re-seeds the combat RNG at every `/start` [session.js:2102] so same
roster+seed is byte-identical regardless of run order -> the per-pick arms are all cleanly paired to ONE
baseline):

- **A baseline** = party, EMPTY branco slot (authored traits only; the canonical party carries 0
  authored traits, so every grant is a genuine addition -- no overlap dilution).
- **Xk granted[k]** = party + imprint pick `k` on every unit (k in the 8 wired cells).
- **D drift** = baseline replicate (same seed) -> the determinism floor.

Per-pick signal = `mean(Xk) - mean(A)` on the graded channels (`enemy_hp_remaining`, `creature_ko_rate`,
`hp_remaining`) PLUS a direct **fire-count**.

**Fire-count instrument** (mirrors `d8-chain-fire-count`): monkeypatch `evaluateAttackTraits` AND
`evaluateStatusTraits` BEFORE `app.js` (-> `session.js`) is required, so `session.js`'s destructured
bindings (session.js:41-42) capture the counting wrappers. Both are patched because the extra_damage /
damage_reduction picks fire in `evaluateAttackTraits` but the **`on_kill` apply_status pick (`ferocia`)
fires in `evaluateStatusTraits`** -- patching only the former would report a blind-spot 0 for ferocia.

**Positive control** (avoid a false null): the no-gate extra_damage pick `occhi_analizzatori_di_tensione`
MUST fire on party hits before the measurement; if it does not, the instrument or the fight is broken ->
THROW.

**Drift floor** = the baseline replicate D vs A. Measured **exactly 0** on every channel in every biome
-> the sim is deterministic given roster+seed, so every non-zero per-pick delta below is a real effect,
NOT sampling noise.

## Evidence A -- per-pick fire-count + graded delta (DECISIVE)

Badlands, N=40, corrected instrument (`reports/sim/d6-imprint-grant-graded-n40-badlands.json`). `fires` =
total `triggered:true` across the 40 runs; `d_enemyHP` / `d_ko` = mean(granted) - mean(baseline) (down =
stronger team). Drift floor = 0 on all channels.

| axis/pole        | trait                              | gate           | fires | d_enemyHP  | d_ko   | verdict               |
| ---------------- | ---------------------------------- | -------------- | ----- | ---------- | ------ | --------------------- |
| senses/ACUTO     | `occhi_analizzatori_di_tensione`   | none (extra)   | 318   | **-0.172** | -0.050 | LIVE, strongest       |
| defense/DURA     | `pelle_elastomera`                 | none (dmg_red) | 229   | -0.163     | -0.125 | LIVE, strong (def)    |
| defense/FLESSIB. | `risposta_di_fuga`                 | none (dmg_red) | 229   | -0.163     | -0.125 | LIVE, strong (def)    |
| locom./SILENZ.   | `cartilagini_flessoacustiche`      | none (dmg_red) | 229   | -0.163     | -0.125 | LIVE, strong (def)    |
| locom./VELOCE    | `coda_stabilizzatrice_vortex`      | melee+min_mos5 | 169   | -0.160     | -0.063 | LIVE                  |
| offense/RAPIDA   | `dilatazione_temporale_percettiva` | min_mos:4      | 197   | -0.091     | -0.038 | LIVE (situational)    |
| senses/LONTANO   | `sensori_geomagnetici`             | min_mos:5      | 163   | -0.080     | -0.031 | LIVE (situational)    |
| offense/PROFONDA | `ferocia`                          | on_kill        | 45    | -0.014     | -0.006 | LIVE but exercise-lim |

Cross-biome (badlands/savana/caverna, N=40 each) graded deltas corroborate the same ordering (the
`enemy_hp_remaining` deltas are within ~+-0.02 of the badlands column; artifact
`d6-imprint-grant-graded-n40-3biome.json`). The three no-gate defensive picks are byte-identical because
they are the SAME effect: `damage_reduction amount:1, action_type:attack/on_result:hit, applies_to:target`
(verified in `active_effects.yaml`) -- granting any of them produces the same combat outcome. That
identity is a correctness check on the probe (three distinct ids -> one effect -> one result), not a bug.

## Evidence B -- the situational picks are LIVE (refutes the #3083 near-inert worry)

The #3083 verify-first note flagged the `min_mos`-gated picks as the weakest cells that could ship a
"passes N=40 falsely at ~0 delta" false-green. The N=40 fire-count settles it directly: `RAPIDA`
(`min_mos:4`) fires **197x** (moving `enemy_hp` -0.091), `VELOCE` (`min_mos:5`, melee) **169x** (-0.160),
`LONTANO` (`min_mos:5`) **163x** (-0.080). The party lands `mos>=4/5` hits often enough in the hardcore
fight that these are genuinely exercised, not vestigial -- they sit below the no-gate picks but well above
the exactly-0 drift floor. **The as-built situational picks are validated LIVE.**

## Evidence C -- ferocia is the lone weak cell (on_kill, exercise-limited)

`ferocia` (offense/PROFONDA) applies a status ON KILL (`on_kill: true`, `apply_status`). In a WR-0
passive-AI hardcore fight the party rarely kills, so it fires only 45x (default) / 16x (attrition, where
the tougher enemies suppress kills further) for a small -0.014 / -0.004 graded delta. It is **LIVE, not a
structural null** (contrast D8's exact 0) -- it just under-fires because its trigger is gated on an event
the passive AI seldom produces. This is the same class of finding as D8 (a real mechanic the current
passive AI under-exercises), scoped to one pick. Under the W5-upgraded AI (X1) or in any fight the party
wins, ferocia's exercise rises. Owner note: keep it (exercise-dependent, not broken) or re-pick a
non-`on_kill` PROFONDA alternative -- see the ratify decision below.

## Attrition sub-run (defensive picks un-masked)

The default badlands fight is low-attrition, so the defensive damage_reduction picks show mostly on
`enemy_hp` (surviving longer -> more damage dealt). The `--attrition` sub-run (enemy +MOD/+dmg) confirms
their defensive value directly on `creature_ko_rate`: the three dmg_red picks cut `ko_rate` by -0.044
(baseline ko 0.5 -> ~0.456), i.e. ~0.17 party units saved per fight
(`d6-imprint-grant-graded-n40-badlands-attrition.json`). ferocia stays weak (16 fires, -0.004).

## What this means

- **The D6 mapping is validated: 8/8 picks are engine-LIVE and exercised in the sim** (drift floor 0, so
  every delta is real). The #3083 liveness concern is closed with runtime evidence, including the
  situational `min_mos` picks.
- **D6 is NOT a separate flip.** Its flag was collapsed into `FORM_PULSE_TRAIT_V2_ENABLED` (W4); the
  imprint grant power is part of the W6 bundle. Nothing new flips; no prod change.
- **The mapping + `w` POWER ratify remains the owner's W6 decision** (staged-latent, anchor 1.20-vs-1.15
  - `w` 0.78). This probe REPORTS (L-069); it never ratifies a value.
- **One owner micro-decision surfaced**: `ferocia` (PROFONDA) is the lone exercise-limited pick
  (`on_kill`). Recommended default: KEEP (it is LIVE, just gated on kills the passive AI seldom scores;
  re-picking on a passive-AI artifact over-fits the harness, and the whole D6/D8/ER6 re-ratify is anyway
  gated on the X1/W5 AI upgrade). Owner may re-pick a non-`on_kill` PROFONDA alternative at the ratify.

## Reproduce (node 22, in-process, no prod port)

```
# cross-biome graded + fire-count (default low-attrition):
node tools/sim/d6-imprint-grant-graded-probe.js --n 40 --biomes badlands,savana,caverna \
  --out reports/sim/d6-imprint-grant-graded-n40-3biome

# single-biome corrected-instrument fire-count (ferocia via evaluateStatusTraits patch):
node tools/sim/d6-imprint-grant-graded-probe.js --n 40 --biomes badlands \
  --out reports/sim/d6-imprint-grant-graded-n40-badlands

# defensive picks un-masked:
node tools/sim/d6-imprint-grant-graded-probe.js --n 40 --biomes badlands --attrition \
  --out reports/sim/d6-imprint-grant-graded-n40-badlands-attrition
```

node v22.22.3 | flags stay OFF/dead (this measures, never flips) | mapping stays PROPOSED (owner ratify).
