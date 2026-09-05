-- 2026-05-22 Fix schema drift: the Species / Biome / SpeciesBiome models were
-- declared in schema.prisma (mapped species / biomes / species_biomes) and are
-- consumed at runtime by the /api/species|biomes|species-biomes routes
-- (apps/backend/routes/speciesBiomes.js) plus seeded by prisma/seed.js
-- seedTaxonomy(), but no migration ever created the tables. On a fresh DB
-- `prisma migrate deploy` left them absent, so `prisma db seed` failed with
-- P2021 ("table public.species does not exist"), blocking dev:setup and the
-- docker-compose backend bootstrap (forced the .docker-prisma-bootstrapped
-- skip-seed workaround). Surfaced 2026-05-22 during the CAMP-3c deploy. The
-- backend keeps its own small atlas taxonomy here (distinct from the
-- Game-Database taxonomy CMS). Additive only -- no change to existing tables.

-- CreateTable
CREATE TABLE "species" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "classification" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biomes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "climate" TEXT,
    "region" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "species_biomes" (
    "id" SERIAL NOT NULL,
    "species_id" TEXT NOT NULL,
    "biome_id" TEXT NOT NULL,
    "strength" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "species_biomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "species_biomes_species_id_biome_id_key" ON "species_biomes"("species_id", "biome_id");

-- AddForeignKey
ALTER TABLE "species_biomes" ADD CONSTRAINT "species_biomes_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "species_biomes" ADD CONSTRAINT "species_biomes_biome_id_fkey" FOREIGN KEY ("biome_id") REFERENCES "biomes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
