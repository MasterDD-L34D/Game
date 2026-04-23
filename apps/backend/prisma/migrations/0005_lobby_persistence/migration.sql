-- M11 Phase D lobby persistence (ADR-2026-04-26 addendum to ADR-2026-04-20).
-- Rooms + players survive backend restart when LOBBY_PRISMA_ENABLED=true.

-- CreateTable
CREATE TABLE "lobby_rooms" (
    "code" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "host_name" TEXT NOT NULL,
    "campaign_id" TEXT,
    "max_players" INTEGER NOT NULL DEFAULT 8,
    "host_transfer_grace_ms" INTEGER NOT NULL DEFAULT 30000,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "state_version" INTEGER NOT NULL DEFAULT 0,
    "last_state" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lobby_rooms_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "lobby_players" (
    "id" TEXT NOT NULL,
    "room_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnected_at" TIMESTAMP(3),

    CONSTRAINT "lobby_players_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lobby_rooms_closed_idx" ON "lobby_rooms"("closed");

-- CreateIndex
CREATE INDEX "lobby_players_room_code_idx" ON "lobby_players"("room_code");

-- AddForeignKey
ALTER TABLE "lobby_players" ADD CONSTRAINT "lobby_players_room_code_fkey" FOREIGN KEY ("room_code") REFERENCES "lobby_rooms"("code") ON DELETE CASCADE ON UPDATE CASCADE;
