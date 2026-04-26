---
title: Nido Pokopia Housing Pattern — Sprint A scaffold report
doc_status: draft
doc_owner: eduardo
workstream: cross-cutting
last_verified: 2026-04-26
source_of_truth: false
language: it
review_cycle_days: 30
tags:
  - nido
  - od-001
  - sprint-a
  - mating
  - lineage
summary: >
  Report di context per Sprint A-Nido (OD-001 Path A 1/4). Nido = housing+
  evolution+mutation pattern Pokopia-style. Sbloccato narrativamente da
  evento `biome_arc_completed` + ≥3 missioni nel bioma affinity. Una volta
  sbloccato, sempre accessibile dal menu tra missioni (Stardew Community
  Center pattern). Sprint A = scaffold UI 4-tab + unlock trigger backend.
---

# Nido Pokopia Housing Pattern — Sprint A scaffold report

**Sprint:** A (1/4 di OD-001 Path A mini-accept)
**Effort:** ~5h scaffold work
**Dipendenze:** B/C/D in parallelo da altri agent (potrebbero toccare gli
stessi file — pattern conflict-tolerant additivo).

## TL;DR (5 bullet)

1. **Nido = hub permanente housing+evolution+mutation post-unlock**.
   Sbloccato da evento diegetic narrative (`biome_arc_completed` +
   ≥3 missioni nel bioma affinity), poi sempre accessibile.
2. **Pattern reference**: Pokopia housing/breeding (Pokémon-like
   collection meta) + Stardew Valley Community Center (unlock una
   volta, accessible sempre).
3. **Sprint A scope**: scaffold UI 4-tab (Squad / Mating / Lineage / Codex)
   + header button con `display:none` default + sessionHelpers
   `checkNidoUnlock` helper. Squad tab attivo (lista NPG recruited);
   Mating/Lineage placeholder (Sprint C/D).
4. **Unlock trigger backend**: `publicSessionView` espone
   `nido_unlocked: boolean` derivato da `state.meta?.nido_unlocked`
   o env override `NIDO_UNLOCKED=true` (dev/test). Wire reale al
   narrative engine = Wave 9+ (post Sprint A-D).
5. **Conflict-tolerant**: `nestHub.js` shared con Sprint C (Mating tab)
   e Sprint D (Lineage tab) — placeholder visible "Coming soon" nelle
   tab altrui, no import di moduli inesistenti.

## Verdict OD-001 Path A

**Path A** scelto su Path B/C in audit 2026-04-25 sera (vedi CLAUDE.md
sprint context). Path A = scope mini-accept (4 sub-sprint sequenziali
~23h totali). Path B = full Form evoluzione (sunk cost engine 50-80h,
frontend zero). Path C = skip definitivo OD-001.

Path A copre:
- **Sprint A** (questo): scaffold panel 4-tab + unlock trigger
- **Sprint B**: housing modules (Dormitori, Bio-Lab, Resonance Anchor,
  Hangar) — tier 0-3, costi risorse
- **Sprint C**: Mating tab full wire (NPG select → mating roll →
  offspring traits visualizzati)
- **Sprint D**: Lineage tab full wire (genealogy tree multi-gen,
  inheritance bias visualization)

## Reference

- `docs/core/Mating-Reclutamento-Nido.md` — design canonical Canvas D
- `apps/backend/services/metaProgression.js` — engine 469 LOC live
  (`createMetaTracker` + `createMetaStore` Prisma adapter)
- `apps/backend/routes/meta.js` — 7 endpoint /api/meta/*
- `apps/play/src/skivPanel.js`, `apps/play/src/codexPanel.js` —
  pattern reference (overlay modal con tab)
- Memory: `feedback_tribe_lineage_emergent_breakthrough` — design
  rationale lineage emergente

## Stop-on-blocker (Sprint A)

- Se `metaProgression.js` non ha endpoint per "lista creature owned" →
  **risolto**: `/api/meta/npg` ritorna `{ npcs[], nest }`. Filtraggio
  client-side `recruited:true` per Squad tab.
- Conflict shared file `apps/play/src/main.js` con altri sprint
  paralleli → APPEND, non riscrivere.

## File touched (Sprint A)

- **MODIFY** `apps/play/src/nestHub.js` (transform existing → 4-tab
  layout preservando Mating logic in Mating tab)
- **MODIFY** `apps/play/index.html` (add `<button id="nest-open">`)
- **MODIFY** `apps/play/src/main.js` (import `initNestHub` + wire
  visibility on `state.world.nido_unlocked`)
- **MODIFY** `apps/backend/routes/sessionHelpers.js` (export
  `checkNidoUnlock` + add `nido_unlocked` field to
  `publicSessionView`)
- **NEW** `tests/api/nestHub.test.js` (DOM-free helper tests)
- **NEW** `tests/api/sessionHelpers.nido.test.js` (checkNidoUnlock)

## Out of scope (Sprint A)

- Wire reale al narrative engine (Wave 9+)
- Mating roll full UI (Sprint C)
- Lineage tree multi-gen (Sprint D)
- Housing modules cost/tier (Sprint B)
- E2E test playtest live (post Sprint D)
