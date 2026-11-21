# SPEC-I ER1 probe (flag `ERMES_ROLE_GAP_ENABLED`, N=40)

Scenario `enc_hardcore_reinf_01` | biome `badlands` | scaling {"countAdd":7,"hpAdd":5,"modAdd":7,"dcAdd":2} | commit `be4f3af9f` | seed base 51000.

| arm | n | win rate (Wilson CI95) | timeouts | rounds (tick) | survivors |
| --- | --- | --- | --- | --- | --- |
| off_gap | 40 | 0.42 [0.29, 0.58] | 0 | 99.1 +/- 18.7 | 0.8 |
| off_gap2 | 40 | 0.40 [0.26, 0.55] | 0 | 98.7 +/- 16.7 | 0.8 |
| on_gap | 40 | 0.40 [0.26, 0.55] | 0 | 102.7 +/- 20.0 | 0.8 |
| off_full | 40 | 0.33 [0.20, 0.48] | 0 | 99.8 +/- 18.2 | 0.7 |
| on_full | 40 | 0.35 [0.22, 0.50] | 0 | 103.5 +/- 19.2 | 0.7 |

ER1 eco-apply proof (max enemy attack_mod_bonus, per arm mean):

- off_gap: 0.00
- off_gap2: 0.00
- on_gap: 1.00
- off_full: 0.00
- on_full: 0.00

Reference band (report-only, task gate): WR [0.40, 0.60].

## Paired deltas (same seeds)

| pair | pairs | win-rate delta | rounds delta (CI95) | flips L->W / W->L |
| --- | --- | --- | --- | --- |
| off_gap2 - off_gap (noise floor) | 40 | -0.03 | -0.4 [-8.4, 7.7] | 11 / 12 |
| on_gap - off_gap (ER1 effect) | 40 | -0.03 | 3.6 [-2.9, 10.2] | 7 / 8 |
| on_full - off_full (no-op check) | 40 | 0.03 | 3.7 [-3.6, 11.0] | 8 / 7 |

Read the effect rows AGAINST the noise-floor row (control replicate): the
session seed pins the start RNG but residual non-seeded randomness keeps
same-seed replays from being identical, so a real effect must clear the floor.

Evidence only -- the flag flip is a master-dd verdict (L-069, spec sez.8).
