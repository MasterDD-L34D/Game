-- M12 Phase D form session persistence (ADR-2026-04-23 addendum).
-- Model: FormSessionState. Write-through cache for formSessionStore.

-- CreateTable
CREATE TABLE "form_session_states" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "current_form_id" TEXT,
    "pe" INTEGER NOT NULL DEFAULT 0,
    "last_evolve_round" INTEGER,
    "evolve_count" INTEGER NOT NULL DEFAULT 0,
    "last_delta" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_session_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "form_session_states_session_id_unit_id_key" ON "form_session_states"("session_id", "unit_id");

-- CreateIndex
CREATE INDEX "form_session_states_session_id_idx" ON "form_session_states"("session_id");
