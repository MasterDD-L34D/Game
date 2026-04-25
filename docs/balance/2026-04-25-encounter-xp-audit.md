---
title: Encounter XP Budget Audit (2026-04-25)
doc_status: active
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-04-25'
source_of_truth: false
language: it
review_cycle_days: 30
tags:
  - balance
  - pcg
  - encounter
  - pathfinder-xp
  - generated
---

# Encounter XP Budget Audit

Pathfinder-inspired difficulty audit. Closes [pcg-level-design-illuminator P1](.claude/agents/pcg-level-design-illuminator.md). Ratio = enemy_power / (party_power × difficulty_multiplier).

## ⚠️ Lettura del verdetto

Il modello è una **baseline first-pass**: usa stat aggregate (hp + mod + dc + traits) ignorando action economy, pressure tier, hazard tiles, AOE/bleeding. Il verdetto **non sostituisce** il playtest empirico — lo affianca come strumento di sanity-check.

### Calibrazione empirica (CLAUDE.md sprint context)

| Scenario                         | Win rate empirico | Verdetto modello |  Δ  |
| -------------------------------- | ----------------: | ---------------- | :-: |
| `enc_tutorial_01`                |              ~80% | balanced         | ✅  |
| `enc_tutorial_02`                |              ~80% | too_hard         | ⚠️  |
| `enc_tutorial_03`                |              ~50% | too_easy         | ⚠️  |
| `enc_tutorial_04`                |              ~30% | too_easy         | ⚠️  |
| `enc_tutorial_05`                |              ~20% | too_easy         | ⚠️  |
| `enc_tutorial_06_hardcore` iter2 |              ~85% | too_easy         | ⚠️  |

Il modello **sotto-predice difficulty** per scenari avanzati (tutorial 03+ + hardcore). Cause probabili:

1. **Action economy** ignorata: 1 BOSS hp 40 vs 8 player → focus-fire boss collassa rapidamente in modello, non in pratica (perde turni a manovrare).
2. **Pressure tier** (`sistema_pressure_start` 0-95) non modellata: AI a tier Apex emette 4 intent/turno = 4× damage output rispetto a tier Calm.
3. **Hazard tiles + bleeding + AOE traits** sommati come solo +2 power per trait flat (placeholder).
4. **Multipliers difficulty** lineari (0.6→2.2): forse troppo aggressivi al rialzo per livelli alti.

### Recommended tuning (post-playtest)

- **Calibra `DIFFICULTY_MULTIPLIER`** in [`tools/py/encounter_xp_budget.py`](../../tools/py/encounter_xp_budget.py) usando le win rate empiriche come ground truth.
- **Pesa traits** per categoria (AOE +5, bleeding +3, focus +2, passive +1) invece di flat +2.
- **Aggiungi `pressure_modifier`** = 1 + sistema_pressure_start / 100, moltiplica enemy_power.
- **Modella action economy**: enemy_power \*= (1 + 0.1 × max(0, party_size - enemy_count)) per catturare la "concentrazione".

Queste tuning richiedono ~3-5h di iterazione con dati di playtest reali (vedi `docs/playtest/*` per win rate per scenario).

## Verdict per scenario

| Scenario                            | Diff | Party | Enemy | Expected |     Ratio | Verdict                    |
| ----------------------------------- | ---: | ----: | ----: | -------: | --------: | -------------------------- |
| `enc_tutorial_01`                   |    1 |  66.0 |  40.0 |     39.6 |  **1.01** | ✅ balanced                |
| `enc_tutorial_02`                   |    2 |  66.0 |  73.0 |     56.1 | **1.301** | 🔴 too_hard (enemy power)  |
| `enc_tutorial_03`                   |    3 |  66.0 |  34.0 |     66.0 | **0.515** | 🟢 too_easy (player power) |
| `enc_tutorial_04`                   |    4 |  66.0 |  60.0 |     92.4 | **0.649** | 🟢 too_easy (player power) |
| `enc_tutorial_05`                   |    5 |  86.0 |  39.0 |    146.2 | **0.267** | 🟢 too_easy (player power) |
| `enc_tutorial_06_hardcore`          |    6 | 282.0 | 190.0 |    620.4 | **0.306** | 🟢 too_easy (player power) |
| `enc_tutorial_06_hardcore_quartet`  |    6 | 132.0 | 172.0 |    290.4 | **0.592** | 🟢 too_easy (player power) |
| `enc_tutorial_07_hardcore_pod_rush` |    7 | 136.0 | 100.0 |    353.6 | **0.283** | 🟢 too_easy (player power) |

