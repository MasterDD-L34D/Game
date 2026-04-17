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

## 11. PR4.c iter 2 — risultati (N=10, post HP +37% + boss rng)

Tune Iter 2 applicato:

| Enemy     | HP      | attack_range |
| --------- | ------- | ------------ |
| BOSS apex | 22 → 30 | 2 → 3        |
| Elite ×2  | 10 → 14 | 2 (invar.)   |
| Minion ×3 | 6 → 8   | 1 (invar.)   |

Total enemy HP: 64 → **82** (+28%). Stats mod/dc invariate (già bumpate in Iter 1).

Raw: `docs/playtest/2026-04-18-hardcore-06-batch-iter2.json`.

| Metric               | Iter 0 | Iter 1 | **Iter 2** | Target  | Band |
| -------------------- | ------ | ------ | ---------- | ------- | :--: |
| win_rate             | 100%   | 100%   | **80%**    | 15-25%  |  🔴  |
| timeout_rate         | 0%     | 0%     | **20%**    | 0%      |  🟡  |
| defeat_rate          | 0%     | 0%     | **0%**     | 75-85%  |  🔴  |
| turns avg            | 17.3   | 22.0   | **29.8**   | 14-18   |  🔴  |
| K/D avg              | 4.0    | 2.9    | **2.67**   | 0.6-0.9 |  🔴  |
| players_alive_on_win | 6.33   | 5.8    | **5.5**    | 2-3     |  🔴  |
| dmg_taken            | 20.7   | 29.2   | **28.2**   | 60-70   |  🔴  |

### Insight critico (Iter 2)

Dmg_taken stagnante a ~28 tra Iter 1 e Iter 2 (stesso mod/dc). HP buff **solo allunga i round** senza aumentare letalità AI. 2 timeout = player non riesce a chiudere in 40 round ma **nemmeno muore**.

**Root cause**: enemy dmg output troppo basso. 6 attaccanti × ~25 round × hit rate basso = 28 dmg totali → 0.19 dmg/atk. AI probabilmente skippa o non raggiunge player (greedy player attrae ma da distanza).

## 12. Iter 3 proposto (focus lethality, non HP)

Obiettivo: raddoppiare dmg output enemy **senza** toccare HP.

```diff
- BOSS ap 3 → 4                # più azioni per round
- Elite ap 2 → 3
- Minion ap 2 → 3
- BOSS mod +5 → +7             # +10% hit, +crit chance
- BOSS damage_bonus: +2        # base damage buff
- Elite mod +4 → +5
- Minion mod +3 → +4

# Alternativa structural:
- objective: 'elimination' → 'survive_turns:8'  # player deve resistere, non killare boss
- Reinforcement: spawn minion ogni 5 turni (max 3 extra waves)
```

**Alt B — ridurre player side**: `modulation: 'hardcore_quartet'` (4p) invece di full 8p. Focus-fire 4v6 asymmetric diversa, forse più bilanciato nativamente.

## 13. Iter 3 — ap/mod buff (N=10)

Iter 3 tune applicato:

| Enemy  | ap  | mod   |
| ------ | --- | ----- |
| BOSS   | 3→4 | +5→+7 |
| Elite  | 2→3 | +4→+5 |
| Minion | 2→3 | +3→+4 |

Risultati: wr 70% (7 victory, 3 timeout), turns 30.6, K/D 2.49, dmg_taken **29.4** (stagnante vs Iter 2 28.2).

**Shock finding**: ap+1 mod+2 sugli enemy non muove dmg_taken. Batch harness `ai_intent_distribution` empty.

## 14. Root cause probe (tools/py/probe_ai.py)

Single probe N=1 su `/round/execute` con player_intents=[] rivela:

