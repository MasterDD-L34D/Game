---
title: 'Sprint 8 — predict_combat hover preview handoff (§C.2 Surface-DEAD #1)'
description: 'Engine LIVE Surface DEAD killer — backend /api/session/predict già live, surface DEAD pre-Sprint 8. Tooltip injection on enemy hover con player selezionato. P1 🟢 → 🟢++.'
authors:
  - claude-code
created: 2026-04-27
updated: 2026-04-27
status: published
tags:
  - sprint-handoff
  - p1
  - surface-dead-sweep
  - predict-combat
  - sprint-8
workstream: ops-qa
---

# Sprint 8 — predict_combat hover preview

**Data**: 2026-04-27 · **Sessione**: autonomous · **Modalità**: 5/5 doc upkeep ritual

## TL;DR

Sprint 8 chiude **§C.2 Surface-DEAD #1** (predictCombat N=1000 → Auto-battle button UI). Backend `/api/session/predict` già LIVE (analytic d20 enumeration in `sessionHelpers.js predictCombat`), surface DEAD: il client non chiamava mai questa route.

Surface NEW: quando il player ha selezionato un'unità player E hover sopra un nemico vivo, tooltip injecta `⚔ HIT% · ~DMG · CRIT%` con band color (high green / medium amber / low red) + elevation hint quando significativo. Decision aid <300ms before commit attack.

**Pillar P1 Tattica leggibile**: 🟢 → **🟢++**.

## Pivot record

Sprint inizialmente pianificato come "HP floating numbers". Discovery durante pre-flight: HP numerici già live in `apps/play/src/render.js` line 768 (`${unit.hp}/${maxHp}` rendering attivo, M4 P0.2 era + crit pulse + AP pips). §C.2 stato-arte stale su quel punto.

Pivot: **Sprint 8 → predict_combat hover preview** (era pianificato come Sprint 9). Resequencing: Sprint 9 → Objective UI HUD, Sprint 10 → QBN narrative debrief.

## Deliverable

| Layer      | File                                                                                             | Cambio                                                                                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Module     | [`apps/play/src/predictPreviewOverlay.js`](../../apps/play/src/predictPreviewOverlay.js) NEW     | `colorBandForHit(hitPct)` + `formatPredictionRow(prediction, opts)` (pure) + `getPrediction(sid, actorId, targetId, fetcher)` (async cached) + `clearPredictionCache()` + `_cacheSize()`                     |
| API client | [`apps/play/src/api.js`](../../apps/play/src/api.js)                                             | `api.predict(sid, actorId, targetId)` POST helper                                                                                                                                                            |
| Wire       | [`apps/play/src/main.js`](../../apps/play/src/main.js)                                           | Import + chiamata in mousemove handler post `tooltipEl.innerHTML = buildUnitTooltip(unit)`. Gate: state.sid + selected è player vivo + hovered unit è enemy vivo. `clearPredictionCache()` su nuova sessione |
| CSS        | [`apps/play/src/style.css`](../../apps/play/src/style.css)                                       | `.unit-tooltip .tt-predict` rules con varianti band high/medium/low/unknown/error                                                                                                                            |
| Tests      | [`tests/play/predictPreviewOverlay.test.js`](../../tests/play/predictPreviewOverlay.test.js) NEW | 22 unit test (3 describe blocks: colorBandForHit + formatPredictionRow + getPrediction async memoization)                                                                                                    |

## Architettura

**Backend pre-esistente** (zero change):

- `apps/backend/routes/session.js` POST `/api/session/predict` (line 1620)
- `apps/backend/routes/sessionHelpers.js predictCombat(actor, target)` line 228 — analytic enumeration su d20 (no random sampling, exact enumeration over 20 faces, weighted equally)
- Returns `{simulations: 20, hit_pct, crit_pct, fumble_pct, avg_mos, avg_pt, dc, attack_mod, elevation_multiplier, elevation_delta, expected_damage}`
- M14-A include elevation modifier (1.3 uphill, 0.85 downhill, 1.0 flat); ignora flank/adjacency/rage (richiedono runtime state non disponibile in pure stat call)

**Frontend nuovo**:

```
canvas.mousemove handler
  ├─ tooltipEl.innerHTML = buildUnitTooltip(hovered) // existing
  ├─ tooltipEl.dataset.lastUnitId = hovered.id
  └─ Sprint 8 NEW gate:
     if state.sid AND selected (state.world.units find by id) AND
        selected.controlled_by === 'player' AND selected.hp > 0 AND
        hovered.controlled_by === 'sistema' AND hovered.hp > 0 AND
        hovered.id !== selected.id
     ├─ getPrediction(sid, selected.id, hovered.id, api.predict)
     │  ├─ cache check Map<key=sid::actor::target, Promise>
     │  ├─ if cached: return same promise (memoization)
     │  └─ else: fetcher → unwrap {ok, data} envelope → cache + return
     └─ on resolve:
        ├─ re-check tooltip stato (target potrebbe essere cambiato)
        │  · skip se hidden / lastUnitId !== targetId
        ├─ remove esistente .tt-predict (idempotent on rapid hover)
        └─ insertAdjacentHTML('beforebegin', formatPredictionRow(prediction))
            ↓ inserito sopra .tt-expand-hint (clean visual stacking)
```

**Style band semantic**:

- `≥65% hit` → green (high) — attacca, alta confidence
- `35-64% hit` → amber (medium) — borderline, valuta alternative
- `<35% hit` → red (low) — risky, consider repositioning
- elevation `≠1` (≥0.01 delta) → suffix `· elev ×1.30` o `×0.85`

## Test budget

