# SPEC-I ER7 probe (flag `BIOME_POPULATION_ENABLED`, N=40)

Scenario `enc_badlands_foodweb_probe_01` | biome `badlands` | scaling {"countAdd":6,"hpAdd":4,"modAdd":7,"dcAdd":2} | commit `ba5975d52` | seed base 62000.

| arm | n | win rate (Wilson CI95) | timeouts | rounds (tick) | survivors |
| --- | --- | --- | --- | --- | --- |
| off | 40 | 0.63 [0.47, 0.76] | 0 | 106.5 +/- 11.4 | 1.2 |
| off2 | 40 | 0.57 [0.42, 0.71] | 0 | 103.8 +/- 11.9 | 1.1 |
| on_depleted | 40 | 0.38 [0.24, 0.53] | 0 | 105.2 +/- 13.5 | 0.7 |
| on_abundant | 40 | 0.72 [0.57, 0.84] | 0 | 107.7 +/- 10.6 | 1.4 |

ER7 spawn composition (mean per run -- effect-fired proof, anti-#14):

| arm | spawns/run | prey share | meso share | apex share | by species (mean/run) |
| --- | --- | --- | --- | --- | --- |
| off | 6.0 | 0.63 | 0.16 | 0.21 | rust-scavenger:1.75, sand-burrower:2.00, echo-wing:0.97, dune-stalker:0.63, ferrimordax-rutilus:0.65 |
| off2 | 6.0 | 0.66 | 0.19 | 0.15 | echo-wing:1.13, rust-scavenger:1.82, sand-burrower:2.13, dune-stalker:0.55, ferrimordax-rutilus:0.38 |
| on_depleted | 6.0 | 0.00 | 0.46 | 0.54 | echo-wing:2.77, dune-stalker:1.65, ferrimordax-rutilus:1.57 |
| on_abundant | 6.0 | 0.50 | 0.15 | 0.35 | rust-scavenger:1.52, ferrimordax-rutilus:1.18, sand-burrower:1.50, echo-wing:0.88, dune-stalker:0.93 |

Reference band (report-only, task gate): WR [0.40, 0.60].

## Paired deltas (same seeds)

| pair | pairs | win-rate delta | rounds delta (CI95) | flips L->W / W->L |
| --- | --- | --- | --- | --- |
| off2 - off (noise floor) | 40 | -0.05 | -2.7 [-8.1, 2.6] | 10 / 12 |
| on_depleted - off (prey exclusion) | 40 | -0.25 | -1.4 [-7.2, 4.5] | 9 / 19 |
| on_abundant - off (apex boost) | 40 | 0.10 | 1.1 [-3.4, 5.7] | 13 / 9 |

Read the effect rows AGAINST the noise-floor row (control replicate): the
session seed pins the start RNG but residual non-seeded randomness keeps
same-seed replays from being identical, so a real effect must clear the floor.

Evidence only -- the flag flip is a master-dd verdict (L-069, spec sez.8).
