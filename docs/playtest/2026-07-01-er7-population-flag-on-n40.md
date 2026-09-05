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
excluded, replaced by meso+apex) and `on_abundant` **bumps the apex share 0.21 -> 0.31** -- exactly the
06-11 design. Win-rate stays **1.0 in every arm**. The `on_depleted` fight-length band (+5.22 rounds
[3.10, 7.35], +2.92 attacks, isolated-arms evidence-grade) is measured on the probe's DIFFERENTIATED
foodweb stats -- and the 06-11 canonical pilot (`...flip-on-pilot-canonical.md`) already established that
with REAL species stats the combat effect is **outcome-neutral** (-0.025 over the floor) and explicitly
flagged the differentiated-probe delta as an **artifact** ("il -0.25 era un artefatto, ER7 canonico e'
benigno"). So this N=40 reproduces the exercise proof + the artifact, and corroborates the 06-11 ratify.
`on_abundant` is only marginal (rounds CI barely excludes 0, attacks CI includes 0).

**No owner action required**: ER7 is already ON + ratified (06-11). This closes the stale "N=40 flag-ON"
register marker as a re-confirmation, not a new flip.

## Exercise proof (DECISIVE) -- the pool reshapes as designed

`aggregateEr7` reads the SAME `ecosystemResolver.getSpeciesRoles` the consumer uses, so the trophic-role
shares are the effect-fired proof (anti-pattern #14). Shares are combat-RNG-independent (a function of the
seeded per-arm `campaign.biomePopulation` + the spawner pool logic), so this proof is robust to the seed
caveat below.

| arm         | prey_share | meso_share | apex_share | spawns/run | reads                                 |
| ----------- | ---------- | ---------- | ---------- | ---------- | ------------------------------------- |
| off         | 0.536      | 0.250      | 0.214      | 3.50       | baseline pool (flag OFF)              |
| off2        | 0.561      | 0.209      | 0.230      | 3.48       | replicate (== off, noise floor)       |
| on_depleted | **0.000**  | 0.543      | **0.457**  | 4.05       | prey EXCLUDED -> meso+apex substitute |
| on_abundant | 0.490      | 0.199      | **0.311**  | 3.77       | apex BUMPED (0.214 -> 0.311)          |

Both shaping directions bite: depleted-prey zeroes the prey share; abundant-apex raises the apex share.
This is a behavioral CHANGE (contrast D8's 0 fires / ER6's identical spawns), so the flag is genuinely
exercised, not gating dead code.

## Graded impact (action-economy vs the off2 noise floor)

The probe reports action-economy (rounds, attacks) -- the live graded channels here (win-rate saturates,
so binary WR is uninformative; the W5 lesson: on a saturated encounter read the continuous channel).
N=40, **isolated per-arm processes + `--aggregate`** (evidence-grade protocol; `isolated_arms: true`),
vs the `off2 - off` replicate floor.

| delta                    | rounds (mean, ci95)    | attacks (mean, ci95)   | read                          |
| ------------------------ | ---------------------- | ---------------------- | ----------------------------- |
| off2 - off (noise floor) | -0.15 [-1.93, 1.63]    | 0.00 [-0.93, 0.93]     | same-config noise             |
| **on_depleted - off**    | **+5.22 [3.10, 7.35]** | **+2.92 [1.85, 4.00]** | REAL: ~1.5x longer fight      |
| on_abundant - off        | +2.20 [0.04, 4.36]     | +1.00 [-0.09, 2.09]    | marginal (attacks CI incl. 0) |

`on_depleted` clears the noise floor by a wide margin on BOTH channels with CIs that exclude 0 -> a real
difficulty-lengthening (more meso/apex to grind through). `on_abundant` is only **marginal**: its rounds
CI barely excludes 0 (+2.2 [0.04, 4.36]) and its attacks CI **includes** 0 ([-0.09, 2.09]) -- raising the
apex share without removing prey barely nudges fight length. (The isolated re-run tightened the floor from
a contaminated -1.70 and un-masked this small on_abundant nudge that the single-process batch had washed
to ~0 -- Codex P1 #3156.)

## Caveats (adversarial self-check)

- **Isolated-arms evidence-grade protocol (Codex P1 #3156, fixed).** The first pass ran all four arms in
  ONE node process; the probe's own protocol (header) requires ONE process per arm + `--aggregate`,
  because sequential same-process arms share module-global combat state and contaminate the deltas
  (documented +0.20 / -17pp phantoms, packs 06-10/06-11). The committed artifact is now regenerated with
  isolated arms (`--arms <one>` x4 + `--aggregate`; `summary.json` carries `isolated_arms: true`). Effect
  of the fix: the off2 floor tightened from a contaminated -1.70 to -0.15, `on_depleted` held (+5.42 ->
  +5.22, still a wide real band), and a small `on_abundant` nudge (+2.2) that the batch had washed to ~0
  was un-masked. The verdict is unchanged.
- **String seeds -> arms not RNG-paired.** The shared probe seeds combat with a string (`er7-<n>`), so
  `/api/session/start` leaves the RNG on `Math.random` (session.js:2102) -> the arms are paired by index,
  not RNG stream. The `off2` replicate floor measures exactly that variance, and `on_depleted` clears the
  (now tight) floor by a wide margin; the decisive exercise proof (prey_share) is RNG- AND state-
  independent (it reproduced within noise across the single-process and isolated runs). Left unchanged to
  avoid ripple to the ratified ER1/ER6 results; a numeric-seed refactor is a future rigor upgrade, not a
  verdict changer.
- **WR saturates (1.0).** The action-economy captures the difficulty-lengthening; a party-loss channel
  (enemy_hp_remaining / ko_rate) is not exposed by this probe. Because WR holds at 1.0, ER7 is
  outcome-safe regardless; the graded channel confirms the intended texture shift.

## What this means

- **ER7 is already default-ON in prod (06-11) + ratified.** No flip, no stage, no owner action -- the
  register "N=40 flag-ON / OPEN" marker was STALE (anti-pattern #19). This N=40 re-confirms it.
- **The exercise reproduces** (prey exclusion + apex boost proven) and WR holds at 1.0 -- consistent with
  the 06-11 canonical ratify.
- **The `on_depleted` fight-length band is the known differentiated-probe artifact**, not a real-stat
  regression: the 06-11 pilot with canonical species stats measured the combat effect as outcome-neutral
  (-0.025 over floor) and named the differentiated delta an artifact. So the +5.22 rounds here reflects
  the probe's amplified foodweb stats, not what a real prey-depleted badlands encounter does.
- **Action = close the stale register marker** (ER7 already ON+ratified) -- done in this PR. No keys.env
  change (would be a redundant no-op vs the default-ON opt-out).

## Reproduce (node 22, in-process, no prod port)

```
# Evidence-grade: ONE process per arm, then --aggregate (avoids same-process contamination).
for arm in off off2 on_depleted on_abundant; do
  node tools/sim/spec-i-gates-probe.js --effect er7 --arms $arm --runs 40 --seed-base 52000 \
    --out reports/sim/er7-population-n40
done
# --seed-base MUST match the per-arm runs: the aggregate stamps args metadata and a missing
# --seed-base defaults to 51000 (parseArgs), which would rewrite the metadata out of sync.
node tools/sim/spec-i-gates-probe.js --effect er7 --aggregate --seed-base 52000 \
  --out reports/sim/er7-population-n40
# then read reports/sim/er7-population-n40/summary.json (isolated_arms:true + summaries + deltas + extras.er7)
```

node v22.22.3 | flag is default-ON in prod (this measures, does not change it).
