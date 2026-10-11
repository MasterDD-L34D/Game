# SPEC-I ER6 probe (flag `STRESSWAVE_EVENTS_ENABLED`, N=40)

Scenario `enc_hardcore_reinf_01` | biome `abisso_vulcanico` | scaling {"countAdd":6,"hpAdd":4,"modAdd":6,"dcAdd":2} | commit `be4f3af9f` | seed base 52000.

| arm | n | win rate (Wilson CI95) | timeouts | rounds (tick) | survivors |
| --- | --- | --- | --- | --- | --- |
| off | 40 | 0.88 [0.74, 0.95] | 0 | 92.9 +/- 9.9 | 1.8 |
| off2 | 40 | 0.82 [0.68, 0.91] | 0 | 91.2 +/- 11.3 | 1.6 |
| on | 40 | 0.82 [0.68, 0.91] | 0 | 90.4 +/- 10.6 | 1.6 |

| arm | rescue rate | rescue turn | overrun rate | overrun turn | spawns | last spawn turn |
| --- | --- | --- | --- | --- | --- | --- |
| off | 0.00 | n/a | 0.00 | n/a | 0.1 | 32.2 |
| off2 | 0.00 | n/a | 0.00 | n/a | 0.2 | 30.7 |
| on | 1.00 | 4.0 | 1.00 | 8.0 | 0.2 | 28.4 |

## Paired deltas (same seeds)

| pair | pairs | win-rate delta | rounds delta (CI95) | flips L->W / W->L |
| --- | --- | --- | --- | --- |
| off2 - off (noise floor) | 40 | -0.05 | -1.7 [-6.5, 3.1] | 5 / 7 |
| on - off (ER6 effect) | 40 | -0.05 | -2.5 [-7.1, 2.1] | 5 / 7 |

Read the effect rows AGAINST the noise-floor row (control replicate): the
session seed pins the start RNG but residual non-seeded randomness keeps
same-seed replays from being identical, so a real effect must clear the floor.

Evidence only -- the flag flip is a master-dd verdict (L-069, spec sez.8).
