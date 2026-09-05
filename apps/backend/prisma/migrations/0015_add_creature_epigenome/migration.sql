-- CreateTable
CREATE TABLE "creature_epigenome" (
    "campaign_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "epigenome" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "creature_epigenome_pkey" PRIMARY KEY ("campaign_id","unit_id")
);
