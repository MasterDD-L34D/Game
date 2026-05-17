---
title: M14-A Elevation + Terrain Reactions + Coop Hardening — Plan
workstream: combat
category: plan
doc_status: draft
doc_owner: claude-code
last_verified: '2026-04-25'
source_of_truth: false
language: it
review_cycle_days: 30
tags:
  - m14-a
  - triangle-strategy
  - elevation
  - terrain-reactions
  - coop
  - f-1
  - f-2
  - f-3
  - runtime
related:
  - docs/research/triangle-strategy-transfer-plan.md
  - docs/qa/2026-04-24-coop-phase-validation-pre-playtest.md
  - docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md
  - docs/planning/2026-04-24-session-handoff-compact.md
---

# M14-A Plan — Elevation + Terrain Reactions + Coop Hardening

## Scope (sessione 2026-04-25, single PR)

Stack bundle sicuro, tutto dentro `apps/backend/` + `packs/evo_tactics_pack/data/balance/terrain_defense.yaml` (data extension additiva). Zero touch a guardrail sprint (`.github/workflows/`, `migrations/`, `packages/contracts/`, `services/generation/`).

### In scope

**Coop hardening pre-playtest** (chiude F-1/F-2/F-3 da [`docs/qa/2026-04-24-coop-phase-validation-pre-playtest.md`](../qa/2026-04-24-coop-phase-validation-pre-playtest.md)):

1. **F-1** — `apps/backend/services/network/wsSession.js`: inietta `coopStore` opzionale in `createWsServer({ lobby, coopStore })`. Nel `socket.on('close')` quando scatta `transferHostAuto`, dopo promozione rebroadcast `phase_change` + `character_ready_list` (se orchestrator esiste per quella room) al new host + peers.
2. **F-2** — nuovo endpoint `POST /api/coop/run/force-advance` (host-only): `{ code, host_token, target_phase }` → chiama `orchestrator.forceAdvance(targetPhase)` che è un wrapper attorno a `_setPhase`. Accetta `world_setup` (da `character_creation`) e `world_setup` (da `debrief`, via scenario advance).
3. **F-3** — `coopOrchestrator.submitCharacter()`: membership check `allPlayerIds.length && !allPlayerIds.includes(playerId)` → throw `player_not_in_room`.

**M14-A Triangle Strategy (slice ridotto, solo helpers + data)**:

4. **Elevation attacker bonus** (Mechanic 3A in `docs/research/triangle-strategy-transfer-plan.md:185`):
   - `packs/evo_tactics_pack/data/balance/terrain_defense.yaml`: aggiungo blocco `elevation.attack_damage_bonus: 0.30` + `attack_damage_penalty: -0.15` (simmetrico, mirror TS).
   - `apps/backend/services/grid/hexGrid.js`: export puro `elevationDamageMultiplier({ attackerElevation, targetElevation, bonus, penalty })` → returns 1.30 / 1.00 / 0.85 a seconda di `delta >= 1 / 0 / <= -1`.
   - No wire dei resolver in questo PR — helper shipping-ready + unit test, wire in next PR (è fuori dal 50-line safe zone, richiede review resolver).
5. **Terrain reactions** (Mechanic 4 in `docs/research/triangle-strategy-transfer-plan.md:236`):
   - Nuovo file `apps/backend/services/combat/terrainReactions.js`, puro, senza I/O. Helper `reactTile(currentState, incoming)` che calcola transizione e damage burst per una singola coppia (element, tile).
   - Rules base: `fire+ice→water (steam_damage: 1)`, `fire+water→normal`, `lightning+water→electrified (chain_damage: 2)`, `fire+normal→fire (burn_tile_dps: 1)`.
   - Helper `chainElectrified(originHex, tileState, hexNeighborsFn, maxDepth=5)` → BFS tiles `water` per propagare electrified con cap TS-style.
   - Zero persistence, zero round hook. Pure logic + tests. Wire next PR.

