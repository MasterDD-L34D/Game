---
title: Handoff fase-2c grid-wiring (board_scale authored grid)
date: 2026-07-03
sprint: big-maps-arc-fase-2c
doc_status: active
workstream: combat
last_verified: 2026-07-03
source_of_truth: false
language: it
---

# Handoff fase-2c grid-wiring -- 2026-07-03

## TL;DR

- **fase-2c grid-wiring SHIPPED + MERGED** (#3199): un `encounter.grid_size` autorato ora dimensiona
  la board, ma solo se l'encounter opta `board_scale: grid_sized`. Default `party_sized` =
  comportamento legacy byte-identical. **Band-neutral**: 0 encounter cambia board.
- **ADR-2026-07-03 = `active`** su main (#3200). Naming ratificato dall'owner `party_sized`/`grid_sized`.
- Keystone del big-maps arc D1: sblocca board grandi opt-in senza toccare il default ne' il render (D10).
- **Capacita' soltanto**: nessun encounter big-board autorato qui. La N=40 re-ratify + il flip del gate
  geometria (#3197) restano downstream, owner-gated.

## PR mergiati (2)

| PR                                                       | Scope                                          | SHA        | Test                            |
| -------------------------------------------------------- | ---------------------------------------------- | ---------- | ------------------------------- |
| [#3199](https://github.com/MasterDD-L34D/Game/pull/3199) | fase-2c grid-wiring (5 unit TDD, band-neutral) | `6703f782` | +11 (resolver 6, sim 2, wire 3) |
| [#3200](https://github.com/MasterDD-L34D/Game/pull/3200) | flip ADR-2026-07-03 draft -> active            | `cf158b09` | docs-only                       |

**#3199 dettaglio** (6 commit ADR-0011): (1) ADR + registry; (2) schema `board_scale` enum
(FORBIDDEN-PATH additivo, default `party_sized`); (3) `resolveBoardSize` + `isAuthoredGrid` puri in
`services/party/loader.js` (unico punto board; `gridSizeFor`/`getModulation` intatti); (4) wire
`session.js` (blocco board RILOCATO dopo `encounterPayload`); (5) sim parity `scenario-enemies.js`
(clamp autorato = `grid_size-1`/asse, `party_sized` = `GRID_SAFE_MAX=5`); (6) doc myth-fix
`15-LEVEL_DESIGN.md` + plan as-built.

DoD verde: AI 567/567 · test:api 25 suite 0-fail · sim 12/12 · resolver 6/6 · schema+datasets (21
encounter `party_sized`) · governance errors=0 · code-reviewer adversariale 0 P1/P2 (band-neutrality
verificata sull'e2e). CI di entrambe le PR CLEAN.

## Ground-truth deviation (verify-first, la lezione della sessione)

Lo spec assumeva `session.encounter` disponibile al punto board-resolve (`session.js:~2396`).
**FALSO**: `encounterPayload` (incl. YAML via `loadEncounter(encounter_id)`, il path primario per
autorare una big-board) e' costruito ~30 righe DOPO. Leggere `req.body.encounter` a 2396 avrebbe
mancato ogni encounter YAML. Fix = RILOCARE il blocco board dopo `encounterPayload` (Option B;
`gridW`/`gridH` = 1 consumer vs encounterPayload ~5 -> blast-radius minimo). `resolveBoardSize`
possiede il fold modulation; invalid-`grid_sized` -> fail-safe a `party_sized`.

## Blockers residui (tutti owner-gated, NESSUNO bloccante)

- [ ] **Autorare >=1 encounter `board_scale: grid_sized`** con un `grid_size` grande (in
      `docs/planning/encounters/`). E' il primo step che rende il wiring OSSERVABILE.
- [ ] **N=10 probe -> N=40 ratify** su quell'encounter (author-guard
      `tools/js/validate_encounter_grid_ratify.js`, #3197; la ratifica NON si trasferisce fra taglie).
- [ ] **Flip del gate geometria** xpBudget (`XP_BUDGET_GEOMETRY_ENABLED`, oggi OFF) post-N=40, per
      misurare hazard/activation sul board reale.
- [ ] Convergenza xpBudget Node vs Python (follow-up noto, vedi [[project_move_terrain_cost_substrate]]).

## Next entry point

1. **First action**: autora un encounter `grid_sized` (es. `docs/planning/encounters/enc_<slug>.yaml`
   con `board_scale: grid_sized` + `grid_size: [W, H]` grande). Il wiring lo onora subito.
2. **Poi**: `node tools/sim/full-loop-batch.js` N=10 probe -> N=40 ratify su quell'encounter; aggiorna
   `data/core/balance/grid_ratify_baseline.json` solo post-evidence.
3. **Reference**: ADR-2026-07-03 (Sequencing) + spec `docs/superpowers/specs/2026-07-03-fase2c-grid-wiring-design.md`
   - plan `docs/superpowers/plans/2026-07-03-fase2c-grid-wiring.md` (as-built).
4. **Estimated effort**: authoring 1-2h; N=40 ratify = sessione dedicata (harness).

## Memory candidates

- [x] `project_big_maps_arc_fase2c_2026_07_03` -- aggiornato (#3199/#3200 built+merged, naming
      ratificato, deviation session.encounter, MEMORY.md index).
- Nessun nuovo `feedback_*`/`reference_*`: la deviation e' catturata nel project memory sopra.
