---
title: 'W6 Form-Pulse trait v2 -- graded cross-biome A/B (flip-readiness evidence; ratify pending)'
workstream: ops-qa
category: playtest
doc_status: review_needed
doc_owner: claude-code
last_verified: '2026-07-01'
language: en
tags:
  [
    playtest,
    calibration,
    form-pulse,
    trait-v2,
    n40,
    graded,
    cross-biome,
    w6,
    ai-driven,
    offset,
    imprint,
  ]
---

# W6 Form-Pulse trait v2 -- graded cross-biome A/B

The flip-readiness gate (build-spec `docs/planning/2026-06-30-form-pulse-trait-v2-flip-readiness-build-spec.md`,
verdict 7): the passive-AI WR-only proxy could not validate the `FORM_PULSE_TRAIT_V2_ENABLED` flip.
This is the graded, power-sensitive combat measurement that produces the ratify evidence. **L-069: this
REPORTS; the flip + the values (offset anchor/reference, imprint weight `w`, imprint picks) are the
owner's verdict.** Nothing is flipped.

Probe `tools/sim/form-pulse-v2-graded-ab-probe.js`. Artifacts `reports/sim/fp-v2-graded-n40/report.json`
(main N=40 + w-sweep) + `reports/sim/fp-v2-driftfloor2/report.json` (order-drift control).

## TL;DR (verdicts for the owner)

1. **The graded metric BITES on form-pulse** -- unlike D8/ER6 (both NULL/inert), the flag MOVES the graded
   channels. This is the power-differential lane the W5 graded metrics were built for; the measurement is
   real.
2. **The flip OVER-compensates offense** (RATIFY-GRADE): net enemy_hp_remaining **+0.11** (drift-corrected,
   95% CI [0.078, 0.136] excludes 0, all 5 biomes same-sign positive, ~3.3x the drift floor). The enemy-HP
   offset (anchor 1.4/reference 4 -> **1.8x** on the 4-creature party) claws back MORE than the player buff
   removed, so the fight ends slower/tankier. To null damage-output: **anchor ~1.25** (or reference ~6) --
   DIRECTIONAL, confirm with one A/B at the new value (enemy_hp->rounds is sub-linear).
3. **The flip is survival-neutral** -- but PROVISIONAL: net ko_rate **-0.029**, hp_remaining ~0. hp_remaining
   is ceiling-masked (party survives ~0.92 everywhere), so "survival-neutral" rests on ko_rate alone; a
   higher-attrition measurement point is needed to exercise the defensive grants before this is ratify-grade.
4. **Imprint weight `w`**: imprint wins the shared branco slot **17.5% @ w=0.3, 70% @ w=0.5** (target 30-40%
   -> **w~0.37-0.38**). DIRECTIONAL: party-size-dependent (this curve is the 4-player party; a 2-player party
   at w=0.5 wins ~33%) and the N=40 win-rate swings 27-52% across seeds -> re-sweep at N>=1000 before fixing `w`.

## Method

**3-arm decouple.** The flag has TWO coupled effects: (buff) v2 grants the team more combat-effective traits
(always-emerge shared branco + one per-player minor + a tuple-determined imprint pick that can win the branco
slot at weight `w`); (offset) at `/start`, `formPulseV2EnemyHpOffset` scales enemy HP up by
`countGrantedV2BuffPower` (the count of granted pool ids on the team) to claw the buff back. The trait
synthesis is pure (the real engine `aggregateFormPulses` + `produceBrancoTrait` + `emergePlayerMinorTrait`,
attached to `unit.traits`), so the probe controls the roster traits independently of the env flag (which only
gates the /start offset). Three arms on paired seeds:

- **A baseline** = baseline roster (branco only if |avg|>=0.30, NO minor/imprint), flag OFF.
- **B v2 no-offset** = v2 roster (always-branco + minor + imprint), flag OFF -> pure player buff.
- **C v2 full** = v2 roster, flag ON -> buff + offset = the real flip.

Signals: `player_buff = B-A`, `offset_claws = C-B`, **net flip = C-A**.

