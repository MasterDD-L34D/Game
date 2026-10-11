# Wound magnitude probe (OD-058 D2, N=40)

Scenario `enc_hardcore_reinf_01` | scaling {"countAdd":6,"hpAdd":4,"modAdd":6,"dcAdd":2} | roster 2x skirmisher ap:2, wound su OGNI player unit | commit `adc8cd9e2903a6db20731cd748950958ccabbad7` | seed base 42000.

| arm | n | win rate (Wilson CI95) | rounds | survivors |
| --- | --- | --- | --- | --- |
| control | 40 | 0.88 [0.74, 0.95] | 85.3 +/- 10.1 | 1.75 |
| control2 | 40 | 1.00 [0.91, 1.00] | 82.4 +/- 3.3 | 2.00 |
| atk_lieve | 40 | 0.97 [0.87, 1.00] | 81.8 +/- 5.2 | 1.95 |
| atk_grave | 40 | 0.95 [0.83, 0.99] | 81.8 +/- 3.9 | 1.90 |
| def_grave | 40 | 0.95 [0.83, 0.99] | 83.0 +/- 5.8 | 1.90 |
| acc_lieve | 40 | 0.97 [0.87, 1.00] | 81.0 +/- 4.5 | 1.95 |
| ap_grave | 40 | 0.93 [0.80, 0.97] | 78.8 +/- 4.0 | 1.85 |
| mob_grave | 40 | 0.90 [0.77, 0.96] | 82.9 +/- 6.4 | 1.80 |

## Paired deltas vs control (same seeds)

| arm | win-rate delta | rounds delta (CI95) | flips L->W / W->L |
| --- | --- | --- | --- |
| control2 (noise floor) | 0.13 | -2.9 [-6.0, 0.2] | 5 / 0 |
| atk_lieve | 0.10 | -3.5 [-7.0, 0.0] | 5 / 1 |
| atk_grave | 0.07 | -3.5 [-7.1, 0.0] | 5 / 2 |
| def_grave | 0.07 | -2.3 [-5.9, 1.3] | 5 / 2 |
| acc_lieve | 0.10 | -4.3 [-7.5, -1.1] | 5 / 1 |
| ap_grave | 0.05 | -6.5 [-9.8, -3.2] | 5 / 3 |
| mob_grave | 0.03 | -2.4 [-5.5, 0.7] | 4 / 3 |

Leggere ogni arm contro la riga noise-floor (control2). mob_grave atteso ==
floor: mobility non ha consumer engine (stat inerte, documentata).
Evidence only -- ratifica magnitudo + flip flag = master-dd (L-069).
