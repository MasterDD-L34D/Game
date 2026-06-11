# SPEC-I ER7 probe (flag `BIOME_POPULATION_ENABLED`, N=40)

Scenario `enc_badlands_foodweb_pilot_01` | biome `badlands` | scaling {"countAdd":7,"hpAdd":4,"modAdd":6,"dcAdd":1} | commit `c85710fb0` | seed base 72000.

| arm | n | win rate (Wilson CI95) | timeouts | rounds (tick) | survivors |
| --- | --- | --- | --- | --- | --- |
| off | 40 | 0.50 [0.35, 0.65] | 0 | 107.6 +/- 12.4 | 0.9 |
| off2 | 40 | 0.63 [0.47, 0.76] | 2 | 113.8 +/- 13.3 | 1.3 |
| on_depleted | 40 | 0.72 [0.57, 0.84] | 1 | 115.8 +/- 11.0 | 1.4 |
| on_abundant | 40 | 0.57 [0.42, 0.71] | 0 | 113.5 +/- 9.2 | 1.1 |

ER7 spawn composition (mean per run -- effect-fired proof, anti-#14):

| arm | spawns/run | prey share | meso share | apex share | by species (mean/run) |
| --- | --- | --- | --- | --- | --- |
| off | 6.0 | 0.63 | 0.30 | 0.07 | sand-burrower:1.98, echo-wing:0.95, rust-scavenger:1.80, dune-stalker:0.45, ferrocolonia-magnetotattica:0.82 |
| off2 | 6.0 | 0.69 | 0.20 | 0.11 | dune-stalker:0.68, rust-scavenger:2.05, sand-burrower:2.10, ferrocolonia-magnetotattica:0.50, echo-wing:0.68 |
| on_depleted | 6.0 | 0.00 | 0.66 | 0.34 | dune-stalker:2.05, echo-wing:1.93, ferrocolonia-magnetotattica:2.02 |
| on_abundant | 6.0 | 0.59 | 0.23 | 0.18 | echo-wing:0.70, rust-scavenger:1.70, ferrocolonia-magnetotattica:0.70, sand-burrower:1.82, dune-stalker:1.07 |

Reference band (report-only, task gate): WR [0.40, 0.60].

## Paired deltas (same seeds)

| pair | pairs | win-rate delta | rounds delta (CI95) | flips L->W / W->L |
| --- | --- | --- | --- | --- |
| off2 - off (noise floor) | 40 | 0.13 | 6.3 [0.9, 11.6] | 14 / 9 |
| on_depleted - off (prey exclusion) | 40 | 0.23 | 8.2 [2.8, 13.6] | 14 / 5 |
| on_abundant - off (apex boost) | 40 | 0.07 | 6.0 [1.1, 10.8] | 10 / 7 |

Read the effect rows AGAINST the noise-floor row (control replicate): the
session seed pins the start RNG but residual non-seeded randomness keeps
same-seed replays from being identical, so a real effect must clear the floor.

Evidence only -- the flag flip is a master-dd verdict (L-069, spec sez.8).