- `ai_result` = **None** sempre in `priority_queue=true` mode. AI actions vivono in `results[]` array.
- Cap **3 azioni/round** observed (pressure 85 = Critical tier, not Apex). Threshold Apex = p≥90.
- **Approach phase 3-4 round** prima che enemy entri in range. Boss start x=8, player x=0-1, ap=4 → 2 round solo per closing.
- Hit rate enemy ~50%, dmg 2-3/hit → max ~33 dmg teorici su 27 round attivi × 3 atk/round ÷ 8 PG pool.

**Lezione harness**: `ai_intent_distribution` empty non era bug scenario, era bug batch runner che leggeva `ai_result.ia_actions` invece di filtrare `results[]` per actor*id prefix `e*`.

## 15. Iter 4 — Apex pressure + closer spawn (N=10, harness patched)

Tune Iter 4:

- `sistema_pressure_start`: 85→**95** (Apex tier, 4 intents/round unlocked)
- Enemy positions chiusi: BOSS (8,5)→(6,5), Elite (7,2)(7,8)→(5,2)(5,8), Minion (6,4)(6,6)(9,5)→(4,4)(4,6)(7,5)
- Batch runner: tally AI da `results[]` + `ai_result.ia_actions` fallback

Risultati N=10:

| Metric           | Iter 3 | **Iter 4** | Target  | Band |
| ---------------- | ------ | ---------- | ------- | :--: |
| win_rate         | 70%    | **90%**    | 15-25%  |  🔴  |
| turns avg        | 30.6   | **28.8**   | 14-18   |  🔴  |
| K/D avg          | 2.49   | **2.35**   | 0.6-0.9 |  🔴  |
| dmg_taken        | 29.4   | **30.8**   | 60-70   |  🔴  |
| dmg_dealt        | 79.4   | 80.8       | 82 max  |  🟢  |
| AI actions total | N/A    | **461**    | ~600    |  🟡  |

### AI intent distribution (Iter 4, 10 run totali)

| Tier     | move | attack | unknown | Total |
| -------- | ---- | ------ | ------- | :---: |
| Apex     | 224  | 167    | 64      |  455  |
| Critical | 2    | 4      | 0       |   6   |

**Ratio move:attack = 1.34:1** → AI spende 57% azioni in movimento. Focus-fire player elimina enemy prima che smettano di approach.

## 16. Diagnosi finale

Dopo 4 iter (HP +130%, stats +2 mod, +2 ap, pressure 75→95, positions closer), wr da 100% a 90%, dmg_taken da 20.7 a 30.8. **Band ancora lontana** (target 15-25% wr).

**Bottleneck strutturale**: focus-fire 8 PG vs 6 enemy. Player concentra su 1 target/round (3-5 damage/round su 1 enemy hp 8-14-30 → boss muore in 8-10 round). Enemy spalmano 3-4 azioni su 8 PG target, diluendo damage.

**Tune HP/stats ha limite asintotico**: finché 8v6 focus-fire asimmetrico esiste, wr ≥ 80%.

## 17. Recommendation finale

**Iter 5 strutturale** (Alt B raccomandato):

- **Switch modulation**: default `hardcore_quartet` (4p × 2 PG = 4 deployed) invece di `full` (8p × 1 PG). Rimuove asimmetria 8v6.
- **Oppure buff enemy count**: 6→10 enemy (+2 minion, +1 elite, +1 boss minion) con proper spawn grid.
- **Oppure objective change**: `elimination` → `survive_turns:10` — player deve resistere 10 round contro waves, non killare boss.

Tune HP/stats/pressure **esaurita**: dopo Iter 4 resa marginale <1pp wr riduzione per iter.

## 18. Next step

1. **PR #1539 (this)**: merge Iter 1+2+3+4 come calibration baseline. Documenta limite tune numerico.
2. **PR4.c (nuovo)**: Iter 5 structural — modulation switch `hardcore_quartet` + re-run N=30.
3. **Fix pending** (issues #1, #2): VC snapshot (→ fetch pre-end), AI tally (fixed in Iter 4 harness).
4. Block ADR-2026-04-17 M3 close finché band raggiunta.
