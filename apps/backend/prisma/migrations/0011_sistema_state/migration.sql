-- 2026-05-21 M1 ADR-2026-05-18 Option B pilot -- Sistema persistent cross-session
-- learning. units_observed JSONB tracks per-PG-unit {kills_vs_sistema, sightings,
-- threat_level} so the Sistema AI biases defensive vs proven killers across
-- encounters. Mirrors the GodotV2CampaignState JSONB write-through pattern
-- (migration 0010). Campaign-scoped (campaign_id unique). Apply deferred to
-- next deploy via `prisma migrate deploy` (idempotent).

CREATE TABLE "sistema_state" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "units_observed" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sistema_state_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sistema_state_campaign_id_key"
    ON "sistema_state"("campaign_id");