## Summary

- **balanced**: 1/8 (12.5%)
- **too_hard**: 1/8 (12.5%)
- **too_easy**: 6/8 (75.0%)

## Difficulty multiplier table

| Difficulty | Multiplier |
| ---------: | ---------: |
|          1 |        0.6 |
|          2 |       0.85 |
|          3 |        1.0 |
|          4 |        1.4 |
|          5 |        1.7 |
|          6 |        2.2 |
|          7 |        2.6 |
|          8 |        3.0 |

## Per-unit power breakdown

### `enc_tutorial_01`

| Unit        | Side    | Power |   hp |  mod |  dc | traits |
| ----------- | ------- | ----: | ---: | ---: | --: | -----: |
| `p_scout`   | player  |  33.0 | 10.0 | 15.0 | 6.0 |    2.0 |
| `p_tank`    | player  |  33.0 | 12.0 | 10.0 | 9.0 |    2.0 |
| `e_nomad_1` | sistema |  19.0 |  3.0 | 10.0 | 6.0 |    0.0 |
| `e_nomad_2` | sistema |  21.0 |  5.0 | 10.0 | 6.0 |    0.0 |

### `enc_tutorial_02`

| Unit        | Side    | Power |   hp |  mod |  dc | traits |
| ----------- | ------- | ----: | ---: | ---: | --: | -----: |
| `p_scout`   | player  |  33.0 | 10.0 | 15.0 | 6.0 |    2.0 |
| `p_tank`    | player  |  33.0 | 12.0 | 10.0 | 9.0 |    2.0 |
| `e_nomad_1` | sistema |  24.0 |  3.0 | 15.0 | 6.0 |    0.0 |
| `e_nomad_2` | sistema |  24.0 |  3.0 | 15.0 | 6.0 |    0.0 |
| `e_hunter`  | sistema |  25.0 |  6.0 | 10.0 | 9.0 |    0.0 |

### `enc_tutorial_03`

| Unit            | Side    | Power |   hp |  mod |  dc | traits |
| --------------- | ------- | ----: | ---: | ---: | --: | -----: |
| `p_scout`       | player  |  33.0 | 10.0 | 15.0 | 6.0 |    2.0 |
| `p_tank`        | player  |  33.0 | 12.0 | 10.0 | 9.0 |    2.0 |
| `e_guardiano_1` | sistema |  17.0 |  4.0 | 10.0 | 3.0 |    0.0 |
| `e_guardiano_2` | sistema |  17.0 |  4.0 | 10.0 | 3.0 |    0.0 |

### `enc_tutorial_04`

| Unit           | Side    | Power |   hp |  mod |  dc | traits |
| -------------- | ------- | ----: | ---: | ---: | --: | -----: |
| `p_scout`      | player  |  33.0 | 10.0 | 15.0 | 6.0 |    2.0 |
| `p_tank`       | player  |  33.0 | 12.0 | 10.0 | 9.0 |    2.0 |
| `e_lanciere`   | sistema |  28.0 |  5.0 | 15.0 | 6.0 |    2.0 |
| `e_corriere_1` | sistema |  16.0 |  3.0 | 10.0 | 3.0 |    0.0 |
| `e_corriere_2` | sistema |  16.0 |  3.0 | 10.0 | 3.0 |    0.0 |

### `enc_tutorial_05`

| Unit      | Side    | Power |   hp |  mod |   dc | traits |
| --------- | ------- | ----: | ---: | ---: | ---: | -----: |
| `p_scout` | player  |  43.0 | 12.0 | 20.0 |  9.0 |    2.0 |
| `p_tank`  | player  |  43.0 | 14.0 | 15.0 | 12.0 |    2.0 |
| `e_apex`  | sistema |  39.0 | 11.0 | 15.0 |  9.0 |    4.0 |

### `enc_tutorial_06_hardcore`

