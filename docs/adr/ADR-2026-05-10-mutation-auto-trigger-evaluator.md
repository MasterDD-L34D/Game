---
status: accepted
doc_status: draft
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-10
source_of_truth: true
language: it-en
review_cycle_days: 90
date: 2026-05-10
deciders: master-dd, claude-autonomous
tags: [mutation, runtime, gate-5, p0]
supersedes: []
superseded_by: []
related:
  - docs/planning/2026-04-25-mutation-system-design.md
  - data/core/mutations/mutation_catalog.yaml
  - apps/backend/services/mutationEngine.js
  - apps/backend/services/combat/mutationTriggerEvaluator.js
  - apps/backend/routes/sessionRoundBridge.js
---

# ADR-2026-05-10 — Mutation Auto-Trigger Evaluator

## Status

**ACCEPTED 2026-05-11** — master-dd verdict batch 11-decisioni explicit ACCEPT (C2 grant). Implementation runtime live (Phase 1+2+3+4 shipped). **Phase 6 SHIPPED 2026-05-11** (TKT-C4 forbidden path bundle, master-dd grant batch ACCEPT) — Prisma migration 0009 + contracts schema register + 2 trigger kinds runtime + cumulativeStateTracker write-through pattern + 10 test coverage. **12/12 kinds complete**.

**Original status**: PROPOSED 2026-05-10 — pending master-dd formal review.

**Implementation evidence**:

- Phase 1 schema: `data/core/mutations/mutation_catalog.yaml` 27/30 mutations populated `trigger_conditions` (5 mutation_chain-only + 4 manual residue documented inline)
- Phase 2 whitelist + parser: 12 trigger kinds shipped (10/12 active, 2/12 deferred Phase 6 schema migration)
- Phase 3 evaluator: `apps/backend/services/combat/mutationTriggerEvaluator.js` LIVE
- Phase 4 wire: `apps/backend/routes/sessionRoundBridge.js:968` per-unit per-round evaluateAndApply call wired to applyEndOfRoundSideEffects lifecycle
- Surface: raw event log `mutation_unlock` + CLI debug log shipped

**Master-dd review gates outstanding** (Q1-Q4):

- ✅ Q1 phase scope: full Phase 1+2+3+4 SHIPPED (autonomous wave 2026-05-10)
- ✅ Q2 trigger kinds priority: 10/12 active (status_apply_count + biome_turn_count + mutation_chain + 7 expansion)
- ⏳ Q3 default unlock UX: hybrid auto-acquire (tier 1 auto-applied + tier 2-3 unlocked-pending) — master-dd verdict ratify
- ⏳ Q4 cumulative-across-sessions: `cumulative_turns_biome` shipped (Prisma migration 0007 done) — extend Phase 6 verdict pending

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

Expanded 6 → 12 kinds post Phase 1 batch 2-4 auto-extract 2026-05-10
(emerged da regex parser su trigger_examples prose):

| Kind                      | Params                                             | Source events                                                              |
| ------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------- |
| `status_apply_count`      | status, threshold, window, source_trait?           | session log `apply_status` events                                          |
| `biome_turn_count`        | biome_class, threshold, sistema_pressure_min       | session.turn + session.scenario_id biome lookup + session.sistema_pressure |
| `damage_taken_high_mos`   | mos_threshold, count, window, side, elevation_min? | session log attack events MoS field                                        |
| `kill_streak`             | count, no_damage_taken_between                     | session log kill events ordered                                            |
| `mutation_chain`          | prereq_mutation_id                                 | unit.applied_mutations (existing)                                          |
| `cumulative_turns_biome`  | biome_class, threshold                             | aggregate across sessions per unit (Prisma persist Q4 schema migration)    |
| `damage_taken_channel`    | channel, count, window                             | session log attack events damage_channel field                             |
| `ally_killed_adjacent`    | species_filter (same/any), threshold               | session log kill events spatial check                                      |
| `ally_adjacent_turns`     | threshold, window                                  | per-turn proximity check                                                   |
| `assisted_kill_count`     | threshold, window                                  | session log assist events                                                  |
| `sistema_signal_active`   | signal_id                                          | session.warning_signals state                                              |
| `trait_active_cumulative` | trait_id, encounter_count, turns_cumulative        | unit.applied_traits + session aggregate                                    |

### Phase 1 batch 4 auto-extract status (2026-05-10)

