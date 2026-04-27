---
title: 'Sprint 6 — Thought Cabinet UI panel + cooldown round-based handoff'
description: 'Disco Elysium Tier S #9 closure — engine + bridge + UI + tests + smoke E2E preview validato. P4 → 🟢 def.'
authors:
  - claude-code
created: 2026-04-27
updated: 2026-04-27
status: published
tags:
  - sprint-handoff
  - p4
  - disco-elysium
  - thought-cabinet
  - sprint-6
workstream: ops-qa
---

# Sprint 6 — Thought Cabinet UI panel + cooldown round-based

**Data**: 2026-04-27 · **Sessione**: autonomous · **Modalità**: 5/5 doc upkeep ritual

## TL;DR

Sprint 6 chiude il pattern P0 residuo `B.1.8 #1` (Disco Tier S #9): **Thought Cabinet UI panel cooldown round-based**. Engine bump `DEFAULT_SLOTS_MAX` 3→8 + nuovo `mode='rounds'` (default) che scala costi T1→3 round, T2→6, T3→9 via `RESEARCH_ROUND_MULTIPLIER=3`. Bridge `sessionRoundBridge.applyEndOfRoundSideEffects` ora decrementa 1 round per fine-turno, auto-internalize quando `cost_remaining==0`, applica passive bonuses live + emette evento `thought_internalized`. Frontend `apps/play/src/thoughtsPanel.js` ottiene Assign/Forget buttons inline, progress bar `done/total round X%`, 8-slot grid e can-research-more gate. Smoke E2E validato in browser preview.

**Pillar P4 status**: 🟢c → **🟢 def**.

## Deliverable

| Layer        | File                                                                                                         | Cambio                                                                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine       | [`apps/backend/services/thoughts/thoughtCabinet.js`](../../apps/backend/services/thoughts/thoughtCabinet.js) | `DEFAULT_SLOTS_MAX` 3→8, `RESEARCH_ROUND_MULTIPLIER=3`, `mode='rounds'\|'encounters'` opt, `tickAllResearch(bucket, delta)` bulk helper, snapshot `mode/scaled_cost/progress_pct/started_at_round` |
| Bridge       | [`apps/backend/routes/sessionRoundBridge.js`](../../apps/backend/routes/sessionRoundBridge.js)               | `applyEndOfRoundSideEffects` → `tickAllResearch(bucket, 1)` + apply passives + emit `thought_internalized` event. `getCabinetBucket` injected via deps                                             |
| Routes       | [`apps/backend/routes/session.js`](../../apps/backend/routes/session.js)                                     | `/thoughts/research` accetta body `mode` (default `'rounds'`). `getCabinetBucket` passato a `createRoundBridge`. Response include `scaled_cost+mode`                                               |
| API client   | [`apps/play/src/api.js`](../../apps/play/src/api.js)                                                         | `thoughtsList/thoughtsResearch/thoughtsForget` aliases                                                                                                                                             |
| Frontend     | [`apps/play/src/thoughtsPanel.js`](../../apps/play/src/thoughtsPanel.js)                                     | Assign/Forget buttons inline per card, progress bar, 8-slot grid, can-research-more gate, error banner, status classes (researching/internalized), `bindActionHandlers`+`refreshPanel`             |
| Tests engine | [`tests/api/thoughtCabinet.test.js`](../../tests/api/thoughtCabinet.test.js)                                 | +12 round-mode tests (T1→3, T2→6, T3→9 + resonance + `tickAllResearch` + 8-slot cap + snapshot fields)                                                                                             |
| Tests routes | [`tests/api/sessionThoughts.test.js`](../../tests/api/sessionThoughts.test.js)                               | +5 E2E (slots_max 8, mode=rounds default, opt-out encounters, researching surface fields, 3-tick T1 internalize)                                                                                   |

## Test budget

- `tests/api/thoughtCabinet.test.js`: **59/59** verde (era 30/30, +29 round-mode tests)
- `tests/api/sessionThoughts.test.js`: **17/17** verde (era 12/12, +5 E2E round-tick)
- `tests/ai/*.test.js`: **353/353** verde (baseline, zero regression)
- `tests/api/roundExecute.test.js` + `tests/services/roundOrchestrator.*.test.js`: **49/49** verde (bridge end-of-round wire non rompe round model)
- `npm run format:check`: All files use Prettier code style ✅
- `python tools/check_docs_governance.py --strict`: errors=0 warnings=0 ✅

## Smoke E2E (browser preview validato)

- **Backend**: `npm run start:api` su `http://localhost:3334` ✓
- **Play**: `npm run play:dev` su `http://localhost:5180` ✓
- **Flow validato**:
  1. `/api/tutorial/enc_tutorial_01` → 4 unit
  2. `/api/session/start` → sid
  3. `/api/session/{sid}/thoughts` → `slots_max=8`, 8 unlocked thoughts via MBTI
  4. `/api/session/{sid}/thoughts/research` (no body.mode) → `mode='rounds'`, `cost_total=3` (T1)
  5. `/api/session/turn/end` ×3 → cost_remaining 3→2→1→0; al round 3 thought interiorizzato + `internalized:[i_osservatore]`
  6. UI: button `🧠 Mente` → overlay con 8 slot ●○ counter + 8 Assign buttons. Click Assign → card flip a `researching`, progress bar `0/3 round 0%`, Forget button "Annulla ricerca". Click Forget → ritorno a stato Assign, slot counter 0/8.

## Codice ripristinabile

- Branch: `claude/sprint-6-thought-cabinet-ui` (da `origin/main` `f74c1da3`)
- Stato pre-commit: tutti i layer modificati, format pulito, test verdi
- Pre-existing issue: l'engine inline catalog `CLIENT_CATALOG` in `thoughtsPanel.js` resta come prima (mirror manuale del YAML); refactor a `/api/thoughts/catalog` rimane backlog futuro non bloccante.

## Pattern Anti "Engine LIVE Surface DEAD" — Gate 5 DoD

✅ Killer applicato: la nuova surface player è visibile <60s gameplay:

- HUD button `🧠 Mente` esiste già (`#thoughts-open` in `apps/play/index.html`)
- Click → overlay con 8 slot counter + 8 Assign buttons + progress bars su pending research
- Click su Assign → status visibile immediato (researching class + progress bar `0/3 round`)
- Auto-tick a fine round visibile come progress bar che avanza + transizione a `internalized` con badge 🧠 Interiorizzato

## Residui Disco B.1.8 (3 pattern, ranking next-session)

| #   | Pattern                                                                             | Effort | Surface      |
| --- | ----------------------------------------------------------------------------------- | ------ | ------------ |
| 2   | Internal voice 4-MBTI axes (narrative log debrief con voce-per-axis durante combat) | ~10h   | log/debrief  |
| 3   | Skill check passive vs active popup (surface trigger via popup notification)        | ~4h    | toast/HUD    |
| 4   | Day/time pacing flavor copy ("Giorno N di Aurora" nei debrief)                      | ~2h    | debrief/copy |

## Next session candidato

**P4 quick-win**: B.1.8 #4 Day/time pacing flavor copy (~2h, debrief surface, low blast radius). Oppure:

- **P4 mid**: B.1.8 #3 Skill check popup (~4h, popup HUD, leverage surface diegetico esistente)
- **P4 deep**: B.1.8 #2 Internal voice 4-MBTI axes (~10h, narrative engine extension, ricco)

## Files toccati

```
apps/backend/services/thoughts/thoughtCabinet.js   (+ round-mode + tickAllResearch + snapshot fields)
apps/backend/routes/sessionRoundBridge.js          (+ end-of-round tick wire + emit event)
apps/backend/routes/session.js                     (+ getCabinetBucket dep + mode body param)
apps/play/src/api.js                                (+ thoughtsList/Research/Forget aliases)
apps/play/src/thoughtsPanel.js                     (+ Assign/Forget + progress bar + 8-slot grid)
tests/api/thoughtCabinet.test.js                   (+ 12 round-mode tests)
tests/api/sessionThoughts.test.js                  (+ 5 E2E round-tick tests)
docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md  (§B.1.8 #1 marked 🟢)
docs/planning/2026-04-27-sprint-6-thought-cabinet-handoff.md   (this doc)
CLAUDE.md                                           (Sprint context section)
COMPACT_CONTEXT.md                                  (v10 bump)
BACKLOG.md                                          (closure entry)
```
