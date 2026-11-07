-- N2 roster-display: loosen party_rosters -> run.id is an ephemeral co-op key,
-- not a Campaign row. Table is EMPTY (no data migration). Mirrors the
-- SistemaState / CreatureEpigenome loose-campaignId (no-FK) pattern.
ALTER TABLE "party_rosters" DROP CONSTRAINT "party_rosters_campaign_id_fkey";

-- Compound unique enables (campaignId, unitId) upsert (idempotent resubmit),
-- the same key shape creatureEpigenomeStore uses.
CREATE UNIQUE INDEX "party_rosters_campaign_id_unit_id_key" ON "party_rosters"("campaign_id", "unit_id");
