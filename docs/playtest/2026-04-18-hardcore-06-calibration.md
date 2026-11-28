---
title: 'Hardcore_06 Calibration Batch — iter 0 baseline'
workstream: ops-qa
type: playtest
status: active
owners: ['MasterDD']
created: '2026-04-18'
related:
  - docs/adr/ADR-2026-04-17-coop-scaling-4to8.md
  - apps/backend/services/hardcoreScenario.js
---

# Hardcore_06 Calibration — iter 0 baseline (PR #1534 baseline)

## TL;DR

`enc_tutorial_06_hardcore` baseline (boss hp 14, 2 elite hp 7, 3 minion hp 4) **TROPPO FACILE**. Win rate 84.6% (target 15-25%), turns avg 32 (target 14-18). Tune iter1 proposto: boss hp +50%, +1 elite, eventuale -1 player support.

## Setup

- Scenario: `enc_tutorial_06_hardcore`
- Modulation: `full` (8p × 1 PG, grid 10×10)
- Pressure start: 75 (Critical tier)
- Player policy: greedy nearest-enemy (skirmisher minion-first, boss last)
- AI policy: data-driven `aggressive` profile (Utility brain ON)
- Harness: `tools/py/batch_calibrate_hardcore06.py`
- Backend port: 3340
- Run target: N=30
- **Run effettivi: N=13** (backend morì al run #14, EADDRINUSE/crash inspiegato)

## Aggregate (N=13)

| Metric                    | Value                 | Target |           Status           |
| ------------------------- | --------------------- | ------ | :------------------------: |
| **win_rate**              | 84.6% (11V / 0L / 2T) | 15-25% |  🔴 **+59pp out of band**  |
| **boss_kill_rate**        | 84.6%                 | n/a    |             —              |
| **turns_avg**             | 32.2                  | 14-18  |      🔴 **+14 above**      |
| **turns_median**          | 33                    | —      |             —              |
| **turns_min**             | 23                    | —      |             —              |
| **turns_max**             | 41 (timeout)          | —      |             —              |
| **players_alive_avg**     | 5.4 / 8               | 4-6    |         🟢 in band         |
| **boss_hp_remaining_avg** | 0.6 / 14              | 5-9    | 🔴 boss muore quasi sempre |

## Per-run

| #   | Outcome | Rounds | Boss HP | Players Alive |
| --- | :-----: | -----: | ------: | ------------: |
| 1   |    V    |     30 |       0 |             5 |
| 2   |    V    |     27 |       0 |             6 |
| 3   |    V    |     23 |       0 |             5 |
| 4   |    V    |     33 |       0 |             5 |
| 5   |    V    |     32 |       0 |             5 |
| 6   |    V    |     23 |       0 |             5 |
| 7   |    V    |     27 |       0 |             5 |
| 8   |  **T**  |     41 |       2 |             6 |
| 9   |    V    |     35 |       0 |             7 |
| 10  |  **T**  |     41 |       6 |             5 |
| 11  |    V    |     35 |       0 |             5 |
| 12  |    V    |     37 |       0 |             6 |
| 13  |    V    |     34 |       0 |             5 |

(V=victory, T=timeout MAX_ROUNDS=41, L=defeat)

## Diagnosi

1. **Player swarm overwhelms BOSS**: 8 player vs 1 boss + 5 enemies → focus-fire + aggro-spread = boss muore prima di 1-shottare nessuno
2. **Boss hp 14 troppo basso**: 8 player @ ~3 dmg/turn × 2-3 round in range = 50-70 dmg/round potenziale → kill in ~5-8 round se tutti convergono
3. **Player_alive_avg 5.4** indica boss/elite uccidono ~3 player ma non bastano (5 sopravvivono)
4. **Turn count 32** non per difficoltà ma per **movement overhead 8p su grid 10x10**: 2-3 round per posizionarsi
5. **2 timeout**: anche quando boss sopravvive, player non muoiono (T=41 con boss hp 2/6, players 5-6)

## Bias N=13 (vs N=30 target)

- Sample piccolo ma signal extreme (84.6% vs 15-25% target = 4 stdev fuori band con tipica binomial p=0.2)
- Anche se i restanti 17 fossero tutti L/T, win_rate min = 11/30 = 36.7% → ancora fuori band
- Conclusione: tune è giustificato senza completare N=30

## Tune iter1 proposto

| Stat                   | Iter 0 |   Iter 1   | Δ       | Razionale                             |
| ---------------------- | :----: | :--------: | ------- | ------------------------------------- |
| `e_apex_boss.hp`       |   14   |   **22**   | +57%    | Sopravvivere 8-12 round invece di 5-8 |
| `e_apex_boss.mod`      |   4    |     4      | 0       | Mantenere offensive output            |
| `e_apex_boss.guardia`  |   2    |   **3**    | +1      | Più dmg reduction                     |
| `e_elite_hunter_*.hp`  |   7    |   **9**    | +29%    | Sopravvivere 1 round in più           |
| Add `e_elite_hunter_3` |   —    | hp 9 mod 3 | +1 unit | Spread aggro player                   |
| `e_minion_*.hp`        |   4    |     4      | 0       | Restano fragili, OK                   |
| Player count           |   8    |     8      | 0       | Mantenere full modulation test        |

**Target post-tune**: win_rate 25-40% (band leggermente più larga), turns avg 18-24, boss_hp_remaining_avg 3-6 on win, player_alive_avg 3-5.

Iter2 conditional (se iter1 ancora >50% win): +1 minion, boss mod 4→5, hazard tiles damage 1→2.

## Backlog tickets

- **TKT-08**: backend stability under batch load — investigare crash al run #14, valutare keep-alive / health endpoint / restart loop
- **TKT-09**: ai_intent_distribution e dmg_dealt/taken per-actor non emessi via /round/execute — script aggregava 0 per `ai_intent_distribution` (vuoto). Verifica `ai_result.ia_actions` shape canonical
- **TKT-10**: harness resilience — script crasha su connection refused, dovrebbe retry+resume (write JSONL incrementale)
- **TKT-11**: predict_combat boss vs full party 8p — sanity check teorico danno aggregato per-round

## Action items

- [ ] PR4.b: applica tune iter1 in `apps/backend/services/hardcoreScenario.js`
- [ ] Re-run N=30 batch dopo TKT-08 (+ TKT-10) risolti
- [ ] Update sprint context CLAUDE.md con calibration arc
