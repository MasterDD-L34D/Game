-- 2026-05-22 Comprehensive migration-history reconciliation.
-- Follow-up to 0013 (unit_progressions.updated_at, PR #2380): a shadow-DB
--   prisma migrate diff --from-migrations prisma/migrations
--     --to-schema-datamodel prisma/schema.prisma
-- (run from apps/backend against a throwaway Postgres 16 container) revealed
-- the migration history was still broadly out of sync with the canonical
-- schema.prisma beyond the single column already fixed. This migration brings
-- the history fully back in line so that the same diff --exit-code reports NO
-- drift. The schema is the source of truth; this corrective migration is
-- generated verbatim by `prisma migrate diff ... --script`. Additive only --
-- existing migration files (immutable history) are untouched.
--
-- Reconciled drift (3 classes):
--
-- 1. updated_at DEFAULT now() drift (same root cause as 0013) on 6 more tables.
--    Each model declares `updatedAt DateTime @updatedAt @map("updated_at")`,
--    which Prisma manages at the application layer and expects NO SQL default,
--    but the originating migrations created the column with
--    `DEFAULT CURRENT_TIMESTAMP`. Tables: ideas, form_session_states,
--    lobby_sessions, nest_states, npc_relations, skiv_companion_states.
--
-- 2. Four campaign tables present in schema.prisma but MISSING from the
--    migration history: campaigns, chapters, party_rosters, save_snapshots
--    (+ their indexes + FKs). Declared for the Descent-engine campaign work
--    (CAMP-4/5). NOT yet consumed via the Prisma client at runtime --
--    apps/backend/services/campaign/campaignStore.js is still the in-memory
--    store ("Phase B-future swap to Prisma Campaign model"), and prisma/seed.js
--    does not reference them -- so unlike the species/biomes case (0012) there
--    is no seed/route break; this is forward-looking schema parity. CREATE
--    columns were cross-checked against the Campaign/Chapter/PartyRoster/
--    SaveSnapshot models in schema.prisma and match.
--
-- 3. FK referential-action normalization: the FKs on affinity_logs,
--    idea_feedback, mating_events, trust_logs were created without the
--    ON UPDATE CASCADE that the schema relations now imply, so they are
--    dropped and re-added to match.
--
-- Verified: shadow Postgres 16 reports no drift both ways after this migration;
-- `prisma validate` passes; fresh `prisma migrate deploy` + `prisma db seed`
-- succeeds end-to-end.

-- DropForeignKey
ALTER TABLE "affinity_logs" DROP CONSTRAINT "affinity_logs_relation_id_fkey";

-- DropForeignKey
ALTER TABLE "idea_feedback" DROP CONSTRAINT "idea_feedback_idea_id_fkey";

-- DropForeignKey
ALTER TABLE "mating_events" DROP CONSTRAINT "mating_events_relation_id_fkey";

-- DropForeignKey
ALTER TABLE "trust_logs" DROP CONSTRAINT "trust_logs_relation_id_fkey";

-- AlterTable
ALTER TABLE "form_session_states" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ideas" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "lobby_sessions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "nest_states" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "npc_relations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "skiv_companion_states" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "campaign_def_id" TEXT NOT NULL DEFAULT 'default_campaign_mvp',
    "current_chapter" INTEGER NOT NULL DEFAULT 1,
    "current_act" INTEGER NOT NULL DEFAULT 0,
    "branch_choices" TEXT NOT NULL DEFAULT '[]',
    "completion_pct" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "final_state" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "chapter_idx" INTEGER NOT NULL,
    "act_idx" INTEGER NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "outcome" TEXT,
    "pe_earned" INTEGER NOT NULL DEFAULT 0,
    "pi_earned" INTEGER NOT NULL DEFAULT 0,
    "branch_chosen" TEXT,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_rosters" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'base',
    "hp_base" INTEGER NOT NULL,
    "traits" TEXT NOT NULL DEFAULT '[]',
    "acquired_traits" TEXT NOT NULL DEFAULT '[]',
    "xp_total" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "party_rosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "save_snapshots" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "session_id" TEXT,
    "save_type" TEXT NOT NULL,
    "snapshot_data" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "save_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaigns_player_id_idx" ON "campaigns"("player_id");

-- CreateIndex
CREATE INDEX "chapters_campaign_id_chapter_idx_idx" ON "chapters"("campaign_id", "chapter_idx");

-- CreateIndex
CREATE INDEX "party_rosters_campaign_id_idx" ON "party_rosters"("campaign_id");

-- CreateIndex
CREATE INDEX "save_snapshots_campaign_id_created_at_idx" ON "save_snapshots"("campaign_id", "created_at");

-- AddForeignKey
ALTER TABLE "idea_feedback" ADD CONSTRAINT "idea_feedback_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_rosters" ADD CONSTRAINT "party_rosters_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "save_snapshots" ADD CONSTRAINT "save_snapshots_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affinity_logs" ADD CONSTRAINT "affinity_logs_relation_id_fkey" FOREIGN KEY ("relation_id") REFERENCES "npc_relations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_logs" ADD CONSTRAINT "trust_logs_relation_id_fkey" FOREIGN KEY ("relation_id") REFERENCES "npc_relations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mating_events" ADD CONSTRAINT "mating_events_relation_id_fkey" FOREIGN KEY ("relation_id") REFERENCES "npc_relations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
