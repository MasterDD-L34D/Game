---
title: 'Sprint 10 — QBN narrative debrief beats handoff (§C.2 Surface-DEAD #7)'
description: 'Engine LIVE Surface DEAD killer — qbnEngine + rewardEconomy emettevano narrative_event ma debrief panel ignorava il campo. P4 🟢 → 🟢++.'
authors:
  - claude-code
created: 2026-04-27
updated: 2026-04-27
status: published
tags:
  - sprint-handoff
  - p4
  - surface-dead-sweep
  - qbn-narrative
  - sprint-10
workstream: ops-qa
---

# Sprint 10 — QBN narrative debrief beats

**Data**: 2026-04-27 · **Sessione**: autonomous · **Modalità**: 5/5 doc upkeep ritual

## TL;DR

Sprint 10 chiude **§C.2 Surface-DEAD #7** (QBN engine 17 events → session debrief wire). Backend `qbnEngine.drawEvent` LIVE da PR #1914 (Sprint α A+E residuals) + `rewardEconomy.buildDebriefSummary` già emette `narrative_event` in debrief response, ma frontend ignorava il campo.

Surface NEW: dopo ogni encounter, debrief panel mostra una sezione "📖 Cronaca diegetica" con un narrative event card stile journal (Georgia serif body italic, accent violet) — title + body + choice list + meta. Player ottiene una beat narrativa contestuale post-combat.

**Pillar P4 Narrative Identità**: 🟢 def → **🟢++**.

## Deliverable