**Measurement point (power-sensitive, unsaturated).** Canonical badlands party (`enc_badlands_pilot_01`, 4
units) vs `enc_badlands_ultima_caccia_01` wave-1 hardcore enemies (apex + 2 elite + 2 base), 10x10, N=40. WR
sits at 0 (KO-designed fight) and enemy_hp_remaining ~0.59-0.78 (interior, not ceiled), so a ~1.2 power/creature
buff MOVES enemy_hp + ko_rate (the sensitive channels). Cross-biome via the `biomeId` enemy-HP multiplier
(savana x1.0 .. abisso_vulcanico x1.17). Reused from `focus-fire-ab-probe.js` (inc-2 validated this point).

**Positive control (avoid the D8 false-null).** Before measuring: assert `countGrantedV2BuffPower(v2 roster) > 0`
(got 8 = 4 units x branco+minor) AND the flag-ON /start raises enemy max_hp (53 -> 96, x1.81 = the buff-8
offset). The mechanic FIRES; a band shift is not a broken probe.

**Order-drift control.** Arm C always runs 2 slots after arm A, and the sim has same-process module-global
drift (the D8 lesson). A drift-floor run replaces arms B/C with baseline REPLICATES (same roster as A, flag OFF)
in the same slots -> its "net" is pure position-drift. Over 3 biomes the floor averages **+0.006** enemy_hp
(badlands +0.039, savana +0.019, abisso -0.039) -> ~0, so the +0.11 net is a real flag effect, not drift.

## Results (cross-biome mean, N=40/arm/biome)

| delta                              | enemy_hp_remaining | creature_ko_rate | hp_remaining |
| ---------------------------------- | ------------------ | ---------------- | ------------ |
| player_buff (B-A)                  | **-0.195**         | **-0.103**       | -0.020       |
| offset_claws (C-B)                 | **+0.302**         | +0.075           | +0.011       |
| net flip (C-A) RAW                 | +0.107             | -0.028           | -0.008       |
| order-drift floor (3 biomes)       | +0.006             | +0.002           | -0.005       |
| **net flip (C-A) drift-corrected** | **+0.110**         | **-0.029**       | **+0.001**   |

- **player buff is a real offense+survival buff**: enemies take ~19% more damage (enemy_hp -0.195, ~7.5x the
  drift floor -- rock-solid), player KOs drop ~10pp. This graded-CONFIRMS in live combat the ~1.21 power/creature
  the `fp-trait-delta-probe` proxy (N=200) estimated -- the proxy's directional figure now has a combat A/B.
- **the offset over-corrects**: it adds +0.30 enemy_hp (makes enemies tankier) vs the -0.195 the buff removed,
  netting **+0.11** -- the fight ends with enemies noticeably tankier under the flip. All 5 biomes over-compensate
  (corrected net enemy_hp badlands 0.100 / savana 0.049 / caverna ~0.08 / abisso 0.181 / palude ~0.10; ~2x
  per-biome spread but same sign).
- **the HP offset is a blunt knob**: it counters the OFFENSE buff (and over-does it) but cannot cleanly counter
  the SURVIVAL buff -- ko_rate nets -0.029 (a slight residual survival buff survives the offset).

### w-sweep (badlands, N=40) -- imprint weight

| w   | imprint wins branco slot |
| --- | ------------------------ |
| 0.0 | 0% (imprint disabled)    |
| 0.3 | 17.5%                    |
| 0.5 | 70% (PROPOSED default)   |
| 0.7 | 90%                      |
| 1.0 | 100%                     |

The curve is steep across 0.3-0.5 (team-averaged form-pulse |avg| clusters ~0.3-0.5). Target 30-40% ->
**w~0.37-0.38**. This is a PURE synthesis result (deterministic, drift-immune), but see the caveats: it is
party-size-specific and N=40-noisy.

## The three ratify decisions (SDMG -- owner)

1. **Offset anchor/reference.** The flip over-compensates offense by +0.11 enemy_hp (ratify-grade) while being
   survival-neutral. Lower the anchor to ~1.25 (nulls damage-output too, fuller net-neutrality) OR keep 1.4/4
   (accept survival-neutral + a mildly slower fight as "within band"). Directional; confirm the chosen value
   with one A/B.
2. **Imprint weight `w`.** Set ~0.37-0.38 for the 30-40% imprint-win target (linear interp: w=0.40 overshoots to ~44%; population N=4000 gives w0.38=33.5%) (PROPOSED 0.5 gives 70% = imprint
   dominant). Re-sweep at N>=1000 before fixing; note party-size dependence.
