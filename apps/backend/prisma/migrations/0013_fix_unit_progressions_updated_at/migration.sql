-- 2026-05-22 Fix schema drift: unit_progressions.updated_at default.
-- The UnitProgression model in schema.prisma declares
--   updatedAt DateTime @updatedAt @map("updated_at")
-- which Prisma manages at the application layer and therefore expects NO SQL
-- column default. However migration 0004_unit_progression created the column as
--   "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
-- so the migration history (and any DB built from it) carries a DEFAULT now()
-- that the canonical schema does not. `prisma migrate diff
--   --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma`
-- (and migrate-status against a fresh DB) reported:
--   [*] Altered column `updated_at` (default changed from Some(Now) to None)
-- The schema is the source of truth, so this corrective migration drops the
-- column default to align the DB with the schema. Additive only — existing
-- migration files (immutable history) are untouched.

-- AlterTable
ALTER TABLE "unit_progressions" ALTER COLUMN "updated_at" DROP DEFAULT;
