// M11 Phase D — lobby persistence adapter (ADR-2026-04-26).
//
// Write-through pattern (reference_prisma_write_through_adapter.md):
//   - In-memory LobbyService resta source-of-truth a runtime
//   - Adapter sync-write a Prisma su createRoom/joinRoom/closeRoom/setConnected
//   - Graceful: se Prisma assente/fallisce, log warn + continua in-mem
//   - Hydrate su boot: carica room.closed=false + player attivi → LobbyService
//
// Enabled via env `LOBBY_PRISMA_ENABLED=true`. Off = noop (legacy behavior).

'use strict';

function isEnabled() {
  return process.env.LOBBY_PRISMA_ENABLED === 'true';
}

function tryLoadPrisma() {
  try {
    const { PrismaClient } = require('@prisma/client');
    return new PrismaClient();
  } catch (err) {
    console.warn('[lobby-prisma] client non disponibile:', err.message);
    return null;
  }
}

/**
 * Create a persistence adapter over a LobbyService. Returns an object with:
 *   - `hydrate()` — load open rooms from DB into service
 *   - `persistCreate(code, room, hostToken)` — write room + host on create
 *   - `persistJoin(code, player)` — write new player
 *   - `persistClose(code)` — mark room closed
 *   - `persistConnected(code, playerId, connected)` — toggle flag
 *   - `persistState(code, version, payload)` — save last state snapshot
 *   - `close()` — disconnect client
 *
 * All methods are no-ops if disabled or prisma client unavailable.
 */
function createLobbyPersistence({ lobby, prisma: injected = null } = {}) {
  if (!lobby) throw new Error('lobby_required');
  const enabled = isEnabled();
  const prisma = enabled ? injected || tryLoadPrisma() : null;
  const active = Boolean(enabled && prisma);

  const safe = async (fn, label) => {
    if (!active) return null;
    try {
      return await fn();
    } catch (err) {
      console.warn(`[lobby-prisma] ${label} failed:`, err.message);
      return null;
    }
  };

  return {
    enabled: active,

    async hydrate() {
      if (!active) return { rooms: 0, players: 0 };
      const rows = await safe(
        () =>
          prisma.lobbyRoom.findMany({
            where: { closed: false },
            include: { players: true },
          }),
        'hydrate',
      );
      if (!rows) return { rooms: 0, players: 0 };
      let playerCount = 0;
      for (const row of rows) {
        lobby.rehydrateRoom({
          code: row.code,
          hostId: row.hostId,
          hostName: row.hostName,
          campaignId: row.campaignId,
          maxPlayers: row.maxPlayers,
          hostTransferGraceMs: row.hostTransferGraceMs,
          stateVersion: row.stateVersion,
          lastState: row.lastState,
          players: row.players.map((p) => ({
            id: p.id,
            name: p.name,
            role: p.role,
            token: p.token,
            connected: false, // WS not yet attached after restart
            joinedAt: p.joinedAt,
          })),
        });
        playerCount += row.players.length;
      }
      return { rooms: rows.length, players: playerCount };
    },

    async persistCreate(code, room) {
      return safe(async () => {
        const host = room.getPlayer(room.hostId);
        await prisma.lobbyRoom.upsert({
          where: { code },
          update: {
            closed: false,
            hostId: room.hostId,
            hostName: host?.name || 'host',
            campaignId: room.campaignId,
            maxPlayers: room.maxPlayers,
            hostTransferGraceMs: room.hostTransferGraceMs,
          },
          create: {
            code,
            hostId: room.hostId,
            hostName: host?.name || 'host',
            campaignId: room.campaignId,
            maxPlayers: room.maxPlayers,
            hostTransferGraceMs: room.hostTransferGraceMs,
            players: host
              ? {
                  create: [
                    {
                      id: host.id,
                      name: host.name,
                      role: host.role,
                      token: host.token,
                      connected: false,
                    },
                  ],
                }
              : undefined,
          },
        });
      }, 'persistCreate');
    },

    async persistJoin(code, player) {
      return safe(
        () =>
          prisma.lobbyPlayer.upsert({
            where: { id: player.id },
            update: {
              name: player.name,
              role: player.role,
              token: player.token,
              connected: player.connected,
            },
            create: {
              id: player.id,
              roomCode: code,
              name: player.name,
              role: player.role,
              token: player.token,
              connected: player.connected,
            },
          }),
        'persistJoin',
      );
    },

    async persistClose(code) {
      return safe(
        () => prisma.lobbyRoom.update({ where: { code }, data: { closed: true } }),
        'persistClose',
      );
    },

    async persistConnected(code, playerId, connected) {
      return safe(
        () =>
          prisma.lobbyPlayer.update({
            where: { id: playerId },
            data: {
              connected,
              disconnectedAt: connected ? null : new Date(),
            },
          }),
        'persistConnected',
      );
    },

    async persistState(code, version, payload) {
      return safe(
        () =>
          prisma.lobbyRoom.update({
            where: { code },
            data: {
              stateVersion: version,
              lastState: payload === null ? null : JSON.stringify(payload),
            },
          }),
        'persistState',
      );
    },

    async close() {
      if (prisma && typeof prisma.$disconnect === 'function') {
        try {
          await prisma.$disconnect();
        } catch {
          // noop
        }
      }
    },
  };
}

module.exports = { createLobbyPersistence, isEnabled };
