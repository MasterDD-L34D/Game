# SPEC-I ER6 probe (flag `STRESSWAVE_EVENTS_ENABLED`, N=40)

Scenario `enc_hardcore_reinf_01` | biome `atollo_obsidiana` | scaling {"countAdd":6,"hpAdd":4,"modAdd":6,"dcAdd":2} | commit `unknown` | seed base 53000.

| arm | n | win rate (Wilson CI95) | timeouts | rounds (tick) | survivors |
| --- | --- | --- | --- | --- | --- |
| off | 40 | 0.78 [0.62, 0.88] | 2 | 105.8 +/- 14.2 | 1.6 |
| off2 | 40 | 0.75 [0.60, 0.86] | 1 | 103.5 +/- 12.6 | 1.5 |
| on | 40 | 0.72 [0.57, 0.84] | 2 | 105.3 +/- 14.9 | 1.5 |

| arm | rescue rate | rescue turn | overrun rate | overrun turn | spawns | last spawn turn |
| --- | --- | --- | --- | --- | --- | --- |
| off | 0.00 | n/a | 0.00 | n/a | 4.0 | 11.0 |
| off2 | 0.00 | n/a | 0.00 | n/a | 4.0 | 11.0 |
| on | 0.00 | n/a | 1.00 | 9.0 | 4.0 | 11.0 |

## Paired deltas (same seeds)

| pair | pairs | win-rate delta | rounds delta (CI95) | flips L->W / W->L |
| --- | --- | --- | --- | --- |
| off2 - off (noise floor) | 40 | -0.03 | -2.4 [-8.5, 3.8] | 6 / 7 |
| on - off (ER6 effect) | 40 | -0.05 | -0.5 [-6.6, 5.6] | 7 / 9 |

Read the effect rows AGAINST the noise-floor row (control replicate): the
session seed pins the start RNG but residual non-seeded randomness keeps
same-seed replays from being identical, so a real effect must clear the floor.

Evidence only -- the flag flip is a master-dd verdict (L-069, spec sez.8).
