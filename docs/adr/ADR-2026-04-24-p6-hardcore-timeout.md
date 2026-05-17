---
title: 'ADR-2026-04-24: M13 P6 — Hardcore mission timer + pod activation (Long War 2)'
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-24
source_of_truth: false
language: it-en
review_cycle_days: 30
related:
  - docs/planning/2026-04-20-pilastri-reality-audit.md
  - docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md
  - docs/playtest/2026-04-18-hardcore-06-calibration.md
  - docs/playtest/2026-04-18-hardcore-06-iter1-validation.md
  - docs/adr/ADR-2026-04-19-reinforcement-option-b.md
---

# ADR-2026-04-24: M13 P6 — Hardcore mission timer + pod activation

- **Data**: 2026-04-24
- **Stato**: Accepted
- **Owner**: Backend + Design
- **Stakeholder**: Pilastro 6 (Fairness), Combat engine, hardcore scenarios

## Contesto

Pilastro 6 (Fairness) 🟡 all'audit 2026-04-20. Hardcore iter7 RED deadlock:

- **Iter 0** (PR #1534): boss hp 14, N=13 → 84.6% win (out-of-band 15-25% target).
- **Iter 1** (PR #1542): boss hp 14→22 + guardia +1 + extra elite, N=30 → 96.7% win. **PEGGIO** (damage spread consente aggro rotation).
- **Iter 2** (in-code): boss hp 40, damage concentrato. Non validated N>0.

Problema root: **multiplier knob exhausted**. Continuare a gonfiare HP/damage non produce challenging; produce grind. Player turtle behavior + kite infinito = 8v6 deterministic win.

Strategy doc raccomandava **Long War 2 pattern**: mission timer cap + pod activation reinforcement. Timer forza commitment (impossibile overcamp), pod converte stalemate in pressing. Non gonfiare stats — cambia incentivi.

## Decisione

Implementare `missionTimer` pure module + wire in `sessionRoundBridge` (both end-turn + commit-round paths). Timer consuma encounter YAML schema additiva. Applicare a `enc_tutorial_06_hardcore` (iter3) e creare `enc_tutorial_07_hardcore_pod_rush` nuovo scenario calibrato around timer.

### Architettura

```
                      ┌──────────────────────────┐
                      │ encounter YAML           │
                      │   mission_timer:         │
                      │     enabled              │
                      │     turn_limit           │
                      │     soft_warning_at      │
                      │     on_expire: enum      │
                      │     on_expire_payload    │
                      └─────────────┬────────────┘
                                    │
                                    ▼
                      ┌──────────────────────────┐
                      │ missionTimer.tick()      │
                      │ - ensureState(session)   │
                      │ - compute remaining      │
                      │ - emit warning/expired   │
                      │ - return side_effects    │
                      └─────────────┬────────────┘
                                    │
                                    ▼
                      ┌──────────────────────────┐
                      │ sessionRoundBridge       │
                      │ (post round resolve)     │
                      │ - if warning → emit evt  │
                      │ - if expired → emit evt  │
                      │    + apply pressure delta│
                      │ - include in response    │
                      └──────────────────────────┘
```

### Timer lifecycle

- **Init**: primo `tick()` salva `started_at_turn = session.turn` in `session.mission_timer_state`.
- **Warning**: `remaining_turns <= soft_warning_at` → emit `mission_timer_warning` event (una volta per valore remaining).
- **Expired**: `remaining_turns <= 0` → emit `mission_timer_expired` event + applica side effects:
  - `on_expire: 'defeat'` → caller stop combat con outcome 'timeout' (campaign advance → retry same).
  - `on_expire: 'escalate_pressure'` → applyPressureDelta(+N) inline (AI tier jump).
  - `on_expire: 'spawn_wave'` → side_effect flag read dal reinforcementSpawner next tick.
- **Re-expire safety**: `state.expired` flag previene double-trigger.

### Scenario iter3

**Hardcore 06 "Cattedrale dell'Apex"**:

- `mission_timer.turn_limit: 15`, `soft_warning_at: 3`, `on_expire: escalate_pressure (+30)` + 2 extra spawns.
- BOSS hp 40 + pressure_start 85 invariati (iter 2 baseline preservata).
- Player che kite senza pressing perde finestra vittoria: a round 12 warning → pressure sta a 85-95 → Apex tier attivo → 4 SIS intents/round impossibile da tankare.

**Hardcore 07 "Assalto Spietato"** (nuovo):

- 4 PG quartet vs 3 iniziali + 3 pod reinforcement (6 spawn total cap).
- `mission_timer.turn_limit: 10`, `on_expire: escalate +30 pressure` + 3 extra spawns.
- NO BOSS tanky: damage distribuito. Priority decisioni > burst window.
- `reinforcement_policy.enabled: true`, min_tier Alert, cooldown 2, 6 spawn max.
- Target win rate: 30-50% (playtest N=10 pending iter B).

### Trade-off e conseguenze

- **Timer schema additive**: encounter legacy senza `mission_timer` → `tick()` returns `skipped: true, reason: policy_disabled`. Zero breaking change.
- **Pressure escalate inline**: timer expire muta `session.sistema_pressure` direttamente in bridge; altrernativa (delegate caller) era più pulita ma aggiungeva coordination overhead.
- **Defeat outcome non auto-triggered**: ora `on_expire: 'defeat'` emette solo event; caller (campaign advance) deve interpretare response `mission_timer.action === 'defeat'` e settare outcome. Deferred wire Phase B.
- **UI timer visibility**: frontend non mostra ancora countdown (Phase B: aggiungere a formsPanel-pattern overlay o HUD canvas).

### Rollback

- Scenario-level: rimuovere `mission_timer:` block da encounter YAML → tick skipped.
- Module-level: rimuovere import + calls da sessionRoundBridge → zero impatto, bridge mantiene reinforcement/objective live.
- File removal: missionTimer.js + tests + scenario 07 → zero dipendenze upstream.

## Scope Phase A (questo PR)

- `apps/backend/services/combat/missionTimer.js` (135 LOC): tick + peek pure functions
- `apps/backend/routes/sessionRoundBridge.js` (+ ~60 LOC): wire tick in both paths
- `apps/backend/services/hardcoreScenario.js` (+140 LOC): timer on 06 iter3 + new scenario 07 + builder
- `apps/backend/routes/tutorial.js` (+ ~10 LOC): serve 07 endpoint
- Tests: `tests/api/missionTimer.test.js` (12 unit) + `tests/api/hardcoreScenarioTimer.test.js` (5 integration) = **17**

Baseline AI 307 + progression 24 (P3) + M12 63 + lobby 26 + campaign 27 + timer 17 = **464+** (preservato).

## Fuori scope Phase B (follow-up ~3-5h)

- Calibration harness: `tools/py/batch_calibrate_hardcore07.py` N=10 baseline + tune iter 1
- Frontend HUD: timer countdown visibile (warning red tint)
- Campaign outcome: interpretare `mission_timer.action === 'defeat'` in `/api/campaign/advance` auto-set outcome
- Fairness score metric: includere timer expire rate in `fairnessCap` per tracking bilanciamento

## Fuori scope Phase C+ (deferred)

- Dynamic timer (tier-based extension: boss kill → +3 rounds)
- Multiple nested timers (soft phase timer + hard fail timer)
- Timer persistence across retry (carry-over partial)

## Riferimenti

- Strategy M9-M11: [`docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md`](../planning/2026-04-20-strategy-m9-m11-evidence-based.md)
- Pilastri audit: [`docs/planning/2026-04-20-pilastri-reality-audit.md`](../planning/2026-04-20-pilastri-reality-audit.md)
- Reinforcement Option B: [`docs/adr/ADR-2026-04-19-reinforcement-option-b.md`](ADR-2026-04-19-reinforcement-option-b.md)
- Hardcore calibration: [`docs/playtest/2026-04-18-hardcore-06-calibration.md`](../playtest/2026-04-18-hardcore-06-calibration.md)
- Hardcore iter1 validation: [`docs/playtest/2026-04-18-hardcore-06-iter1-validation.md`](../playtest/2026-04-18-hardcore-06-iter1-validation.md)

---

## Addendum Phase B (2026-04-25) — calibration harness + HUD + auto-timeout

Phase B chiude P6 runtime (🟡+ → 🟢 candidato). 3 wire sopra engine Phase A.

### 1. Calibration harness hardcore 07

`tools/py/batch_calibrate_hardcore07.py` — stdlib-only Python runner. N=10 default, quartet modulation. Target win rate **30-50%**.

Metriche raccolte per run:

- `outcome` (victory/defeat/timeout)
- `rounds` (effettivi)
- `timer_expired` (bool)
- `players_alive`, `enemies_alive`, `kills`, `losses`, `kd`

Summary aggregato: win/defeat/timeout rate + timer_expire_rate + rounds avg/median + KD avg + `in_band` flag.

Usage:

```bash
npm run start:api &   # Terminal 1 (richiesto backend :3334)
python tools/py/batch_calibrate_hardcore07.py --n 10 --out reports/hardcore07-iter0.json
```

Harness execution **userland** (richiede backend live). Report deferred docs/playtest/ quando eseguito.

### 2. HUD timer countdown frontend

`apps/play/src/main.js` `updateMissionTimerHud(timer)` chiamato in `triggerCommitRound` post-resolve. Bottom-right overlay `<div id="mission-timer-hud">`:

- Icon ⏱ + `remaining/limit` countdown
- `.mt-warning` class (red pulse 1.2s) quando `remaining ≤ 3` o `timer.warning=true`
- `.mt-expired` class (strikethrough + dark red) quando `timer.expired=true`

CSS in `apps/play/src/style.css`:

- Position fixed bottom-right 20px/20px
- Pulse animation via `@keyframes mt-pulse`
- Hidden quando `!timer.enabled`

### 3. Campaign auto-timeout

`state.lastMissionTimer` cached da ogni `commit-round` response. `advanceCampaignWithEvolvePrompt(id, outcome, ...)` pre-processa outcome:

| `state.lastMissionTimer.expired` | outcome declared | outcome finale          |
| -------------------------------- | ---------------- | ----------------------- |
| false / null                     | any              | passthrough             |
| true                             | null/undefined   | `'timeout'`             |
| true                             | `'victory'`      | `'timeout'` (override)  |
| true                             | `'defeat'`       | `'defeat'` (rispettato) |

Log entry `⏱ Auto-timeout: mission_timer expired → outcome='timeout'` emesso quando override applicato. Gating campaign retry coerente con timer behavior (M13 P6 Phase A pattern).

### Test delta Phase B

- `tests/api/missionTimerHud.test.js` NEW — 10 test (inferOutcome 5 + hudClass 5)
- Calibration harness: script-level (non unit test)

**Baseline post-Phase B**: AI 307 + timer 12 Phase A + 5 scenario + 10 HUD = **334 (subset)**. Full stack con progression + M12: 472+.

### Pilastro 6 post-Phase B

- Pre-A: 🟡 → Post-A: 🟡+ → **Post-B: 🟢 candidato** (residuo: calibration harness execution userland + N=10 report)

### Fuori scope Phase C

- Dynamic timer extension (boss kill → +3 rounds)
- Multiple nested timers (soft phase + hard fail)
- Timer persistence across retry
- Fairness score metric includere timer_expire_rate in `fairnessCap` tracking

## Addendum anti-rot — cross-ref path rotto (fence 2026-05-17)

⚠️ **La DECISIONE resta valida e invariata** (M13 P6 hardcore timer +
pod activation). **Ma un riferimento file è ROTTO** (audit veracità ADR
2026-05-17, regola-0, verifica file-path vs git-truth):

- `docs/adr/ADR-2026-04-19-reinforcement-option-b.md` (frontmatter
  `related:` + sezione Riferimenti) → **FILE INESISTENTE**. Il file
  reale è `docs/adr/ADR-2026-04-19-reinforcement-spawn-engine.md`
  (rinominato; decisione Reinforcement Option B contenuta lì). Link
  storico = snapshot pre-rinomina, NON path corrente.

**Trattamento**: decisione invariata; il path nel corpo/frontmatter =
*riferimento storico rotto*, NON puntatore valido. Target canonico →
`ADR-2026-04-19-reinforcement-spawn-engine.md`. (Addendum-only:
governance ADR non riscrive link nel corpo; pointer corretto qui.)
