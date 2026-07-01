# SPEC-I ER7 probe (flag `BIOME_POPULATION_ENABLED`, N=40)

Scenario `enc_badlands_foodweb_probe_01` | biome `badlands` | scaling {} | commit `unknown` | seed base 52000.

| arm | n | win rate (Wilson CI95) | timeouts | rounds (tick) | survivors |
| --- | --- | --- | --- | --- | --- |
| off | 40 | 1.00 [0.91, 1.00] | 0 | 32.5 +/- 4.7 | 2.0 |
| off2 | 40 | 1.00 [0.91, 1.00] | 0 | 30.8 +/- 3.5 | 2.0 |
| on_depleted | 40 | 1.00 [0.91, 1.00] | 0 | 37.9 +/- 4.8 | 2.0 |
| on_abundant | 40 | 1.00 [0.91, 1.00] | 0 | 32.3 +/- 4.7 | 2.0 |

ER7 spawn composition (mean per run -- effect-fired proof, anti-#14):

| arm | spawns/run | prey share | meso share | apex share | by species (mean/run) |
| --- | --- | --- | --- | --- | --- |
| off | 3.5 | 0.60 | 0.17 | 0.22 | echo-wing:0.60, sand-burrower:1.18, rust-scavenger:0.90, ferrimordax-rutilus:0.33, dune-stalker:0.45 |
| off2 | 3.3 | 0.63 | 0.22 | 0.15 | ferrimordax-rutilus:0.17, sand-burrower:1.18, echo-wing:0.72, rust-scavenger:0.88, dune-stalker:0.30 |
| on_depleted | 4.0 | 0.00 | 0.48 | 0.52 | dune-stalker:1.00, echo-wing:1.93, ferrimordax-rutilus:1.05 |
| on_abundant | 3.4 | 0.55 | 0.11 | 0.34 | ferrimordax-rutilus:0.57, dune-stalker:0.60, rust-scavenger:0.72, echo-wing:0.38, sand-burrower:1.15 |

Reference band (report-only, task gate): WR [0.40, 0.60].

## Paired deltas (same seeds)

| pair | pairs | win-rate delta | rounds delta (CI95) | flips L->W / W->L |
| --- | --- | --- | --- | --- |
| off2 - off (noise floor) | 40 | 0.00 | -1.7 [-3.7, 0.3] | 0 / 0 |
| on_depleted - off (prey exclusion) | 40 | 0.00 | 5.4 [3.7, 7.2] | 0 / 0 |
| on_abundant - off (apex boost) | 40 | 0.00 | -0.3 [-2.2, 1.7] | 0 / 0 |

Read the effect rows AGAINST the noise-floor row (control replicate): the
session seed pins the start RNG but residual non-seeded randomness keeps
same-seed replays from being identical, so a real effect must clear the floor.

Evidence only -- the flag flip is a master-dd verdict (L-069, spec sez.8).
