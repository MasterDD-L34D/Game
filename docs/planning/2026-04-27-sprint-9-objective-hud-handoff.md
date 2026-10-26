---
title: 'Sprint 9 — Objective HUD top-bar handoff (§C.2 Surface-DEAD #5)'
description: 'Engine LIVE Surface DEAD killer — objectiveEvaluator 6 obj types era live ma encounter.objective + objective_state non esposti al client. HUD render live. P5 🟡 → 🟡++.'
authors:
  - claude-code
created: 2026-04-27
updated: 2026-04-27
status: published
tags:
  - sprint-handoff
  - p5
  - p1
  - surface-dead-sweep
  - objective-hud
  - sprint-9
workstream: ops-qa
---

# Sprint 9 — Objective HUD top-bar

**Data**: 2026-04-27 · **Sessione**: autonomous · **Modalità**: 5/5 doc upkeep ritual

## TL;DR

Sprint 9 chiude **§C.2 Surface-DEAD #5** (objectiveEvaluator 6 obj types → encounter scenarios usage non-elim). Backend `objectiveEvaluator` LIVE da ADR-2026-04-20 supportava 6 obj types (elimination, capture_point, escort, sabotage, survival, escape) ma surface DEAD: `encounter.objective` + `objective_state` non esposti al client.

Surface NEW: HUD top-bar in header mostra `⚔ Elimina i nemici · Sistema vivi: 2 · PG: 2` (o equivalente per altri obj types) con band color status (active accent / win green / loss red). Player capisce subito cosa deve fare per vincere e quanto manca.

**Pillar impact**:

- P5 Co-op vs Sistema: 🟡 → **🟡++** (player vede esplicitamente l'obiettivo).
- P1 Tattica leggibile: 🟢++ → **🟢++ (consolidato)**.

## Deliverable

| Layer      | File                                                                               | Cambio                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend    | [`apps/backend/routes/session.js`](../../apps/backend/routes/session.js)           | NEW `GET /api/session/:id/objective` route — ritorna `{session_id, encounter_id, encounter_label_it, objective: {type,...}, evaluation: {completed, failed, progress, reason, outcome?}}` lazy-evaluating tramite `evaluateObjective()`. Graceful 404 / null shape se sessione senza encounter.objective (backward compat).                                                |
| Module     | [`apps/play/src/objectivePanel.js`](../../apps/play/src/objectivePanel.js) NEW     | Pure: `labelForObjectiveType` (6 IT canonical labels) + `iconForObjectiveType` (emoji per tipo) + `statusForEvaluation` (win/loss/active/unknown) + `formatProgress(type, progress)` aligned con real backend payload keys + `formatObjectiveBar(payload)` (HTML row). Side effect: `renderObjectiveBar(containerEl, payload)` (idempotent innerHTML + status class swap). |
| API client | [`apps/play/src/api.js`](../../apps/play/src/api.js)                               | `api.objective(sid)` GET helper                                                                                                                                                                                                                                                                                                                                            |
| Wire       | [`apps/play/src/main.js`](../../apps/play/src/main.js)                             | Import + `refreshObjectiveBar()` chiamato in `refresh()` (post state-fetch) + bootstrap `startSession`. Pipeline `encounter_id` → backend `loadEncounter` → engine.encounter populated → /objective surfaces.                                                                                                                                                              |
| HTML       | [`apps/play/index.html`](../../apps/play/index.html)                               | `<div id="objective-bar" class="objective-bar obj-hidden" role="status" aria-live="polite">` in header next to pressure-meter                                                                                                                                                                                                                                              |
| CSS        | [`apps/play/src/style.css`](../../apps/play/src/style.css)                         | `.objective-bar` rules con varianti band (status-active accent / status-win green / status-loss red / hidden / empty placeholder)                                                                                                                                                                                                                                          |
| Tests      | [`tests/play/objectivePanel.test.js`](../../tests/play/objectivePanel.test.js) NEW | 29 unit test (6 describe blocks: labelForObjectiveType + iconForObjectiveType + statusForEvaluation + formatProgress 6 obj types con real backend keys + formatObjectiveBar XSS escape + renderObjectiveBar fakeContainer DOM)                                                                                                                                             |

## Architettura

**Backend pre-esistente** (zero engine change):

- `apps/backend/services/combat/objectiveEvaluator.js` `evaluateObjective(session, encounter)` line 305 — registry di 6 evaluator pure functions (elimination + capture_point + escort + sabotage + survival + escape)
- Returns `{completed: bool, failed: bool, progress: object, reason: string, outcome?: 'win'|'wipe'|'timeout'|'objective_failed'}`
- Real progress payload keys per tipo (catalogati nel module per format consistency):
  - `elimination` → `{sistema, player}` counts alive
  - `capture_point` → `{turns_held, units_in_zone, target_turns}`
  - `escort` → `{escort_hp, extracted}`
  - `sabotage` → `{sabotage_progress, units_in_zone, required}`
  - `survival` → `{turns_survived, target}`
  - `escape` → `{units_escaped, units_alive}`

**Backend route nuovo**:

```
GET /api/session/:id/objective
  ├─ resolveSession(:id) → 404 se non trovata
  ├─ session.encounter || {} → objective = encounter.objective || null
  ├─ if objective.type:
  │  ├─ lazy require evaluator (try/catch — non blocca path principale)
  │  └─ evaluation = evaluateObjective(session, encounter)
  └─ res.json({session_id, encounter_id, encounter_label_it, objective, evaluation})
```

**Frontend nuovo**:

```
main.js refresh()
  ├─ api.state(sid) → world fetch
  ├─ refreshVcSnapshot() // existing
  ├─ refreshObjectiveBar() // NEW
  │  ├─ api.objective(sid) → fetch /api/session/:id/objective
  │  ├─ getElementById('objective-bar') → containerEl
  │  └─ renderObjectiveBar(containerEl, response):
  │     ├─ if !payload.objective.type → hide (.obj-hidden) + clear innerHTML
  │     ├─ else:
  │     │  ├─ remove .obj-hidden + .obj-status-* (cleanup)
  │     │  ├─ formatObjectiveBar(payload) → HTML
  │     │  ├─ statusForEvaluation(payload.evaluation) → 'win'|'loss'|'active'|'unknown'
  │     │  └─ add .obj-status-{status} class
  │     └─ innerHTML = `<icon><label><progress><statusBadge?>`
  └─ applyPressurePalette(world) // existing
```

**Style band semantic**:

- `active` → border + label accent (Sistema mood color)
- `win` → border green + status badge "✓ COMPLETATO"
- `loss` → border red + status badge "✕ FALLITO"
- `hidden` → display:none (no objective configured)

**Tutorial play UI integration**:

- `main.js startSession`: passa `encounter_id: sc.data.id` a `api.start()`
- Backend `/api/session/start` body.encounter_id triggers `loadEncounter()` → docs/planning/encounters/<id>.yaml → session.encounter populated con full config (incluso `objective` block)
- Backward compat: encounter senza objective field → HUD hidden (gracefully degrade)

## Test budget

- `tests/play/objectivePanel.test.js`: **29/29** verde
  - `labelForObjectiveType` (3 test): 6 canonical IT labels + caps fallback unknown + null em-dash
  - `iconForObjectiveType` (2 test): canonical emoji + 📌 fallback
  - `statusForEvaluation` (4 test): completed→win + failed→loss + neither→active + null→unknown
  - `formatProgress` (8 test): 6 obj types con real backend keys + unknown type empty + null progress empty
  - `formatObjectiveBar` (6 test): full elimination active + completed badge + failed badge + null placeholder + no-objective copy + XSS escape on type fallback
  - `renderObjectiveBar` (6 test): null containerEl no-crash + null payload hide + no-type hide + full payload renders + completed status class + failed drops prior status
- `tests/ai/*.test.js`: **363/363** verde (baseline, zero regression)
- `npm run format:check`: All files use Prettier code style ✅
- `python tools/check_docs_governance.py --strict`: errors=0 warnings=0 ✅

## Smoke E2E (browser preview validato live)

- **Backend**: `npm run start:api` su `http://localhost:3334` ✓
- **Play**: `npm run play:dev` su `http://localhost:5180` ✓
- **Verificato in browser**:
  1. Module + api.objective import OK ✓
  2. Direct backend call `GET /api/session/:sid/objective` con encounter_id non passato → `{encounter_id: null, evaluation: null}` ✓
  3. Direct backend call con `encounter_id: 'enc_tutorial_01'` passed → `{objective: {type: 'elimination'}, evaluation: {completed: false, failed: false, progress: {sistema: 2, player: 2}, reason: 'in_progress'}}` ✓
  4. **End-to-end LIVE**: bootstrap session via Nuova sessione → HUD top-bar render `⚔ Elimina i nemici · Sistema vivi: 2 · PG: 2` con classes `objective-bar obj-status-active` ✓

## Anti-pattern Engine LIVE Surface DEAD — Gate 5 DoD

✅ Killer applicato:

- Backend `objectiveEvaluator` registry LIVE da ADR-2026-04-20 (6 obj types implementati e testati 49/49 in service tests)
- Surface DEAD pre-Sprint 9: `encounter.objective` + `evaluation` mai esposti al client (publicSessionView non li includeva, no /objective route)
- Sprint 9 wire crea la surface immediata, **<60s gameplay** durante bootstrap session (HUD visibile da subito)
- Visivamente prominente (header top-bar 240-480px width, accent border, IT label uppercase)

## Status §C.2 Surface-DEAD sweep — 4/8 chiusi

| #   | Engine LIVE                 | Surface                  | Status                                   |
| --- | --------------------------- | ------------------------ | ---------------------------------------- |
| 1   | predictCombat N=1000        | tooltip hover preview    | 🟢 Sprint 8                              |
| 2   | Tactics Ogre HUD            | HP floating render.js    | 🟢 already live (M4 P0.2 line 768)       |
| 3   | Spore part-pack             | drawMutationDots overlay | 🔴                                       |
| 4   | Mating engine 469 LOC       | gene_slots → lifecycle   | 🔴                                       |
| 5   | objectiveEvaluator 6 types  | HUD top-bar              | 🟢 **Sprint 9 (this)**                   |
| 6   | biomeSpawnBias.js           | universal initial wave   | 🔴 — Sprint 11 candidato (~2h quick-win) |
| 7   | QBN engine 17 events        | session debrief wire     | 🔴 — **Sprint 10 candidato**             |
| 8   | Thought Cabinet 18 thoughts | reveal_text_it + UI      | 🟢 Sprint 6 PR #1966                     |

## Codice ripristinabile

- Branch: `claude/sprint-9-objective-hud` (da `origin/main` `0c162543` post Sprint 8 merge)
- Stato pre-commit: 1 backend file modificato + 1 frontend module nuovo + 1 module test nuovo + 4 file UI/wire modificati
- Pre-existing: encounter YAML loader (`encounterLoader.js`) usa path `docs/planning/encounters/<id>.yaml`. Tutorial scenario `id: 'enc_tutorial_01'` exposed in /api/tutorial response.

## Next session candidato

Continua §C.2 Surface-DEAD sweep:

- **Sprint 10**: QBN narrative debrief beats (Surface-DEAD #7) — engine `narrativeEngine` 17 events LIVE, debrief panel `narrativeFromEvents` solo combat events. Wire QBN events nel debrief panel. ~3h.
- **Sprint 11** (quick-win): biome initial wave universal wire (Surface-DEAD #6) — `biomeSpawnBias.js` LIVE post PR #1935 ma non chiamato in initial wave universalmente. ~2h.

Bundle 8+9+10+11 = ~12h totali per §C.2 6/8 chiusi.

## Files toccati

```
apps/backend/routes/session.js                                       (+ /:id/objective route)
apps/play/src/objectivePanel.js                                      (NEW — module)
apps/play/src/api.js                                                 (+ objective helper)
apps/play/src/main.js                                                (+ import + refreshObjectiveBar wire + encounter_id pipe)
apps/play/index.html                                                 (+ #objective-bar HUD slot)
apps/play/src/style.css                                              (+ .objective-bar rules)
tests/play/objectivePanel.test.js                                    (NEW — 29 test)
docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md        (§C.2 4/8 chiusi marker)
docs/planning/2026-04-27-sprint-9-objective-hud-handoff.md           (this doc)
CLAUDE.md                                                            (Sprint 9 section pre-pended)
COMPACT_CONTEXT.md                                                   (v13 bump)
BACKLOG.md                                                           (closure entry)
```