| Unit               | Side    | Power |   hp |  mod |   dc | traits |
| ------------------ | ------- | ----: | ---: | ---: | ---: | -----: |
| `p_scout_1`        | player  |  33.0 | 10.0 | 15.0 |  6.0 |    2.0 |
| `p_scout_2`        | player  |  33.0 | 10.0 | 15.0 |  6.0 |    2.0 |
| `p_scout_3`        | player  |  33.0 | 10.0 | 15.0 |  6.0 |    2.0 |
| `p_scout_4`        | player  |  33.0 | 10.0 | 15.0 |  6.0 |    2.0 |
| `p_tank_1`         | player  |  38.0 | 14.0 | 10.0 | 12.0 |    2.0 |
| `p_tank_2`         | player  |  38.0 | 14.0 | 10.0 | 12.0 |    2.0 |
| `p_support_1`      | player  |  37.0 | 11.0 | 15.0 |  9.0 |    2.0 |
| `p_support_2`      | player  |  37.0 | 11.0 | 15.0 |  9.0 |    2.0 |
| `e_apex_boss`      | sistema |  73.0 | 40.0 | 15.0 | 12.0 |    6.0 |
| `e_elite_hunter_1` | sistema |  33.0 |  9.0 | 15.0 |  9.0 |    0.0 |
| `e_elite_hunter_2` | sistema |  33.0 |  9.0 | 15.0 |  9.0 |    0.0 |
| `e_minion_1`       | sistema |  17.0 |  4.0 | 10.0 |  3.0 |    0.0 |
| `e_minion_2`       | sistema |  17.0 |  4.0 | 10.0 |  3.0 |    0.0 |
| `e_minion_3`       | sistema |  17.0 |  4.0 | 10.0 |  3.0 |    0.0 |

### `enc_tutorial_06_hardcore_quartet`

| Unit               | Side    | Power |   hp |  mod |   dc | traits |
| ------------------ | ------- | ----: | ---: | ---: | ---: | -----: |
| `p_scout_1`        | player  |  33.0 | 10.0 | 15.0 |  6.0 |    2.0 |
| `p_scout_2`        | player  |  33.0 | 10.0 | 15.0 |  6.0 |    2.0 |
| `p_scout_3`        | player  |  33.0 | 10.0 | 15.0 |  6.0 |    2.0 |
| `p_scout_4`        | player  |  33.0 | 10.0 | 15.0 |  6.0 |    2.0 |
| `e_apex_boss`      | sistema |  55.0 | 22.0 | 15.0 | 12.0 |    6.0 |
| `e_elite_hunter_1` | sistema |  33.0 |  9.0 | 15.0 |  9.0 |    0.0 |
| `e_elite_hunter_2` | sistema |  33.0 |  9.0 | 15.0 |  9.0 |    0.0 |
| `e_minion_1`       | sistema |  17.0 |  4.0 | 10.0 |  3.0 |    0.0 |
| `e_minion_2`       | sistema |  17.0 |  4.0 | 10.0 |  3.0 |    0.0 |
| `e_minion_3`       | sistema |  17.0 |  4.0 | 10.0 |  3.0 |    0.0 |

### `enc_tutorial_07_hardcore_pod_rush`

| Unit               | Side    | Power |   hp |  mod |   dc | traits |
| ------------------ | ------- | ----: | ---: | ---: | ---: | -----: |
| `p_scout_1`        | player  |  33.0 | 10.0 | 15.0 |  6.0 |    2.0 |
| `p_scout_2`        | player  |  33.0 | 10.0 | 15.0 |  6.0 |    2.0 |
| `p_tank_1`         | player  |  38.0 | 14.0 | 10.0 | 12.0 |    2.0 |
| `p_support_1`      | player  |  32.0 | 11.0 | 10.0 |  9.0 |    2.0 |
| `e_patrol_leader`  | sistema |  41.0 | 15.0 | 15.0 |  9.0 |    2.0 |
| `e_patrol_scout_1` | sistema |  21.0 |  6.0 | 10.0 |  3.0 |    2.0 |
| `e_patrol_scout_2` | sistema |  19.0 |  6.0 | 10.0 |  3.0 |    0.0 |
| `e_patrol_scout_3` | sistema |  19.0 |  6.0 | 10.0 |  3.0 |    0.0 |

## Notes & limits

- Action economy (1 BOSS vs N minion) **non** modellata: 1 boss da 50 power
  e 5 minion da 10 power dichiarano lo stesso enemy_power totale, ma giocano
  diversamente (focus-fire vs spread). Calibrazione finale resta empirica.
- DC contribuisce solo per la parte > 10 (proxy difensivo, non valore assoluto).
- Traits = +2 power flat per trait (placeholder; trait scaling profondo è in
  `data/balance/trait_mechanics.yaml`).
- Multipliers tunable in `tools/py/encounter_xp_budget.py::DIFFICULTY_MULTIPLIER`.

## Sources

- [Pathfinder Encounter Building](https://aonprd.com/Rules.aspx?ID=252)
- Agent: `.claude/agents/pcg-level-design-illuminator.md`
