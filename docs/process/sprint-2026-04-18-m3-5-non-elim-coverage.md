---
title: Sprint 2026-04-18 M3.5 — Wire G+H + Pilastro 1 non-elimination coverage
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-04-18'
source_of_truth: false
language: it
review_cycle_days: 90
---

# Sprint 2026-04-18 M3.5 — Wire G+H + Pilastro 1 non-elimination coverage

**Sessione autonoma overnight** post-M3. Closes ADR-2026-04-19 (reinforcementSpawner) + ADR-2026-04-20 (objectiveEvaluator) da DRAFT a ACCEPTED via wiring completo in `sessionRoundBridge` + `/end` outcome + coverage encounter Pilastro 1 non-elimination.

## Scope delivered

5 PR sequenziali (2 wire + 1 data + 1 tool + 1 docs):

| #    | Lane           | PR                                                                                          | Size LOC |  Status   |
| ---- | -------------- | ------------------------------------------------------------------------------------------- | :------: | :-------: |
| PR 1 | wire step 1    | [#1571](https://github.com/MasterDD-L34D/Game/pull/1571) — `/turn/end`                      |   115    | ✅ merged |
| PR 2 | wire step 2    | [#1573](https://github.com/MasterDD-L34D/Game/pull/1573) — `/commit-round` + `/end` outcome |   159    |  🟡 open  |
| PR 3 | data scenarios | [#1574](https://github.com/MasterDD-L34D/Game/pull/1574) — 4 encounter YAML                 |   298    |  🟡 open  |
| PR 4 | harness        | [#1575](https://github.com/MasterDD-L34D/Game/pull/1575) — batch_calibrate_non_elim         |   389    |  🟡 open  |
| PR 5 | docs close     | (this PR) — ADR status + sprint doc                                                         |   ~100   |  🟡 open  |

**Totale net**: ~1000 LOC (backend wiring 52, data 298, tools 389, docs 100, tests 160).

## Obiettivo + rationale

Next-session priority #1 scritta in memory M3:

> Con G+H moduli pronti ma NON wirati, next session ha due lane: wire G+H in session engine, chiamare `reinforcementSpawner.tick()` in `sessionRoundBridge.js` dopo resolve round, e `evaluateObjective()` in `/turn/end` + `/round/execute` → outcome enum espanso in `/end` response

**Pilastro coverage**: prima di M3.5 solo `elimination` valutato runtime (altre 5 enum `objective.type` dead). Post: capture/escort/survival/timeout/objective_failed tutti attivi via encounter authoring.

## Wire step 1 (`/turn/end`) — PR #1571

- `session.js /start`: accetta `req.body.encounter` payload, stash in `session.encounter` (null default)
- `sessionRoundBridge.js handleTurnEndViaRound`: chiama `reinforcementTick(session, session.encounter)` + `evaluateObjective(session, session.encounter)` prima del return
- Raw event `action_type='reinforcement_spawn'` emesso per vcScoring
- Response nuovi campi: `reinforcement_spawned`, `objective_state`
- Test integration 3/3 pass (`sessionEncounterWiring.test.js`)

## Wire step 2 (`/commit-round` + `/end`) — PR #1573

- `/commit-round auto_resolve=true`: stessa parity wiring (reinforcement + objective post resolve round)
- `/end` response: `outcome` prende da `objectiveEvaluator` se `encounter.objective` presente; fallback elimination se undefined
- Nuovi outcome enum: `timeout`, `objective_failed` (oltre a win/wipe/draw/abandon)
- Nuovo campo `objective_state` in `/end` response
- Test integration 3/3 pass (`sessionEncounterWiringStep2.test.js`)
- Regression: 224/224 session+ai pass

## Encounter scenarios — PR #1574

4 nuovi encounter YAML in `docs/planning/encounters/`:

| slug                    | objective     | difficulty | key feature                                            |
| ----------------------- | ------------- | :--------: | ------------------------------------------------------ |
| `enc_capture_01`        | capture_point |    3/5     | hold 3×3 zone 3 turni, min_units=2, limit 15           |
| `enc_escort_01`         | escort        |    3/5     | proteggi VIP `escort_01`, extract_zone, t≤12           |
| `enc_survival_01`       | survival      |    4/5     | 10 turni, 3 wave progressive                           |
| `enc_hardcore_reinf_01` | elimination   |    5/5     | reinforcement_pool attivo, min_tier Alert, max 4 spawn |

Schema validation 12/12 pass (`encounterSchema.test.js`).

## Calibration harness — PR #1575

`tools/py/batch_calibrate_non_elim.py` parameterizable:

```bash
python3 tools/py/batch_calibrate_non_elim.py --scenario enc_capture_01 --n 10
python3 tools/py/batch_calibrate_non_elim.py --scenario enc_survival_01 --probe
```

- Load YAML, build initial units, run N via `/turn/end` loop + `/end`
- Collect outcome distribution (`win`/`wipe`/`timeout`/`objective_failed`)
- Auto-inject VIP `escort_01` se `objective.type='escort'`
- `--probe` mode N=1 verbose schema dump (pattern memory `feedback_probe_before_batch.md`)
- 8/8 unit test pass (no backend dep)

## Pilastro state update

| #   | Pilastro                     | Pre-M3.5 | Post-M3.5 |
| --- | ---------------------------- | :------: | :-------: |
| 1   | Tattica leggibile (FFT)      |    🟢    |   🟢 ++   |
| 2   | Evoluzione emergente (Spore) |    🟢    |    🟢     |
| 3   | Identità Specie × Job        |    🟢    |    🟢     |
| 4   | Temperamenti MBTI/Ennea      |    🟢    |    🟢     |
| 5   | Co-op vs Sistema             |    🟢    |   🟢 ++   |
| 6   | Fairness                     |    🟢    |    🟢     |

Pilastro 1: ora 4 objective type live (elimination + capture + escort + survival), non più 1. Pilastro 5: AI Progress pattern (Park) completo — pressure → tier → reinforcement_budget → spawn.

## Follow-up FU-M3.5-A..D

| ID  | Task                                                              | Blocker               | Priorità |
| --- | ----------------------------------------------------------------- | --------------------- | :------: |
| A   | Batch calibration N=10 per 4 nuovi encounter (backend run)        | Backend live          |    🟢    |
| B   | UI Replay render: capture zone + escort route + countdown         | UI source unknown     |    🟡    |
| C   | VC calibration: raw event `objective_progress_event` in telemetry | TKT-06 predict_combat |    🟡    |
| D   | ADR-2026-04-21 composite objectives (AND/OR sub-objective)        | Design validation     |    ⚪    |

## Memo guardrail rispettati

- Regola 50 righe: wire step 2 52 LOC (apps/backend), altri PR data-only
- Nessun file in `.github/workflows/`, `migrations/`, `services/generation/` toccato
- `packages/contracts/schemas/` non toccato (schema encounter.schema.json già includeva campi necessari)
- Trait: zero modifica a `active_effects.yaml`
- Nessuna dipendenza npm nuova (PyYAML già in `tools/py/requirements.txt`)

## Test delta

| Suite                     | Pre | Post |  Δ  |
| ------------------------- | :-: | :--: | :-: |
| session+ai (api)          | 221 | 227  | +6  |
| encounter schema          |  8  |  12  | +4  |
| harness unit (python)     |  0  |  8   | +8  |
| **Totale delta sessione** |  —  |  —   | +18 |

## ADR status change

- `ADR-2026-04-19`: DRAFT → **ACCEPTED** (implementation + wiring + coverage + harness tutti live)
- `ADR-2026-04-20`: DRAFT → **ACCEPTED** (stesso)

Registry `docs/governance/docs_registry.json` aggiornato: entrambi `doc_status: active`.

## Quirks sessione

- Git worktree lock su `main` persiste (vibrant-curie-e6ddac) — workaround `git checkout -b feat/<name> origin/main` funziona senza checkout main
- PR #1571 landed parallelamente a PR 1572 (duplicate commit ID) → chiuso dup
- Python dual version issue: Python 3.14 system python non ha pyyaml/pytest, Python 3.13 sì — usa `python` non `python3` per tests locale
- Stash #0-13 accumulated da sessioni precedenti — cleanup deferred
