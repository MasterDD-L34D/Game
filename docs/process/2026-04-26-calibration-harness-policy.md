---
title: Calibration harness policy — diagnostic, not merge gate
workstream: ops-qa
category: process
doc_status: draft
doc_owner: claude-code
last_verified: '2026-04-26'
source_of_truth: false
language: it
review_cycle_days: 90
tags:
  - calibration
  - balance
  - policy
  - process
  - m14-c
related:
  - docs/playtest/2026-04-26-M14-C-elevation-calibration.md
  - docs/adr/ADR-2026-04-20-damage-scaling-curves.md
  - docs/playtest/2026-04-18-hardcore-06-addendum-iter2-4.md
---

# Calibration Harness Policy — Diagnostic, Not Merge Gate

**Stato**: 🟡 DRAFT (M14-C follow-up, pending master-dd approval)  
**Trigger**: sessione 2026-04-26 iter3-iter5 hardcore_06 post-elevation = 30+ min di loop edit→backend→harness senza convergenza. User feedback: "stiamo perdendo un sacco di tempo".

## Problema

I 3 script `tools/py/batch_calibrate_hardcore*.py` sono usati come **merge gate implicito**: "scenario non in band = non mergi". Questo è scorretto per 4 motivi:

1. **Proxy greedy → human invalidato da ogni cambio feature**. Iter5B pre-elevation aveva constant greedy 20% ≈ human 15-25%. M14-C elevation ha introdotto `+30% / -15%` bidirezionale e la costante è rotta. Ogni nuova mechanic (pincer, weather, push) la romperà di nuovo.
2. **Costo per iterazione**: 9 min/batch N=10. 5 iter = 45 min per un signal ±15pp noise (1 sigma a N=10). Gli edge case richiedono N=30 = 27 min/iter.
3. **Metric sbagliata per diagnosi**: `win_rate` dice SE sei fuori band, non PERCHE'. Per il bug elevation M14-C la metrica corretta è `boss_hp_remaining_avg_on_loss` (survivability vs DPR distinction).
4. **Anti-pattern già parked**: ADR-2026-04-20 Phase F+G documenta "knob damage_multiplier exhausted" — iter6+iter7 1.4→1.8 con 0 effect su defeat_rate. Il loop è stato chiuso "structural fix M9", riaperto a ogni sprint che tocca combat.

## Policy

### 🟢 Harness = diagnostic tool

- Invocato **dopo** change significativo per vedere direzione (win up/down).
- N=10 è sufficiente per esplorazione (noise ±15pp, ok per decidere "direzione giusta o no").
- N=30 **solo quando pensi di essere già in band** — validation, non exploration.
- Output = input per decisione, non verdetto. RED ≠ blocco merge se direzione corretta.

### 🔴 Harness ≠ merge gate

- **NON** bloccare PR su `verdict: RED` greedy se:
  - AI regression `tests/ai/*.test.js` è verde (307/307)
  - Direzione del win_rate coerente con design intent
  - Scenario è flaggato `needs_playtest_tune` (nuovo field opzionale per scenari out-of-band)
- **SI** bloccare se:
  - AI regression fallisce
  - Scenario CRASH o test strutturale (units missing, normalize broken)
  - Scenario spec change rompe governance/contract ripple

### 🎯 Oracolo vero = playtest live umano

- **TKT-M11B-06 playtest live** (4 amici, TV + phone) è il solo gate definitivo per difficulty band
- Telemetry JSONL via `POST /api/session/telemetry` raccoglie win/defeat/time reali
- `playtest-analyzer` agent (`.claude/agents/playtest-analyzer.md`) elabora JSONL per identificare outliers
- Post-playtest → UN re-tune iter, non dieci

## Tooling da evolvere (backlog)

Research session 2026-04-26 — 3 agenti paralleli (balance-auditor + Explore + general-purpose) hanno identificato pattern industry-standard:

### P0 — Adopt Restricted Play pattern (Jaffe 2012 AIIDE)

**Rationale**: industry ha validato che single-policy greedy → human constant è inaffidabile. Lo standard è **multi-policy triangulation**:

- Random policy WR (noise floor)
- Greedy policy WR (ceiling locale)
- Lookahead-2 policy WR (tactical awareness)
- Strong policy WR (utility brain)

La banda `[random_WR, strong_WR]` definisce il **confidence interval** del human WR. Se la banda è larga → skill-dominated (posizionamento conta). Se stretta → luck-dominated (RNG domina, tune variance).

**Implementation stub** (~4h):

1. Extend `tools/py/batch_calibrate_hardcore*.py` con flag `--policy {random,greedy,lookahead2,utility}`
2. Report output = WR band + policy delta, non single `verdict`
3. Formula initiale human WR ≈ `greedy_WR × 0.55 + lookahead_WR × 0.45` (tunable post-TKT-M11B-06)

