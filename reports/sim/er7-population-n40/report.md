# SPEC-I ER7 probe (flag `BIOME_POPULATION_ENABLED`, N=40)

Scenario `enc_badlands_foodweb_probe_01` | biome `badlands` | scaling {} | commit `unknown` | seed base 51000.

| arm | n | win rate (Wilson CI95) | timeouts | rounds (tick) | survivors |
| --- | --- | --- | --- | --- | --- |
| off | 40 | 1.00 [0.91, 1.00] | 0 | 32.9 +/- 4.5 | 2.0 |
| off2 | 40 | 1.00 [0.91, 1.00] | 0 | 32.7 +/- 4.6 | 2.0 |
| on_depleted | 40 | 1.00 [0.91, 1.00] | 0 | 38.1 +/- 5.1 | 2.0 |
| on_abundant | 40 | 1.00 [0.91, 1.00] | 0 | 35.0 +/- 4.9 | 2.0 |

ER7 spawn composition (mean per run -- effect-fired proof, anti-#14):

| arm | spawns/run | prey share | meso share | apex share | by species (mean/run) |
| --- | --- | --- | --- | --- | --- |
| off | 3.5 | 0.54 | 0.25 | 0.21 | rust-scavenger:0.78, echo-wing:0.88, ferrimordax-rutilus:0.42, sand-burrower:1.10, dune-stalker:0.33 |
| off2 | 3.5 | 0.56 | 0.21 | 0.23 | sand-burrower:1.00, dune-stalker:0.35, ferrimordax-rutilus:0.45, echo-wing:0.72, rust-scavenger:0.95 |
| on_depleted | 4.0 | 0.00 | 0.54 | 0.46 | echo-wing:2.20, dune-stalker:0.88, ferrimordax-rutilus:0.97 |
| on_abundant | 3.8 | 0.49 | 0.20 | 0.31 | echo-wing:0.75, rust-scavenger:0.88, sand-burrower:0.97, ferrimordax-rutilus:0.68, dune-stalker:0.50 |

Reference band (report-only, task gate): WR [0.40, 0.60].

## Paired deltas (same seeds)

| pair | pairs | win-rate delta | rounds delta (CI95) | flips L->W / W->L |
| --- | --- | --- | --- | --- |
| off2 - off (noise floor) | 40 | 0.00 | -0.1 [-1.9, 1.6] | 0 / 0 |
| on_depleted - off (prey exclusion) | 40 | 0.00 | 5.2 [3.1, 7.3] | 0 / 0 |
| on_abundant - off (apex boost) | 40 | 0.00 | 2.2 [0.0, 4.4] | 0 / 0 |

Read the effect rows AGAINST the noise-floor row (control replicate): the
session seed pins the start RNG but residual non-seeded randomness keeps
same-seed replays from being identical, so a real effect must clear the floor.

Evidence only -- the flag flip is a master-dd verdict (L-069, spec sez.8).