- `tests/play/predictPreviewOverlay.test.js`: **22/22** verde
  - `colorBandForHit` (4 test): boundary check (high ≥65, medium 35-64, low <35, unknown null/NaN/string)
  - `formatPredictionRow` (9 test): high/medium/low band + elevation hint surfaces only when significant + null/non-object/missing fields graceful → error placeholder + opts.title override
  - `getPrediction` (9 test): null inputs gracefully → null + non-function fetcher → null + happy path + memoization (1 fetch per tuple) + different tuples → independent + envelope unwrap {ok, data} + envelope ok=false → null + fetcher reject → null + clearPredictionCache resets
- `tests/ai/*.test.js`: **363/363** verde (baseline, zero regression)
- `npm run format:check`: All files use Prettier code style ✅
- `python tools/check_docs_governance.py --strict`: errors=0 warnings=0 ✅

## Smoke E2E (browser preview validato live)

- **Backend**: `npm run start:api` su `http://localhost:3334` ✓
- **Play**: `npm run play:dev` su `http://localhost:5180` ✓
- **Verificato in browser**:
  1. Module `predictPreviewOverlay.js` import dinamico OK ✓
  2. `api.predict` exposed in api.js ✓
  3. Direct backend call `POST /api/session/predict` con `{session_id, actor_id: 'p_scout', target_id: 'e_nomad_1'}` → `{hit_pct: 60, crit_pct: 5, expected_damage: 1.4, simulations: 20, ...}` ✓
  4. `getPrediction(sid, 'p_scout', 'e_nomad_1', api.predict)` → unwrapped prediction object ✓
  5. `formatPredictionRow(prediction)` → `<div class="tt-predict tt-predict-medium" title="Predict d20 — 20 faces">⚔ <strong>60%</strong> hit · ~1.4 dmg · 5% crit</div>` ✓
  6. **End-to-end live**: bootstrap session → `state.selected = 'p_scout'` → dispatch mousemove on enemy cell pixel → tooltip popup mostra `⚔ 60% hit · ~1.4 dmg · 5% crit` con band amber, dataset.lastUnitId = 'e_nomad_1' ✓

## Anti-pattern Engine LIVE Surface DEAD — Gate 5 DoD

✅ Killer applicato:

- Backend predict route LIVE da almeno M14-A era (analytic d20 enumeration) ma surface DEAD: client non importava mai `/api/session/predict`
- Sprint 8 wire crea la surface immediata, <60s gameplay durante hover (60Hz mousemove cache-throttled)
- Visualmente distinto da damage popup (band color + bracket icon ⚔ + elevation suffix), così il player può distinguere "info pre-attack" da "info post-attack"

## Status §C.2 Surface-DEAD sweep — 3/8 chiusi

| #   | Engine LIVE                    | Surface                       |               Status               |
| --- | ------------------------------ | ----------------------------- | :--------------------------------: |
| 1   | predictCombat N=1000           | tooltip hover preview         |         🟢 Sprint 8 (this)         |
| 2   | Tactics Ogre HUD               | HP floating render.js         | 🟢 already live (M4 P0.2 line 768) |
| 3   | Spore part-pack design         | drawMutationDots overlay      |                 🔴                 |
| 4   | Mating engine 469 LOC          | gene_slots → lifecycle wire   |                 🔴                 |
| 5   | objectiveEvaluator 5 obj types | encounter scenarios non-elim  |      🔴 — Sprint 9 candidato       |
| 6   | biomeSpawnBias.js initial wave | universal initial wave wire   |                 🔴                 |
| 7   | QBN engine 17 events           | session debrief wire          |      🔴 — Sprint 10 candidato      |
| 8   | Thought Cabinet 18 thoughts    | reveal_text_it authoring + UI |        🟢 Sprint 6 PR #1966        |

## Codice ripristinabile

- Branch: `claude/sprint-8-hp-floating-numbers` (originally planned HP, pivoted to predict hover dopo discovery)
- Stato pre-commit: 5 file modificati + 1 file nuovo + 1 file test nuovo
- Pre-existing assumption: tooltip system esistente (`buildUnitTooltip` + `tooltipEl.dataset.lastUnitId`) usato per gating idempotente

## Next session candidato

Continua §C.2 Surface-DEAD sweep:

- **Sprint 9**: Objective UI HUD (Surface-DEAD #5) — encounter scenarios usano solo elimination, engine `objectiveEvaluator` LIVE supporta 5 obj types (control_zone, extract, survive, escort, eliminate). Surface: HUD top-bar mostra obiettivo corrente + progress (es. "Tieni la zona centrale per 5 round: 3/5"). ~3h.
- **Sprint 10**: QBN narrative debrief beats (Surface-DEAD #7) — engine `narrativeEngine` 17 events LIVE, debrief panel `narrativeFromEvents` solo combat events. Wire QBN events nel debrief panel. ~3h.

Bundle 8+9+10 = ~10h totali, tutti 3 producono delta visibili al player <60s gameplay.

## Files toccati

```
apps/play/src/predictPreviewOverlay.js                                (NEW — module)
apps/play/src/api.js                                                  (+ predict helper)
apps/play/src/main.js                                                 (+ import + mousemove wire + clearPredictionCache on session change)
apps/play/src/style.css                                               (+ .tt-predict rules)
tests/play/predictPreviewOverlay.test.js                              (NEW — 22 test)
docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md         (§C.2 3/8 chiusi marker)
docs/planning/2026-04-27-sprint-8-predict-hover-preview-handoff.md    (this doc)
CLAUDE.md                                                             (Sprint 8 section pre-pended)
COMPACT_CONTEXT.md                                                    (v12 bump)
BACKLOG.md                                                            (closure entry)
```
