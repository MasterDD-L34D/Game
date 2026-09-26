-- SPEC-F TKT-PERSISTENCE-LAYER -- persist the FULL whitelisted companion card.
-- Root fix for the truncation: persistAsync wrote only 6 of the 14 whitelist fields,
-- so species_id / biome_id / mbti_axes / progression / cabinet / mutations / aspect /
-- unit_id / generated_at were lost at the first restart. One nullable JSONB column
-- holds the entire sanitized (PII-free) card; fromPrismaRow prefers it and falls back
-- to the 6 legacy columns when NULL (pre-migration rows). Additive + nullable: existing
-- rows read state=NULL -> the legacy 6-column reconstruction, byte-identical behaviour,
-- no backfill needed.
ALTER TABLE "skiv_companion_states" ADD COLUMN "state" JSONB;
