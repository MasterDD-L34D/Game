-- S1 polish Phase 1 — Skiv portable companion state (ADR-2026-04-27).
-- Schema additive 0.1.0 → 0.2.0. Adapter preserves in-memory fallback when
-- DATABASE_URL unset (dev/demo/tests). Privacy whitelist enforced app-level
-- in apps/backend/services/skiv/companionStateStore.js.
-- Scope: portable Skiv card state, share URL, crossbreed history, voice diary.

-- CreateTable
CREATE TABLE "skiv_companion_states" (
    "lineage_id" TEXT NOT NULL,
    "schema_version" TEXT NOT NULL DEFAULT '0.2.0',
    "signature" TEXT,
    "crossbreed_history" JSONB NOT NULL DEFAULT '[]',
    "voice_diary_portable" JSONB NOT NULL DEFAULT '[]',
    "share_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skiv_companion_states_pkey" PRIMARY KEY ("lineage_id")
);
