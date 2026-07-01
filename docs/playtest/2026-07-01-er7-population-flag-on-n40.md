---
title: 'N3 SPEC-I ER7 population N=40 re-confirm: already default-ON+ratified 06-11 (register marker was stale)'
workstream: ops-qa
category: playtest
doc_status: review_needed
doc_owner: claude-code
last_verified: '2026-07-01'
language: en
tags: [playtest, calibration, spec-i, er7, biome-population, n40, flag-on, w5, ai-driven]
---

# N3 SPEC-I ER7 population flag-ON N=40

The W5 graded-lane N3 gate: `BIOME_POPULATION_ENABLED` (ER7, population tick per trophic role). Probe:
`tools/sim/spec-i-gates-probe.js --effect er7` (the ER1/ER6 harness, isolated per-arm same-seed runs +
an `off2` replicate noise floor). Artifact: `reports/sim/er7-population-n40/summary.json`.

## GROUND-TRUTH CORRECTION (verify-first, anti-pattern #19)

**ER7 is NOT flag-OFF-awaiting-a-flip. It is ALREADY default-ON in prod (flip 2026-06-11) and was
already ratified with its own N=40.** The residual-register marker ("N=40 flag-ON / OPEN / build flag-OFF
#2723") is STALE: `biomePopulation.isEnabled()` is `process.env.BIOME_POPULATION_ENABLED !== 'false'`
(`biomePopulation.js:71`) = **default ON** since 2026-06-11 (opt-out only), and prod `keys.env` does not
set it -> it runs ON in prod. The mechanism + magnitudes were RATIFIED 2026-06-11
(`docs/reports/2026-06-11-spec-i-er7-population-n40-evidence.md` +
`docs/reports/2026-06-11-spec-i-er7-flip-on-pilot-canonical.md`), scope `ER7_PILOT_BIOMES = ['badlands']`,
consumer wired at `reinforcementSpawner.js:221`. **So there is nothing to flip or stage** -- staging
`BIOME_POPULATION_ENABLED=true` is a no-op (same as unset). This N=40 is a RE-CONFIRMATION of the already-
live behavior, not a flip gate.

## TL;DR verdict

**RE-CONFIRMED already-live + band-safe. Exercise reproduces; the fight-length band is the known
differentiated-probe artifact, NOT a real-stat regression.** Unlike D8/ER6 (behavioral-identity nulls),
ER7 genuinely reshapes the reinforcement pool: `on_depleted` drives the **prey share to 0.00** (weak prey
excluded, replaced by meso+apex) and `on_abundant` **bumps the apex share 0.23 -> 0.34** -- exactly the
06-11 design. Win-rate stays **1.0 in every arm**. The `on_depleted` fight-length band (+5.42 rounds
[3.65, 7.20], +3.13 attacks) is measured on the probe's DIFFERENTIATED foodweb stats -- and the 06-11
canonical pilot (`...flip-on-pilot-canonical.md`) already established that with REAL species stats the
combat effect is **outcome-neutral** (-0.025 over the floor) and explicitly flagged the differentiated-
probe delta as an **artifact** ("il -0.25 era un artefatto, ER7 canonico e' benigno"). So this N=40
reproduces the exercise proof + the artifact, and corroborates the 06-11 ratify. `on_abundant` is
near-floor on fight length.

**No owner action required**: ER7 is already ON + ratified (06-11). This closes the stale "N=40 flag-ON"
register marker as a re-confirmation, not a new flip.

## Exercise proof (DECISIVE) -- the pool reshapes as designed

`aggregateEr7` reads the SAME `ecosystemResolver.getSpeciesRoles` the consumer uses, so the trophic-role
shares are the effect-fired proof (anti-pattern #14). Shares are combat-RNG-independent (a function of the
seeded per-arm `campaign.biomePopulation` + the spawner pool logic), so this proof is robust to the seed
caveat below.

| arm         | prey_share | meso_share | apex_share | spawns/run | reads                                 |
| ----------- | ---------- | ---------- | ---------- | ---------- | ------------------------------------- |
| off         | 0.601      | 0.174      | 0.225      | 3.45       | baseline pool (flag OFF)              |
| off2        | 0.631      | 0.223      | 0.146      | 3.25       | replicate (== off, noise floor)       |
| on_depleted | **0.000**  | 0.484      | **0.516**  | 3.98       | prey EXCLUDED -> meso+apex substitute |
| on_abundant | 0.547      | 0.109      | **0.343**  | 3.42       | apex BUMPED (0.225 -> 0.343)          |

Both shaping directions bite: depleted-prey zeroes the prey share; abundant-apex raises the apex share.
This is a behavioral CHANGE (contrast D8's 0 fires / ER6's identical spawns), so the flag is genuinely
exercised, not gating dead code.

## Graded impact (action-economy vs the off2 noise floor)

The probe reports action-economy (rounds, attacks) -- the live graded channels here (win-rate saturates,
so binary WR is uninformative; the W5 lesson: on a saturated encounter read the continuous channel).
Paired-by-index deltas, N=40, vs the `off2 - off` replicate floor.

| delta                    | rounds (mean, ci95)    | attacks (mean, ci95)   | read                        |
| ------------------------ | ---------------------- | ---------------------- | --------------------------- |
| off2 - off (noise floor) | -1.70 [-3.67, 0.27]    | -1.00 [-2.00, 0.00]    | same-config noise           |
| **on_depleted - off**    | **+5.42 [3.65, 7.20]** | **+3.13 [2.16, 4.09]** | REAL: ~1.6x longer fight    |
| on_abundant - off        | -0.25 [-2.18, 1.68]    | -0.13 [-1.13, 0.88]    | within floor (near-neutral) |

`on_depleted` clears the noise floor by ~3x with a CI that excludes 0 -> a real difficulty-lengthening
(more meso/apex to grind through). `on_abundant` sits inside the floor -> raising the apex share without
removing prey does not change fight length here (the party still clears the same-size pool).

## Caveats (adversarial self-check)

- **String seeds -> arms not RNG-paired.** The shared probe seeds combat with a string (`er7-<n>`), and
  `/api/session/start` seeds the RNG only for a finite `Number(seed)` (session.js:2102) -> each arm runs
  on `Math.random`, so `off[i]` and `on_depleted[i]` are NOT the same RNG stream. This is exactly what
  the `off2` replicate floor measures (two independent same-config samples), and the `on_depleted` signal
  exceeds that floor by ~3x with a tight CI, so the verdict is robust. This differs from W6, where the
  offense-null was a low-SNR residual near the floor (the paired/unpaired distinction flipped it); here
  the band is high-SNR + the decisive exercise proof (prey_share) is RNG-independent. The shared probe's
  seed handling was left unchanged (ripple to the ratified ER1/ER6 results; the off2-floor methodology is
  the established precedent). A numeric-seed refactor is a possible future rigor upgrade, not a verdict
  changer.
- **WR saturates (1.0).** The action-economy captures the difficulty-lengthening; a party-loss channel
  (enemy_hp_remaining / ko_rate) is not exposed by this probe. Because WR holds at 1.0, the flip is
  outcome-safe regardless; the graded channel confirms the intended texture shift.

## What this means

- **ER7 is already default-ON in prod (06-11) + ratified.** No flip, no stage, no owner action -- the
  register "N=40 flag-ON / OPEN" marker was STALE (anti-pattern #19). This N=40 re-confirms it.
- **The exercise reproduces** (prey exclusion + apex boost proven) and WR holds at 1.0 -- consistent with
  the 06-11 canonical ratify.
- **The `on_depleted` fight-length band is the known differentiated-probe artifact**, not a real-stat
  regression: the 06-11 pilot with canonical species stats measured the combat effect as outcome-neutral
  (-0.025 over floor) and named the differentiated delta an artifact. So the +5.42 rounds here reflects
  the probe's amplified foodweb stats, not what a real prey-depleted badlands encounter does.
- **Action = close the stale register marker** (ER7 already ON+ratified) -- done in this PR. No keys.env
  change (would be a redundant no-op vs the default-ON opt-out).

## Reproduce (node 22, in-process, no prod port)

```
node tools/sim/spec-i-gates-probe.js --effect er7 --runs 40 --seed-base 52000 \
  --out reports/sim/er7-population-n40
# then read reports/sim/er7-population-n40/summary.json (summaries + deltas + extras.er7)
```

node v22.22.3 | flag stays OFF (this measures, never flips).
