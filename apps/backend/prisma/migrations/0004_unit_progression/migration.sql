-- M13 P3 character progression persistence (ADR-2026-04-24 pending).
-- Model: UnitProgression. XP + level + picked perks per unit × campaign.

-- CreateTable
CREATE TABLE "unit_progressions" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "unit_id" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "xp_total" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "picked_perks" TEXT NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_progressions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unit_progressions_campaign_id_unit_id_key" ON "unit_progressions"("campaign_id", "unit_id");

-- CreateIndex
CREATE INDEX "unit_progressions_campaign_id_idx" ON "unit_progressions"("campaign_id");
