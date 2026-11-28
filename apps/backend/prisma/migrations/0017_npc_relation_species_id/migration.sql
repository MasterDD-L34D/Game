-- Species enrichment — NpcRelation gains a nullable species_id so a recruited
-- NPC can carry its real species into party_rosters (vs the 'unknown' default).
-- Additive + nullable: npc_relations has live rows but no backfill is needed
-- (legacy relations have no known species; the column reads NULL → 'unknown',
-- the current behaviour). Mirrors the 0007 ADD COLUMN style.
ALTER TABLE "npc_relations" ADD COLUMN "species_id" TEXT;
