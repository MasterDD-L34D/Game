# SPEC-I ER6 probe (flag `STRESSWAVE_EVENTS_ENABLED`, N=40)

Scenario `enc_hardcore_reinf_01` | biome `abisso_vulcanico` | scaling {"countAdd":6,"hpAdd":4,"modAdd":6,"dcAdd":2} | commit `unknown` | seed base 52000.

| arm | n | win rate (Wilson CI95) | timeouts | rounds (tick) | survivors |
| --- | --- | --- | --- | --- | --- |
| off | 40 | 0.70 [0.55, 0.82] | 3 | 109.5 +/- 17.4 | 1.5 |
| off2 | 40 | 0.68 [0.52, 0.80] | 1 | 102.5 +/- 15.0 | 1.4 |
| on | 40 | 0.68 [0.52, 0.80] | 2 | 105.8 +/- 14.5 | 1.4 |

| arm | rescue rate | rescue turn | overrun rate | overrun turn | spawns | last spawn turn |
| --- | --- | --- | --- | --- | --- | --- |
| off | 0.00 | n/a | 0.00 | n/a | 4.0 | 11.0 |
| off2 | 0.00 | n/a | 0.00 | n/a | 4.0 | 11.0 |
| on | 1.00 | 4.0 | 1.00 | 8.0 | 4.0 | 8.0 |

## Paired deltas (same seeds)

| pair | pairs | win-rate delta | rounds delta (CI95) | flips L->W / W->L |
| --- | --- | --- | --- | --- |
| off2 - off (noise floor) | 40 | -0.03 | -7.0 [-14.6, 0.6] | 7 / 8 |
| on - off (ER6 effect) | 40 | -0.03 | -3.7 [-10.6, 3.2] | 10 / 11 |

Read the effect rows AGAINST the noise-floor row (control replicate): the
session seed pins the start RNG but residual non-seeded randomness keeps
same-seed replays from being identical, so a real effect must clear the floor.

Evidence only -- the flag flip is a master-dd verdict (L-069, spec sez.8).
