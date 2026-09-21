---
title: 'Sprint 7 — Disco skill check passive→active popup handoff (B.1.8 bundle saturator)'
description: 'Disco Elysium B.1.8 #3 closure — frontend module skillCheckPopup.js consuma trait_effects già emessi dal backend. Bundle Disco Tier S 4/4 saturated. Test 22/22.'
authors:
  - claude-code
created: 2026-04-27
updated: 2026-04-27
status: published
tags:
  - sprint-handoff
  - p4
  - disco-elysium
  - skill-check-popup
  - sprint-7
workstream: ops-qa
---

# Sprint 7 — Disco skill check passive→active popup

**Data**: 2026-04-27 · **Sessione**: autonomous · **Modalità**: 5/5 doc upkeep ritual

## TL;DR

Sprint 7 chiude **B.1.8 #3** (Disco skill check passive vs active popup) — l'ultimo residuo del bundle Disco Elysium Tier S. Pattern: surface al player **in-moment** quando un trait passivo triggera durante combat, via popup floating Disco-style `[NOME TRAIT]` sopra l'actor.

Implementazione **frontend-only**: backend già emette `trait_effects[]` in event payload via `evaluateAttackTraits` → ho aggiunto un nuovo modulo `apps/play/src/skillCheckPopup.js` che lo consuma + un wire 1-line in `main.js processNewEvents`.

**Pillar P4 status**: 🟢 def → **🟢 def++** (Disco bundle Tier S 4/4 saturated).

## Bundle Disco Elysium — stato finale

