# SPEC-I ER6 probe (flag `STRESSWAVE_EVENTS_ENABLED`, N=40)

Scenario `enc_hardcore_reinf_01` | biome `abisso_vulcanico` | scaling {"countAdd":6,"hpAdd":4,"modAdd":6,"dcAdd":2} | commit `unknown` | seed base 52000.

| arm | n | win rate (Wilson CI95) | timeouts | rounds (tick) | survivors |
| --- | --- | --- | --- | --- | --- |
| off | 40 | 0.90 [0.77, 0.96] | 0 | 92.7 +/- 8.1 | 1.8 |
| off2 | 40 | 0.85 [0.71, 0.93] | 0 | 92.5 +/- 9.4 | 1.7 |
| on | 40 | 0.90 [0.77, 0.96] | 0 | 91.8 +/- 7.4 | 1.8 |

| arm | rescue rate | rescue turn | overrun rate | overrun turn | spawns | last spawn turn |
| --- | --- | --- | --- | --- | --- | --- |
| off | 0.00 | n/a | 0.00 | n/a | 0.1 | 34.8 |
| off2 | 0.00 | n/a | 0.00 | n/a | 0.1 | 31.5 |
| on | 1.00 | 4.0 | 1.00 | 8.0 | 0.1 | 28.8 |

## Paired deltas (same seeds)

| pair | pairs | win-rate delta | rounds delta (CI95) | flips L->W / W->L |
| --- | --- | --- | --- | --- |
| off2 - off (noise floor) | 40 | -0.05 | -0.2 [-4.1, 3.8] | 4 / 6 |
| on - off (ER6 effect) | 40 | 0.00 | -0.9 [-4.3, 2.5] | 4 / 4 |

Read the effect rows AGAINST the noise-floor row (control replicate): the
session seed pins the start RNG but residual non-seeded randomness keeps
same-seed replays from being identical, so a real effect must clear the floor.

Evidence only -- the flag flip is a master-dd verdict (L-069, spec sez.8).
