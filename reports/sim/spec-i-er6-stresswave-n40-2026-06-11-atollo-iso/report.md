# SPEC-I ER6 probe (flag `STRESSWAVE_EVENTS_ENABLED`, N=40)

Scenario `enc_hardcore_reinf_01` | biome `atollo_obsidiana` | scaling {"countAdd":6,"hpAdd":4,"modAdd":6,"dcAdd":2} | commit `unknown` | seed base 53000.

| arm | n | win rate (Wilson CI95) | timeouts | rounds (tick) | survivors |
| --- | --- | --- | --- | --- | --- |
| off | 40 | 0.57 [0.42, 0.71] | 2 | 102.5 +/- 19.4 | 1.2 |
| off2 | 40 | 0.90 [0.77, 0.96] | 0 | 100.4 +/- 6.9 | 1.8 |
| on | 40 | 0.80 [0.65, 0.90] | 0 | 101.8 +/- 8.8 | 1.6 |

| arm | rescue rate | rescue turn | overrun rate | overrun turn | spawns | last spawn turn |
| --- | --- | --- | --- | --- | --- | --- |
| off | 0.00 | n/a | 0.00 | n/a | 4.0 | 11.0 |
| off2 | 0.00 | n/a | 0.00 | n/a | 4.0 | 11.0 |
| on | 0.00 | n/a | 1.00 | 9.0 | 4.0 | 11.0 |

## Paired deltas (same seeds)

| pair | pairs | win-rate delta | rounds delta (CI95) | flips L->W / W->L |
| --- | --- | --- | --- | --- |
| off2 - off (noise floor) | 40 | 0.33 | -2.1 [-8.4, 4.3] | 16 / 3 |
| on - off (ER6 effect) | 40 | 0.23 | -0.7 [-6.9, 5.6] | 13 / 4 |

Read the effect rows AGAINST the noise-floor row (control replicate): the
session seed pins the start RNG but residual non-seeded randomness keeps
same-seed replays from being identical, so a real effect must clear the floor.

Evidence only -- the flag flip is a master-dd verdict (L-069, spec sez.8).
