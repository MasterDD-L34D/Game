---
title: 'Per-creature volo grade thread -- spec (owner-gated schema + ready-to-wire)'
date: 2026-06-28
doc_status: draft
doc_owner: master-dd
workstream: combat
last_verified: '2026-06-28'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [combat, movement, volo, volo-grade, species, schema, substrate, spec]
---

# Per-creature volo grade thread -- spec

> **Origine**: harsh+opposite review 2026-06-28 + master-dd decision (AskUserQuestion). Path A (#3050)
> assigns `adattamento_volo` to the 3 flyer species but they all default to **grade 1** -- the ratified
> per-creature grades (echo-wing g1 / aurora-gull g2 / noctule-termico g3) are NOT honored, because the
> grade has no per-creature source the runtime reads. This spec defines the owner-gated schema change +
> the ready-to-wire engine thread. **Owner does the schema edit; I wire the thread on approval.**

## 1. Gap (verified)

- `evaluateVoloGrade(registry, actor)` (`movementResolver.js`) reads `actor.volo_grade` (per-unit override,
  clamp [1,3]) -> registry base -> 1. The per-unit field works (PR #3020, verified).
- BUT the runtime path that builds units from species -- `ecologyCombatAdapter.deriveCombatStats`
  (`apps/backend/services/worldgen/ecologyCombatAdapter.js:188`) -- maps `genetic_traits.core -> unit.traits`
  but **never sets `unit.volo_grade`**. So every species-spawned volo carrier gets grade 1.
- The species YAML (`packs/evo_tactics_pack/data/species/*.yaml`) has no `volo_grade` field, and the schema
  `schemas/evo/species.schema.json` is `additionalProperties: false` -> **adding the field fails validation**
  without a schema change.

**Severity**: NOT a safety bug. g1 frees normal terrain but leaves hazard (lava/acqua_profonda) at full cost,
so a g1 flyer is STRICTLY weaker than its ratified g2/g3 -- conservative. It is a **fidelity gap** vs the
ratification, load-bearing only on hazard encounters AND only after the flip (`MOVE_TERRAIN_COST_ENABLED` ON;
currently OFF). So it gates the flip, not the merge.

## 2. Owner action (schema, forbidden-path)

Add an optional integer field to the species schema (the level where `genetic_traits`/`morphotype` live):

```json
"volo_grade": { "type": "integer", "minimum": 1, "maximum": 3 }
```

`schemas/evo/species.schema.json` is a guarded path -> master-dd edits it. After that, the 3 flyer species
get `volo_grade: 1|2|3` (echo-wing 1, aurora-gull 2, noctule-termico 3).

## 3. Engine thread (I wire on approval -- ready)

1. `ecologyCombatAdapter.deriveCombatStats`: after the `traits` line, add
   `const voloGrade = Number.isFinite(Number(species.volo_grade)) ? Number(species.volo_grade) : undefined;`
   and include `...(voloGrade ? { volo_grade: voloGrade } : {})` in the returned unit. (clamp happens
   downstream in `evaluateVoloGrade`.)
2. The scenario loaders that build a stripped `norm` from the species YAML must pass `volo_grade` through:
   - `forestaPilotScenario.loadForestaSpecies` (`norm = {...}` -- add `volo_grade: parsed.volo_grade`).
   - `badlandsPilotScenario` equivalent loader (same).
     (Any caller passing the full species object already carries it.)
3. Test: a species with `volo_grade: 3` -> `deriveCombatStats(...).volo_grade === 3` -> on a lava tile,
   `evaluateVoloGrade` returns 3 -> `applyVoloGrade` frees the hazard. Mirror `voloGradePercreature.test.js`.

## 4. Boundary / gating

- Conservative-safe to leave g1-only until the flip; do NOT block #3050 (band-neutral, flag-OFF) on this.
- This thread is a **flip prerequisite** alongside the Gate-5 Godot telegraph and the calibration-harness
  band (issue #3053). All three must hold before `MOVE_TERRAIN_COST_ENABLED=true`.
- No new derived-catalog regen (deriveCombatStats reads packs species directly; the trait/grade path is
  authored + runtime-read, NOT the species_catalog.json ETL).
