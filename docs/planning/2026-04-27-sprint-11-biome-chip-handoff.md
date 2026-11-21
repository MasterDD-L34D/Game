---
title: 'Sprint 11 — Biome chip HUD handoff (§C.2 Surface-DEAD #6)'
description: 'Engine LIVE Surface DEAD killer — biomeSpawnBias engine + biome_id session metadata erano live ma player non vedeva mai il bioma corrente. HUD chip live. P5 🟡++ consolidato.'
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
  - biome-chip
  - sprint-11
workstream: ops-qa
---

# Sprint 11 — Biome chip HUD

**Data**: 2026-04-27 · **Sessione**: autonomous · **Modalità**: 5/5 doc upkeep ritual

## TL;DR

Sprint 11 chiude **§C.2 Surface-DEAD #6** (biomeSpawnBias.js initial wave → universal initial wave wire). Backend `biomeSpawnBias.js` LIVE (boost spawn pool weights basato su biome affinity, applicato in reinforcement spawner) + `session.biome_id` populated by encounter YAML loader, ma player non vedeva mai il bioma corrente — perdeva lettura tattica ambientale (specie endemiche favorite, hazard, strategia).

Surface NEW: chip HUD pill style next to objective bar mostra `🌾 Savana` (o equivalente per altri 10 biomi canonical) con tooltip nativo "Biome: <id> — vedi Codex per dettagli".

**Pillar impact**:

- P5 Co-op vs Sistema: 🟡++ → **🟡++ (consolidato)** — player vede ambient context.
- P1 Tattica leggibile: 🟢++ — bioma è feedback ambientale.

