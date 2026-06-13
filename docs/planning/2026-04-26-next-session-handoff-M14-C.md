---
title: Next Session Handoff — M14-C Populate Scenarios + Wire AbilityExecutor
workstream: combat
category: handoff
doc_status: active
doc_owner: claude-code
last_verified: '2026-04-26'
source_of_truth: false
language: it
review_cycle_days: 14
tags:
  - handoff
  - next-session
  - m14-c
  - triangle-strategy
  - elevation
  - facing
  - autonomous-task
related:
  - docs/planning/2026-04-25-M14-A-elevation-terrain.md
  - docs/research/triangle-strategy-transfer-plan.md
  - docs/qa/2026-04-24-coop-phase-validation-pre-playtest.md
---

# NEXT SESSION HANDOFF — M14-C

**Per**: Claude Code autonomous session (~4-6h budget)
**Da**: sessione 2026-04-25 (M14-A + M14-B merged, PR #1736 + #1737)
**Bloccante umano**: solo TKT-M11B-06 playtest live (non assegnabile a Claude)

---

## 🚦 STATO ATTUALE (2026-04-26)

### Main sync post-sessione 2026-04-25

- PR #1736 `b7abfe39` — M14-A helpers (elevation + terrain reactions) + F-1/F-2/F-3 coop
- PR #1737 `492aae6b` — M14-B wire (elevation + flank + pincer detection)

### Test baseline aggregate

- AI regression: **307/307** (`node --test tests/ai/*.test.js`)
- Services: **39/39** (`node --test tests/services/*.test.js`)
- Coop/lobby: **26** esistenti (F-1 WS rebroadcast + F-2/F-3 coperti)
- Format + governance: verde

### Runtime wire attivo

- `session.js` damage step → `computePositionalDamage` (elevation + flank + rear quadrant)
- `hexGrid.js` → `elevationDamageMultiplier`, `detectPincer`
- `terrainReactions.js` pure helper (reactTile + chainElectrified, **non wired**)

### Baseline zero behavior change

Scenari esistenti NON hanno `elevation`/`facing` popolato → multiplier=1.0 → damage invariato.

---

## 🎯 TASK PER PROSSIMA SESSIONE

### P0 — Populate scenarios (LOW RISK, HIGH ROI, ~90 min)

**Obiettivo**: attivare M14-B meccaniche in scenari esistenti senza toccare runtime.

**File da editare**:

1. `apps/backend/services/hardcoreScenario.js` — aggiungi `elevation` field a unit spec (scenari hardcore 06/07 hanno già `facing`)
2. `data/encounters/*.yaml` — estendi `terrain_features` con `elevation_map` opzionale

**Task concreti**:

- [ ] Aggiungi `elevation: 1` ai BOSS/elite units in hardcore_06 + hardcore_07 (già hanno facing)
- [ ] Aggiungi `elevation: 0` ai player PG default (ground level)
- [ ] Nei tutorial 03-05, aggiungi unit con `facing: 'N/S/E/W'` diverso (test flank path)
- [ ] Calibration harness Python `tools/py/batch_calibrate_hardcore07.py` run N=10 → JSON report
- [ ] Doc telemetry impact: `docs/playtest/2026-04-26-M14-B-elevation-calibration.md`

**Tests nuovi**:

- `tests/scenarios/hardcoreElevation.test.js` — smoke che units hanno elevation field post-spawn
- Assert N=10 sim hardcore_07 non oltrepassa `win_rate ± 10%` pre-M14-B baseline (usa telemetry JSON)

**Regression gate**:

- AI 307/307 deve restare verde (formula resolver invariata, solo input)
- Win rate tutorial 01-02 non deve calare >5% (elevation=0 entrambi = multiplier=1)
- Hardcore 06/07 win rate può variare; documentare nel report

### P1 — Wire elevation in abilityExecutor.js (MEDIUM RISK, ~4h)

**Obiettivo**: wire elevation nel damage step di TUTTE le abilities (attack_move, attack_push, multi_attack, drain, ranged, surge_aoe, aoe_buff, team_heal, etc.).

**Strategia**:

1. **Helper refactor centralizzato**: crea `applyPositionalDamageToUnit({ session, actor, target, damage })` in `apps/backend/services/abilityExecutor.js` o in `sessionHelpers.js` → wrap damage application (shield absorb + resistance + positional multiplier + HP subtract + damage_taken tracking).
2. Sostituisci i **6 siti** dove oggi c'è `target.hp = Math.max(0, target.hp - damage)` con il helper.
3. Per AoE: apply positional per-target (ogni target ha quadrant diverso).

**File target**:

- `apps/backend/services/abilityExecutor.js:293-284` (attack_move + attack_push + attack_move variants)
- `apps/backend/services/abilityExecutor.js:401` (multi_attack)
- `apps/backend/services/abilityExecutor.js:615-741` (drain_attack + execution_attack)
- `apps/backend/services/abilityExecutor.js:921-1120` (aoe_buff + team_debuff + surge_aoe)
- `apps/backend/services/abilityExecutor.js:1500` (secondary surge_aoe)

**Risk**:

- Regola 50-LOC: scope potenzialmente >50 LOC in apps/backend/ (OK — dentro guardrail).
- Regression: ogni edit di damage path richiede AI + ability tests verdi.
- 4-gate DoD: smoke test via `general-purpose` agent "esegui tutte le abilities in /session/start + /action, verifica damage_dealt event ha campo `positional_mult`".

**Test target**:

- `tests/api/abilityExecutorPositional.test.js` — +5 test (1 per major ability type con elevation settato)
- AI 307/307 regression verde post-wire

### P2 — Pincer follow-up intent API (HIGH RISK, ~6h, deferred se P0+P1 finiscono)

**Prerequisito**: design `roundOrchestrator.pushFollowup(intent)` API prima di implementare.

**Scope**:

1. Design doc `docs/adr/ADR-2026-04-26-pincer-followup-queue.md` con schema intent + priority + cap
2. Implementa `pushFollowup` in `apps/backend/services/roundOrchestrator.js`
3. Wire in `session.js` damage step: dopo hit, se `detectPincer(actor, target, allies).pincer` → enqueue follow-up
4. Tests: 3-4 scenari pincer (happy + cap + dead ally)

**Scope-out se tempo stringe**: bozza ADR solo, implementazione next+1 session.

### P3 — Terrain reactions wire (DEFERRED, documentare solo)

Terrain reactions (`terrainReactions.js`) helper sono shipped pure. Wire richiede:

- Per-session `tileStateMap` in `session.js` o `sessionConstants.js`
- Round-end TTL decrement hook in `sessionRoundBridge.handleTurnEndViaRound`
- Abilities con `element: fire|ice|water|lightning` che triggerano `reactTile` sul target hex
- UI visualization (Mission Console bundle readonly → fuori scope)

**Decision**: non implementare in M14-C. Aggiungi ticket backlog `TKT-M14-TERRAIN-WIRE`.

---

## 🛑 DO NOT (scope cut hard)

- ❌ **Wire terrain reactions** — richiede session state design decision (deferred P3)
- ❌ **Facing UI overlay** — Mission Console bundle pre-built, fuori repo
- ❌ **Weather system** (M15 slice)
- ❌ **Push/knockback/ledge damage** (Mechanic 5, separate PR)
- ❌ **V3 Mating/Nido** (post-MVP)
- ❌ **V6 UI polish** (post-playtest)
- ❌ **Nuovi agent/skill** (4-gate DoD se applicato)
- ❌ **Game-Database Alt B activation** (flag OFF)

---

## 🧱 GUARDRAIL CHECK

Pre-commit checklist:

- [ ] NO touch `.github/workflows/`, `migrations/`, `packages/contracts/`, `services/generation/`
- [ ] NO nuove deps npm/pip senza approvazione
- [ ] Regola 50 LOC: se task fuori da `apps/backend/`, ferma
- [ ] 4-gate DoD: new agent/skill/feature → research + smoke + tuning + optimization

---

## 🔧 START COMMANDS

```bash
cd "C:/Users/edusc/Desktop/gioco/Game"

# Sync
git fetch origin main
git checkout -b claude/m14c-populate-scenarios origin/main

# Verify baseline
node --test tests/ai/*.test.js          # 307/307 green
node --test tests/services/*.test.js    # 39/39 green

# Read handoff + plan
# docs/planning/2026-04-26-next-session-handoff-M14-C.md  ← questo file
# docs/planning/2026-04-25-M14-A-elevation-terrain.md     ← plan M14-A/B
# docs/research/triangle-strategy-transfer-plan.md        ← design spec

# Start P0
# 1. Edit apps/backend/services/hardcoreScenario.js (add elevation field)
# 2. Edit data/encounters/*.yaml (add terrain_features.elevation_map)
# 3. Run tools/py/batch_calibrate_hardcore07.py N=10
# 4. Commit + PR
```

---

## 📊 BUDGET STIMATO

| Task                                | Effort  |      Confidence       |
| ----------------------------------- | ------- | :-------------------: |
| P0 populate scenarios + calibration | 90 min  |        🟢 high        |
| P1 wire abilityExecutor             | ~4h     |       🟡 medium       |
| P2 pincer followup                  | ~6h     | 🔴 low (design first) |
| P3 terrain wire (doc solo)          | 30 min  |          🟢           |
| **TOTALE session**                  | **~6h** |          mix          |

**Deliverable atteso**: 1 PR con P0 shipped (sempre), P1 wire abilityExecutor (se confidence alta), P3 ticket backlog. P2 ADR bozza se tempo resta.

---

## 🎮 PILASTRI TARGET POST M14-C

| #   | Pilastro   | Oggi |              Target post-M14-C              |
| --- | ---------- | :--: | :-----------------------------------------: |
| 1   | Tattica    | 🟢+  |  🟢++ (elevation/flank attivi in scenari)   |
| 2   | Evoluzione | 🟢c  |                     🟢c                     |
| 3   | Specie×Job | 🟢c  |                     🟢c                     |
| 4   | MBTI       | 🟡++ |                    🟡++                     |
| 5   | Co-op      | 🟡+  |      🟡+ (TKT-M11B-06 resta userland)       |
| 6   | Fairness   | 🟢c+ | 🟢c++ (hardcore 07 calibrato con elevation) |

---

## 🚨 ESCALATION

- Se P1 wire abilityExecutor produce >10 test fail → ferma, revert, doc blocker in report
- Se calibration N=10 mostra win_rate drop >15% su tutorial → investiga, NON commit senza user OK
- Se emerge unexpected state o file sconosciuti → NO touch, segnala in report

---

**Chi sono**: autonomous Claude Code session, branch `claude/m14c-*`. Tu (user) confermi merge PR finale come per #1736 + #1737.
