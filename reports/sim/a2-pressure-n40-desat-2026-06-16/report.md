# A2 pressure_tier_floor -- N=40 band-verify (flag `PRESSURE_TIER_FLOOR_ENABLED`)

Roster `weak` | scaling {"countAdd":3,"modAdd":3} | commit `2a7f3853` | isolated arms (one process per scenario+arm).

## Per-class pooled (flag OFF baseline vs flag ON) vs canonical bands

| class | band WR / defeat / timeout | arm | n | WR (Wilson CI95) | defeat | timeout | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| tutorial | 0.60-0.80 / 0.10-0.20 / 0.05-0.10 | off | 80 | 95.0% [87.8%, 98.0%] | 5.0% | 0.0% | RED |
| tutorial | 0.60-0.80 / 0.10-0.20 / 0.05-0.10 | off2 | 80 | 90.0% [81.5%, 94.8%] | 10.0% | 0.0% | RED |
| tutorial | 0.60-0.80 / 0.10-0.20 / 0.05-0.10 | on | 80 | 95.0% [87.8%, 98.0%] | 5.0% | 0.0% | RED |
| standard | 0.35-0.55 / 0.25-0.40 / 0.10-0.20 | off | 160 | 46.3% [38.7%, 54.0%] | 53.8% | 0.0% | RED |
| standard | 0.35-0.55 / 0.25-0.40 / 0.10-0.20 | off2 | 160 | 43.8% [36.3%, 51.5%] | 56.3% | 0.0% | RED |
| standard | 0.35-0.55 / 0.25-0.40 / 0.10-0.20 | on | 160 | 46.3% [38.7%, 54.0%] | 53.8% | 0.0% | RED |
| hardcore | 0.15-0.25 / 0.75-0.85 / 0.00-0.05 | off | 160 | 76.9% [69.8%, 82.7%] | 23.1% | 0.0% | RED |
| hardcore | 0.15-0.25 / 0.75-0.85 / 0.00-0.05 | off2 | 160 | 76.9% [69.8%, 82.7%] | 23.1% | 0.0% | RED |
| hardcore | 0.15-0.25 / 0.75-0.85 / 0.00-0.05 | on | 160 | 75.0% [67.8%, 81.1%] | 16.9% | 8.1% | RED |

## Per-encounter outcomes + paired delta (same seeds)

