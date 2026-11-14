# Overcharge action-economy probe (OD-058 D1, N=40)

Scenario `enc_hardcore_reinf_01` | scaling {"countAdd":6,"hpAdd":4,"modAdd":6,"dcAdd":2} | roster 2x skirmisher ap:2 (canon §7.1) | commit `6f54d08953a8b7aa369359bbd466d006d5027e96` | seed base 41000.

| arm | n | win rate (Wilson CI95) | rounds | player attacks | overcharge uses |
| --- | --- | --- | --- | --- | --- |
| control | 40 | 0.90 [0.77, 0.96] | 83.5 +/- 7.0 | 49.5 | 0.00 |
| control2 | 40 | 0.90 [0.77, 0.96] | 82.2 +/- 7.8 | 48.5 | 0.00 |
| live | 40 | 0.65 [0.50, 0.78] | 80.7 +/- 7.9 | 49.4 | 9.60 |
| seeded | 40 | 0.72 [0.57, 0.84] | 80.5 +/- 9.9 | 49.6 | 10.70 |

## Paired deltas (same seeds)

| pair | pairs | win-rate delta | rounds delta (CI95) | attacks delta (CI95) | flips L->W / W->L |
| --- | --- | --- | --- | --- | --- |
| control2 - control (noise floor) | 40 | 0.00 | -1.3 [-4.5, 1.9] | -1.0 [-2.9, 1.0] | 4 / 4 |
| live - control | 40 | -0.25 | -2.9 [-5.7, 0.0] | -0.1 [-1.9, 1.7] | 2 / 12 |
| seeded - control | 40 | -0.17 | -3.0 [-6.9, 0.8] | 0.1 [-2.3, 2.5] | 4 / 11 |

Read the verb rows AGAINST the noise-floor row: the session seed pins the start RNG
but residual non-seeded randomness keeps same-seed replays from being identical, so a
real effect must clear the control2-control floor.

Caveat: shared sim policy = basic attacks only (1 AP); deltas are the conservative
floor of the +1 AP swing (real players chain cost_ap 3 abilities on the borrowed AP).
Evidence only -- ratification verso P6 = master-dd (L-069).
