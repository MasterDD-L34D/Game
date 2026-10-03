---
title: Sprint 2026-04-18 M3 — Telemetry close + VC snapshot pre-end + ADR follow-up combat
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-04-18'
source_of_truth: false
language: it
review_cycle_days: 90
---

# Sprint 2026-04-18 M3 — Telemetry close + ADR follow-up combat

**Sessione di chiusura follow-up** post-sprint M1 (telemetry gap) e M2 (ability + canonical). Scopo: sbloccare `PR #1535` (telemetry), colmare micro-gap `/end` (VC in response), e formalizzare via ADR 2 proposte di combat design (reinforcement + objective) raccolte dal playtest sweep M1.

**5 PR aperti questa sessione** (3 ready-to-merge + 2 draft ADR):

- #1535 (telemetry) — rebased + test 172 fix
- #1564 — `vc_snapshot` in `/end` response
- #1565 — ADR 04-19 reinforcement-spawn + 04-20 objective-parametrizzato

## Scope

5 task dalla lista follow-up consegnata a inizio sessione:

| #   | Task                               | Esito                                  |
| --- | ---------------------------------- | -------------------------------------- |
| C   | PR #1535 rebase + fix test 172     | 🟢 CI green, merge-ready               |
| D   | VC snapshot fetch pre-`/end`       | 🟢 PR #1564 aperta, 246/246 test verdi |
| A   | ADR-2026-04-19 reinforcement-spawn | 🟡 DRAFT in PR #1565                   |
| B   | ADR-2026-04-20 objective-parametr. | 🟡 DRAFT in PR #1565                   |
| E   | Sprint M3 formal close             | 🟢 questo doc                          |

## PR aperti (3 branch, 5 task)

### C — PR #1535 telemetry (merge-ready)

**Branch**: `telemetry-session-events` · **HEAD**: `252d9a97`

