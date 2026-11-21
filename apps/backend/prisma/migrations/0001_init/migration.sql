-- CreateTable
CREATE TABLE "ideas" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "biomes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "ecosystems" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "species" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "traits" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "game_functions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "priority" TEXT NOT NULL DEFAULT 'P2',
    "actions_next" TEXT NOT NULL DEFAULT '',
    "link_drive" TEXT NOT NULL DEFAULT '',
    "github" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "allow_slug_override" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "idea_feedback" (
    "id" SERIAL PRIMARY KEY,
    "message" TEXT NOT NULL,
    "contact" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idea_id" INTEGER NOT NULL,
    CONSTRAINT "idea_feedback_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "idea_feedback_idea_id_idx" ON "idea_feedback"("idea_id");
