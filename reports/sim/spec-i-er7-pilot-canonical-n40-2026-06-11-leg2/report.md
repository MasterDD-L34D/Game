# SPEC-I ER7 probe (flag `BIOME_POPULATION_ENABLED`, N=40)

Scenario `enc_badlands_foodweb_pilot_01` | biome `badlands` | scaling {"countAdd":6,"hpAdd":4,"modAdd":7,"dcAdd":2} | commit `c85710fb0` | seed base 73000.

| arm | n | win rate (Wilson CI95) | timeouts | rounds (tick) | survivors |
| --- | --- | --- | --- | --- | --- |
| off | 40 | 0.68 [0.52, 0.80] | 0 | 103.4 +/- 10.4 | 1.3 |
| off2 | 40 | 0.63 [0.47, 0.76] | 0 | 101.3 +/- 11.4 | 1.2 |
| on_depleted | 40 | 0.60 [0.45, 0.74] | 1 | 106.9 +/- 16.4 | 1.2 |
| on_abundant | 40 | 0.60 [0.45, 0.74] | 0 | 103.3 +/- 12.6 | 1.1 |

ER7 spawn composition (mean per run -- effect-fired proof, anti-#14):

| arm | spawns/run | prey share | meso share | apex share | by species (mean/run) |
| --- | --- | --- | --- | --- | --- |
| off | 6.0 | 0.65 | 0.23 | 0.12 | rust-scavenger:1.93, sand-burrower:1.95, echo-wing:0.55, dune-stalker:0.72, ferrocolonia-magnetotattica:0.85 |
| off2 | 6.0 | 0.69 | 0.19 | 0.12 | sand-burrower:1.98, rust-scavenger:2.17, ferrocolonia-magnetotattica:0.45, echo-wing:0.70, dune-stalker:0.70 |
| on_depleted | 6.0 | 0.00 | 0.62 | 0.38 | ferrocolonia-magnetotattica:1.82, dune-stalker:2.30, echo-wing:1.88 |
| on_abundant | 6.0 | 0.57 | 0.16 | 0.27 | dune-stalker:1.63, rust-scavenger:1.55, sand-burrower:1.88, ferrocolonia-magnetotattica:0.65, echo-wing:0.30 |

Reference band (report-only, task gate): WR [0.40, 0.60].

## Paired deltas (same seeds)

| pair | pairs | win-rate delta | rounds delta (CI95) | flips L->W / W->L |
| --- | --- | --- | --- | --- |
| off2 - off (noise floor) | 40 | -0.05 | -2.1 [-6.5, 2.3] | 8 / 10 |
| on_depleted - off (prey exclusion) | 40 | -0.07 | 3.5 [-2.6, 9.7] | 8 / 11 |
| on_abundant - off (apex boost) | 40 | -0.07 | -0.1 [-4.7, 4.4] | 8 / 11 |

Read the effect rows AGAINST the noise-floor row (control replicate): the
session seed pins the start RNG but residual non-seeded randomness keeps
same-seed replays from being identical, so a real effect must clear the floor.

Evidence only -- the flag flip is a master-dd verdict (L-069, spec sez.8).
