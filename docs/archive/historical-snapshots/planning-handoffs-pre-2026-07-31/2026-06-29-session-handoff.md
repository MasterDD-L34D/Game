---
title: '2026-06-29 session handoff -- move terrain-cost: Godot telegraph + flip prereqs'
date: 2026-06-29
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-29'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [handoff, combat, movement, terrain-cost, volo, radici, godot, gate-5, flip]
---

# 2026-06-29 session handoff

> Sessione lunga, cross-repo (Game + Game-Godot-v2). Tema unico: chiudere il **move
> terrain-cost substrate** verso il flip `MOVE_TERRAIN_COST_ENABLED`. Memory:
> [[project_move_terrain_cost_substrate]].

## Shipped

1. **Gate-5 Godot telegraph -- GGv2 PR #557 MERGED** (`36ca823`, squash). Surface player-visible
   del costo-terreno nel client Godot: pure `MoveCostField` (port di `moveCost.js`, parity-pinned a
   `movement_profiles.yaml`) -> `BoardOverlay` cost-cell (badge AP + tint costoso/hazard) -> modo
   destination-pick in `main.gd`. Flag Godot default-OFF (behavior-neutral). 🔑 **verify-first**:
   il combat Godot e' client-side -> il telegraph PORTA la matematica in GDScript, NON chiama il
   backend (l'assunzione del task era sbagliata). 4 fasi TDD subagent-driven + 2-stage review.
   Post-merge fix CI (#557 era rosso): gdlint order/dup-load + Codex P2 occupancy-filter + BOM-strip.
2. **Flip prereqs -- Game PR #3061 OPEN** (band-safe, CI tutta verde, flag OFF):
   - **Path A per-species volo grade**: `volo_grade` sui 3 flyer pack YAML (echo-wing g1 / aurora-gull
     g2 / noctule-termico g3) + `deriveCombatStats` emette `unit.volo_grade` + scenario loaders lift.
     🔑 **NESSUN cambio schema** (verify-first ha ucciso l'edit forbidden-path autorizzato):
     `validate-datasets` accetta il campo sui pack YAML flat -- lo schema `additionalProperties:false`
     gatta i file rich `species:`-wrapped, non questi.
   - **radici DR2 ratificata** (RATIFIED-PROVISIONAL, valore 2 invariato).
   - **Banda N=40 caso-peggiore = WR-NEUTRA** (hazard wall lava+roccia, heavy forzati): delta 0.
     Evidence `docs/reports/2026-06-29-move-terrain-flip-prereqs-evidence.md`.
3. **Pulizia**: branch stale `feat/mesh-roster-batch4` (gia' mergiato via #555) cancellato.

## Verify-first wins (sessione)

- Godot combat e' client-side -> telegraph = port GDScript, non backend-preview.
- Il backend-flip NON richiede l'engine-AP-enforcement Godot (separato, informational).
- Nessun schema forbidden-path per volo_grade (testato `validate-datasets`, non indovinato).
- trace_hash test = solo non-empty, non content-match -> niente regen rischioso.
- mesh-roster-batch4: era gia' tutto in main (#555 merged) -> cancellare, non rebasare.

## Next entry points (owner-gated)

1. **Hazard encounter authoring** -- chip cross-repo `task_16a36a4d` (spawn 2026-06-29): autora
   encounter caricabili (`docs/planning/encounters/`, lava) coi flyer cosi' g2/g3 sono GIOCATI non
   latenti. Il chip fa recon completa + AskUserQuestion sui punti design + piano + build. Roster/balance
   = call master-dd (per questo il chip chiede).
2. **Flip prod**: merge #3061 -> `MOVE_TERRAIN_COST_ENABLED=true` in keys.env + restart
   EvoTacticsBackend (host CODEMASTERDD). User: "lo faccio io con la tua OK" -> eseguibile post-merge.
3. **Audit Codex** sui PR mergiati (in corso a fine sessione) -> fix eventuali thread non risolti.

## Worktrees

- `C:/dev/_gamewt-flip-prereqs` (Game, branch `feat/move-terrain-flip-prereqs`, PR #3061) -- npm ci done.
- Godot telegraph branch gia' mergiato + worktree rimosso.
