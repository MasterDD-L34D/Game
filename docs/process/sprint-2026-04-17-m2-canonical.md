---
title: Sprint 2026-04-17 M2 — Ability Executor + SoT Canonical Alignment
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-04-17'
source_of_truth: false
language: it
review_cycle_days: 90
---

# Sprint 2026-04-17 M2 — Ability Executor + SoT Canonical

**Seconda sessione giornaliera post-playtest M1+M2**. Da "ability spec in YAML + discovery endpoint" a "18/18 effect_type live + canonical round model allineato SoT end-to-end".

**16 PR mergiati** (#1498-#1527 range, 10 backend + 4 test + 2 docs).

## Scope

Dopo playtest #1+#2 (PR #1485, #1502) — che hanno rivelato 7 FRICTION e confermato ability executor missing — questa sessione chiude il gap tra spec e runtime:

1. **Ability executor** (FRICTION #4): 0 → 18/18 effect_type supportati
2. **SoT canonical round model** (ADR-2026-04-15): endpoint `/round/execute` + priority queue
3. **FRICTION residue** (#6, #7): effective_reach discoverability + effect_trigger semantics
4. **AP canonical** (ap_max=2): tutorial 02-05 allineati
5. **CLI playtest tool** (master_dm.py): REPL canonical syntax → batch endpoint
6. **Polish** (squadCombo flake, kill chain, aggro_warning, reaction cap)

## PR mergiati (16)

| #   | PR    | Categoria    | Cosa                                                       |
| --- | ----- | ------------ | ---------------------------------------------------------- |
| 1   | #1498 | fix          | apBudget flake (drain via move, 10/10 verdi)               |
| 2   | #1499 | feat         | Ability executor MVP (4 effect_type)                       |
| 3   | #1500 | feat         | Iter2 (+6 effect_type + stat bonus wiring)                 |
| 4   | #1501 | feat         | Iter3 (+7: shield/aoe/team/reaction stub)                  |
| 5   | #1503 | feat         | FRICTION #6 effective_reach + #7 effect_trigger            |
| 6   | #1504 | feat         | Iter4 reaction triggers (intercept + overwatch INTO range) |
| 7   | #1505 | feat         | Iter5 aggro_pull (taunt, 18/18 effect_type)                |
| 8   | #1506 | feat         | Iter6 polish (kill chain, aggro_warning, reaction cap)     |
| 9   | #1510 | feat (SoT)   | `/round/execute` batch endpoint                            |
| 10  | #1511 | balance      | Tutorial 02-05 ap_max=2 canonical                          |
| 11  | #1513 | feat (tools) | CLI master_dm.py REPL + 10/10 parser test                  |
| 12  | #1518 | balance      | M3 automated validation + tune T04/T05                     |
| 13  | #1521 | fix          | squadCombo flake (combo metadata su hit damage=0)          |
| 14  | #1522 | test         | roundExecute scenario harness (proof canonical)            |
| 15  | #1525 | feat (SoT)   | Priority queue canonical in /round/execute                 |
| 16  | #1527 | feat (SoT)   | CLI + harness default priority_queue=true                  |

## Stato sistema — prima vs dopo

### Ability System

|                         | Prima           | Dopo                                             |
| ----------------------- | --------------- | ------------------------------------------------ |
| Effect type supportati  | 0               | **18/18 (100%)**                                 |
| Reaction trigger system | stub            | live (intercept INTO + overwatch INTO range)     |
| Stat bonus wiring       | hardcoded       | attack_mod_bonus + defense_mod_bonus in resolver |
| Kill chain on intercept | no              | sì (emit kill + assist)                          |
| Reaction cap per actor  | unlimited stack | **1** (re-arm sostituisce)                       |
| aggro_pull AI respect   | no              | sì (declareSistemaIntents override)              |

### Round Model Canonical

|                           | Prima                    | Dopo                                                   |
| ------------------------- | ------------------------ | ------------------------------------------------------ |
| `/round/execute` endpoint | mancante                 | attivo                                                 |
| Priority queue            | sequential               | canonical (initiative + action_speed - status_penalty) |
| AI intent mix             | post-hoc via /turn/end   | inline in queue (canonical)                            |
| End-of-round ticks        | in handleTurnEndViaRound | inline quando priority_queue=true                      |
| AP budget validation      | per-action               | cumulativo per-actor (batch)                           |

### AP Budget SoT

|                       | Prima | Dopo                            |
| --------------------- | ----- | ------------------------------- |
| Tutorial 01 player ap | 3     | 3 (eccezione documentata easy)  |
| Tutorial 02 player ap | 3     | **2 canonical**                 |
| Tutorial 03 player ap | 3     | **2 canonical**                 |
| Tutorial 04 player ap | 3     | **2 canonical** + enemy hp tune |
| Tutorial 05 player ap | 3     | **2 canonical** + Apex hp 9→11  |

### Tools + Testing

|                        | Prima    | Dopo                         |
| ---------------------- | -------- | ---------------------------- |
| CLI playtest assistant | mancante | `tools/py/master_dm.py` REPL |
| Test ability executor  | 0        | 34/34 verdi                  |
| Test round/execute     | 0        | 12/12 (6 base + 6 priority)  |
| Test canonical harness | 0        | 1/1 (N=10 scenario)          |
| squadCombo flake       | ~10% CI  | **0** (50/50 verdi)          |

## Balance M3 automated validation (post ap=2)

N=30 aggregate (3×N=10) su tutorial 02-05 via legacy `/action` harness:

| Tutorial        | Win rate | Band target | Status                  |
| --------------- | -------- | ----------- | ----------------------- |
| T02 Pattuglia   | 73%      | 60-70%      | 🟡 +3pt variance        |
| T03 Caverna     | 57%      | 40-50%      | 🟡 +7pt pending         |
| T04 Pozza Acida | **33%**  | 30-45%      | ✅ centrato (post tune) |
| T05 BOSS Apex   | **~20%** | 15-30%      | ✅ in band (post tune)  |

Canonical harness (priority_queue=true) su T02: **100% win** (player initiative vantage). Richiede human playtest + eventuale tuning initiative enemy.

## Friction log — stato finale

| Friction                         | Origine        | Stato | Soluzione                               |
| -------------------------------- | -------------- | ----- | --------------------------------------- |
| #1 Move syntax                   | playtest #1    | ✅    | Canonical syntax in 11-REGOLE_D20_TV.md |
| #2 AP budget                     | playtest #1    | ✅    | Libero spending `Σ ≤ ap_max`            |
| #3 2 attack stessi turno         | playtest #1    | ✅    | By-design, doppio attack valido         |
| #4 Ability executor              | playtest #1+#2 | ✅    | 18/18 effect_type live                  |
| #5 AP vincola N attack post-move | playtest #2    | ✅    | By-design, tutorial educa               |
| #6 Effective reach               | playtest #2    | ✅    | Esposto in GET /api/jobs/:id            |
| #7 Effect trigger on_hit/always  | playtest #2    | ✅    | Schema opt-in `effect_trigger`          |

**7/7 FRICTION risolte o accettate.**

## Canonical flow end-to-end

```
Master DM (tavolo) leggendo fogli player
    ↓
tools/py/master_dm.py REPL (canonical syntax)
    ↓
POST /api/session/round/execute
  { player_intents: [...], ai_auto: true, priority_queue: true }
    ↓
apps/backend/routes/session.js /round/execute handler:
  1. Validate AP budget cumulativo
  2. declareSistemaIntents (pure) → AI intents
  3. Merge player + AI in unified queue
  4. Sort: initiative + action_speed - status_penalty
  5. Tiebreak: actor_id asc, declaration order asc
  6. Dispatch in priority order (attack/move/ability)
  7. End-of-round inline: bleeding tick, AP reset, status decay, bonus clear
  8. turn++
    ↓
Response: { results[] (player+AI), events[], state }
    ↓
master_dm.py print + state table + outcome detect
    ↓
Master DM traduce result in fogli player
```

Coerente con [ADR-2026-04-15](../adr/ADR-2026-04-15-round-based-combat-model.md) (source_of_truth: true): planning phase cooperativa simulata via batch, resolve ordered by reaction speed passive, determinismo tiebreak.

## Test health

- `tests/api/abilityExecutor.test.js`: 34/34 (18 effect_type + 4 FRICTION + 6 polish + 3 intercept/overwatch + 3 aggro_pull)
- `tests/api/roundExecute.test.js`: 6/6 (batch, AP, ability dispatch, empty, invalid)
- `tests/api/roundExecutePriorityQueue.test.js`: 6/6 (default, sort, penalty, tiebreak, AI mix, ticks)
- `tests/api/roundExecuteScenarioHarness.test.js`: 1/1 (N=10 canonical)
- `tests/api/apBudget.test.js`: 3/3 (drain via moves)
- `tests/api/squadCombo.test.js`: 2/2 (50/50 su 10 iter loop, 0 flake)
- `tests/api/tutorial02-05.test.js`: 4/4 (batch harness legacy)
- `tests/test_master_dm_parser.py`: 10/10 (canonical syntax parser)
- `tests/ai/*.test.js`: 197/197

**Totale test: 260+ verdi**. CI clean senza admin override post squadCombo fix.

## Roadmap M3 (prossima sessione)

### Human-driven playtest M3 — bloccante

- Valida canonical flow tabletop con `master_dm.py` + `priority_queue=true`
- Subjective rating (narrativa, leggibilità, pacing)
- VC/MBTI data live vs automated batch
- Decide se canonical 100% win su T02 è bug o feature

### Balance refinement

- Se priority queue 100% win persiste → tuning enemy initiative (+5-10 per competere con player 15)
- Se T02/T03 canonical band persistentemente off → tune mod enemy o HP
- T04/T05 post-tune da ri-validare human side

### Tech debt (non-blocking)

- Interceptor death NON triggera kill chain su priority queue path (solo legacy flow)
- master_dm.py preview mode (preview_only body flag)
- VC scoring analysis N=30 canonical data (MBTI/Ennea distribution)

### Nice-to-have

- Migrazione batch harness legacy `tutorial02-05.test.js` a `/round/execute` canonical
- Dashboard TV per visualizzare round results in real-time (Mission Console integration)

## Cross-ref

- ADR canonical: [`ADR-2026-04-15-round-based-combat-model.md`](../adr/ADR-2026-04-15-round-based-combat-model.md)
- SoT: [`docs/core/11-REGOLE_D20_TV.md`](../core/11-REGOLE_D20_TV.md) §"Batch execution" + §"AP budget canonico"
- Ability spec: [`data/core/jobs.yaml`](../../data/core/jobs.yaml)
- Ability executor: [`apps/backend/services/abilityExecutor.js`](../../apps/backend/services/abilityExecutor.js)
- Round execute: [`apps/backend/routes/session.js`](../../apps/backend/routes/session.js) `/round/execute` endpoint
- Playtest previous: [`docs/playtests/2026-04-17/notes.md`](../playtests/2026-04-17/notes.md), [`docs/playtests/2026-04-17-02/notes.md`](../playtests/2026-04-17-02/notes.md)
- Automated validation: [`docs/playtests/2026-04-17-m3-automated/notes.md`](../playtests/2026-04-17-m3-automated/notes.md)

---

_Sessione M2 chiusa: 16 PR, 7/7 FRICTION risolte, ability system 100%, canonical flow end-to-end live._
