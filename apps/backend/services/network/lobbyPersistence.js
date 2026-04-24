// M13 P5 Opzione C — Lobby Prisma write-through adapter.
//
// Pattern canonico (stesso di formSessionStore / progressionStore):
//   - in-memory LobbyService Map resta authoritative
//   - Prisma upsert fire-and-forget ad ogni mutation significativa
//   - hydrate(prisma) pre-carica rooms non-chiuse su init dopo restart
//   - graceful fallback quando DATABASE_URL unset / client senza delegate
//
// Shape LobbySession upsert:
//   { code, hostId, campaignId, maxPlayers, state: JSON|null, stateVersion,
//     closed, players: LobbyPlayer[] (nested) }
//
// Chiamate: persistRoomAsync, persistPlayerAsync, deleteRoomAsync,
// hydrateRooms. Tutte no-op quando prisma mancante/parziale.

'use strict';

function prismaSupportsLobby(prisma) {
  return Boolean(
    prisma &&
      prisma.lobbySession &&
      typeof prisma.lobbySession.upsert === 'function' &&
      typeof prisma.lobbySession.findMany === 'function' &&
      prisma.lobbyPlayer &&
      typeof prisma.lobbyPlayer.upsert === 'function',
  );
}

function snapshotRoomForDb(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    campaignId: room.campaignId ?? null,
    maxPlayers: Number(room.maxPlayers ?? 8),
    state: room.state ? JSON.stringify(room.state) : null,
    stateVersion: Number(room.stateVersion ?? 0),
    closed: Boolean(room.closed),
  };
}

function snapshotPlayerForDb(sessionDbId, p) {
  return {
    sessionId: sessionDbId,
    playerId: p.id,
    name: p.name,
    role: p.role,
    token: p.token,
    connected: Boolean(p.connected),
    joinedAt: new Date(p.joinedAt || Date.now()),
  };
}

async function persistRoomAsync(prisma, room, { logger = console } = {}) {
  if (!prismaSupportsLobby(prisma)) return null;
  const data = snapshotRoomForDb(room);
  try {
    const saved = await prisma.lobbySession.upsert({
      where: { code: data.code },
      create: data,
      update: {
        hostId: data.hostId,
        campaignId: data.campaignId,
        maxPlayers: data.maxPlayers,
        state: data.state,
        stateVersion: data.stateVersion,
        closed: data.closed,
      },
    });
    // upsert each player (skip socket/connected drift — persisted as last-known).
    for (const p of room.players.values()) {
      const pdata = snapshotPlayerForDb(saved.id, p);
      await prisma.lobbyPlayer
        .upsert({
          where: {
            sessionId_playerId: { sessionId: saved.id, playerId: p.id },
          },
          create: pdata,
          update: {
            name: pdata.name,
            role: pdata.role,
            connected: pdata.connected,
          },
        })
        .catch((err) => {
          logger.warn?.(`[lobbyPersistence] upsert player ${p.id} failed: ${err?.message || err}`);
        });
    }
    return saved;
  } catch (err) {
    logger.warn?.(`[lobbyPersistence] upsert room ${data.code} failed: ${err?.message || err}`);
    return null;
  }
}

async function deleteRoomAsync(prisma, code, { logger = console } = {}) {
  if (!prismaSupportsLobby(prisma)) return false;
  try {
    await prisma.lobbySession.delete({ where: { code } });
    return true;
  } catch (err) {
    // P2025 (record not found) is benign for idempotent delete.
    if (err?.code !== 'P2025') {
      logger.warn?.(`[lobbyPersistence] delete ${code} failed: ${err?.message || err}`);
    }
    return false;
  }
}

async function hydrateRooms(prisma, { logger = console } = {}) {
  if (!prismaSupportsLobby(prisma)) return [];
  try {
    const rows = await prisma.lobbySession.findMany({
      where: { closed: false },
      include: { players: true },
    });
    return rows.map(rowToRoomSeed);
  } catch (err) {
    logger.warn?.(`[lobbyPersistence] hydrate failed: ${err?.message || err}`);
    return [];
  }
}

function rowToRoomSeed(row) {
  let state = null;
  if (row.state) {
    try {
      state = JSON.parse(row.state);
    } catch {
      state = null;
    }
  }
  return {
    code: row.code,
    hostId: row.hostId,
    campaignId: row.campaignId,
    maxPlayers: row.maxPlayers,
    state,
    stateVersion: row.stateVersion,
    closed: row.closed,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.getTime() : Number(row.createdAt) || Date.now(),
    players: (row.players || []).map((p) => ({
      id: p.playerId,
      name: p.name,
      role: p.role,
      token: p.token,
      connected: false, // on hydrate, clients must reconnect
      joinedAt:
        p.joinedAt instanceof Date ? p.joinedAt.getTime() : Number(p.joinedAt) || Date.now(),
    })),
  };
}

module.exports = {
  prismaSupportsLobby,
  persistRoomAsync,
  deleteRoomAsync,
  hydrateRooms,
  snapshotRoomForDb,
  snapshotPlayerForDb,
  rowToRoomSeed,
};
