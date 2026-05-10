-- 2026-05-10 TKT-MUT Q4 Prisma schema migration cumulative_biome_turns.
-- ADR-2026-05-10 mutation auto-trigger evaluator Phase 5 dependency.
--
-- Add `cumulative_biome_turns` JSONB column to FormSessionState.
-- Schema: { "<biome_class>": <int_turns_cumulative_cross_session> }
-- Es. {"upland": 12, "wetland": 8} = unit accumulated 12 turns in upland
-- biome + 8 in wetland across all sessions (delta tracked per session,
-- aggregated cross-session via Prisma persist).
--
-- Consumer: apps/backend/services/combat/mutationTriggerEvaluator.js
-- kind=cumulative_turns_biome (currently stub Phase 5). Post-migration,
-- evaluator reads unit.cumulative_biome_turns[biome_class] >= threshold
-- → triggered. Update happens end-of-encounter (sessionRoundBridge or
-- session end handler).
--
-- Backward-compat: nullable column, defaults NULL. Existing records
-- unaffected. Service fallback empty {} when null.

ALTER TABLE "form_session_states"
ADD COLUMN "cumulative_biome_turns" JSONB;

-- Index per biome_class lookup performance (optional, skip if low query volume).
-- Deferred future index: si query patterns mostrano biome lookup bottleneck.
