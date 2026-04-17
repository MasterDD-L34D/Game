---
title: Master DD Tutorial Sweep — 2026-04-17
workstream: ops-qa
status: active
owner: master-dd
last_review: 2026-04-17
tags: [playtest, tutorial, balance, vc-scoring]
---

# Master DD Tutorial Sweep — 2026-04-17

Analisi log sessioni tutorial `enc_tutorial_01..05`. 20 candidati filtrati, 11 run sostanziali, 4 smoke-test scartati, 1 incompleto. Scenario inferito da composizione nemici + hazard (nessun `scenario_id` esplicito persistito — vedi Note).

## Sintesi

| Scenario                             | Run (ts)                                       | Outcome           | Turni | Dmg+ | Dmg- | Win atteso |    Win reale |
| ------------------------------------ | ---------------------------------------------- | ----------------- | ----: | ---: | ---: | ---------: | -----------: |
| tutorial_01 (2 nomad)                | 213743, 210939, 201341, 202551, 205353, 214532 | 4 WIN / 2 partial |   2–4 | 8–20 |  0–7 |        80% |    67% (4/6) |
| tutorial_02 (hunter+2 nomad)         | 214630                                         | WIN (2/3 kill)    |     4 |   28 |    5 |        80% | incomplete\* |
| tutorial_03 (2 guardiano + fumarole) | 214101                                         | partial (1/2)     |     3 |    9 |    3 |        50% |   0% (1 run) |
| tutorial_04 (3 misti + pozza_acida)  | 214246                                         | WIN (3/3 kill)    |     4 |   18 |    2 |        30% | 100% (1 run) |
| tutorial_05 (e_apex boss)            | 214431                                         | WIN               |     5 |   12 |    4 |        20% | 100% (1 run) |

\* outcome WIN inferito (ultimo nemico vivo con HP basso, no session_end persistito).

Sample size critico: solo tutorial_01 ha N sufficiente (6 run). 02/03/04/05 = 1 run ciascuno → **no statistical power**.

## Dettaglio per scenario

### tutorial_01 — 2 nomadi (pressure_start ~0)

- **6 run**: 213743, 210939, 201341, 202551, 205353, 214532
- **Composition**: `e_nomad_1`, `e_nomad_2` (HP 8 ciascuno da `tutorialScenario.js`)
- **Turni medi**: 2.8 (range 2–4)
- **Dmg+ medio**: 12.3 · **Dmg- medio**: 3.0 · **TTK**: ~5 dmg/turno player
- **Kill rate**: 4/6 run completati entrambi i kill, 2/6 kill parziali (incompleto o timeout log)
- **Status applicati**: nessuno
- **Abilities**: `dash_strike` usata in 2/6 run (1 hit / 1 miss), `evasive_maneuver` in 1/6 (1 hit)
- **Pressure trajectory**: non persistita negli event
- **AI intents**: nessun event `ai_intent` o tier log presente

### tutorial_02 — hunter elite + 2 nomadi (inferito)

- **1 run**: 214630
- **Composition**: `e_hunter`, `e_nomad_1`, `e_nomad_2`
- **Turni**: 4 · Dmg+: 28 · Dmg-: 5 · Kill: hunter + nomad_1 (nomad_2 non killato in log ma dmg_total alto)
- **Abilities**: `dash_strike` hit (7 dmg singolo colpo — outlier), `evasive_maneuver` miss
- **Note**: sistema elite sotto-performante (solo 5 dmg in 4 turni vs 3 attaccanti).

### tutorial_03 — 2 guardiani + fumarole tossica (inferito da hazard)

- **1 run**: 214101
- **Composition**: `e_guardiano_1`, `e_guardiano_2`, hazard `fumarole_tossica`
- **Turni**: 3 · Dmg+: 9 · Dmg-: 3 · Kill: guardiano_2
- **Abilities**: `dash_strike` hit, `evasive_maneuver` miss
- **Hazard**: 2 tick fumarole in 3 turni — danno ambientale limitato
- **Outcome**: incompleto (guardiano_1 vivo a fine log, ma player HP ~teoricamente ok)

### tutorial_04 — 3 misti (corriere+lanciere) + pozza_acida (inferito)

- **1 run**: 214246
- **Composition**: `e_corriere_1`, `e_corriere_2`, `e_lanciere`, hazard `pozza_acida`
- **Turni**: 4 · Dmg+: 18 · Dmg-: 2 · Kill: **tutti e 3**
- **Status applicati**: `bleeding` x2 (da player contro nemici — trait effect)
- **Abilities**: `dash_strike` miss (prima azione, roll 7 vs DC 12, MoS -5)
- **Outcome**: WIN pulita — dmg sistema irrisorio (2) contro win atteso 30%. **Over-tuned player side o pressure_start non applicato.**

### tutorial_05 — e_apex (boss, inferito)

- **1 run**: 214431
- **Composition**: `e_apex` (1 boss)
- **Turni**: 5 · Dmg+: 12 · Dmg-: 4 · Kill: apex
- **Abilities**: nessuna (attack base only)
- **Outcome**: WIN in 5 turni, dmg- solo 4. Win atteso 20%, reale 100%. **Boss sotto-dimensionato.**