Rebase su main dopo 151 commit di drift. Conflitto documenti risolto (skip commit duplicato — il doc playtest sweep era già su main via #1537).

Test 172 (`replay endpoint returns payload with session events + meta`) falliva perché `freshReplay.body.meta.events_count` atteso 0 ma la PR emette `session_start` event a `/start` (count 1). Fix su `tests/api/sessionReplay.test.js`:

- Asserisce `events_count === events.length` + `>= 1`
- Verifica `events[0].action_type === 'session_start'`

CI: `stack-quality pass 1m7s`, governance pass. Merge-ready post-Master DD review.

### D — PR #1564 vc_snapshot in `/end`

**Branch**: `feat/end-response-vc-snapshot` · **HEAD**: `2d091a58`

Gap: 4/5 harness Python (`batch_calibrate_hardcore06_quartet`, `master_dm`, `probe_ai`, `batch_calibrate_hardcore06:probe_round_resp`) chiamano `/end` senza pre-fetch `/vc`. Risultato: VC snapshot perso per batch analytics.

Fix in `apps/backend/routes/session.js:1383` (/end handler):

1. `buildVcSnapshot()` + `buildDebriefSummary()` **prima** di `sessions.delete()`
2. Aggiunto `vc_snapshot: { per_actor, aggregate, mbti, ennea } | null` al response

Test: `tests/api/sessionEndResponse.test.js` (2 nuovi test). Full suite: **246/246 pass** (+2 vs main 244).

Backward compat: nuovo field, nessun breakage `session_id/finalized/log_file/events_count/debrief`.

### A+B — PR #1565 ADR follow-up combat

**Branch**: `docs/adr-reinforcement-spawn` · **HEAD**: `eab051f8`

#### ADR-2026-04-19 Reinforcement spawn engine

**Trigger**: `packs/evo_tactics_pack/data/balance/sistema_pressure.yaml` definisce `reinforcement_budget: 0..4` per tier ma **il campo è mai consumato**. Pacing encounter piatto, AI War pattern (Park) implementato a metà.

**Decisione**: `services/combat/reinforcementSpawner.js` (modulo puro, feature-flagged OFF). Consuma budget tier, spawna da `encounter.reinforcement_pool` (weighted), piazza su `reinforcement_entry_tiles` (filter Manhattan ≥3 da PG), emette raw event `reinforcement_spawn`.

Opt-in scenario → hardcore06 primo candidato.

#### ADR-2026-04-20 Objective parametrizzato

**Trigger**: `schemas/evo/encounter.schema.json` dichiara 6 `objective.type` ma **solo `elimination` valutato a runtime**. 5 tipi dormienti (capture*point, escort, sabotage, survival, escape), SoT §pilastro 1 esplicito: *"l'obiettivo non è sempre kill them all"\_.

**Decisione**: `services/combat/objectiveEvaluator.js` — pluggable registry. 1 evaluator per tipo, contratto `evaluateObjective(session, encounter) → { completed, state, reason }`. Tick in `/turn/end` + `/round/execute`. Outcome enum esteso: `win/wipe/timeout/objective_failed/abandon`.

`loss_conditions` (nuovo campo) disaccoppia vittoria da sconfitta.

#### Integrazione A+B

Hook `objective_tick → pressure_relief (-3)` chiude loop reinforcement ↔ objective. Entry proposta in `sistema_pressure.yaml.deltas`: `pg_objective_tick: -3`, `pg_objective_completed: -20`.

## Test coverage

| Suite           | Pre  | Post      | Delta |
| --------------- | ---- | --------- | ----- |
| `tests/api/*`   | 244  | **246**   | +2    |
| CI PR #1535     | fail | **green** | —     |
| Docs governance | ok   | **ok**    | err=0 |

## Definition of Done

- [x] `node --test tests/api/sessionReplay.test.js` → 4/4 verde
- [x] `node --test tests/api/sessionEndResponse.test.js` → 2/2 verde
- [x] `node --test tests/api/*.test.js` → 246/246 verde
- [x] `npm run format:check` → pass (warn solo su `.claude/worktrees/`, untracked)
- [x] `python tools/check_docs_governance.py --strict` → errors=0
- [ ] **Master DD approval richiesto** per merge PR #1535 + #1564 + #1565

## Follow-up aperti (backlog)

| ID      | Source          | Cosa                                                                    | Priorità |
| ------- | --------------- | ----------------------------------------------------------------------- | :------: |
| FU-M3-A | ADR 04-19       | Implementare `reinforcementSpawner.js` + unit/integration test          |    🟢    |
| FU-M3-B | ADR 04-20       | Implementare `objectiveEvaluator.js` + 6 evaluator + registry           |    🟢    |
| FU-M3-C | PR #1535        | Merge + verify downstream (mock snapshots, replay UI)                   |    🟢    |
| FU-M3-D | PR #1564        | Merge + aggiorna harness Python per leggere `vc_snapshot` da `/end`     |    🟡    |
| FU-M3-E | TKT-06          | `predict_combat` include `unit.mod` stat (dalla sprint precedente)      |    🟡    |
| FU-M3-F | TKT-07          | Tutorial sweep #2 N=10/scenario post telemetry fix                      |    ⚪    |
| FU-M3-G | ADR 04-17 drift | 5 doc con `last_verified` mismatch frontmatter vs registry (governance) |    ⚪    |

## Guardrail rispetto

- ✅ Niente file in `.github/workflows/` toccati
- ✅ Niente `migrations/` toccati
- ✅ Niente `packages/contracts/` toccato
- ✅ Niente `services/generation/` toccato
- ✅ Regola 50 righe rispettata (session.js delta = 22 righe nette)
- ✅ Trait solo in `data/core/traits/active_effects.yaml` (nessun hardcode)
- ✅ Nessuna dipendenza npm/pip nuova

## Link

- PR #1535 https://github.com/MasterDD-L34D/Game/pull/1535
- PR #1564 https://github.com/MasterDD-L34D/Game/pull/1564
- PR #1565 https://github.com/MasterDD-L34D/Game/pull/1565
- [ADR-2026-04-19](../adr/ADR-2026-04-19-reinforcement-spawn-engine.md)
- [ADR-2026-04-20](../adr/ADR-2026-04-20-objective-parametrizzato.md)