| encounter | class | floor | arm | n | WR | defeat | timeout | rounds | spawns | on-off WR delta | flips L->W / W->L |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| enc_tutorial_01 | tutorial | 1 | off | 40 | 90.0% | 10.0% | 0.0% | 31.6 | 0.0 |  |  |
| enc_tutorial_01 | tutorial | 1 | off2 | 40 | 80.0% | 20.0% | 0.0% | 34.3 | 0.0 | (noise -0.10) | 2 / 6 |
| enc_tutorial_01 | tutorial | 1 | on | 40 | 90.0% | 10.0% | 0.0% | 30.0 | 0.0 | 0.00 | 4 / 4 |
| enc_tutorial_02 | tutorial | 1 | off | 40 | 100.0% | 0.0% | 0.0% | 16.0 | 0.0 |  |  |
| enc_tutorial_02 | tutorial | 1 | off2 | 40 | 100.0% | 0.0% | 0.0% | 16.0 | 0.0 | (noise 0.00) | 0 / 0 |
| enc_tutorial_02 | tutorial | 1 | on | 40 | 100.0% | 0.0% | 0.0% | 16.0 | 0.0 | 0.00 | 0 / 0 |
| enc_savana_01 | standard | 2 | off | 40 | 85.0% | 15.0% | 0.0% | 32.0 | 0.0 |  |  |
| enc_savana_01 | standard | 2 | off2 | 40 | 75.0% | 25.0% | 0.0% | 34.4 | 0.0 | (noise -0.10) | 6 / 10 |
| enc_savana_01 | standard | 2 | on | 40 | 85.0% | 15.0% | 0.0% | 31.1 | 0.0 | 0.00 | 6 / 6 |
| enc_caverna_02 | standard | 2 | off | 40 | 100.0% | 0.0% | 0.0% | 16.0 | 0.0 |  |  |
| enc_caverna_02 | standard | 2 | off2 | 40 | 100.0% | 0.0% | 0.0% | 16.0 | 0.0 | (noise 0.00) | 0 / 0 |
| enc_caverna_02 | standard | 2 | on | 40 | 100.0% | 0.0% | 0.0% | 16.0 | 0.0 | 0.00 | 0 / 0 |
| enc_capture_01 | standard | 2 | off | 40 | 0.0% | 100.0% | 0.0% | 30.9 | 0.0 |  |  |
| enc_capture_01 | standard | 2 | off2 | 40 | 0.0% | 100.0% | 0.0% | 31.4 | 0.0 | (noise 0.00) | 0 / 0 |
| enc_capture_01 | standard | 2 | on | 40 | 0.0% | 100.0% | 0.0% | 34.8 | 0.0 | 0.00 | 0 / 0 |
| enc_escort_01 | standard | 2 | off | 40 | 0.0% | 100.0% | 0.0% | 1.0 | 0.0 |  |  |
| enc_escort_01 | standard | 2 | off2 | 40 | 0.0% | 100.0% | 0.0% | 1.0 | 0.0 | (noise 0.00) | 0 / 0 |
| enc_escort_01 | standard | 2 | on | 40 | 0.0% | 100.0% | 0.0% | 1.0 | 0.0 | 0.00 | 0 / 0 |
| enc_survival_01 | hardcore | 3 | off | 40 | 100.0% | 0.0% | 0.0% | 25.1 | 0.0 |  |  |
| enc_survival_01 | hardcore | 3 | off2 | 40 | 100.0% | 0.0% | 0.0% | 25.2 | 0.0 | (noise 0.00) | 0 / 0 |
| enc_survival_01 | hardcore | 3 | on | 40 | 100.0% | 0.0% | 0.0% | 21.5 | 0.0 | 0.00 | 0 / 0 |
| enc_savana_skiv_solo_vs_pack | hardcore | 3 | off | 40 | 100.0% | 0.0% | 0.0% | 13.0 | 0.0 |  |  |
| enc_savana_skiv_solo_vs_pack | hardcore | 3 | off2 | 40 | 100.0% | 0.0% | 0.0% | 13.0 | 0.0 | (noise 0.00) | 0 / 0 |
| enc_savana_skiv_solo_vs_pack | hardcore | 3 | on | 40 | 100.0% | 0.0% | 0.0% | 13.0 | 0.0 | 0.00 | 0 / 0 |
| enc_hardcore_reinf_01 | hardcore | 4 | off | 40 | 7.5% | 92.5% | 0.0% | 68.3 | 0.0 |  |  |
| enc_hardcore_reinf_01 | hardcore | 4 | off2 | 40 | 7.5% | 92.5% | 0.0% | 67.6 | 0.0 | (noise 0.00) | 3 / 3 |
| enc_hardcore_reinf_01 | hardcore | 4 | on | 40 | 0.0% | 67.5% | 32.5% | 94.0 | 4.0 | -0.07 | 0 / 3 |
| enc_frattura_03 | hardcore | 4 | off | 40 | 100.0% | 0.0% | 0.0% | 34.0 | 0.0 |  |  |
| enc_frattura_03 | hardcore | 4 | off2 | 40 | 100.0% | 0.0% | 0.0% | 34.0 | 0.0 | (noise 0.00) | 0 / 0 |
| enc_frattura_03 | hardcore | 4 | on | 40 | 100.0% | 0.0% | 0.0% | 34.0 | 0.0 | 0.00 | 0 / 0 |

## Fire check (anti-#14): the floor lifts the Sistema tier through the real backend

| encounter | floor | expected min pressure | off tier (pressure) | on tier (pressure) |
| --- | --- | --- | --- | --- |
| enc_tutorial_01 | 1 | 0 | Calm (0) | Calm (0) |
| enc_tutorial_02 | 1 | 0 | Calm (0) | Calm (0) |
| enc_savana_01 | 2 | 25 | Calm (0) | Alert (25) |
| enc_caverna_02 | 2 | 25 | Calm (0) | Alert (25) |
| enc_capture_01 | 2 | 25 | Calm (0) | Alert (25) |
| enc_escort_01 | 2 | 25 | Calm (0) | Alert (25) |
| enc_survival_01 | 3 | 50 | Calm (0) | Escalated (50) |
| enc_savana_skiv_solo_vs_pack | 3 | 50 | Calm (0) | Escalated (50) |
| enc_hardcore_reinf_01 | 4 | 75 | Calm (0) | Critical (75) |
| enc_frattura_03 | 4 | 75 | Calm (0) | Critical (75) |

Read the on-off WR delta AGAINST the off2-off noise floor: the session seed pins the
start RNG but residual non-seeded randomness keeps same-seed replays from being
identical, so a real floor effect must clear the noise floor.

Caveat: the greedy 2-skirmisher probe saturates authored fights, so the OFF absolute
win rate sits above the calibrated damage_curves bands. The ratifiable signal is the
PAIRED on-vs-off delta + the fire-check tier lift; the absolute band verdict carries
the saturation caveat.

Evidence only -- the flag flip + any floor re-tune is a master-dd verdict (L-069, spec sez. Gate balance).
