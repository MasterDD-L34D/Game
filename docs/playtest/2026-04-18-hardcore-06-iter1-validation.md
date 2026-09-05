---
title: 'Hardcore_06 Iter 1 validation N=30 + iter 2 tune proposal'
workstream: ops-qa
type: playtest
status: active
owners: ['MasterDD']
created: '2026-04-18'
related:
  - docs/playtest/2026-04-18-hardcore-06-calibration.md
  - apps/backend/services/hardcoreScenario.js
  - apps/play/src/sfx.js
---

# Hardcore_06 Iter 1 validation N=30 + iter 2 tune

## TL;DR

Iter 1 (PR #1542: boss hp 14→22, +1 elite) **PEGGIORA il bilancio**: win rate 84.6%→96.7%. Splitting damage source consente al party 8p di gestire aggro distribuito. Iter 2 servirà damage concentrato (single boss buffed) invece che distribuito. Telemetria AI ora completa (TKT-09 fix validato).

## Setup

- Scenario: `enc_tutorial_06_hardcore` (post PR #1542 iter 1)
- Boss hp 22, 3 elite hp 9, 3 minion hp 4, pressure_start 75
- Harness: `tools/py/batch_calibrate_hardcore06.py` (post PR fix probe + retry + AI metric)
- Backend port: 3350 (fresh main)
- N=30, cooldown 1s, jsonl incrementale

## Iter 1 Aggregate (N=30)

| Metric                       | Iter 0 (N=13) | **Iter 1 (N=30)**     | Target  |             Status              |
| ---------------------------- | ------------- | --------------------- | ------- | :-----------------------------: |
| **win_rate**                 | 84.6%         | **96.7%** (29V/0L/1T) | 25-40%  | 🔴 **+57pp ancora out of band** |
| **turns_avg**                | 32.2          | **24.0**              | 18-24   |           🟢 in band            |
| **turns_median**             | 33            | **21**                | —       |                —                |
| **K/D player**               | 2.0           | **4.07**              | 0.6-0.9 |        🔴 **+3.4 worse**        |
| **dmg_dealt**                | 82            | **60.8**              | —       |     meno danno per vincere      |
| **dmg_taken**                | 34.5          | **23.9**              | —       |      player tankano meglio      |
| **players_alive_avg_on_win** | 5             | **6.1**               | 3-5     |     🔴 troppi sopravvivono      |
| **timeout_count**            | 2/13          | **1/30**              | —       |                —                |

**Iter 1 worse than iter 0**. Tune sbagliato direzionalmente.

## Telemetry AI (NUOVA — TKT-09 fix)

`ai_intent_distribution` ora popolato (PR fix harness `_ai_actions_from_resp` legge da `results[]` filter SIS):

| Tier                 | Action       |    Count |
| -------------------- | ------------ | -------: |
| Apex                 | attack       |      433 |
| Apex                 | move         |      241 |
| Apex                 | skip/unknown |      117 |
| Critical             | move         |      133 |
| Critical             | attack       |       17 |
| Critical             | skip/unknown |       60 |
| **Total AI actions** |              | **1001** |

Insight:

- Apex tier dominates (player wipe presto += 95% pressure ramp)
- Apex attack 433 vs Critical attack 17 → AI offensive principalmente in fase late-game
- ~18% skip/unknown — AI sceglie skip (cornered/out of range) o action_type non mappato

## Diagnosi (perché iter 1 backfire)

1. **Damage spread > damage concentrato** per party 8p: 3 elite + boss hp 22 totali 49 hp da abbattere; vs iter 0 con 2 elite + boss hp 14 = 28 hp totali — meno hp ma single boss tankava più focus-fire
2. **Aggro spread = K/D ↑**: con 4 target distinti (boss + 3 elite), tank player rotano e nessun PG single-target subisce pressione critica. Boss da solo concentrava fire.
3. **Hp 22 boss insufficiente vs 8p × 3 dmg/turn × 5+ round in range**: 8 × 3 × 5 = 120 potenziale, abbondante per kill
4. **Players_alive 6.1/8** = solo 1.9 morti per match → wipe quasi mai

## Iter 2 tune proposal

**Strategia**: damage SINGLE-SOURCE concentrato + AOE pressure passiva.

| Stat                          |      Iter 1      |     **Iter 2**     | Δ       | Razionale                                     |
| ----------------------------- | :--------------: | :----------------: | ------- | --------------------------------------------- |
| `e_apex_boss.hp`              |        22        |       **40**       | +82%    | Single tank-target hp = focus-fire test reale |
| `e_apex_boss.mod`             |        4         |       **5**        | +1      | Più dmg per attacco (target 4-5 dmg/hit)      |
| `e_apex_boss.guardia`         |        3         |       **4**        | +1      | -1 dmg vs hit (cumula con hp +18)             |
| `e_apex_boss.attack_range`    |        2         |       **3**        | +1      | Anti-kiting: scout out of range hard          |
| `e_apex_boss.traits`          | martello+ferocia | +`ondata_psichica` | +AOE    | Single-target boss + AOE proc su crit         |
| **Remove `e_elite_hunter_3`** |    (3 elite)     |     (2 elite)      | -1 unit | Concentra threat su boss                      |
| `e_elite_hunter_*.hp`         |        9         |         9          | 0       | OK                                            |
| `e_minion_*.hp`               |        4         |         4          | 0       | OK fragili                                    |
| `pressure_start`              |        75        |       **85**       | +10     | Critical→Apex fast (4 intents/round earlier)  |
| `hazard_tiles` damage         |        1         |       **2**        | +1      | Pozzanghere più letali (multi-tick danno)     |

**Target post-iter 2**: win_rate 30-50% (band larga, hardcore = challenging non impossible), turns 16-22, K/D 1.0-1.5, players_alive_on_win 4-5.

Iter 3 conditional (se ancora >60%): aggiungi 2° boss minore (mini-boss), ridurre starting AP player a 1 round 1.

## Validazioni indirette

- ✅ TKT-08 backend stability: N=30 senza crash (vs iter 0 N=14 crash). Harness retry+health probe funziona.
- ✅ TKT-09 ai_intent_distribution emit: 1001 entries vs 0 iter 0. Fix `_ai_actions_from_resp` validato.
- ✅ TKT-10 harness resilience: jsonl write incrementale OK (30 righe), --cooldown 1s rispettato.
- ✅ Probe rule: N=1 verbose dump prevenuto re-run su shape sbagliata. Tempo: 8s probe vs 28 min batch errato.

## Backlog tickets nuovi

- **TKT-12**: `result.action_type` per skipped events (ora "unknown") — backend dovrebbe emettere `action_type='skipped'` esplicito
- **TKT-13**: AI tier distribution → atlas live (gauge UI mostra "X% Apex moves" come indicator difficoltà)
- **TKT-14**: predict_combat aggregato boss vs party 8p (TKT-11 spec) per iter 2 sanity check pre-batch

## Action items

- [ ] Iter 2 tune in `apps/backend/services/hardcoreScenario.js`
- [ ] Re-batch N=30 iter 2 → validate band raggiunta
- [ ] Se iter 2 ancora >50% → iter 3 mini-boss + AP reduction