### Out of scope (deferred next PR o next session)

- **Pincer / follow-up** (Mechanic 3B): richiede `roundOrchestrator.pushFollowup()` + intents queue change. Rischio rotture, fuori 50-line zone. Deferred.
- **Facing + rear crit** (Mechanic 3C): richiede `unit.facing` stato + tracking move directions in round. Medium effort, wire extensivo. Deferred M14-B.
- **Weather global modifier** (Mechanic 4 weather): richiede biome/session integration. Deferred.
- **Push / ledge / collision** (Mechanic 5): ~4h standalone PR. Deferred.
- **UI facing arrows / TV telegraph**: Mission Console bundle pre-built, fuori repo. Non toccabile.
- **Wire elevation nel damage step** (resistanceEngine.js + predictCombat): richiede test regression 307/307 + e2e su combat. Deferred per safety — il multiplier è pure helper, chiunque wire può chiamarlo.

## Guardrail compliance

- [x] 50-line rule: touch solo `apps/backend/` + `packs/evo_tactics_pack/data/balance/terrain_defense.yaml` (data extension). Non tocco resolver.
- [x] No `.github/workflows/`, `migrations/`, `packages/contracts/`, `services/generation/`.
- [x] No nuove deps npm/pip.
- [x] Traits inalterati (no `data/core/traits/active_effects.yaml`).
- [x] 4-gate DoD:
  - G1 research: ✅ Triangle Strategy transfer plan letto + coop validation report letto + paths verified.
  - G2 smoke: tests unit per ogni module.
  - G3 tuning: run `node --test tests/ai/*.test.js` + `tests/api/coop*.test.js`.
  - G4 polish: caveman comments, no redundancy.

## Rollback plan (03A)

- **F-1 fix**: revert parameter inject `coopStore` = no-op (guarda `if (coopStore) ...`). Zero side effect se non iniettato.
- **F-2 endpoint**: rimozione route `/coop/run/force-advance` non rompe flow esistente.
- **F-3 membership check**: invertibile con flag `allPlayerIds.length === 0` (sempre permesso se lista vuota).
- **Elevation helper**: mai chiamato dal resolver in questo PR → zero runtime impact se si vuole rimuovere.
- **Terrain reactions**: nuovo file non importato da nessuno runtime. Safe remove.

## Test target

Nuovi test (stima +20-25):

- `tests/api/coopRoutes.test.js`: +3 test force-advance (happy, non-host reject, invalid phase reject)
- `tests/api/coopOrchestrator.test.js`: +2 test (membership check F-3, forceAdvance)
- `tests/network/wsSessionCoopRebroadcast.test.js`: +1-2 test (host transfer triggers rebroadcast se coopStore presente)
- `tests/combat/elevationMultiplier.test.js`: +4 test (above/same/below/custom bonus)
- `tests/combat/terrainReactions.test.js`: +6 test (4 transition + chain depth + cap)

Regression: `node --test tests/ai/*.test.js` (307/307 baseline) + coop suite (26 esistenti).

## Next PR candidates

1. **Wire elevation in resolveAttack + predictCombat** (rischio medio, richiede N=1000 regression).
2. **Facing + rear crit** (M14-B slice).
3. **Pincer follow-up** (Mechanic 3B standalone).

## Reference pointers

- `apps/backend/services/grid/hexGrid.js:40-51` — hex distance + neighbors (base per chain BFS)
- `apps/backend/services/coop/coopOrchestrator.js:106-132` — submitCharacter (F-3 target)
- `apps/backend/routes/coop.js:37-41` — `allPlayerIds(room)` helper (cross-check per F-3)
- `apps/backend/services/network/wsSession.js:765-784` — close handler (F-1 target)
- `docs/research/triangle-strategy-transfer-plan.md:179-283` — Mechanic 3+4 spec
- `docs/qa/2026-04-24-coop-phase-validation-pre-playtest.md:95-145` — F-1/F-2/F-3 findings