Auto-parser via Node regex extracted `trigger_conditions` per 12/27 mutations
con `trigger_examples` parseable. Total Phase 1 coverage:

- **27/30 mutations** populated (5 manual batch 1 + 5 manual batch 2 + 5 manual batch 3 + 12 auto-extract batch 4)
- **5 mutations** senza `trigger_examples` (unlock-on-mutation_chain only): coda_balanced_to_counter / ghiandole_ink_to_acid / zampe_spring_to_radiant / simbionte_lichene_solare / branco_cooperazione_segnalata
- **4 mutations** flagged manual fill (parser missed): capillari_to_photovoltaic / cuticole_wax_to_neutralize / ferocia_to_supercritical / recettori_chimici_seed_tracking

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

## Decision ratified (implementation evidence)

**Autonomous wave 2026-05-10 implementation outcomes**:

- **Q1 → DECIDED full 4-phase ship**: Phase 1+2+3+4 wave-shipped autonomous in single sprint window (~3.5h actual vs ~8-10h estimated).
  Rationale: Gate 5 compliance richiede surface ship con backend. Spec-only PR sarebbe lasciato P0 audit ticket aperto a meno di trigger downstream.
- **Q2 → DECIDED 10/12 kinds shipped**: scope expanded da iniziali 6 a 12 post Phase 1 batch 4 auto-extract (regex parser sui `trigger_examples` prose ha rivelato 6 kinds aggiuntivi non previsti).
  2/12 deferred: `ally_adjacent_turns` (require per-turn proximity tracker, Prisma migration 0008+) + `trait_active_cumulative` (cross-encounter aggregate, Prisma migration 0009+). Tracked Phase 6 deferred bundle.
- **Q3 → PROPOSED hybrid auto-acquire**: tier 1 mutations auto-applied to `unit.applied_mutations`; tier 2-3 mutations pushed to `unit.unlocked_mutations` (player-confirm via downstream player action endpoint).
  Master-dd verdict ratify needed: confirm hybrid pattern vs full-auto OR full-player-confirm.
- **Q4 → PARTIAL DECIDED**: `cumulative_turns_biome` shipped (Prisma migration 0007 done). Extension Phase 6 (ally_adjacent + trait_active cumulative) gated master-dd grant per migration 0008+/0009+ (forbidden path).

## Acceptance criteria

ADR acceptance gate (DRAFT → PROPOSED → ACCEPTED):

- ✅ Phase 1 schema additivo zero breaking — `trigger_examples` prose preserved + `trigger_conditions` machine-readable parallelo
- ✅ Phase 2 whitelist 10/12 kinds documented + validated tests `tests/services/mutationTriggerEvaluator*.test.js`
- ✅ Phase 3 evaluator service idempotent + non-blocking errors logged
- ✅ Phase 4 wire to `applyEndOfRoundSideEffects` lifecycle non-blocking (round flow non rotto su evaluator error)
- ✅ Determinismo verificato: stesso event sequence → stesso unlock outcome
- ✅ Gate 5 surface live: raw event log `mutation_unlock` event_type emitted + CLI debug log
- ⏳ Master-dd Q3 verdict hybrid auto-acquire pattern (PROPOSED → ACCEPTED gate)
- ⏳ Phase 6 deferred bundle bounded (2/12 kinds — ally_adjacent_turns + trait_active_cumulative — formal grant per Prisma migration 0008+/0009+)

## Effort estimate vs actual

| Phase                        | Estimate   | Actual    | Owner                                                                              |
| ---------------------------- | ---------- | --------- | ---------------------------------------------------------------------------------- |
| Phase 1 (schema)             | ~1-2h      | ~1h       | autonomous batch 1-4 + master-dd ratify pending per kind list per quality check    |
| Phase 2 (whitelist + parser) | ~1h        | ~0.5h     | autonomous                                                                         |
| Phase 3 (evaluator service)  | ~3-4h      | ~1.5h     | autonomous + 11 test cases verde                                                   |
| Phase 4 (surface)            | ~3h        | ~0.5h     | autonomous (raw event log + CLI debug; HUD toast notification Mission Console TBD) |
| **Total**                    | **~8-10h** | **~3.5h** | autonomous wave 2026-05-10                                                         |

Speedup ~2.5-3x vs estimate (no frontend coord round-trip needed for v1 ship).

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
