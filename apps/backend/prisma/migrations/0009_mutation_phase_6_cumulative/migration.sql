-- 2026-05-11 TKT-C4 Mutation Phase 6 forbidden path bundle.
-- ADR-2026-05-10 mutation auto-trigger evaluator Phase 6 closure.
-- Master-dd verdict batch 2026-05-11 C4 ACCEPT scoped grant (forbidden path).
--
-- Add 2 JSONB columns to FormSessionState for Phase 6 residue trigger kinds:
--   1. cumulative_ally_adjacent_turns (int counter per unit, cross-session)
--      - Schema: integer (default 0)
--      - Consumer: mutationTriggerEvaluator kind=ally_adjacent_turns
--      - Update: end-of-round bridge hook scans session.units, increments
--        if any ally within Manhattan distance <=1 of this unit.
--      - Optional species_filter ('same') narrows ally pool to unit.species.
--
--   2. cumulative_trait_active (JSONB map {trait_id: count} per unit, cross-session)
--      - Schema: {"<trait_id>": <int_cumulative_fires>}
--      - Es. {"artigli_sette_vie": 14, "coda_frusta_cinetica": 7}
--      - Consumer: mutationTriggerEvaluator kind=trait_active_cumulative
--      - Update: end-of-round bridge hook reads session.events for
--        action_type='trait_fire' actor_id=unit.id + increments per-trait counter.
--
-- Backward-compat: nullable columns, defaults NULL/{}. Existing records
-- unaffected. Service fallback: empty {} / 0 when null.
--
-- Phase 6 closes residue 2/12 deferred kinds. Evaluator runtime full
-- coverage 12/12. Cross-encounter aggregate persisted via write-through
-- adapter pattern (cumulativeBiomeTurns precedent migration 0007).

ALTER TABLE "form_session_states"
ADD COLUMN "cumulative_ally_adjacent_turns" INTEGER DEFAULT 0;

ALTER TABLE "form_session_states"
ADD COLUMN "cumulative_trait_active" JSONB;

-- Indexes deferred — low query volume expected (read once per round-end).
-- Re-evaluate post Phase 6 LIVE if HUD bottleneck emerges.
