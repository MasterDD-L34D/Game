-- M13 P5 lobby persistence (Opzione C handoff 2026-04-26).
-- Models: LobbySession (Jackbox rooms) + LobbyPlayer.
-- Adapter preserves in-memory LobbyService fallback when DATABASE_URL unset.
-- Scope: durable reconnect dopo backend restart.

-- CreateTable
CREATE TABLE "lobby_sessions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "max_players" INTEGER NOT NULL DEFAULT 8,
    "state" TEXT,
    "state_version" INTEGER NOT NULL DEFAULT 0,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lobby_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lobby_players" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lobby_players_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lobby_sessions_code_key" ON "lobby_sessions"("code");

-- CreateIndex
CREATE INDEX "lobby_sessions_campaign_id_idx" ON "lobby_sessions"("campaign_id");

-- CreateIndex
CREATE INDEX "lobby_sessions_created_at_idx" ON "lobby_sessions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "lobby_players_token_key" ON "lobby_players"("token");

-- CreateIndex
CREATE UNIQUE INDEX "lobby_players_session_id_player_id_key" ON "lobby_players"("session_id", "player_id");

-- CreateIndex
CREATE INDEX "lobby_players_session_id_idx" ON "lobby_players"("session_id");

-- AddForeignKey
ALTER TABLE "lobby_players" ADD CONSTRAINT "lobby_players_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "lobby_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