3. **Imprint mechanism + picks.** 8/8 cells wired (incl offense/RAPIDA = `dilatazione_temporale_percettiva`);
   `selectImprintAxis` uses a hash-mod tuple selection (PROPOSED) -- keep, or swap to a curated tuple->axis
   table. Per-pick power was not isolated here (the imprint only swaps WHICH branco trait, not net power) -- a
   dedicated per-pick measurement is the follow-up if the picks need power-balancing.

## Caveats (adversarial-verify workflow, 3 lenses)

- **survival-neutral = PROVISIONAL.** hp_remaining ~0.91-0.96 flat across arms -> the party is under-attrited,
  so the defensive v2 grants (damage_reduction / pelle_elastomera / risposta_di_fuga) are ceiling-masked. Add a
  higher-attrition point (tougher enemy DPR, party pushed below ~0.7 survivor HP) to exercise them before
  ratifying "survival-neutral".
- **magnitude is measurement-point-specific.** Cross-biome varies ONLY the enemy-HP multiplier; identical party
  - identical 5-enemy roster in all biomes. The +0.11 SIGN is robust (5/5 biomes); the MAGNITUDE would differ on
    other party comps / enemy archetypes / lower-difficulty encounters.
- **anchor 1.25 assumes linear.** The HP multiplier is linear in (anchor-1), but enemy-HP->rounds is sub-linear
  (offset header) -> 1.25 is a first-order estimate; confirm net~0 with an A/B at the new anchor.
- **`w` is party-size-dependent + N=40-noisy.** The imprint-win curve is the 4-player party; a 2-player party at
  w=0.5 wins ~33%. At N=40, w=0.40 swings 27.5-52.5% across seeds. Re-sweep at N>=1000, party-stratified.
- **the offset equal-weights all granted ids** (`countGrantedV2BuffPower` counts branco/minor/imprint pool
  instances 1:1). The empirical buff is real (measured), but per-trait power varies (the `fp-trait-delta-probe`
  proxy hardening), so the "right" offset is content-coupled.
- **WR carries no signal** (structurally 0, KO-designed fight); the whole net rests on graded proxies (as
  designed -- inc-2).

## Confirming sweeps (master-dd ratify 2026-07-01: anchor->~1.25, w->~0.38, run sweeps then stage)

Three confirming measurements were run against the ratified direction (artifacts
`reports/sim/fp-v2-anchor125/` + `fp-v2-attrition/` + `fp-v2-w-resweep/`). They CONFIRM the direction
but surface two wrinkles the exact values rest on:

**1. Anchor 1.25 A/B (3 biomes, N=40).** At anchor 1.25 (offset x1.53 for the buff-8 party) the net flip
is enemy_hp **-0.012** (~0, vs +0.107 at 1.4) -> the damage-output over-compensation is NULLED, as
predicted. BUT net **ko_rate -0.069** (was ~-0.03 at 1.4) -> the flip is now survival player-FAVORABLE
(the lower offset stops clawing back the survival buff). **The offset is a single HP knob on a 2D
(offense+survival) buff and cannot null both**: 1.4 = offense-disadvantaged / survival-neutral; 1.25 =
offense-neutral / survival-favorable. A compromise ~1.30-1.35 would split the residual.

