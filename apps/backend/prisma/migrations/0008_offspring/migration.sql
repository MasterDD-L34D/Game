-- 2026-05-10 sera Sprint Q+ Q-2 Prisma migration Offspring table.
-- ADR-2026-05-05 Phase B Path γ ACCEPTED 2026-05-10 sera (formal grace
-- closure 2026-05-14). Forbidden path master-dd grant cascade approval
-- session sera "2+3".
--
-- Cross-encounter offspring legacy ritual persistence. Game/ + Godot v2 +
-- evo-swarm CO-02 v0.3 contract `lineage_ritual.schema.json` (Q-1).
--
-- Consumer: apps/backend/services/lineage/propagateLineage.js (Q-3 ship
-- next session) + apps/backend/routes/lineage.js (Q-4 HTTP API).
--
-- Schema additive only (no breaking change existing tables).
-- Composite FK parent_a_id + parent_b_id → UnitProgression.id ON DELETE
-- RESTRICT (preserve offspring chain post parent death).

CREATE TABLE "offspring" (
    "id" TEXT NOT NULL,
    "lineage_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "parent_a_id" TEXT NOT NULL,
    "parent_b_id" TEXT NOT NULL,
    "mutations" TEXT[] NOT NULL,
    "trait_inherited" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "biome_origin" TEXT,
    "born_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offspring_pkey" PRIMARY KEY ("id")
);

-- Lineage chain lookup index (cross-encounter query patterns).
CREATE INDEX "offspring_lineage_id_idx" ON "offspring"("lineage_id");

-- Session lookup index (per-session offspring listing).
CREATE INDEX "offspring_session_id_idx" ON "offspring"("session_id");

-- Composite FK parent A → UnitProgression.
ALTER TABLE "offspring" ADD CONSTRAINT "offspring_parent_a_id_fkey"
    FOREIGN KEY ("parent_a_id") REFERENCES "unit_progressions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Composite FK parent B → UnitProgression.
ALTER TABLE "offspring" ADD CONSTRAINT "offspring_parent_b_id_fkey"
    FOREIGN KEY ("parent_b_id") REFERENCES "unit_progressions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