**§C.2 Surface-DEAD sweep**: **6/8 chiusi** (#1 Sprint 8 + #2 HP floating M4 P0.2 + #5 Sprint 9 + #6 Sprint 11 + #7 Sprint 10 + #8 Sprint 6). Residui solo #3 Spore mutation dots (15h authoring) + #4 Mating lifecycle wire (5h).

## Deliverable

| Layer   | File                                                                                   | Cambio                                                                                                                                                                                                                                               |
| ------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --------------------------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend | [`apps/backend/routes/sessionHelpers.js`](../../apps/backend/routes/sessionHelpers.js) | Expose `biome_id: session.biome_id                                                                                                                                                                                                                   |     | session.encounter?.biome_id |     | null`in`publicSessionView`. Fallback a encounter YAML loader (sblocca tutorial UI flow che passa solo `encounter_id`senza`biome_id` esplicito). |
| Module  | [`apps/play/src/biomeChip.js`](../../apps/play/src/biomeChip.js) NEW                   | Pure: `labelForBiome(biomeId)` (11 canonical IT labels + Title-Case fallback) + `iconForBiome(biomeId)` (emoji per tipo + 🌍 default) + `formatBiomeChip(biomeId)` (HTML pill con XSS escape). Side-effect: `renderBiomeChip(containerEl, biomeId)`. |
| HTML    | [`apps/play/index.html`](../../apps/play/index.html)                                   | `<div id="biome-chip" class="biome-chip biome-hidden" role="status" aria-live="polite">` next to objective-bar in header                                                                                                                             |
| Wire    | [`apps/play/src/main.js`](../../apps/play/src/main.js)                                 | Import + `refreshBiomeChip()` chiamato in `refresh()` (post state-fetch) + bootstrap `startSession`. Reads `state.world.biome_id` (publicSessionView).                                                                                               |
| CSS     | [`apps/play/src/style.css`](../../apps/play/src/style.css)                             | `.biome-chip` pill style (rgba green-tinted bg + border + caps label + hover state)                                                                                                                                                                  |
| Tests   | [`tests/play/biomeChip.test.js`](../../tests/play/biomeChip.test.js) NEW               | 17 unit test (4 describe blocks: labelForBiome canonical+case-insensitive+fallback+null + iconForBiome canonical+default + formatBiomeChip + renderBiomeChip DOM side effect)                                                                        |

## Architettura

**Backend pre-esistente** (1-line change in publicSessionView):

- `apps/backend/services/combat/biomeSpawnBias.js` `applyBiomeBias(pool, biomeConfig)` — boost spawn pool weights (already LIVE in reinforcement)
- `apps/backend/services/combat/biomePoolLoader.js` `getRoleTemplates(biomeId)` — biome metadata
- `session.biome_id` populated da `body.biome_id` o derivato da encounter YAML loaded
- Sprint 11 fix: publicSessionView ora propaga `session.biome_id || session.encounter?.biome_id || null` (sblocca tutorial UI flow)

**Frontend nuovo**:

```
main.js refresh()
  ├─ api.state(sid) → world fetch (now includes biome_id)
  ├─ refreshVcSnapshot() // existing
  ├─ refreshObjectiveBar() // Sprint 9
  ├─ refreshBiomeChip() // NEW
  │  ├─ getElementById('biome-chip')
  │  └─ renderBiomeChip(containerEl, state.world.biome_id):
  │     ├─ formatBiomeChip(biomeId) → '<span class="biome-icon">🌾</span><span class="biome-label">Savana</span>'
  │     ├─ se HTML empty → containerEl.classList.add('biome-hidden') + clear innerHTML + remove title
  │     └─ else → remove .biome-hidden + innerHTML = HTML + setAttribute('title', `Biome: ${id} — vedi Codex per dettagli`)
  └─ applyPressurePalette(world) // existing
```

**Style**:

- Pill rounded (border-radius 999px) — visibile next to header buttons ma più piccolo/discreto di objective bar
- Green-tinted (`rgba(34, 51, 34, 0.32)` bg + `#4a5d3f` border) — colore biome/natura distintivo da altri HUD elements
- Icon emoji + label uppercase tagstyle
- Hover state slightly brighter (cursor:help indica clickable future codex link)
- Hidden by default (`.biome-hidden` display:none) — graceful degrade quando biome_id null

## Test budget

- `tests/play/biomeChip.test.js`: **17/17** verde
  - `labelForBiome` (4 test): 8 canonical + case-insensitive + Title-Case fallback unknown + null/empty
  - `iconForBiome` (3 test): canonical emoji + 🌍 default unknown + null
  - `formatBiomeChip` (4 test): canonical → HTML + fallback unknown + null empty + XSS escape
  - `renderBiomeChip` (6 test): null containerEl no-crash + null biomeId hide + empty hide + canonical reveal + idempotent + switch biome re-render
- `tests/ai/*.test.js`: **363/363** verde (baseline, zero regression)
- `npm run format:check`: All files use Prettier code style ✅
- `python tools/check_docs_governance.py --strict`: errors=0 warnings=0 ✅

## Smoke E2E (browser preview validato live)

- **Backend**: `npm run start:api` su `http://localhost:3334` ✓
- **Play**: `npm run play:dev` su `http://localhost:5180` ✓
- **Verificato in browser**:
  1. Module + biomeChip render path import OK ✓
  2. Bootstrap session enc_tutorial_01 → backend resolve `biome_id: 'savana'` (via encounter YAML loader fallback) ✓
  3. **End-to-end LIVE**: HUD chip render `🌾 Savana` con tooltip `Biome: savana — vedi Codex per dettagli`, classes `biome-chip` (no biome-hidden) ✓

## Anti-pattern Engine LIVE Surface DEAD — Gate 5 DoD

✅ Killer applicato:

- Backend `biomeSpawnBias.js` LIVE da V7 (ADR-2026-04-26) + biome_id populated per session
- Surface DEAD pre-Sprint 11: zero frontend mostrava il bioma corrente al player
- Sprint 11 wire crea la surface immediata, **<60s gameplay** durante bootstrap session
- Visivamente discreto ma persistente (chip pill in header, sempre visibile durante encounter)

## Status §C.2 Surface-DEAD sweep — 6/8 chiusi

| #   | Engine LIVE                | Surface                  | Status                            |
| --- | -------------------------- | ------------------------ | --------------------------------- |
| 1   | predictCombat N=1000       | tooltip hover preview    | 🟢 Sprint 8                       |
| 2   | Tactics Ogre HUD           | HP floating render.js    | 🟢 already live (M4 P0.2)         |
| 3   | Spore part-pack            | drawMutationDots overlay | 🔴 (15h authoring + 3h render)    |
| 4   | Mating engine 469 LOC      | gene_slots → lifecycle   | 🔴 (5h) — **Sprint 12 candidato** |
| 5   | objectiveEvaluator 6 types | HUD top-bar              | 🟢 Sprint 9                       |
| 6   | biomeSpawnBias.js          | biome chip HUD           | 🟢 **Sprint 11 (this)**           |
| 7   | QBN engine 17 events       | session debrief wire     | 🟢 Sprint 10                      |
| 8   | Thought Cabinet 18         | reveal_text_it + UI      | 🟢 Sprint 6 PR #1966              |

## Codice ripristinabile

- Branch: `claude/sprint-11-biome-initial-wave` (da `origin/main` post Sprint 10 merge)
- Stato pre-commit: 1 backend file modificato (1 line) + 1 module nuovo + 1 test nuovo + 3 file UI/wire modificati + CSS modificato
- Backend restart needed quando `sessionHelpers.js` cambia (hot reload non copre `require()` cached modules) — confermato durante smoke E2E

## Next session candidato

Continua §C.2 Surface-DEAD sweep:

- **Sprint 12** (5h): Mating lifecycle wire (Surface-DEAD #4) — `Mating engine 469 LOC` LIVE ma `gene_slots → lifecycle` wire mancante. Sblocca lineage chain visibile post-encounter.
- **Sprint 13** (15h+ authoring): Spore mutation dots overlay (Surface-DEAD #3) — design doc esiste, render code + 30 mutation `aspect_token` authoring residual. Spawn batch 6+12 = ~7h totali per §C.2 7/8 chiusi escludendo Spore authoring.

Bundle 8+9+10+11+12 = ~14h totali per §C.2 7/8 chiusi (escludendo Spore authoring batch).

## Files toccati

```
apps/backend/routes/sessionHelpers.js                                (+ biome_id propagation in publicSessionView)
apps/play/src/biomeChip.js                                           (NEW — module)
apps/play/index.html                                                 (+ #biome-chip HUD slot)
apps/play/src/main.js                                                (+ import + refreshBiomeChip wire)
apps/play/src/style.css                                              (+ .biome-chip pill rules)
tests/play/biomeChip.test.js                                         (NEW — 17 test)
docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md        (§C.2 6/8 chiusi marker)
docs/planning/2026-04-27-sprint-11-biome-chip-handoff.md             (this doc)
CLAUDE.md                                                            (Sprint 11 section pre-pended)
COMPACT_CONTEXT.md                                                   (v15 bump)
BACKLOG.md                                                           (closure entry)
```
