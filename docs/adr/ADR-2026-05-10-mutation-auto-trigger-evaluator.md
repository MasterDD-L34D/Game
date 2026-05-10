---
status: draft
date: 2026-05-10
deciders: master-dd, claude-autonomous
tags: [mutation, runtime, gate-5, p0]
supersedes: []
superseded_by: []
related:
  - docs/planning/2026-04-25-mutation-system-design.md
  - data/core/mutations/mutation_catalog.yaml
  - apps/backend/services/mutationEngine.js
---

# ADR-2026-05-10 — Mutation Auto-Trigger Evaluator

## Status

**DRAFT** — pending master-dd review (TKT-MUT-AUTO-TRIGGER P0 cross-domain audit BACKLOG 2026-05-10).

## Context

Audit cross-domain 2026-05-10 (creature-aspect-illuminator) revealed Gate 5 violation pervasive sul mutation engine:

- **30/30 mutations** in `mutation_catalog.yaml` hanno `trigger_examples` field prose-only
  (es. _"3 stunned applicati in 1 encounter"_, _"10 turni cumulativi in biome palustre"_)
- **ZERO backend evaluator**: nessun service in `apps/backend/services/` parsa
  `trigger_examples` o emette mutation_unlock event basato su raw event log
- `mutationEngine.js` esiste ma serve SOLO `/api/v1/mutations/apply` (player-manual)
- **Auto-unlock path 0% implementato** — design promise di "mutation evolves su
  condition" è inert

**Pattern**: Engine LIVE / trigger DEAD. Design intent vs runtime gap pervasivo.

## Constraints / non-negoziabili

1. **Backward compat**: `/api/v1/mutations/apply` player-manual flow immutato
2. **Schema preserved**: NO breaking change su `mutation_catalog.yaml` (trigger_examples è prose human-readable)
3. **Gate 5 compliance**: feature ship richiede surface player-visible (notifica unlock + log event)
4. **Performance**: evaluator chiamato ogni round end → O(N_mutations × N_units) cap budget
5. **Determinismo**: stesso event sequence → stesso unlock outcome (no flaky)

## Design proposal

### Phase 1 — Structured trigger schema

Augment `mutation_catalog.yaml` con field `trigger_conditions` machine-readable parallelo a `trigger_examples` prose:

```yaml
artigli_freeze_to_glacier:
  tier: 2
  # ... existing ...
  trigger_examples:
    - '3 stunned applicati in 1 encounter'
    - '1 turno passato in biome glaciale post-Sistema pressure tier 2'
  trigger_conditions:
    # Machine-readable. ANY clause vera → mutation unlock available.
    - kind: status_apply_count
      status: stunned
      threshold: 3
      window: encounter # encounter | session | cumulative
    - kind: biome_turn_count
      biome_class: glacial # cryosteppe, caldera_glaciale, etc.
      threshold: 1
      sistema_pressure_min: 50 # pressure tier 2 = 50-74
```

### Phase 2 — Trigger kinds whitelist

Initial kinds set (subset, expandable):

| Kind                     | Params                                       | Source events                                                              |
| ------------------------ | -------------------------------------------- | -------------------------------------------------------------------------- |
| `status_apply_count`     | status, threshold, window                    | session log `apply_status` events                                          |
| `biome_turn_count`       | biome_class, threshold, sistema_pressure_min | session.turn + session.scenario_id biome lookup + session.sistema_pressure |
| `damage_taken_high_mos`  | mos_threshold, count, window                 | session log attack events MoS field                                        |
| `kill_streak`            | count, no_damage_taken_between               | session log kill events ordered                                            |
| `mutation_chain`         | prereq_mutation_id                           | unit.applied_mutations (existing)                                          |
| `cumulative_turns_biome` | biome_class, threshold                       | aggregate across sessions per unit                                         |

### Phase 3 — Evaluator service

New service `apps/backend/services/combat/mutationTriggerEvaluator.js`:

```js
// API:
//   evaluateMutationTriggers(unit, session, registry) → unlocked: string[]
//   Called from sessionRoundBridge.applyEndOfRoundSideEffects.
//
// Returns array of mutation_id newly unlocked this round (delta).
// Side-effect: unit.unlockedMutations Set updated.
//
// Idempotent: re-call same state → empty delta (already-unlocked filtered).
//
// Performance: per-unit per-round, evaluates only mutations with prereq
// satisfied (skip locked-by-tier path).
```

### Phase 4 — Surface (Gate 5)

1. **Session response**: emit `mutation_unlocked` event in raw event log (action_type='mutation_unlock')
2. **HUD notification**: frontend reads event log → toast notification "X mutation disponibile" (frontend-coord required, separate ticket)
3. **CLI / debug log**: `[mutation-trigger] unit=<id> unlocked=<mutation_id> reason=<kind>` log line

## Trade-offs

| Approach                      | Pro                               | Con                                                  |
| ----------------------------- | --------------------------------- | ---------------------------------------------------- |
| **Phase 1 only** (schema add) | Zero risk, ADR ship now           | Trigger evaluation deferred — gap persistent         |
| **Phase 1+2+3**               | Full P0 close, surface player ops | ~5-8h impl + new test suite                          |
| **Phase 1+2+3+4**             | Gate 5 compliant ship             | +3h frontend coord (Mission Console bundle external) |

## Decision pending

**Master-dd verdict needed**:

- **Q1**: Phase scope per primo ship — solo Phase 1 schema OR full Phase 1+2+3 backend OR full 4-phase?
- **Q2**: Trigger kinds priority — start con 3 kinds (status_apply_count + biome_turn_count + mutation_chain) o full 6?
- **Q3**: Default unlock UX — auto-acquire vs player-confirm dialog?
- **Q4**: Cumulative-across-sessions kinds (es. `cumulative_turns_biome`) — richiedono persist su FormSessionState Prisma → schema migration?

## Effort estimate

| Phase                        | Effort     | Owner                                                                      |
| ---------------------------- | ---------- | -------------------------------------------------------------------------- |
| Phase 1 (schema)             | ~1-2h      | master-dd review per kind list + 30 mutation re-tag con trigger_conditions |
| Phase 2 (whitelist + parser) | ~1h        | autonomous                                                                 |
| Phase 3 (evaluator service)  | ~3-4h      | autonomous + test                                                          |
| Phase 4 (surface)            | ~3h        | frontend coord (Mission Console blocked se source non in repo)             |
| **Total**                    | **~8-10h** | mixed                                                                      |

## Out of scope this ADR

- Mutation visual reveal animation (Hades aspect reveal pattern museum M-006)
- Multi-mutation chain dependency resolver (graph cycle detection)
- Mutation rollback path (player-undo unlock)

## References

- `data/core/mutations/mutation_catalog.yaml` (30 mutations, trigger_examples prose-only)
- `apps/backend/services/mutationEngine.js` (existing player-manual flow)
- `apps/backend/services/combat/woundedPerma.js` (canonical reference for "engine + dedicated service" pattern)
- `docs/planning/2026-04-25-mutation-system-design.md` (original design doc)
- BACKLOG.md TKT-MUT-AUTO-TRIGGER section (cross-domain audit 2026-05-10)
- Gate 5 policy: CLAUDE.md §"Gate 5 — Engine wired"
