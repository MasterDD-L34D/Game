---
title: 'Hardcore 06 — Calibration Batch N=30'
slug: 2026-04-18-hardcore-06-calibration
status: draft
owner: ai
workstream: ops-qa
created: 2026-04-18
tags: [playtest, calibration, encounter, hardcore, adr-2026-04-17]
summary: 'Batch calibration enc_tutorial_06_hardcore (PR #1534) — 30 run greedy policy, scenario fuori band (wr 100% vs target 15-25%).'
---

# Hardcore 06 — Calibration Batch N=30 (2026-04-18)

**Scenario**: `enc_tutorial_06_hardcore` — "Cattedrale dell'Apex" (PR [#1534](https://github.com/MasterDD-L34D/Game/pull/1534))
**Policy player**: greedy (atk closest, priority minion→elite→boss, move+atk 2 AP)
**Harness**: `tools/py/batch_calibrate_hardcore06.py` → `POST /api/session/round/execute` (priority_queue=true, ai_auto=true)
**Runtime**: 1249s / 30 run = 41.6s/run
**Raw**: `docs/playtest/2026-04-18-hardcore-06-batch.json`

## 1. Aggregate (30 run)

| Metric                        | Reale        | Target  | Δ              | Band |
| ----------------------------- | ------------ | ------- | -------------- | :--: |
| win_rate                      | **100%**     | 15-25%  | **+75..+85pp** |  🔴  |
| turns avg                     | 17.3         | 14-18   | 0              |  🟢  |
| turns median / stdev          | 16.5 / 4.53  | —       | —              |  —   |
| turns range                   | 11-34        | —       | —              |  —   |
| K/D player (kills/deaths)     | **4.0 avg**  | 0.6-0.9 | **+3.1..+3.4** |  🔴  |
| K/D median                    | 3.0          | —       | —              |  —   |
| players_alive_avg (on win)    | 6.33 / 8     | ~2-3    | +3..+4         |  🔴  |
| players_dead_avg              | 1.67 / 8     | ~5-6    | -3..-4         |  🔴  |
| dmg_dealt player avg          | 40 (=max)    | ~30-40  | 0              |  🟢  |
| dmg_taken player avg          | 20.7 / 92 HP | ~60-70  | -40..-50       |  🔴  |
| boss_hp_remaining avg on loss | N/A (0 loss) | 0-4     | —              |  ⚫  |
| pressure_final                | 100 (Apex)   | 100     | 0              |  🟢  |

**Esito**: scenario troppo facile — policy greedy 1-PG wipe garantito.

## 2. Istogramma turns

```
11-15 [##########]                10
16-20 [################]          16
21-30 [###]                        3
31-40 [#]                          1
```

Moda = 16-20 (53%). Long tail (run 4 = 34 turni) = runaway con minion che sopravvivono, ma comunque win.

## 3. Analisi band

### Win rate fuori banda (100% vs 15-25%)

Root cause:

- **Totale HP enemy = 40** vs **totale HP player = 92** → player ha 2.3x HP pool.
- Attack range player skirmisher = 1 (default), ma greedy + grid 10x10 = fire-lane pulita dopo 3-4 round.
- Boss hp 14, mod +4, dc 14 — stesso range di elite tutorial_05 (hp 11). "Hardcore" non scala oltre +3 HP sul boss.
- Elite hunter hp 7 (same as tutorial_03 elite). Minion hp 4 = 1-shot con crit/MoS alto.
- Focus-fire 8 PG su boss → boss muore in ~3-4 turni dopo engagement (round 8-12).

### Turns in banda (17.3 vs 14-18)

Dura ok (target rispettato) ma solo perché movimento 6-8 celle è lento — non perché enemy resista.

### K/D fuori banda (4.0 vs 0.6-0.9)

Enemy uccidono solo 1.67 player su 8 (21%). Target: 5-6 player dead (62-75%).

## 4. AI intent distribution

`ai_intent_distribution` = vuoto nel tally. Bug minore nel batch runner (chiave non matchata o `ai_result.ia_actions` out-of-shape). Non blocca calibrazione. TODO followup: inspect `/round/execute` response shape, verify `ai_result.ia_actions` vs `ai_result.iaActions`.

## 5. VC scores

`GET /api/session/:id/vc` ritorna `{mbti:null, ennea:null, aggregate:null}` post-batch. Possibile causa: endpoint chiamato dopo `/end` (session deleted). Fix: chiamare VC **prima** di `/end`. Non blocca calibrazione hardcore.

## 6. Raccomandazioni tune (PR4.b)

Target calibrazione: wr 15-25%, dmg_taken ~60-70, players_alive_on_win ~2-3.

### Iter 1 — HP buff enemy (stima wr ~50-60%)

```diff
- BOSS apex   hp 14 → 22  (+8,  +57%)
- Elite hunt  hp  7 → 10  (+3,  +43%)
- Minion nom  hp  4 →  6  (+2,  +50%)
= Total enemy HP: 40 → 62 (+55%)
```

### Iter 2 — Stat buff enemy (stima wr ~25-35%)

```diff
- BOSS mod   +4 → +5      (+1, ~+5% hit rate)
- BOSS dc    14 → 15      (+1, -5% player hit rate)
- Elite mod  +3 → +4
- Elite dc   13 → 14
- Minion mod +2 → +3
```

### Iter 3 — Pressure / AI aggressiveness (stima wr ~15-25%)

```diff
- pressure_start 75 → 85   (Apex tier earlier → 3 intents/round + swarm unlocked)
- BOSS ai_profile: aggressive → aggressive_boss (focus-fire più lontani, charge)
- Add minion reinforcement: turn 5 → spawn 1 minion at (9,5)
```

### Iter 4 (opzionale) — Boss trait

```diff
+ BOSS traits: ['martello_osseo', 'ferocia', 'grido_territoriale']  # AoE fear → panic status → skip turn
+ BOSS attack_range: 2 → 3  (contro kite)
```

**Proposta**: applicare Iter 1+2+3 in **PR4.b** come singolo batch tune, ri-run N=30, aggiustare fine.

## 7. Issue candidate (backlog)

1. **AI intent tally empty** — verificare shape `ai_result.ia_actions` nel response `/round/execute`. Batch runner non tally correttamente. (priority: low)
2. **VC scores null post-session** — `/api/session/:id/vc` chiamato dopo `/end` ritorna null. Spostare fetch prima di end, o estendere VC con snapshot in `publicSessionView`. (priority: medium)
3. **Enemy HP baseline sotto-dimensionato** — boss hp 14 = elite tutorial_03. Serve scaling rule: `boss_hp = tutorial_n * 1.5 + 4` tipo. (priority: high, blocker PR4.b)
4. **Focus-fire 8v6 asimmetria** — 8 PG che concentrano su boss vincono sempre. Design: forzare split via AoE threat / hazard espanso / objective secondari. (priority: medium)
5. **Pressure progression troppo lenta per scala** — pressure_start=75 non basta a rendere AI letale su 8 PG. Scale pressure_start con `deployed_count`. (priority: medium)

## 8. Calibration hints VC thresholds

Dati MBTI/Ennea non disponibili (issue #2 sopra). Re-run dopo fix VC snapshot.

## 9. PR4.b iter 1 — risultati (N=10, post Iter 1+2+3 applied)

Tune applicato in `apps/backend/services/hardcoreScenario.js`:

| Enemy     | HP    | mod   | dc    |
| --------- | ----- | ----- | ----- |
| BOSS apex | 14→22 | +4→+5 | 14→15 |
| Elite ×2  | 7→10  | +3→+4 | 13→14 |
| Minion ×3 | 4→6   | +2→+3 | 11→12 |

`pressure_start`: 75→85 (Apex tier).

Raw: `docs/playtest/2026-04-18-hardcore-06-batch-iter1.json`.

| Metric               | Iter 0 (baseline) | Iter 1 (tune) | Target  | Band |
| -------------------- | ----------------- | ------------- | ------- | :--: |
| win_rate             | 100%              | **100%**      | 15-25%  |  🔴  |
| turns avg            | 17.3              | **22.0**      | 14-18   |  🔴  |
| K/D avg              | 4.0               | **2.9**       | 0.6-0.9 |  🔴  |
| players_alive_on_win | 6.33              | **5.8**       | 2-3     |  🔴  |
| dmg_taken            | 20.7              | **29.2**      | 60-70   |  🔴  |
| dmg_dealt            | 40                | **60** (=max) | 60      |  🟢  |

Iter 1 alza difficulty (dmg taken +40%, pa -9%) ma scenario ancora troppo facile per policy greedy 8v6. Serve Iter 2 più aggressivo.

## 10. Iter 2 proposto (PR4.c)

Player HP pool = 92, enemy HP = 64. Gap ancora 1.44x. Target ~1.05x.

```diff
- BOSS hp 22 → 30   (+36%)
- BOSS attack_range 2 → 3
- BOSS traits: + 'grido_territoriale' (AoE panic → skip turn)
- Elite hp 10 → 14 (+40%)
- Minion hp 6 → 8 (+33%)
= Total enemy HP: 64 → 88 (+37%)
```

Pressure reinforcement: spawn +1 minion at turn 4 (pos 8,5) via sistema spawn event.

Oppure: ridurre player side (modulation `hardcore_quartet` 4p invece di full 8p) → rimuove asimmetria focus-fire.

## 11. Next step

1. **PR4.b (this)**: merge Iter 1 tune anche se ancora fuori band — stabilisce baseline iter 1 e raccoglie data.
2. **PR4.c**: Iter 2 (HP +37%, boss AoE, reinforcement) o modulation switch. Re-run N=30.
3. Parallel: fix VC snapshot + AI tally bug (issues #1, #2).
4. Close ADR-2026-04-17 M3 quando band target raggiunta.
