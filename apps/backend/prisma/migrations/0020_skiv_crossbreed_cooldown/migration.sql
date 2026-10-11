-- SPEC-F -- durable crossbreed cooldown (ADR-04-27 "1 crossbreed per campaign per
-- lineage"). The cooldown lived in a per-router in-memory Set, so a backend restart
-- reset it (re-crossbreed exploit). One nullable JSONB column holds the campaign ids
-- a lineage crossbred in (FIFO cap 20 app-level); boot bulk-hydrate reloads it.
-- Server-side metadata like `owner`: campaign_id never enters the whitelisted
-- shareable card (the privacy leak that killed the #3101 contracts-field approach).
-- Additive + nullable: existing rows read NULL -> empty list, no backfill.
ALTER TABLE "skiv_companion_states" ADD COLUMN "crossbreed_campaigns" JSONB;
