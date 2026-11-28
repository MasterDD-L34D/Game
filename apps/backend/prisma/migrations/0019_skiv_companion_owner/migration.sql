-- SPEC-F Option C -- durable per-Nido ambassador cap.
-- The Option-A per-owner cap (#3138) kept its owner index in memory only, so a
-- restart collapsed every Nido back into the global window. One nullable TEXT
-- column captures the owner (JWT sub else self-asserted player_id) at save-time;
-- hydrateAllAsync({isolate:true}) rebuilds the per-owner FIFO windows at boot.
-- Server-side metadata only: never part of the whitelisted shareable card.
-- Additive + nullable: existing rows read NULL -> ANON bucket on hydrate, no
-- backfill needed, byte-identical behaviour while the isolation flag is OFF.
ALTER TABLE "skiv_companion_states" ADD COLUMN "owner" TEXT;
