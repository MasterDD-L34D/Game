# SPEC-I ER6 probe (flag `STRESSWAVE_EVENTS_ENABLED`, N=40)

Scenario `enc_hardcore_reinf_01` | biome `abisso_vulcanico` | scaling {"countAdd":6,"hpAdd":4,"modAdd":6,"dcAdd":2} | commit `unknown` | seed base 52000.

| arm | n | win rate (Wilson CI95) | timeouts | rounds (tick) | survivors |
| --- | --- | --- | --- | --- | --- |
| off | 40 | 0.78 [0.62, 0.88] | 0 | 105.8 +/- 9.6 | 1.5 |
| off2 | 40 | 0.78 [0.62, 0.88] | 0 | 104.0 +/- 12.1 | 1.6 |
| on | 40 | 0.60 [0.45, 0.74] | 3 | 110.2 +/- 17.3 | 1.3 |

| arm | rescue rate | rescue turn | overrun rate | overrun turn | spawns | last spawn turn |
| --- | --- | --- | --- | --- | --- | --- |
| off | 0.00 | n/a | 0.00 | n/a | 4.0 | 11.0 |
| off2 | 0.00 | n/a | 0.00 | n/a | 4.0 | 11.0 |
| on | 1.00 | 4.0 | 1.00 | 8.0 | 4.0 | 8.0 |

## Paired deltas (same seeds)

| pair | pairs | win-rate delta | rounds delta (CI95) | flips L->W / W->L |
| --- | --- | --- | --- | --- |
| off2 - off (noise floor) | 40 | 0.00 | -1.9 [-6.6, 2.9] | 7 / 7 |
| on - off (ER6 effect) | 40 | -0.17 | 4.3 [-2.5, 11.2] | 4 / 11 |

Read the effect rows AGAINST the noise-floor row (control replicate): the
session seed pins the start RNG but residual non-seeded randomness keeps
same-seed replays from being identical, so a real effect must clear the floor.

Evidence only -- the flag flip is a master-dd verdict (L-069, spec sez.8).