**Fonte**: [Jaffe, Evaluating Competitive Game Balance with Restricted Play, AIIDE 2012](https://homes.cs.washington.edu/~zoran/jaffe2012ecg.pdf); [Politowski, Assessing Video Game Balance using Autonomous Agents, IEEE CoG 2023](https://arxiv.org/abs/2304.08699).

### P0 — Promote `predictCombat()` a primary knob-tuning tool

`apps/backend/routes/sessionHelpers.js:171` — **enumera le 20 facce d20 in O(1)**, no HTTP roundtrip, no random sampling (deterministic analytic). Riserva `batch_calibrate_*.py` per regression integration (pre-PR), non per knob tuning (~9 min/iter eliminati per il 90% dei cambiamenti).

**Uso**: prima di ogni batch, calcola `predictCombat(actor, target, n=1000)` per:

- `hit_pct` — asymmetric hit rate (player vs enemy)
- `avg_pt` — damage tier expectations
- Check: `avg_dmg × rounds_avg > player_hp_pool` → config broken, skip batch.

**Fonte pattern**: community Fire Emblem (kagero-calc, 10k duels in browser), Long War 1 Airgame Simulator (Jorbs spreadsheet → 100k iter) — pattern "fast offline analytic → full engine only for integration".

### P1 — Composite metric (OpenRA-Bench pattern)

Sostituire `win_rate` single con weighted composite:

```
score = 0.50 × win_rate + 0.25 × kill_death_ratio + 0.25 × pe_earned_ratio
```

Elimina false positive "balanced" quando WR=40% ma una squadra sempre HP-starva. Nostre metriche già presenti: `boss_hp_remaining_avg_on_loss` (survivability), `kd_avg`, `dmg_dealt_avg`. ~3h.

**Fonte**: [OpenRA-Bench](https://github.com/yxc20089/OpenRA-Bench) + [OpenRA issue #21461](https://github.com/OpenRA/OpenRA/issues/21461).

### P1 — Smart policy via `utilityBrain.js`

`apps/backend/services/ai/utilityBrain.js` espone `selectAction(actions, actor, state, profile)` con `{selection: argmax|weighted_top3|random, noise: 0-1}`. Già wired opt-in per `ai_profile: aggressive`. Integrabile come terza policy nel Restricted Play triangulation (sopra).

### P2 — Telemetry = ground truth

`POST /api/session/telemetry` (JSONL batch, PR #1726) già disponibile. Agente `playtest-analyzer` legge JSONL per win/defeat/time reali da TKT-M11B-06. **Sim = scaffold, humans = ground truth**. Non tentare di sostituire playtest con simulation più sofisticata.

**Fonte**: XCOM/Long War community mods (Display Shot Chance, Xcom2eXcel save extractor), OpenRA replay files — tutti convergono su "live play telemetry" come final oracle.

### Anti-pattern documentati (NON fare)

- **Single greedy policy come human proxy** — explicitly rejected da Jaffe 2012 + Politowski 2023. Greedy WR rappresenta "weakest opponent ceiling", non human median.
- **Deep RL training per patch** — too slow (hours), solo per final metagame balance (arxiv 2006.04419).
- **Wesnoth `AI test scenarios`** — sono demo manuali, non batch WR. Forum thread `t=36293` conferma: components esistono, pipeline automated mai adottata.
- **XState `@xstate/test` per balance** — copre state-graph coverage, non WR. Usabile solo per `roundStatechart.js` correctness.
- **Monte Carlo multiplier sweep** — già parkato in ADR-2026-04-20 ("knob exhausted" iter6+7, 1.4→1.8 zero defeat_rate change).

## Decisioni immediate (questa sessione)

- **Ship iter4 hardcore_06** (BOSS mod 5→3, elite elevation→0) come best-available greedy config: `win_rate: 10%` (amber, 5pp from band 15-25%). Direzione giusta, non bloccante per PR merge.
- **Ship iter1 hardcore_07** (+1 scout, min_tier Calm, cooldown 1, leader HP 15): calibration non eseguita (costo/beneficio non giustificato). Direzione coerente con feedback iter0 (100% win = +70pp sopra band).
- **Rimuovi calibration dal critical path M14-C**: PR merge su AI 307/307 + governance verde. Calibration report pubblicato come diagnostic, non gate.
- **Backlog ticket P0 → P1**: wire smart policy (utilityBrain) come optional harness mode.

## Riferimenti

### Interni

- `tools/py/batch_calibrate_hardcore06.py` — batch harness current (da evolvere P0)
- `apps/backend/routes/sessionHelpers.js:171` — `predictCombat` analitico O(1)
- `apps/backend/services/ai/utilityBrain.js` — smart policy (integrabile Restricted Play)
- `tests/api/batchPlaytest.test.js` — Node-native batch (Jest)
- `docs/adr/ADR-2026-04-20-damage-scaling-curves.md` — iter6/7 parking doc
- `docs/playtest/2026-04-26-M14-C-elevation-calibration.md` — M14-C state

### Papers (academic)

- [Jaffe, Evaluating Competitive Game Balance with Restricted Play, AIIDE 2012](https://homes.cs.washington.edu/~zoran/jaffe2012ecg.pdf) — multi-policy triangulation
- [Politowski, Assessing Video Game Balance using Autonomous Agents, IEEE CoG 2023](https://arxiv.org/abs/2304.08699) — novice/pro/random triple
- [Volz, Feasibility of Automatic Game Balancing, 2016](https://arxiv.org/pdf/1603.03795)
- [Metagame Autobalancing for Competitive Multiplayer Games, 2020](https://arxiv.org/pdf/2006.04419)

### Repo di riferimento

- [OpenRA-Bench](https://github.com/yxc20089/OpenRA-Bench) — benchmark scaffold weighted composite
- [kagero-calc (Fire Emblem Heroes)](https://github.com/HertzDevil/kagero-calc) — static prob calculator
- [LW1-Airgame-Simulator](https://github.com/nucmatt/LW1-Airgame-Simulator) — Jorbs Long War spreadsheet port
- [OpenRA issue #21461](https://github.com/OpenRA/OpenRA/issues/21461) — "Way to test lots of AI battles"
