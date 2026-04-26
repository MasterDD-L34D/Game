---
title: "PCG / Level Design Deep Analysis (2026-04-26)"
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-04-26'
source_of_truth: false
language: en
review_cycle_days: 30
tags: [pcg, encounter, biome, spawn, audit]
date: 2026-04-26
---

# PCG / Level Design Deep Analysis

> Output di `pcg-level-design-illuminator` agent. Spawn da [`docs/reports/2026-04-26-design-corpus-catalog.md`](2026-04-26-design-corpus-catalog.md).

## Encounter coverage matrix

### Templates inventory (`docs/planning/encounters/`, 9 files)

| Encounter | biome_id | Objective | Class | Diff | Conditions | Reinforcement |
|---|---|---|---|---|---|---|
| enc_tutorial_01/02 | savana | elimination/survival | tutorial | 1 | none | no |
| enc_savana_01 | savana | elimination | standard | 2 | fog | no |
| enc_capture_01 | rovine_planari | capture_point | standard | 3 | none | no |
| enc_caverna_02 | caverna | capture_point | standard | 3 | fog+env | no |
| enc_escort_01 | savana | escort | standard | 3 | none | no |
| enc_survival_01 | caverna_sotterranea | survival | hardcore | 4 | none | no |
| enc_frattura_03 | frattura_abissale_sinaptica | survival | hardcore | 5 | fog+stress+collapse | no |
| enc_hardcore_reinf_01 | rovine_planari | elimination | hardcore | 5 | none | YES |

### Runtime scenario objects (tutorial+hardcoreScenario.js, 972 LOC)

8 scenari hardcoded JS. **Tutti** `objective: 'elimination'` string (non schema-compliant object).

## Critical bugs (blocking)

| ID | Severity | Description | File | Fix |
|---|---|---|---|---|
| G1 | P0 | YAML templates **mai loaded runtime** — 9 encounters orphaned | `session.js` + scenario JS | 4-6h encounter loader |
| G2 | P0 | JS runtime objective stringa, non schema object — objectiveEvaluator NEVER evaluates non-elim live | `tutorialScenario.js:25,42`, `hardcoreScenario.js:32,273` | 1h schema align |
| G3 | P1 | biomeSpawnBias disconnesso da initial wave spawn — biome_id zero effect on enemy composition | `reinforcementSpawner.js:84` only consumer | 2h wire to wave spawn |
| G4 | P1 | reinforcement_pool entries missing `archetype` field → biomeSpawnBias archetype branch dead | `encounter.schema.json` + YAML pools | 1h schema + 2h data |
| G5 | P1 | biomeConfig source `require('../../data/biomes')` non verified — may throw runtime | `reinforcementSpawner.js:159` | 1h path verify |
| G6 | P1 | `rovine_planari` + `caverna_sotterranea` usati in 4 encounters ma **absent** da `data/core/biomes.yaml` + manifest | encounter YAMLs + biomes.yaml | 1h add o rename |
| G7 | P2 | No CI gate valida `docs/planning/encounters/*.yaml` vs schema — drift risk post pincer ADR | `.github/workflows/` | 1h npm script |

### Schema violation
`hardcoreScenario.js:29,270` ha `difficulty_rating: 6` e `7`. Schema max = 5. AJV reject if validated.

## Design space gap

| Axis | Range | Coverage | Score |
|---|---|---|---|
| Objective type | 6 | 4 YAML / **1 JS** | RED runtime |
| Biome canonical | 19 | 5 YAML / 4 JS | RED |
| Enemy pool variety | per-biome | **0** hardcoded | RED |
| Conditions | 5 | 3 YAML / **0 JS** | RED runtime |
| Reinforcement | optional | 1/9 YAML | YELLOW |
| Per-run randomization | needed ITB | **0** | RED |
| biome_id alignment biomes.yaml | 100% | ~70% | YELLOW |

**Emergence: RED/YELLOW**. 7/8 JS scenarios = flat elimination, no conditions, no reinforcement, no biome composition.

## Top-3 pattern reco

**P0 — ITB hand-made + random elements** (~3-5h):
- Mantieni hand-authored (correct <20 budget).
- Add per-run variance: `enemy_pool_candidates[]` + `condition_candidates[]` in `/start`. Pick-N session init.
- File: `tutorialScenario.js` + `hardcoreScenario.js` + `session.js /start`.

**P0 — YAML encounter loader** (critical blocker, ~4-6h):
- Wire `docs/planning/encounters/*.yaml` → session /start.
- Sblocca: objectiveEvaluator 5 types, biomeSpawnBias initial waves, conditions runtime.
- File: new `services/combat/encounterLoader.js` + `session.js:1174`.

**P1 — Pathfinder XP budget** (~2h):
- enc_hardcore_reinf_01 reinforcement pool uncalibrated.
- Map XP budget: minion=100/elite=500/apex=1000.
- Integra `data/core/balance/damage_curves.yaml`.

## What NOT to do

- No full PCG encounter generation MVP. ITB random + 9 authored = right ROI.
- No Dormans grammar finché campaign arc M10+ con >30 encounter.
- No WFC layout — grid orthogonal/hex set by party.yaml.
- No LLM generation — unplayable risk no repair loop.
- **Fix G1 (YAML loader) BEFORE adding PCG infrastructure**.

## Escalation

- G1/G2 → `session-debugger` (runtime path audit)
- G4/G6 → `schema-ripple` (encounter.schema.json + biomes.yaml ripple)
- Reinforcement calibration → `balance-illuminator` (XP + N=10 harness)