| Layer  | File                                                                                   | Cambio                                                                                                                                                                                                                                                             |
| ------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Module | [`apps/play/src/qbnDebriefRender.js`](../../apps/play/src/qbnDebriefRender.js) NEW     | Pure `formatNarrativeEventCard(narrativeEvent)` (HTML card con title + body + choices + meta + XSS escape) + side-effect `renderNarrativeEvent(sectionEl, cardEl, payload)` (idempotent + section show/hide). Accept legacy keys `title`/`body` + canonical `_it`. |
| Setter | [`apps/play/src/debriefPanel.js`](../../apps/play/src/debriefPanel.js)                 | NEW `setNarrativeEvent(payload)` API + `state.narrativeEvent` field + `renderQbn()` chiamato in render path principale + import + `<div id="db-qbn-section">` HTML template                                                                                        |
| Wire   | [`apps/play/src/phaseCoordinator.js`](../../apps/play/src/phaseCoordinator.js)         | Pipe `bridge.lastDebrief.narrative_event` → `dbApi.setNarrativeEvent(...)` quando phase transitions a 'debrief'                                                                                                                                                    |
| CSS    | [`apps/play/src/debriefPanel.css`](../../apps/play/src/debriefPanel.css)               | `.db-qbn-card` journal style (linear-gradient #1a1626→#0f0c18 + violet accent border + Georgia serif body italic) + `.db-qbn-title/body/choices/meta` typography                                                                                                   |
| Tests  | [`tests/play/qbnDebriefRender.test.js`](../../tests/play/qbnDebriefRender.test.js) NEW | 15 unit test (2 describe blocks: formatNarrativeEventCard + renderNarrativeEvent — null/empty/full payload + legacy keys + XSS escape + choices fallback + idempotency)                                                                                            |

## Architettura

**Backend pre-esistente** (zero engine change):

- `apps/backend/services/narrative/qbnEngine.js drawEvent({vcSnapshot, runState, history, seed})` ritorna `{event: {id, title_it, body_it, choices: [{id, label_it}], ...}, eligible_count}` (Quality-Based Narrative pattern).
- `apps/backend/services/rewardEconomy.js buildDebriefSummary` line 124-147 wire (E-residual #2 — Sprint α 2026-04-27): chiama `drawEvent` + popola `narrative_event: {id, title_it, body_it, choices, eligible_count}` nel debrief response. Best-effort, fail silenzioso se pack missing.
- Output flows through `/api/session/end` debrief field e via coop debrief broadcast.

**Frontend nuovo**:

```
phaseCoordinator.applyPhase('debrief')
  ├─ ensureDebrief() → wireDebriefPanel api
  ├─ dbApi.reset() + setState(world) + show()
  ├─ V2 Tri-Sorgente reward offer fetch (existing)
  └─ Sprint 10 NEW:
     ├─ debriefPayload = bridge.lastDebrief || bridge.session.lastDebrief
     ├─ narrativeEvent = debriefPayload?.narrative_event || null
     └─ dbApi.setNarrativeEvent(narrativeEvent)
        ├─ state.narrativeEvent = payload (or null se empty fields)
        └─ renderQbn():
           └─ renderNarrativeEvent(sectionEl, cardEl, payload):
              ├─ formatNarrativeEventCard(payload) → HTML
              │  ├─ title_it / body_it / choices / eligible_count
              │  ├─ XSS escape per ogni campo
              │  └─ data-event-id + data-choice-id su elementi
              ├─ if HTML empty → section.style.display = 'none'
              └─ else → section visible + cardEl.innerHTML = HTML
```

**Style journal**:

- Background linear-gradient `#1a1626 → #0f0c18` (deep purple/black)
- Border-left 3px solid `#c6a0ff` (violet accent — Disco Tier S palette)
- Title `#d8c7ff` 1.05rem bold
- Body Georgia serif italic `#cfd1d5` 0.95rem (journal entry feel)
- Choices `<ul>` con violet bg/border + Georgia body inherit
- Meta `#6b6f7d` 0.7rem opacity 0.7

## Test budget

- `tests/play/qbnDebriefRender.test.js`: **15/15** verde
  - `formatNarrativeEventCard` (9 test): null/non-object → empty + all-empty fields → empty + full payload + title-only + body-only + legacy keys + XSS escape on title/body/choice/label + choices fallback (id → ordinal) + empty choices skip + non-finite eligible_count skip
  - `renderNarrativeEvent` (5 test): null section/card no-crash + null payload hide + all-empty hide + full payload reveal + idempotent
- `tests/ai/*.test.js`: **363/363** verde (baseline, zero regression)
- `npm run format:check`: All files use Prettier code style ✅
- `python tools/check_docs_governance.py --strict`: errors=0 warnings=0 ✅

## Smoke E2E (browser preview validato live)

- **Backend**: `npm run start:api` su `http://localhost:3334` ✓
- **Play**: `npm run play:dev` su `http://localhost:5180` ✓
- **Verificato in browser**:
  1. Module `qbnDebriefRender.js` import dinamico OK ✓
  2. `renderNarrativeEvent(section, card, fullPayload)` produces correct DOM `<div class="db-qbn-event" data-event-id="evt_test">` con title "Alba sul valico" + body "Le creature si allontanano..." + 2 choices "Accetta il legame" / "Lasciala libera" + meta "4 eventi possibili" ✓

## Anti-pattern Engine LIVE Surface DEAD — Gate 5 DoD

✅ Killer applicato:

- Backend `qbnEngine` LIVE + `rewardEconomy` wire LIVE da Sprint α 2026-04-27 (PR #1914)
- Surface DEAD pre-Sprint 10: `narrative_event` campo nel debrief response mai consumato dal frontend
- Sprint 10 wire crea la surface immediata, **<60s gameplay** post-encounter (debrief phase transition)
- Visivamente prominente (sezione dedicata stile journal con typography differente da MBTI/recruit/skiv sections)

## Status §C.2 Surface-DEAD sweep — 5/8 chiusi

| #   | Engine LIVE                | Surface                  | Status                              |
| --- | -------------------------- | ------------------------ | ----------------------------------- |
| 1   | predictCombat N=1000       | tooltip hover preview    | 🟢 Sprint 8                         |
| 2   | Tactics Ogre HUD           | HP floating render.js    | 🟢 already live (M4 P0.2)           |
| 3   | Spore part-pack            | drawMutationDots overlay | 🔴 (15h authoring + 3h render)      |
| 4   | Mating engine 469 LOC      | gene_slots → lifecycle   | 🔴 (5h)                             |
| 5   | objectiveEvaluator 6 types | HUD top-bar              | 🟢 Sprint 9                         |
| 6   | biomeSpawnBias.js          | universal initial wave   | 🔴 (2h quick-win — Sprint 11 cand.) |
| 7   | QBN engine 17 events       | session debrief wire     | 🟢 **Sprint 10 (this)**             |
| 8   | Thought Cabinet 18         | reveal_text_it + UI      | 🟢 Sprint 6 PR #1966                |

## Codice ripristinabile

- Branch: `claude/sprint-10-qbn-debrief` (da `origin/main` post Sprint 9 merge)
- Stato pre-commit: 1 module nuovo + 1 test nuovo + 3 file UI/wire modificati + CSS modificato
- Pre-existing: `bridge.lastDebrief` cache deve essere popolata da chi triggera la debrief phase (typically /api/session/end response cache). Se mancante, `setNarrativeEvent(null)` → section nascosta gracefully.

## Next session candidato

Continua §C.2 Surface-DEAD sweep:

- **Sprint 11** (quick-win 2h): biome initial wave universal wire (Surface-DEAD #6) — `biomeSpawnBias.js` LIVE post PR #1935 ma non chiamato in initial wave universalmente.
- **Sprint 12** (5h): Mating lifecycle wire (Surface-DEAD #4) — `Mating engine 469 LOC` LIVE ma `gene_slots → lifecycle` wire mancante.
- **Sprint 13** (15h+ authoring): Spore mutation dots overlay (Surface-DEAD #3) — design doc esiste, render code + 30 mutation `aspect_token` authoring residual.

Bundle 6+11+12 = ~7h totali per §C.2 7/8 chiusi (escludendo Spore authoring batch).

## Files toccati

```
apps/play/src/qbnDebriefRender.js                                    (NEW — module)
apps/play/src/debriefPanel.js                                        (+ import + state.narrativeEvent + renderQbn + setNarrativeEvent setter + #db-qbn-section HTML)
apps/play/src/phaseCoordinator.js                                    (+ pipe bridge.lastDebrief.narrative_event)
apps/play/src/debriefPanel.css                                       (+ .db-qbn-card journal style)
tests/play/qbnDebriefRender.test.js                                  (NEW — 15 test)
docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md        (§C.2 5/8 chiusi marker)
docs/planning/2026-04-27-sprint-10-qbn-debrief-handoff.md            (this doc)
CLAUDE.md                                                            (Sprint 10 section pre-pended)
COMPACT_CONTEXT.md                                                   (v14 bump)
BACKLOG.md                                                           (closure entry)
```
