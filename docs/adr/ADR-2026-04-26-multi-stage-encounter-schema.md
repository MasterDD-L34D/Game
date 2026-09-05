---
title: 'ADR-2026-04-26 — Multi-stage encounter schema (HP threshold + form switch)'
doc_status: draft
doc_owner: master-dd
workstream: combat
last_verified: '2026-04-26'
source_of_truth: false
language: it
review_cycle_days: 180
related:
  - schemas/evo/encounter.schema.json
  - docs/planning/encounters/enc_frattura_03.yaml
  - docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html
  - docs/adr/ADR-2026-04-20-objective-parametrizzato.md
---

# ADR-2026-04-26 — Multi-stage encounter schema

**Status**: accepted (sign-off master-dd 2026-04-26 sera, sprint kickoff pending Nido merge)
**Decision date**: 2026-04-26
**Accepted date**: 2026-04-26
**Effort impl**: 12-15h (Sprint A)

## Context

Schema attuale (`schemas/evo/encounter.schema.json:41-96`) supporta **single-objective** + `waves[].turn_trigger` (linea 116). Boss multi-stage richiede **HP threshold trigger** + **form/mechanics switch** + **zone-as-stratum**.

Evidenza concreta della frizione: `docs/planning/encounters/enc_frattura_03.yaml:7-9` ha commento esplicito:

```
# NOTE: Original design had 3 branching objectives (disinnescare/accordo/fuga).
# Schema supports single objective — using survival as primary.
# Multi-objective design preserved in docs/planning/ narrative docs.
```

Il design originale (vertical slice 2128 LOC, `docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html:596-779`) prevede **3 strati canonical**:

1. **Strato I — Cresta Fotofase** (linee 596-668): keystone Polpo Araldo Sinaptico, corridoi stabili, primo contatto
2. **Strato II — Soglia Crepuscolare** (linee 670-720): nebbia mnesica, sciame larve neurali, decisione morale
3. **Strato III — Frattura Nera** (linee 722-780): apex Leviatano Risonante, climax accordo/ritirata/combat

Strati già wired in `data/core/traits/biome_pools.json:381,417,453` (`fotofase_synaptic_ridge`, `crepuscolo_synapse_bloom`, `frattura_void_choir`). Manca runtime per progressione fra strati.

## Decision

Estendi `encounter.schema.json` con campo opzionale `phases[]` (additive, non breaking):

```yaml
phases:
  - phase_id: 1
    name: 'Cresta Fotofase'
    enter_condition:
      type: encounter_start
    grid_zone: [0, 0, 11, 3] # bounding box strato I
    objective_override:
      type: capture_point
      target_zone: [4, 1, 7, 2]
      hold_turns: 3
    mechanics_modifiers:
      visibility_radius: 6
      stress_wave_disabled: true
    transition_animation: bloom_wave

  - phase_id: 2
    name: 'Soglia Crepuscolare'
    enter_condition:
      type: phase_objective_completed
      from_phase: 1
    mechanics_modifiers:
      visibility_radius: 4 # fog
      hazard: memory_fog
    transition_animation: eclissi_sinaptica

  - phase_id: 3
    name: 'Frattura Nera'
    enter_condition:
      type: hp_threshold
      target_unit_role: apex
      threshold_pct: 60
    mechanics_modifiers:
      apex_form: leviatano_risvegliato
      reaction_pool: [canto_dello_strappo]
    transition_animation: risveglio
```

`enter_condition.type` enum: `encounter_start | turn_count | hp_threshold | phase_objective_completed | objective_zone_held`.

Backward compat: encounter senza `phases[]` resta single-stage (oggi 100% encounter).

## Consequences

**Positive**:

- Sblocca riuso vertical slice 2128 LOC senza shippare nuovo engine boss
- `enc_frattura_03.yaml` migration path documentato — TODO commento linea 7-9 risolto
- Frontend HUD può mostrare phase indicator (riusa pattern `progressionPanel.js`)
- Pattern riusabile per ogni encounter apex futuro (rottura precedente strict single-objective)

**Negative**:

- `objectiveEvaluator.js` (line 13 outcome enum) richiede phase-aware evaluation — refactor minor
- Test surface esplode: ogni encounter multi-phase → N×phases test cases
- Schema seam `packages/contracts` → ripple test backend + dashboard (mitigation: campo additive optional)

**Risk register dedicato**: vedi `docs/planning/2026-04-26-leviatano-sprint-plan.md` § Risk register.

## Alternatives considered

- **A) Multi-encounter chain** (3 encounter sequenziali via campaign advance): UX stutter fra match, perde tensione climax, scartato.
- **B) `waves[]` HP-trigger overload**: hack su schema esistente, non gestisce mechanics switch (visibility, hazard), scartato.
- **C) Custom boss state machine in `apps/backend/services/combat/`**: bypass schema, viola SoT data-driven principle, scartato.

## DoD

1. Schema `phases[]` definito + AJV register
2. `enc_frattura_03.yaml` migrato a 3-phase
3. Runtime evaluator phase transition in `services/combat/phaseEvaluator.js` (nuovo)
4. Frontend HUD phase indicator
5. Test: ≥10 unit (transitions) + 1 integration (full encounter playthrough)
6. Balance N=10 sim su 3-phase encounter

## References

- `schemas/evo/encounter.schema.json:41-96` — current single-objective schema
- `docs/planning/encounters/enc_frattura_03.yaml:7-9` — DOWNGRADED comment evidence
- `docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html:596-779` — 3-strati design 1:1
- `data/core/traits/biome_pools.json:381,417,453` — strata già pool-wired
- `apps/backend/services/combat/objectiveEvaluator.js:13` — outcome enum chiuso (impatto Sprint B)
- ADR-2026-04-20 objective parametrizzato (precedente schema extension)

## Sequencing

**Prerequisito di** ADR-2026-04-26 parley-outcome-enum (Sprint B richiede phase finale come trigger parley).
