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

## Harness artifacts (novel)

- `tools/py/probe_ai.py` — single-round probe, dumps `results[]` + `ai_result` shape. Usato per root cause. **Nuovo file in questo addendum.**
- `tools/py/batch_calibrate_hardcore06.py` — batch runner N-configurable. Già in main via PR #1542 con retry exponential backoff. Il mio branch aveva fix tally AI da `results[]` (priority_queue-aware) ma non propagato per evitare conflict.

## Issue backlog (novel, non in main report)

1. **AI tally batch runner** — `ai_result.ia_actions` sempre null in `priority_queue=true` mode. Fix: filtrare `results[]` per `actor_id` prefix `e_`. (priority: medium per future calibration)
2. **VC scores null post-`/end`** — `/api/session/:id/vc` ritorna `{mbti:null, ennea:null, aggregate:null}`. Fix: fetch PRIMA di `/end` o estendere VC snapshot in `publicSessionView`. (priority: medium)
3. **Pressure tier threshold documentation** — non documentato che pressure>=90 sblocca 4 intents/round. Aggiungere a `docs/hubs/combat.md` o session engine comments. (priority: low)
4. **Approach phase ≥3 round** — ogni scenario wastes 3 round in closing distance. Fix: scenario designer può usare closer spawn positions OR AI gets "charge" bonus first round. (priority: low)

## Riferimenti

- [Calibration iter 0+1 (main report)](./2026-04-18-hardcore-06-calibration.md)
- [PR #1539 closed](https://github.com/MasterDD-L34D/Game/pull/1539) — superseded by PR #1542 + this addendum
- [ADR-2026-04-17 co-op scaling](../adr/ADR-2026-04-17-coop-scaling-4to8.md)
