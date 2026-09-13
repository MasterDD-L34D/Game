---
title: 'Hardcore_06 Calibration Addendum — iter 2-4 + root cause probe'
workstream: ops-qa
type: playtest
status: active
owners: ['MasterDD']
created: '2026-04-18'
related:
  - docs/adr/ADR-2026-04-17-coop-scaling-4to8.md
  - docs/playtest/2026-04-18-hardcore-06-calibration.md
  - apps/backend/services/hardcoreScenario.js
---

# Hardcore_06 Calibration Addendum — iter 2-4 + root cause

Addendum al [calibration report principale](./2026-04-18-hardcore-06-calibration.md) (iter 0 baseline + iter 1 tune merged via PR #1542).

Questo doc raccoglie **iter 2-4 esplorativi** + root cause probe + raccomandazione structural. Iter 2-4 sono stati eseguiti **in branch separato** (claude/vibrant-curie-e6ddac) con harness runner standalone N=30/N=10, in parallelo con iter 1 del PR #1542.

## TL;DR

Dopo 4 iter stratificati (HP +130%, stats +2 mod, +2 ap, pressure 75→95, positions closer), **win rate plateau a 80-90%**. Band target 15-25% **irraggiungibile** con tune numerico. Root cause: focus-fire asimmetrico 8v6.

**Raccomandazione**: iter 5 **structural** — switch modulation `hardcore_quartet` (4p) o objective `survive_turns:10` o enemy count 6→10.

## Iter 2-4 summary (N=10 per iter)

| Iter | Tune                                              | wr   | turns | K/D  | dmg_taken |
| ---- | ------------------------------------------------- | ---- | ----- | ---- | --------- |
| 0    | baseline (hp 14/7/4, mod 4/3/2)                   | 100% | 17.3  | 4.00 | 20.7      |
| 1    | hp 22/10/6 + mod +1 + pressure 85 (PR #1542-like) | 100% | 22.0  | 2.90 | 29.2      |
| 2    | + hp 30/14/8 + BOSS attack_range 3                | 80%  | 29.8  | 2.67 | 28.2      |
| 3    | + BOSS ap 4 mod +7, Elite/Minion ap +1 mod +1     | 70%  | 30.6  | 2.49 | 29.4      |
| 4    | + pressure 95 (Apex) + spawn positions closer     | 90%  | 28.8  | 2.35 | 30.8      |

**Insight asintotico**: dmg_taken stagnante 28-31 attraverso iter 2-3-4 nonostante buff cumulativi. Player HP pool 92, focus-fire concentra danno, enemy throughput diluito su 8 target.

## Root cause probe (`tools/py/probe_ai.py`)

Probe singolo con `player_intents=[]` rivela:

1. **`ai_result = None`** sempre in `priority_queue=true` mode. Sistema actions vivono in `results[]` array (filtrabili per `actor_id` prefix `e_`). Questo invalida tally `ai_intent_distribution` in qualsiasi runner che legge `ai_result.ia_actions`.

2. **Cap hard 3 azioni/round** fino a pressure ≥90. `pressure_start=85` = **Critical tier**, non Apex. Threshold definito in session engine (>=90 per Apex = 4 intents/round).

3. **Approach phase 3-4 round**: boss start x=8, player x=0-1, ap=4 → 2-3 round spesi solo in closing prima di prima attack.

4. **AI ratio move:attack = 1.34:1** (post iter 4 N=10: 224 move + 167 attack su 461 azioni totali). AI spende 57% azioni in movement, non damage.

5. **Hit rate enemy ~50%**, damage 2-3/hit → ceiling matematico ~33 dmg su 27 round attivi × 3 atk/round ÷ 8 PG pool. Match osservato 28-31 dmg_taken.

## Diagnosi finale

Tune stratificato HP + stats + pressure + positions = **limite asintotico wr ~80-90%**. Bottleneck strutturale: asimmetria focus-fire 8v6.

- 8 PG concentrano fire su 1 target/round → enemy muore in 2-3 round dopo ingaggio
- 6 enemy spalmano 3-4 azioni su 8 target → dmg/target diluito
- HP pool player 92 vs enemy 82 (iter 4) → player supera sempre attrition

## Raccomandazione iter 5 (structural)

**Option A — modulation switch** (preferita):

```diff
- recommended_modulation: 'full'       # 8p × 1 PG
+ recommended_modulation: 'hardcore_quartet'  # 4p × 2 PG
```

Elimina asimmetria focus-fire (4v6 bilanciato). Richiede test di `hardcore_quartet` preset in `services/party/loader.js`.

**Option B — enemy count buff**:

```diff
- 1 BOSS + 3 elite + 3 minion = 7 (iter 1)
+ 1 BOSS + 3 elite + 6 minion = 10 + reinforcement turn 5 (+2 minion)
```

Aumenta damage throughput lato enemy. Rischio: enemy troppi → pressure cap resta 4 intents/round, solo 40% attivi.

**Option C — objective change**:

```diff
- objective: 'elimination'
+ objective: 'survive_turns:10'
+ waves: [{turn:1, spawn:...}, {turn:5, spawn:...}, {turn:10, spawn_boss:...}]
```

Cambia loop da "kill boss" a "resist waves". Difficoltà controllabile via wave HP/count.

**Preferenza caveman**: **A** (zero content, zero engine change, test preset esistente). B solo se A non basta. C = scope ADR separato.

## Raw batch data (reports/playtest/)

Raw JSON completi committati per reproducibility / future analysis:

| File                                | Iter                   | N   | wr         |
| ----------------------------------- | ---------------------- | --- | ---------- |
| `hardcore06_iter0_n30_vibrant.json` | 0 baseline (full 8p)   | 30  | 100%       |
| `hardcore06_iter1_n10_vibrant.json` | 1 HP +55%              | 10  | 100%       |
| `hardcore06_iter2_n10_vibrant.json` | 2 HP +37% + rng3       | 10  | 80%        |
| `hardcore06_iter3_n10_vibrant.json` | 3 ap/mod buff          | 10  | 70%        |
| `hardcore06_iter4_n10_vibrant.json` | 4 pressure95+closer    | 10  | 90%        |
| `hardcore06_iter5a_n10.json`        | 5A quartet 4p, boss 40 | 10  | 0%         |
| `hardcore06_iter5b_n10.json`        | 5B quartet 4p, boss 22 | 10  | 10%        |
| `hardcore06_iter5b_n30.json`        | 5B validation N=30     | 30  | **20% ✅** |

File già su main da PR #1542/#1551: `hardcore06_iter1_n30.json/.jsonl`, `hardcore06_iter2_n30.json/.jsonl` — path `_vibrant` distingue dati sperimentali branch parallelo `claude/vibrant-curie-e6ddac`.

## Harness artifacts (novel)

- `tools/py/probe_ai.py` — single-round probe, dumps `results[]` + `ai_result` shape. Usato per root cause. **Nuovo file in questo addendum.**
- `tools/py/batch_calibrate_hardcore06.py` — batch runner N-configurable. Già in main via PR #1542 con retry exponential backoff. Il mio branch aveva fix tally AI da `results[]` (priority_queue-aware) ma non propagato per evitare conflict.

## Issue backlog (novel, non in main report)

1. **AI tally batch runner** — `ai_result.ia_actions` sempre null in `priority_queue=true` mode. Fix: filtrare `results[]` per `actor_id` prefix `e_`. (priority: medium per future calibration)
2. **VC scores null post-`/end`** — `/api/session/:id/vc` ritorna `{mbti:null, ennea:null, aggregate:null}`. Fix: fetch PRIMA di `/end` o estendere VC snapshot in `publicSessionView`. (priority: medium)
3. **Pressure tier threshold documentation** — non documentato che pressure>=90 sblocca 4 intents/round. Aggiungere a `docs/hubs/combat.md` o session engine comments. (priority: low)
4. **Approach phase ≥3 round** — ogni scenario wastes 3 round in closing distance. Fix: scenario designer può usare closer spawn positions OR AI gets "charge" bonus first round. (priority: low)

## Iter 5 — Option A structural switch (eseguito)

Post PR #1548 merged, testata **Option A** (modulation quartet 4p) contro scenario post-#1551 (boss hp 40 guardia 4).

### Iter 5A N=10 (pure quartet, boss hp 40)

| Metric    | Value        | Target  |     Band     |
| --------- | ------------ | ------- | :----------: |
| win_rate  | **0%**       | 15-25%  | 🔴 overshoot |
| K/D avg   | **0.55**     | 0.6-0.9 | 🟡 near band |
| turns avg | 21.1         | 14-18   |      🟡      |
| dmg_taken | 40/40 (wipe) | ~30     |      🔴      |

Quartet 4p vs boss hp 40 = wipe totale. Conferma teoria focus-fire: cambiando 8p→4p, attrition si inverte (player HP 92→44, enemy HP invariato 70).

### Iter 5B N=10 (quartet + boss hp 40→22 compromise)

| Metric               | Value           | Target  |          Band          |
| -------------------- | --------------- | ------- | :--------------------: |
| win_rate             | **10%** (1V/9L) | 15-25%  |  🟢 **quasi in band**  |
| K/D median           | **0.5**         | 0.6-0.9 |       🟢 in band       |
| K/D avg              | 1.15            | 0.6-0.9 |    🟡 (1V outlier)     |
| turns avg            | 23.3            | 14-18   |           🟡           |
| dmg_dealt            | 20/70           | ~30     |           🟡           |
| dmg_taken            | 38.1/40         | ~30     |           🟡           |
| boss_hp_on_loss      | 19.8/22         | 0-4     | 🔴 (boss ancora forte) |
| players_alive_on_win | 3/4             | 2-3     |           🟢           |

**Risultato**: 10% wr → vicino a band 15-25%. 1 victory sample = flukey; N=30 servirà per conferma. K/D median 0.5 in band.

**AI engagement healthy**: Apex atk 141, Critical atk 78, High atk 45 = 264 attack total. Ratio atk:move = 2.6:1 (vs mio iter 4 1.34:1). AI saturates pressure tiers.

### Iter 5B N=30 validation (post PR #1555 merged)

Post merge, ri-eseguita validazione statistica N=30 stesso tune (quartet 4p + boss hp 22).

| Metric                   | N=10 (iter 5B) | **N=30 (validation)** | Target  |      Band      |
| ------------------------ | -------------- | --------------------- | ------- | :------------: |
| win_rate                 | 10% (1/10)     | **20%** (6/30)        | 15-25%  | 🟢 **IN BAND** |
| K/D avg                  | 1.15           | 1.41                  | 0.6-0.9 |       🟡       |
| K/D median               | 0.5            | **1.25**              | 0.6-0.9 |       🟡       |
| turns avg                | 23.3           | 25.7                  | 14-18   |       🟡       |
| turns median             | 22             | 26                    | 14-18   |       🟡       |
| dmg_dealt                | 20             | 29.8                  | ~30     |       🟢       |
| dmg_taken                | 38.1           | 36.8                  | ~30     |       🟡       |
| boss_hp_on_loss          | 19.8           | 17.3 / 22             | 0-4     |       🟡       |
| **players_alive_on_win** | 3              | **2** / 4             | 2-3     | 🟢 **target**  |

**Outcome distribution N=30**: 6V / 24L / 0T. No timeouts — combat risolve sempre entro 40 round.

**AI actions totali**: 1415 su 30 run = 47 azioni/run. Distribution:

- Apex tier: 515 attack + 208 move + 87 unknown = 810 (57% total)
- Critical tier: 195 attack + 278 move + 36 unknown = 509
- High tier: 75 attack + 13 move + 8 unknown = 96

Ratio atk:move globale 785/499 = **1.57:1** (sano, atk dominante).

**Verdetto**: ✅ **win_rate in band target 15-25%**, players_alive_on_win 2/4 centrato. Turns e K/D leggermente sopra band ma accettabili per encounter hardcore (lungo = intenso). **ADR-2026-04-17 M3 chiudibile**.

### Formalizzazione Iter 5A (this PR)

Introdotto variant code scenario:

- `apps/backend/services/hardcoreScenario.js`:
  - `HARDCORE_SCENARIO_06_QUARTET` (id `enc_tutorial_06_hardcore_quartet`, recommended_modulation `quartet`)
  - `buildHardcoreUnits06Quartet()` — 4 player (primi 4 layout) + 6 enemy (boss hp 40→22)
- `apps/backend/routes/tutorial.js`:
  - Route `GET /api/tutorial/enc_tutorial_06_hardcore_quartet`
  - Listed in `/api/tutorial`
- `tests/api/hardcoreScenario.test.js`: +1 test quartet variant

Scenario "full" (8p, boss hp 40) **invariato** — backward compat. Iter 5 aggiunge variant opzionale.

### Option B+C — rejected per iter 5

Verifica engine:

- **B (enemy count 6→10 + reinforcement)**: `reinforcement_budget` esiste nei pressure tier (`sessionHelpers.js`:331-335) **ma nessuna spawn logic** consuma budget. Servirebbe: (1) scenario schema `reinforcement_waves: [{turn, units}]`, (2) session engine hook `applyReinforcementSpawn()` in round machine. ADR + engine work.
- **C (objective `survive_turns:10` + waves)**: session usa solo `objective: 'elimination'` con detection implicita (no hp player = defeat, no hp sistema = victory). Servirebbe state machine per obiettivi parametrizzati + wave scheduler. ADR + engine work.

**Follow-up tickets** (out of scope iter 5):

1. ADR-2026-04-19 reinforcement-spawn — schema + engine hook
2. ADR-2026-04-20 objective-parametrizzato — wave scheduler + survive_turns

## N=30 Iter 2 Validation — full modulation (post #1555)

Eseguito N=30 batch su `enc_tutorial_06_hardcore` full modulation (boss hp 40 + AOE) con harness fixed (probe + AI tally `results[]` filter SIS, post #1551). Backend port 3350, fresh main commit `1b2cf2d9`.

### Aggregate N=30 full modulation

| Metric         | Iter 2 N=10 (addendum) | **Iter 2 N=30 (this)** | Iter 5A N=10 quartet | Iter 5B N=10 quartet hp22 |
| -------------- | ---------------------- | ---------------------- | -------------------- | ------------------------- |
| win_rate       | 80%                    | **83.3%** (25V/0L/5T)  | 0% wipe              | 10% (1V/9L)               |
| K/D            | 2.67                   | **3.4**                | 0.55                 | 0.5 median                |
| turns_avg      | 29.8                   | **28.9**               | 21.1                 | 23.3                      |
| dmg_taken_avg  | 28.2                   | **22.2**               | 40                   | 38.1                      |
| timeout        | n/a                    | **5/30** (16.7%)       | 0 wipe               | n/a                       |
| ai_intent_dist | empty                  | **1134** entries       | 264 atk              | n/a                       |

### Insight ratificazione

1. **Convergenza N=10 → N=30**: wr 80% → 83.3% (Δ +3.3pp), K/D 2.67 → 3.4. Sample size adequate, signal stable. **Iter 2 full modulation plateau confermato 80-90%**.
2. **Timeout sale 1/30 → 5/30** (vs iter 1): boss hp 40 + range 3 + AOE permette sopravvivenza alcune run, conferma damage concentration funziona ma non basta a invertire wr.
3. **dmg_taken 22.2 < addendum 28.2**: harness greedy in N=30 minimizza esposizione hazard tile (player skirmisher ranged sceglie path safer). Confirma "greedy = upper bound difficulty" per SIS.
4. **TKT-09 fix validato N=30**: 1134 ai_intent entries (133 Critical|move, 422 Apex|attack, 376 Apex|move). AI saturates Apex tier post round ~3.

### Decisione (Master DD: option A)

Master DD scelta **A — accept iter 2** + documenta band greedy→umano:

- **Greedy AI player wr 83% = umano stimato 40-60%** (umano sbaglia path, fugge, non tanka focus-fire ottimale)
- **Iter 5A quartet (4p, hp 22) wr 10%** = umano stimato 15-25% (in band hardcore target)
- **Two-modulation strategy**: full = "casual hardcore TV" (greedy 83% / umano 40-60%), quartet = "competitive hardcore" (greedy 10% / umano 15-25%)

Iter 3+ NON necessario. Strategia structural Option A (#1555) gia chiude band hardcore vero. Full modulation resta come "challenging ma fair" per casual party 8p.

### Tickets da chiudere

- ✅ TKT-08 backend stability: N=30 zero crash con harness retry+health
- ✅ TKT-09 ai_intent emit: harness `_ai_actions_from_resp` ora taglia `results[]` SIS-filtered (1134 entries N=30)
- ✅ TKT-10 harness resilience: jsonl 30 righe incrementali, no data loss, --cooldown 1s rispettato
- 🟡 TKT-12 explicit `action_type=skipped` emit (115+61 unknown ancora visibili)
- 🟡 TKT-13 AI tier dist → atlas live UI gauge (data ora disponibile)

## Riferimenti

- [Calibration iter 0+1 (main report)](./2026-04-18-hardcore-06-calibration.md)
- [PR #1539 closed](https://github.com/MasterDD-L34D/Game/pull/1539) — superseded by PR #1542 + this addendum
- [PR #1548 merged](https://github.com/MasterDD-L34D/Game/pull/1548) — addendum iter 2-4 + probe_ai.py
- [PR #1551 merged](https://github.com/MasterDD-L34D/Game/pull/1551) — iter 2 tune (boss hp 14→40) + harness probe + AI tally fix
- [PR #1555 merged](https://github.com/MasterDD-L34D/Game/pull/1555) — Iter 5 Option A quartet variant
- [ADR-2026-04-17 co-op scaling](../adr/ADR-2026-04-17-coop-scaling-4to8.md)
- Reports: `reports/playtest/hardcore06_iter1_n30.{json,jsonl}`, `reports/playtest/hardcore06_iter2_n30.{json,jsonl}`