## Osservazioni bilanciamento

1. **Tutorial_01 win rate 67% ≈ 80% atteso**: OK entro noise su N=6. Turni medi 2.8 basso → encounter risolvibile rapidamente, design intent match.
2. **Tutorial_04 / 05 win rate 100% (N=1 ciascuno) vs atteso 30/20%**: outlier forte. Ipotesi:
   - `pressure_start` 75/95 non applicato al roll AI (bug orchestrator round).
   - DC difensiva nemici (e_apex, e_corriere) troppo bassa.
   - Player composition (`dune_stalker skirmisher` + `vanguard`) over-tuned per tier early.
3. **Dmg- medio cross-scenario**: 3.3 complessivi → sistema fa troppo poco damage. Rapporto dmg+/dmg- = 4.5:1.
4. **Abilities hit rate**: `dash_strike` 3 hit / 3 miss = 50% (d20 baseline ok). `evasive_maneuver` 2 hit / 2 miss = 50%.
5. **Status system sottoutilizzato**: solo `bleeding` osservato (2 istanze), nessun panic/stunned/focused/confused/rage/fracture in 11 run. **AI Sistema non usa abilities con status-apply**, o trait non hanno branch reattivo acceso.

## Issue candidate

- **TKT-01: [telemetry] persist scenario_id + pressure_start in primo event**. Oggi inferenza da enemy IDs — fragile quando encounter condividono creature base. Fix: emettere event `scenario_start` a inizio sessione con `scenario_id`, `pressure_start`, `enemy_roster`, `map_id`.
- **TKT-02: [telemetry] persist session outcome**. Nessun event `session_end` / `victory` / `defeat` nei 11 log. Fix: hook su `/turn/end` quando faction_hp==0 → append `{action_type:'session_end', outcome:'win|loss|wipe', turns, dmg_player, dmg_sistema}`.
- **TKT-03: [balance] tutorial_04/05 over-player-favored**. Win rate 100% vs atteso 30/20%. Fix: audit `e_apex.dc_attack` e `e_corriere.hp`, verificare che `pressure_start` 75/95 moduli `attack_mod` sistema in `declareSistemaIntents`.
- **TKT-04: [AI] Sistema non applica status**. 11 run, 0 panic/stunned/rage applicati da sistema. Fix: verificare `ai_intent_scores.yaml` pesi su `apply_status` vs `basic_attack`; considerare minimum_floor per status-intent.
- **TKT-05: [VC] nessun VC score persistito**. Event `vc_score` assente in tutti i log. Fix: su `/turn/end` con faction eliminata, chiamare `vcScoring.compute()` e append event `{action_type:'vc_score', mbti, ennea, aggregates}`.

## Calibration hints VC

**Dati insufficienti**. `vcScoring.js` richiede 20+ raw metrics aggregate, ma nessun event `vc_score` persistito. Metriche raw deducibili dai log esistenti:

- `attacks_made` per player (derivabile): tank ~3/run, scout ~3/run
- `damage_dealt_ratio`: player/sistema = 4.5:1 (cross-scenario)
- `movement_turns`: 30–40% action index
- `ability_usage_rate`: ~20% azioni (dash_strike/evasive_maneuver)

Threshold suggeriti (prelim, da validare post-TKT-05):

- MBTI S/N: `ability_usage_rate > 30%` → N (planner), < 15% → S (reactor). Attuale 20% = borderline.
- Ennea 8 (aggressor): `damage_dealt_ratio > 3` + `attacks_made > 5/run` → valido nei dati.
- Ennea 6 (cautious): `retreat_moves > 1` + `evasive_maneuver > 0` → scout in 3/11 run.

## Note metodologiche

**Dati mancanti nei log:**

1. `scenario_id` / `encounter_id` esplicito → **inferito** da roster nemici e hazard (tutorial_01 confermato da `tutorialScenario.js`; 02–05 da pattern composition, confidenza bassa).
2. `pressure_start` e `pressure` per-turno → **assenti**. Impossibile verificare se tier pressure effettivamente applicato.
3. `ai_intent` events (expected: intent score/tier dump per decisione AI) → **assenti**. Impossibile verificare distribution attack/approach/retreat/skip.
4. `session_end` / `outcome` → **assente**. Outcome WIN inferito da presenza `kill` events su tutti i nemici roster.
5. VC score finale → **assente**. Endpoint `/:id/vc` forse non chiamato o risultato non persistito in events array.
6. `faction_hp` tracking → assente. Player HP deducibile solo da `target_hp_before/after` quando target è player.

**Remediation prioritaria** (in ordine): TKT-01 (scenario_id) → TKT-05 (VC persist) → TKT-02 (outcome persist). Con questi 3 fix, questo report diventerebbe affidabile e riproducibile via script su ogni sweep futuro.

**Sample size**: tutorial_01 N=6 (accettabile per smoke), 02/03/04/05 N=1 (pilota singolo). Per balance calibration servirebbero ≥10 run per scenario.
