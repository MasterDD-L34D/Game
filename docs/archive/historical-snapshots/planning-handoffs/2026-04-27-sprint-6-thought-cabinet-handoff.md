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
**Status**: ✅ **MERGED** — [PR #1966](https://github.com/MasterDD-L34D/Game/pull/1966) squashed to `main` come `584c54c2` (2026-04-27 18:19 UTC).

## TL;DR

Sprint 6 chiude il pattern P0 residuo `B.1.8 #1` (Disco Tier S #9): **Thought Cabinet UI panel cooldown round-based**. Engine bump `DEFAULT_SLOTS_MAX` 3→8 + nuovo `mode='rounds'` (default) che scala costi T1→3 round, T2→6, T3→9 via `RESEARCH_ROUND_MULTIPLIER=3`. Bridge `sessionRoundBridge.applyEndOfRoundSideEffects` ora decrementa 1 round per fine-turno, auto-internalize quando `cost_remaining==0`, applica passive bonuses live + emette evento `thought_internalized`. Frontend `apps/play/src/thoughtsPanel.js` ottiene Assign/Forget buttons inline, progress bar `done/total round X%`, 8-slot grid e can-research-more gate. Smoke E2E validato in browser preview.

**Pillar P4 status**: 🟢c → **🟢 def**.

## Merge bookkeeping

- **PR**: [#1966](https://github.com/MasterDD-L34D/Game/pull/1966) — `feat(p4): Sprint 6 — Thought Cabinet UI panel + cooldown round-based (Disco Tier S #9)`
- **Squash commit**: `584c54c2` su `main`
- **Merged at**: 2026-04-27 18:19 UTC (Mon 27 Apr 2026, 20:19 Europe/Rome)
- **CI finale**: 19 SUCCESS / 12 SKIPPED / 0 FAIL (1 transient flake `terrainReactionsWire.test.js:240` "eventually hits" risolto via `gh run rerun --failed`; verificato locally 7/7 verdi).
- **Branch update**: il branch era `BEHIND` post-3-PR landed (ADR Ancestors #1963 + Channel resistance #1964 + Pulverator #1967); aggiornato via `gh pr update-branch 1966`.
- **Adoption follow-up scheduled**: routine `thought-cabinet-adoption-check` (`trig_01JJsMTpGWaEsBfhE51YFNMx`) firing **2026-05-11 07:00 UTC** (Mon 11 May 2026, 9:00 Europe/Rome) — pull `thought_internalized` telemetry, flag cold-start (Engine LIVE Surface DEAD), recommend P4 status promote/hold/downgrade. Manage: https://claude.ai/code/routines/trig_01JJsMTpGWaEsBfhE51YFNMx

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

- Branch (rimosso post-merge): `claude/sprint-6-thought-cabinet-ui` (era da `origin/main` `f74c1da3`, mergiato come `584c54c2`)
- Stato finale: tutti i layer su main, 76/76 test thoughts verdi, 353/353 AI baseline, format prettier verde, governance 0 errors
- Pre-existing issue: l'engine inline catalog `CLIENT_CATALOG` in `thoughtsPanel.js` resta come prima (mirror manuale del YAML); refactor a `/api/thoughts/catalog` rimane backlog futuro non bloccante.

## Pattern Anti "Engine LIVE Surface DEAD" — Gate 5 DoD

✅ Killer applicato: la nuova surface player è visibile <60s gameplay:

- HUD button `🧠 Mente` esiste già (`#thoughts-open` in `apps/play/index.html`)
- Click → overlay con 8 slot counter + 8 Assign buttons + progress bars su pending research
- Click su Assign → status visibile immediato (researching class + progress bar `0/3 round`)
- Auto-tick a fine round visibile come progress bar che avanza + transizione a `internalized` con badge 🧠 Interiorizzato

## Residui Disco B.1.8 (1 pattern post-merge — 3/4 shipped)

| #   | Pattern                                                                      | Effort | Surface      | Status                                                                                               |
| --- | ---------------------------------------------------------------------------- | ------ | ------------ | ---------------------------------------------------------------------------------------------------- |
| 1   | Thought Cabinet UI panel + cooldown round-based                              | ~8h    | HUD/overlay  | ✅ MERGED ([PR #1966](https://github.com/MasterDD-L34D/Game/pull/1966) `584c54c2`) — _questo sprint_ |
| 2   | Internal voice 4-MBTI axes                                                   | ~10h   | log/debrief  | ✅ MERGED ([PR #1945](https://github.com/MasterDD-L34D/Game/pull/1945) `de57432c`) — _stesso turno_  |
| 3   | Skill check passive vs active popup (surface trigger via popup notification) | ~4h    | toast/HUD    | 🔴 open — only residuo                                                                               |
| 4   | Day/time pacing flavor copy ("Giorno N di Aurora" nei debrief)               | ~2h    | debrief/copy | ✅ MERGED ([PR #1934](https://github.com/MasterDD-L34D/Game/pull/1934)) — _Sprint 1 §I notte_        |

## Next session candidato

**Solo residuo Disco**: B.1.8 #3 Skill check passive vs active popup (~4h, popup HUD, leverage surface diegetico esistente). Post-#3 il bundle Disco è 4/4 chiuso.

Altri P4 residui (non-Disco): vedi stato-arte §B.1.6 (XCOM EW Officer Training School ~10h) o §B.1.11 (Wildermyth layered storylets ~10h).

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
