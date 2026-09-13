---
title: 'fase-2c grid-wiring: honor authored grid_size via board_scale -- implementation plan (as-built)'
date: 2026-07-03
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-07-03'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [combat, encounter, grid, board-size, party, big-maps, board-scale, tdd, adr, fase-2c]
---

# fase-2c grid-wiring -- implementation plan (as-built)

**Goal:** an authored `encounter.grid_size` sizes the played board when (and only when) the encounter
opts into `board_scale: grid_sized`; the party fill-ratio `gridSizeFor` stays the byte-identical
default for `party_sized` (and absent). Band-neutral: the capability ships dormant.

**Design record:** spec `docs/superpowers/specs/2026-07-03-fase2c-grid-wiring-design.md` (#3198) +
`docs/adr/ADR-2026-07-03-authored-grid-board-scale.md` (owner sign-off 2026-07-03). Parent: big-maps
arc D1 (per-cell, big boards immediately) / D10 (visual-first -> this is backend/opt-in). Prereq:
#3197 (xpBudget geometry gate + author-guard grid-ratify, merged).

**Architecture:** one pure funnel `resolveBoardSize(deployedCount, encounter, modulation)` in
`services/party/loader.js` is the single point that decides the board. `grid_sized` + valid
`grid_size` -> return `grid_size`; else own the modulation->deployed fold and delegate to the
unchanged `gridSizeFor`. `session.js` and the sim both route through it (or its `isAuthoredGrid`
predicate). Adding the enum defaulting to `party_sized` keeps all 21 encounters structurally
unchanged.

## Ground-truth deviations from the spec literal (verified origin/main, resolved during build)

1. **`session.encounter` is NOT available at the old board-resolve point** (spec sez.7 open item):
   `encounterPayload` is built later (incl. YAML via `loadEncounter(encounter_id)` -- the primary
   big-board authoring path). Fix: **relocate the board-resolve block to just before
   `const session = {`** (Option B), so `resolveBoardSize` sees the fully-resolved encounter.
   Chosen over hoisting `encounterPayload` (~5 downstream consumers) because `gridW`/`gridH` have a
   single consumer -> lower blast radius.
2. **`resolveBoardSize` owns the modulation->deployed fold** (session.js used to do it inline). Makes
   the 3rd param genuinely used and satisfies "one point decides the board". Byte-identical to the
   old inline fold for `party_sized`.
3. **Invalid-`grid_sized` falls back to `party_sized` (fail-safe)**, not a hard reject: an authoring
   mistake degrades to a valid party-derived board, not a 500. Schema (`additionalProperties:false`,
   `grid_size` items 4..20) + author-guard catch bad authoring upstream; `isAuthoredGrid` mirrors the
   bounds at runtime because it also runs on live `req.body.encounter` (may bypass schema validation).

## Units (all built TDD, red -> green, band-neutral)

1. **Schema** `schemas/evo/encounter.schema.json` (FORBIDDEN-PATH, master-dd review): additive
   `board_scale` enum `[party_sized, grid_sized]`, default `party_sized`. Not required. `c566beb5b`.
2. **Resolver** `services/party/loader.js`: `resolveBoardSize` + `isAuthoredGrid`; `gridSizeFor`/
   `getModulation` untouched. Test `tests/services/resolveBoardSize.test.js` (6 cases: byte-identical
   party_sized/absent, modulation fold crossing a grid bracket, grid_sized returns grid_size,
   invalid fail-safe, no aliasing). `7258f9950`.
3. **Session wire** `apps/backend/routes/session.js`: board block relocated + calls `resolveBoardSize`.
   Test `tests/api/sessionStartBoardScale.test.js` (grid_sized -> authored board; party_sized/absent
   -> party board). `d944af7df`.
4. **Sim parity** `tools/sim/scenario-enemies.js`: authored spawn clamps to `grid_size-1` per axis
   via `isAuthoredGrid`; party_sized keeps `GRID_SAFE_MAX=5`. Test
   `tests/sim/scenarioEnemiesAuthoredGrid.test.js`. `ba64dcd20`.
5. **Doc** `docs/core/15-LEVEL_DESIGN.md`: corrected the hardcore-06 "`grid_size: 10`" myth (the 10x10
   comes from 8-PG modulation `deployed_7_8`, not the YAML field); documented `board_scale: grid_sized`.
   `387b9d38b`.

ADR + registry: `4dad847d2`.

## DoD outcome (spec sez.6)

- `resolveBoardSize` regression: party_sized/absent == `gridSizeFor` byte-identical -- PASS (6/6).
- `node --test tests/ai/*.test.js` -- PASS 567/567.
- `npm run test:api` -- EXIT 0, 25 sub-suites, 0 fail (incl. the wire + resolver tests).
- Sim authored spawn on-grid (no over-clamp) -- PASS; existing sim suite byte-identical (12/12).
- `npm run schema:lint` + `validate-datasets` -- PASS (all 21 encounters `party_sized`).
- `npm run format:check` on changed files -- clean (repo baseline drift on untouched files is not ours).
- `check_docs_governance.py --strict` -- errors=0.
- Commits: ADR-0011 trailers (`Coding-Agent: claude-opus-4-8` + `Trace-Id` uuidv7), no `Co-Authored-By`.
- Forbidden-path `schemas/evo` flagged for master-dd. No new deps. Band-neutral.

## Downstream (out of scope for this PR -- capability only)

Authoring a big-board `grid_sized` encounter is NOT in this PR. Any encounter later set to
`grid_sized` + resized MUST re-run N=10 probe -> N=40 ratify (author-guard
`tools/js/validate_encounter_grid_ratify.js`, #3197). Sequence: this wiring -> author `grid_sized`
encounter -> N=40 -> flip the xpBudget geometry gate. See ADR-2026-07-03 Sequencing.