**2. Attrition point (anchor 1.4, tougher enemy DPR -> baseline ko ~0.47, party genuinely stressed).**
The defensive v2 grants un-mask on ko_rate: player_buff ko **-0.069**, NET flip ko **-0.044** (survival
player-favorable when survival actually matters). So the earlier "survival-neutral" was low-attrition-
specific; under real pressure v2 tilts survival-favorable. (hp_remaining stays ~0.99 even here -- it is
survivor-only, structurally can't carry this; ko_rate is the defensive channel.)

**3. w re-sweep (pure synthesis, N=4000/cell, party-stratified).** CRITICAL: **no single `w` hits the
30-40% imprint-win target across party sizes** -- party-4 needs w~0.38, party-3 ~0.44, party-2 ~0.58+
(a bigger team's averaged |avg| clusters nearer 0 by CLT, so a fixed w wins the branco slot more often).
The ratified w~0.38 is a **4-player value**; on a 2-3 player co-op it makes imprint near-vestigial (8-20%).

| party size | w for 30-40% imprint-win (N=4000) |
| ---------- | --------------------------------- |
| 2          | ~0.58+ (w0.5=22.6%)               |
| 3          | ~0.44 (w0.5=45.7%)                |
| 4          | ~0.37-0.38 (w0.38=33.5%)          |

**Net for the owner**: direction ratified + confirmed. Exact values are a design judgment the sweep
narrowed but did not close: (a) which channel to null (offense @1.25 / survival @~1.4 / balanced @~1.3);
(b) `w` cannot be party-neutral without normalizing the producer's form-|avg| by team size (a code
change) -- else pick `w` for the modal party size and accept off-target elsewhere.

## Refined confirming (master-dd 2026-07-01 round 2: anchor->~1.30 balanced, party-normalize the producer)

**Party-normalization SHIPPED + re-measured.** `produceBrancoTrait` now scales the Form-Pulse magnitude
by `sqrt(nPlayers)` in the imprint-vs-form win comparison (flag-gated: byte-identical when combined=OFF;
`nPlayers` passed by `coopOrchestrator`). This makes the imprint-win party-size-invariant: the N=4000
re-sweep converges party 2/3/4 to within ~4pp, and **a single w~0.78 hits the 30-40% target across all
sizes** (party2 ~32% / party3 ~34% / party4 ~36%). So the ratified normalized weight is **w~0.78** (one
value, party-neutral).

**Paired anchor sweep (drift-free) pins the balanced anchor.** The earlier per-anchor single runs were
non-monotonic (net residual ~+-0.06 noise); a PAIRED sweep (per team: arm A once + arm C at every anchor,
same seed/process -> the anchor is the only between-arm difference) gives a clean monotonic curve
(`reports/sim/fp-v2-anchorsweep/`, w=0.78, 3 biomes N=40):

| anchor   | net enemy_hp (offense) | net ko_rate (survival) |
| -------- | ---------------------- | ---------------------- |
| 1.15     | -0.052                 | -0.081                 |
| **1.20** | **+0.009**             | -0.056                 |
| 1.25     | +0.015                 | -0.092                 |
| 1.30     | +0.039                 | -0.058                 |
| 1.35     | +0.068                 | -0.065                 |
| 1.40     | +0.095                 | -0.050                 |

Two clean readings: (1) **the offense-null (enemy_hp ~0) is anchor ~1.20**, NOT 1.30 -- 1.30 leaves a
mild +0.039 offense over-compensation. (2) **ko_rate is negative at EVERY anchor (-0.05 to -0.09)** ->
the ~-0.06 survival buff is STRUCTURALLY IRREDUCIBLE by the enemy-HP offset (a blunt single knob that
adds enemy HP but barely touches player deaths). So NO anchor nulls both channels; ~1.20 is the
offense-neutral point, carrying an irreducible mild survival tilt (v2 = "leave a mark" -> ~6pp fewer
deaths, by construction). The anchor choice is offense-balance only: ~1.20 offense-null / ~1.30 slight
offense-negative / 1.40 as-built offense-disadvantaged.

## Reproduce (node 22, persistent 127.0.0.1 listener + fetch, no prod port)

```
node tools/sim/form-pulse-v2-graded-ab-probe.js --n 40 --w-sweep --out reports/sim/fp-v2-graded-n40
node tools/sim/form-pulse-v2-graded-ab-probe.js --n 40 --drift-floor --biomes badlands,savana,abisso_vulcanico --out reports/sim/fp-v2-driftfloor2
FORM_PULSE_V2_ENEMY_HP_OFFSET=1.25 node tools/sim/form-pulse-v2-graded-ab-probe.js --n 40 --biomes badlands,savana,abisso_vulcanico --out reports/sim/fp-v2-anchor125
node tools/sim/form-pulse-v2-graded-ab-probe.js --n 40 --attrition --biomes badlands,savana,abisso_vulcanico --out reports/sim/fp-v2-attrition
node tools/sim/form-pulse-v2-graded-ab-probe.js --w-resweep --resweep-n 4000 --out reports/sim/fp-v2-w-resweep
FORM_PULSE_IMPRINT_WEIGHT=0.78 node tools/sim/form-pulse-v2-graded-ab-probe.js --anchor-sweep --n 40 --biomes badlands,savana,abisso_vulcanico --out reports/sim/fp-v2-anchorsweep
```

Commit `31c07902` | node v22.22.3 | flag `FORM_PULSE_TRAIT_V2_ENABLED` stays OFF (this measures, never flips).
Sim NOT bit-repro cross node-version (bands as ranges, ~+-0.04-0.05).