| #   | Pattern                                         | Effort | Donor PR                                                                | Status     |
| --- | ----------------------------------------------- | ------ | ----------------------------------------------------------------------- | ---------- |
| 1   | Thought Cabinet UI panel + cooldown round-based | ~8h    | [PR #1966](https://github.com/MasterDD-L34D/Game/pull/1966) Sprint 6    | ✅ MERGED  |
| 2   | Internal voice 4-MBTI axes diegetic             | ~10h   | [PR #1945](https://github.com/MasterDD-L34D/Game/pull/1945)             | ✅ MERGED  |
| 3   | **Skill check passive→active popup**            | ~4h    | _this sprint_                                                           | ✅ this PR |
| 4   | Day/time pacing flavor copy                     | ~2h    | [PR #1934](https://github.com/MasterDD-L34D/Game/pull/1934) Sprint 1 §I | ✅ MERGED  |

## Deliverable

| Layer  | File                                                                                                                                               | Cambio                                                                                                                                                                |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Module | [`apps/play/src/skillCheckPopup.js`](../../apps/play/src/skillCheckPopup.js) NEW                                                                   | `formatTraitLabel(traitId)` + `buildSkillCheckPayload(traitEffects, opts)` (pure transform) + `renderSkillCheckPopups(event, actor, pushPopupFn, opts)` (side effect) |
| Wire   | [`apps/play/src/main.js`](../../apps/play/src/main.js)                                                                                             | Import + chiamata in `processNewEvents` post `handleDamageEvent`. Trigger condizionato a `Array.isArray(ev.trait_effects) && ev.trait_effects.length > 0`             |
| Tests  | [`tests/play/skillCheckPopup.test.js`](../../tests/play/skillCheckPopup.test.js) NEW                                                               | 22 unit test (3 describe blocks: formatTraitLabel + buildSkillCheckPayload + renderSkillCheckPopups con pushPopup spy)                                                |
| Ticket | [`data/core/tickets/merged/TKT-NARRATIVE-DISCO-SKILL-CHECK-POPUP.json`](../../data/core/tickets/merged/TKT-NARRATIVE-DISCO-SKILL-CHECK-POPUP.json) | Renamed da `proposed/` + `status: merged` + `merged_at: 2026-04-27` + summary aggiornata                                                                              |

## Architettura

**Backend pre-esistente** (zero change):

- `apps/backend/services/traitEffects.js` `evaluateAttackTraits()` ritorna `{trait_effects: [{trait, triggered, effect}]}` aggregando actor-side + target-side traits
- `apps/backend/routes/session.js performAttack` injecta `trait_effects` in attack event payload (line 975)
- `apps/backend/services/abilityExecutor.js` injecta `trait_effects: []` placeholder in ability events
- `passesBasicTriggers` valida i trigger (action*type, on_result, min_mos, requires*_, requires*target*_, melee_only, ecc.)

**Frontend nuovo**:

```
processNewEvents(prevWorld, newWorld)
  ├─ for each event in newWorld.events.slice(lastEventsCount)
  │  ├─ if action_type === 'attack' || 'ability'
  │  │  ├─ handleDamageEvent({actor, target, damage, ...})  // existing
  │  │  └─ if (trait_effects.length > 0)
  │  │     └─ renderSkillCheckPopups(ev, actor, pushPopup)  // NEW
  │  │        ├─ buildSkillCheckPayload(trait_effects)      // pure transform
  │  │        │  ├─ filter triggered === true
  │  │        │  ├─ dedupe by trait_id
  │  │        │  ├─ apply skipTraits opt (skip noisy)
  │  │        │  └─ map → {trait_id, label, effect_tag}
  │  │        └─ for each, schedule pushPopup(actor.x, actor.y - idx*0.32, '[LABEL]', '#c6a0ff')
  │  │           ├─ first popup: synchronous
  │  │           └─ subsequent: setTimeout(idx * delayMs)
  │  └─ ...
```

**Stile Disco-Elysium**:

- Caps + brackets (`[ARTIGLI SETTE VIE]`) → distingue da damage popup numerico (`-3` / `+5`)
- Color cyan-violet `#c6a0ff` (default) → distingue da damage red / heal green
- Y-offset crescente per popup multipli stesso evento → stack visivo dal basso verso l'alto
- Stagger 220ms → leggibilità senza overlap

## Test budget

- `tests/play/skillCheckPopup.test.js`: **22/22** verde
  - `formatTraitLabel` (3 test): snake_case → CAPS + null/undefined/empty + whitespace trim
  - `buildSkillCheckPayload` (10 test): pure transform — non-array input, empty array, filter non-triggered, dedupe, skipTraits Set/Array, missing trait id, mixed actor+target real backend payload, effect tag handling
  - `renderSkillCheckPopups` (9 test): side effect orchestration — no actor, no position, non-function fn, single popup, stagger, y-offset, no triggered, null event, opts.color override
- `tests/ai/*.test.js`: **363/363** verde (baseline, zero regression)
- `npm run format:check`: All files use Prettier code style ✅
- `python tools/check_docs_governance.py --strict`: errors=0 warnings=0 ✅

## Smoke E2E (browser preview validato)

- **Backend**: `npm run start:api` su `http://localhost:3334` ✓
- **Play**: `npm run play:dev` su `http://localhost:5180` ✓
- **Verificato in browser**:
  1. Module `skillCheckPopup.js` importato dinamicamente ✓
  2. `buildSkillCheckPayload([{trait:'artigli_sette_vie', triggered:true, effect:'extra_damage'}, {trait:'thermal_armor', triggered:false}])` → `[{trait_id:'artigli_sette_vie', label:'ARTIGLI SETTE VIE', effect_tag:'extra_damage'}]` (1 popup, filtrato)
  3. `renderSkillCheckPopups({trait_effects:[3 items, 2 triggered]}, actor, pushPopup)` → 2 popups scheduled
  4. Backend `world.events[].trait_effects` confermato live via `/api/session/state` (verified `{trait:'zampe_a_molla', triggered:false, effect:'none'}` su attack non-triggerante; con setup elevation+min_mos triggererebbe correttamente)
- **Smoke gap**: non ho riprodotto un attack che effettivamente fa triggerare un trait passivo (richiede scenario più strutturato — elevation per zampe_a_molla o target con pelle_elastomera). Compensato da unit test che usa real-shape payload da `evaluateAttackTraits`.

## Anti-pattern Engine LIVE Surface DEAD — Gate 5 DoD

✅ Killer applicato:

- Backend trait_effects era LIVE (engine `evaluateAttackTraits`) ma surface DEAD: il frontend ignorava il campo
- Sprint 7 wire crea la surface immediata, <60s gameplay durante un combat con trait equipaggiato
- Visualmente distinto da damage popup (caps + brackets + violet color), così il player può distinguere "danno inflitto" da "skill mia che fired"

## Codice ripristinabile

- Branch: `claude/sprint-7-skill-check-popup` (da `origin/main` `4eabf7e6`)
- Stato pre-commit: 1 file nuovo + 1 modificato + 1 ticket renamed + 5 doc updates
- Pre-existing assumption: il modulo presume `pushPopup(x, y, text, color)` da `anim.js` (signature standard usata in MP grants + xp grants + form change)

## Residui Disco — NESSUNO

Bundle Disco Elysium Tier S **chiuso 4/4**. Nessun pattern Disco residuo in §B.1.8.

## Next session candidato

Esci dal Disco bundle. Possibili direzioni P4 / non-Disco:

- **P4 mid**: B.1.6 XCOM EW Officer Training School meta perks (~10h)
- **P4 mid**: B.1.11 Wildermyth layered storylets pool (~10h)
- **P3 deep**: ability r3/r4 tier extension (~10h)
- **P6**: B.3 #2 Frozen Synapse replay cinematico round 3-5s (~10-14h)

## Files toccati

```
apps/play/src/skillCheckPopup.js                              (NEW — module)
apps/play/src/main.js                                         (+ import + processNewEvents wire)
tests/play/skillCheckPopup.test.js                            (NEW — 22 test)
data/core/tickets/proposed/TKT-NARRATIVE-DISCO-SKILL-CHECK-POPUP.json
  → data/core/tickets/merged/TKT-NARRATIVE-DISCO-SKILL-CHECK-POPUP.json   (renamed + status:merged)
docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md (§B.1.8 4/4 BUNDLE COMPLETO + flow diagram)
docs/planning/2026-04-27-sprint-7-skill-check-popup-handoff.md (this doc)
CLAUDE.md                                                     (Sprint 7 section pre-pended)
COMPACT_CONTEXT.md                                            (v11 bump)
BACKLOG.md                                                    (closure entry)
```
