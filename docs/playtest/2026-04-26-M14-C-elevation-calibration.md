---
title: M14-C Elevation Populate + Calibration N=10 — Hardcore 06/07
workstream: combat
category: playtest
doc_status: active
doc_owner: claude-code
last_verified: '2026-04-26'
source_of_truth: false
language: it
review_cycle_days: 30
tags:
  - m14-c
  - playtest
  - calibration
  - elevation
  - triangle-strategy
  - hardcore-06
  - hardcore-07
related:
  - docs/planning/2026-04-26-next-session-handoff-M14-C.md
  - docs/planning/2026-04-25-M14-A-elevation-terrain.md
  - docs/research/triangle-strategy-transfer-plan.md
  - docs/playtest/2026-04-18-hardcore-06-calibration.md
---

# M14-C Elevation Populate + Calibration — Hardcore 06/07

## TL;DR

M14-C **populate scenarios** chiuso. Smoke test (+4 nuovi) verdi, AI regression 307/307
e services 177/177 invariati. Calibration harness N=10 hardcore 06 + hardcore 07
rivela che **elevation wire (M14-B) è operativo e misurabile**, ma ribalta le curve di
difficoltà esistenti. ~~HP/mod re-tune differito~~ → **shipped** in [PR #1744](https://github.com/MasterDD-L34D/Game/pull/1744) iter4 (10% WR amber, band 15-25%, gap 5pp). Vedi sezione Follow-up + policy doc.

## Scope delivered

### Scenari popolati

| Scenario                            | Unit                                   | Field                      |
| ----------------------------------- | -------------------------------------- | -------------------------- |
| `enc_tutorial_06_hardcore`          | `e_apex_boss`                          | `elevation: 1`             |
| `enc_tutorial_06_hardcore`          | `e_elite_hunter_1`, `e_elite_hunter_2` | `elevation: 1`             |
| `enc_tutorial_06_hardcore`          | 8 player PG                            | `elevation: 0` (esplicito) |
| `enc_tutorial_07_hardcore_pod_rush` | `e_patrol_leader`                      | `elevation: 1`             |
| `enc_tutorial_07_hardcore_pod_rush` | 4 player PG                            | `elevation: 0` (esplicito) |
| `enc_tutorial_03`                   | `e_guardiano_2`                        | `facing: 'N'` (flank test) |
| `enc_tutorial_04`                   | `e_lanciere`                           | `facing: 'S'` (flank test) |

### Fix runtime: `normaliseUnit` preserve `elevation`

`apps/backend/routes/sessionHelpers.js:65` pre-M14-C stripava `elevation`
durante `normaliseUnit`. Fix: clampa a integer (default 0) e passa attraverso
session state. Senza questa patch il multiplier Triangle Strategy wired in session.js
era effettivamente dead code per scenari.

## Smoke tests nuovi (+3)

`tests/api/hardcoreScenario.test.js` (pre-M14-C 4 test → 7 totali):

- `GET hardcore_06 raw units: BOSS + elite vantage = 1, player ground = 0`
- `POST session start preserva elevation attraverso normalization`
- `GET hardcore_07 patrol leader elevation=1 (vedetta)`

Plus regression sanity — tutorial 03/04/05 tutti verdi (batch N=10: 03/05 invariati
a livello macro, tutorial 04 + 10pp win per facing S flank nuovo).

## Calibration N=10

### Hardcore 06 (full 8p vs BOSS + 2 elite + 3 minion)

```
win_rate: 0.0% (target band hardcore class: 15-25%, vedi data/core/balance/damage_curves.yaml)
defeat_rate: 100.0%
turns_avg: 25 (max)
boss_hp_remaining_avg_on_loss: 30.6/40
dmg_dealt_avg: 39.4
dmg_taken_avg: 28
```

**Regressione vs baseline pre-M14-C**:

- iter0 (PR #1534): 84.6% win — tune iniziale
- iter1 (PR #1542): 96.7% win — damage spread PEGGIO
- iter2 (N=10 greedy, PR #1548 addendum): ~80% win — accepted con band greedy→umano
- **iter2 + M14-C elevation (questa PR)**: **0% win**

BOSS + elite a elevation 1 colpiscono con +30% multiplier su 8 ground players,
_mentre_ i player dal basso hanno penalty -15% sul ritorno. Doppio swing:
Apex single-source diventa tanto lethal quanto tanky. BOSS HP 40 → party lima
~10 prima di wipe.

**Interpretazione**: feature operativa, tuning invalidato. HP/mod re-tune differito
(fuori scope P0). Iter successiva deve:

- Ridurre BOSS HP 40→~25 (damage/round post-elevation player subisce 10-15)
- O rimuovere elevation dagli elite (keep BOSS only)
- O buffare player con `elevation: 0 → 1` su tank guardianite (TV elevato = 2p
  sui tank)

### Hardcore 07 (quartet 4p vs patrol 3 + pod reinforcement)

```
win_rate: 100.0% (target 30-50%)
defeat_rate: 0.0%
timeout_rate: 0.0%
rounds_avg: 10.1 (max 15, timer 10)
kd_avg: 3.0 (enemy:player)
timer_expire_rate: 0.0%
```

**Finding**: elevation su patrol leader (+1) non mitiga 3-vs-4 vantaggio iniziale.
Party elimina la pattuglia PRIMA che il timer rampi a Alert tier (cooldown 2 round
per spawn + min_distance 4). Reinforcement pool mai triggerato.

**Interpretazione**: feature operativa, tuning fragile. Iter successiva:

- Start enemy count 3→5 (include 1 pod già spawned)
- Abbassare `reinforcement_policy.cooldown_rounds: 2→1` + `min_tier: Alert→Calm`
- Patrol leader HP 12→16 per rallentare il wipe iniziale

## Gate di regressione

Verde:

- `node --test tests/ai/*.test.js` → **307/307**
- `node --test tests/services/*.test.js` → **177/177**
- `node --test tests/api/hardcoreScenario.test.js` → **7/7** (3 nuovi + 4 esistenti)
- Tutorial 03 batch → timeout-heavy invariato (facing N solo, no dmg change)
- Tutorial 04 batch → 70% → 80% win (+10pp da facing S flank, noise band accettabile per N=10)
- Tutorial 05 batch → 0/10 timeout invariato vs pre-M14-C

## Decisioni

1. **Merge as-is**: il popolate espone la meccanica. La regressione del win rate
   sui 2 scenari hardcore è il **segnale atteso** (prima: elevation era silenziato
   dal data strip in normaliseUnit; ora attivo). Validate che pipeline funziona.
2. ~~**HP/mod re-tune**: ticket di backlog~~ → **shipped** [PR #1744](https://github.com/MasterDD-L34D/Game/pull/1744) iter4 (research-backed: BOSS mod 5→3 compensa elevation +30% in arrivo, elite elevation rimossa). Calibration N=10 → 10% WR amber. Hardcore playable.
3. **Tutorial 05 elevation rolled back**: Apex + elevation 1 → 0/10 win (vs baseline
   0/10 timeout pre-M14-C). Identiche a livello macro (entrambi no-kill), ma il wire
   elevation **aumentava** HP residuo Apex 4.7 (baseline) → 7.3/18 (con elevation):
   player dal basso penalty -15% dmg + Apex elevato -30% dmg in arrivo = Apex più
   tanky e più lethal. Rollbackato per mantenere tuning esistente; Apex elevation
   reintroducibile post HP/mod re-tune.

## Follow-up (ticket backlog)

- ~~`TKT-M14-C-HARDCORE06-RETUNE`~~ → **CHIUSO** [PR #1744](https://github.com/MasterDD-L34D/Game/pull/1744) iter4 (BOSS `mod 5→3` compensa elevation; elite 1+2 `elevation 1→0`). Calibration N=10 → 10% WR (amber, band 15-25%, gap 5pp). Direzione corretta.
- ~~`TKT-M14-C-HARDCORE07-RETUNE`~~ → **CHIUSO** [PR #1744](https://github.com/MasterDD-L34D/Game/pull/1744) iter1 (+1 predone scout, `min_tier Alert→Calm`, `cooldown 2→1`, `patrol_leader.hp 12→15`).
- `TKT-M14-C-TUTORIAL05-ELEVATION` — re-introduce Apex elevation post
  HP/mod re-tune (probably HP 11→8 + apex ap 3→2).

> **Policy update 2026-04-26** — harness ≠ merge gate. Vedi [`docs/process/2026-04-26-calibration-harness-policy.md`](../process/2026-04-26-calibration-harness-policy.md) (Restricted Play multi-policy + `predictCombat` primary knob). Calibration RED non blocca merge se AI 307/307 verde + direzione coerente. Oracolo vero = `TKT-M11B-06` playtest live umano + telemetry JSONL.

## File impattati

- `apps/backend/routes/sessionHelpers.js` (elevation preserve in normaliseUnit)
- `apps/backend/services/hardcoreScenario.js` (elevation fields hardcore 06/07)
- `apps/backend/services/tutorialScenario.js` (facing variation tutorial 03/04)
- `tests/api/hardcoreScenario.test.js` (+4 smoke tests)
- `docs/playtest/2026-04-26-M14-C-hardcore06-calibration.json` (raw N=10 out)
- `docs/playtest/2026-04-26-M14-C-hardcore07-calibration.json` (raw N=10 out)
