-- L06 Meta progression persistence (ADR-2026-04-21-meta-progression-prisma)
-- Models: NpcRelation, AffinityLog, TrustLog, NestState, MatingEvent.

-- CreateTable
CREATE TABLE "npc_relations" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "npc_id" TEXT NOT NULL,
    "affinity" INTEGER NOT NULL DEFAULT 0,
    "trust" INTEGER NOT NULL DEFAULT 0,
    "recruited" BOOLEAN NOT NULL DEFAULT FALSE,
    "mated" BOOLEAN NOT NULL DEFAULT FALSE,
    "mating_cooldown" INTEGER NOT NULL DEFAULT 0,
    "mbti_type" TEXT,
    "trait_ids" TEXT NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "npc_relations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "npc_relations_campaign_id_npc_id_key" ON "npc_relations"("campaign_id", "npc_id");

-- CreateIndex
CREATE INDEX "npc_relations_campaign_id_idx" ON "npc_relations"("campaign_id");

-- CreateTable
CREATE TABLE "affinity_logs" (
    "id" TEXT NOT NULL,
    "relation_id" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "before" INTEGER NOT NULL,
    "after" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affinity_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "affinity_logs_relation_id_fkey" FOREIGN KEY ("relation_id") REFERENCES "npc_relations"("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "affinity_logs_relation_id_created_at_idx" ON "affinity_logs"("relation_id", "created_at");

-- CreateTable
CREATE TABLE "trust_logs" (
    "id" TEXT NOT NULL,
    "relation_id" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "before" INTEGER NOT NULL,
    "after" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trust_logs_relation_id_fkey" FOREIGN KEY ("relation_id") REFERENCES "npc_relations"("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "trust_logs_relation_id_created_at_idx" ON "trust_logs"("relation_id", "created_at");

-- CreateTable
CREATE TABLE "nest_states" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "biome" TEXT,
    "requirements_met" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nest_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nest_states_campaign_id_key" ON "nest_states"("campaign_id");

-- CreateTable
CREATE TABLE "mating_events" (
    "id" TEXT NOT NULL,
    "relation_id" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "roll" INTEGER NOT NULL,
    "modifier" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "threshold" INTEGER NOT NULL,
    "offspring_traits" TEXT NOT NULL DEFAULT '[]',
    "seed_generated" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mating_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mating_events_relation_id_fkey" FOREIGN KEY ("relation_id") REFERENCES "npc_relations"("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "mating_events_relation_id_created_at_idx" ON "mating_events"("relation_id", "created_at");
