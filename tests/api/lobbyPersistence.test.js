// M13 P5 Opzione C — lobbyPersistence + LobbyService Prisma integration tests.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  prismaSupportsLobby,
  persistRoomAsync,
  deleteRoomAsync,
  hydrateRooms,
  snapshotRoomForDb,
  rowToRoomSeed,
} = require('../../apps/backend/services/network/lobbyPersistence');
const { LobbyService } = require('../../apps/backend/services/network/wsSession');

// ---------------------------------------------------------------------------
// Mock Prisma helpers
// ---------------------------------------------------------------------------
function createMockPrisma() {
  const sessions = new Map(); // code → { id, ...data, players: Map<playerId, row> }
  const calls = [];

  function makeId(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
  }

  return {
    calls,
    _sessions: sessions,
    lobbySession: {
      async upsert({ where, create, update }) {
        calls.push({ op: 'lobbySession.upsert', where, create, update });
        const existing = sessions.get(where.code);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const row = {
          id: makeId('ls'),
          ...create,
          createdAt: new Date(),
          updatedAt: new Date(),
          players: new Map(),
        };
        sessions.set(create.code, row);
        return { ...row, players: undefined };
      },
      async findMany({ where, include } = {}) {
        calls.push({ op: 'lobbySession.findMany', where, include });
        const rows = Array.from(sessions.values()).filter((r) => {
          if (where?.closed !== undefined) return r.closed === where.closed;
          return true;
        });
        return rows.map((r) => ({
          ...r,
          players: include?.players ? Array.from(r.players.values()) : undefined,
        }));
      },
      async delete({ where }) {
        calls.push({ op: 'lobbySession.delete', where });
        if (!sessions.has(where.code)) {
          const err = new Error('record not found');
          err.code = 'P2025';
          throw err;
        }
        sessions.delete(where.code);
        return { code: where.code };
      },
    },
    lobbyPlayer: {
      async upsert({ where, create, update }) {
        calls.push({ op: 'lobbyPlayer.upsert', where, create, update });
        const sessionRow = Array.from(sessions.values()).find(
          (r) => r.id === where.sessionId_playerId.sessionId,
        );
        if (!sessionRow) {
          const err = new Error('no parent');
          err.code = 'P2003';
          throw err;
        }
        const key = where.sessionId_playerId.playerId;
        const existing = sessionRow.players.get(key);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const row = { id: makeId('lp'), ...create };
        sessionRow.players.set(key, row);
        return row;
      },
    },
  };
}

// ---------------------------------------------------------------------------
// prismaSupportsLobby guard
// ---------------------------------------------------------------------------
test('prismaSupportsLobby: null/missing methods → false', () => {
  assert.equal(prismaSupportsLobby(null), false);
  assert.equal(prismaSupportsLobby({}), false);
  assert.equal(prismaSupportsLobby({ lobbySession: {} }), false);
});

test('prismaSupportsLobby: mock with upsert+findMany → true', () => {
  const p = createMockPrisma();
  assert.equal(prismaSupportsLobby(p), true);
});

// ---------------------------------------------------------------------------
// snapshotRoomForDb shape
// ---------------------------------------------------------------------------
test('snapshotRoomForDb: serializes state as JSON string', () => {
  const room = {
    code: 'BCDF',
    hostId: 'p_1',
    campaignId: 'camp_1',
    maxPlayers: 4,
    state: { turn: 3 },
    stateVersion: 7,
    closed: false,
  };
  const snap = snapshotRoomForDb(room);
  assert.equal(snap.code, 'BCDF');
  assert.equal(snap.state, '{"turn":3}');
  assert.equal(snap.stateVersion, 7);
  assert.equal(snap.closed, false);
});

test('snapshotRoomForDb: null state stays null', () => {
  const room = { code: 'BCDF', hostId: 'p_1', state: null };
  const snap = snapshotRoomForDb(room);
  assert.equal(snap.state, null);
});

// ---------------------------------------------------------------------------
// persistRoomAsync
// ---------------------------------------------------------------------------
test('persistRoomAsync: no-op when prisma lacks delegates', async () => {
  const res = await persistRoomAsync({}, { code: 'XXXX', hostId: 'p', players: new Map() });
  assert.equal(res, null);
});

test('persistRoomAsync: upserts session + all players', async () => {
  const prisma = createMockPrisma();
  const room = {
    code: 'BCDF',
    hostId: 'p_1',
    campaignId: null,
    maxPlayers: 8,
    state: null,
    stateVersion: 0,
    closed: false,
    players: new Map([
      [
        'p_1',
        {
          id: 'p_1',
          name: 'Host',
          role: 'host',
          token: 't_abc',
          connected: true,
          joinedAt: Date.now(),
        },
      ],
      [
        'p_2',
        {
          id: 'p_2',
          name: 'Player2',
          role: 'player',
          token: 't_xyz',
          connected: false,
          joinedAt: Date.now(),
        },
      ],
    ]),
  };
  const saved = await persistRoomAsync(prisma, room);
  assert.ok(saved, 'returns saved session row');
  // upsert calls: 1 session + 2 players = 3
  const upsertCalls = prisma.calls.filter((c) => c.op.endsWith('.upsert'));
  assert.equal(upsertCalls.length, 3);
});

test('persistRoomAsync: session error logs but does not throw', async () => {
  const prisma = createMockPrisma();
  prisma.lobbySession.upsert = async () => {
    throw new Error('db down');
  };
  let warned = 0;
  const res = await persistRoomAsync(
    prisma,
    { code: 'XXXX', hostId: 'p', players: new Map() },
    { logger: { warn: () => (warned += 1) } },
  );
  assert.equal(res, null);
  assert.equal(warned, 1);
});

// ---------------------------------------------------------------------------
// deleteRoomAsync
// ---------------------------------------------------------------------------
test('deleteRoomAsync: removes row', async () => {
  const prisma = createMockPrisma();
  await persistRoomAsync(prisma, {
    code: 'BCDF',
    hostId: 'p',
    campaignId: null,
    maxPlayers: 8,
    state: null,
    stateVersion: 0,
    closed: false,
    players: new Map([
      [
        'p',
        { id: 'p', name: 'H', role: 'host', token: 't', connected: false, joinedAt: Date.now() },
      ],
    ]),
  });
  const ok = await deleteRoomAsync(prisma, 'BCDF');
  assert.equal(ok, true);
  assert.equal(prisma._sessions.size, 0);
});

test('deleteRoomAsync: P2025 (not found) returns false silently', async () => {
  const prisma = createMockPrisma();
  let warned = 0;
  const ok = await deleteRoomAsync(prisma, 'GONE', { logger: { warn: () => (warned += 1) } });
  assert.equal(ok, false);
  assert.equal(warned, 0, 'P2025 is benign');
});

// ---------------------------------------------------------------------------
// hydrateRooms + rowToRoomSeed
// ---------------------------------------------------------------------------
test('rowToRoomSeed: parses state JSON + maps players', () => {
  const row = {
    code: 'ABCD',
    hostId: 'p_1',
    campaignId: 'camp',
    maxPlayers: 4,
    state: '{"x":1}',
    stateVersion: 2,
    closed: false,
    createdAt: new Date('2026-04-24T10:00:00Z'),
    players: [
      {
        playerId: 'p_1',
        name: 'Host',
        role: 'host',
        token: 't1',
        connected: true,
        joinedAt: new Date('2026-04-24T10:00:00Z'),
      },
    ],
  };
  const seed = rowToRoomSeed(row);
  assert.equal(seed.code, 'ABCD');
  assert.deepEqual(seed.state, { x: 1 });
  assert.equal(seed.players.length, 1);
  assert.equal(seed.players[0].connected, false, 'hydrate resets connected');
});

test('rowToRoomSeed: malformed state JSON → null', () => {
  const seed = rowToRoomSeed({
    code: 'BAD',
    hostId: 'p',
    state: '{not json',
    stateVersion: 0,
    closed: false,
    createdAt: new Date(),
    players: [],
  });
  assert.equal(seed.state, null);
});

test('hydrateRooms: returns seeds for non-closed rows', async () => {
  const prisma = createMockPrisma();
  await persistRoomAsync(prisma, {
    code: 'BCDF',
    hostId: 'p',
    campaignId: null,
    maxPlayers: 8,
    state: { ok: true },
    stateVersion: 1,
    closed: false,
    players: new Map([
      [
        'p',
        { id: 'p', name: 'H', role: 'host', token: 't', connected: false, joinedAt: Date.now() },
      ],
    ]),
  });
  const seeds = await hydrateRooms(prisma);
  assert.equal(seeds.length, 1);
  assert.equal(seeds[0].code, 'BCDF');
  assert.deepEqual(seeds[0].state, { ok: true });
});

// ---------------------------------------------------------------------------
// LobbyService integration
// ---------------------------------------------------------------------------
test('LobbyService: no prisma → in-memory works, _persistEnabled false', () => {
  const svc = new LobbyService();
  assert.equal(svc._persistEnabled, false);
  const r = svc.createRoom({ hostName: 'H' });
  assert.ok(r.code);
  assert.equal(svc.rooms.size, 1);
});

test('LobbyService: with prisma → createRoom triggers persist', async () => {
  const prisma = createMockPrisma();
  const svc = new LobbyService({ prisma });
  assert.equal(svc._persistEnabled, true);
  svc.createRoom({ hostName: 'Host1' });
  // wait microtask for fire-and-forget
  await new Promise((r) => setImmediate(r));
  const upserts = prisma.calls.filter((c) => c.op === 'lobbySession.upsert');
  assert.ok(upserts.length >= 1, 'at least 1 session upsert fired');
});

test('LobbyService: joinRoom triggers persist via onMutate', async () => {
  const prisma = createMockPrisma();
  const svc = new LobbyService({ prisma });
  const { code } = svc.createRoom({ hostName: 'H' });
  prisma.calls.length = 0;
  svc.joinRoom({ code, playerName: 'P2' });
  await new Promise((r) => setImmediate(r));
  const sessionUpserts = prisma.calls.filter((c) => c.op === 'lobbySession.upsert');
  assert.ok(sessionUpserts.length >= 1, 'player_added mutation persisted');
});

test('LobbyService: closeRoom removes DB row', async () => {
  const prisma = createMockPrisma();
  const svc = new LobbyService({ prisma });
  const created = svc.createRoom({ hostName: 'H' });
  await new Promise((r) => setImmediate(r));
  prisma.calls.length = 0;
  svc.closeRoom({ code: created.code, hostToken: created.host_token });
  await new Promise((r) => setImmediate(r));
  const deletes = prisma.calls.filter((c) => c.op === 'lobbySession.delete');
  assert.equal(deletes.length, 1);
});

test('LobbyService.hydrate: restores rooms from DB seeds', async () => {
  const prisma = createMockPrisma();
  // Pre-seed DB directly.
  await persistRoomAsync(prisma, {
    code: 'ABCD',
    hostId: 'p_host',
    campaignId: null,
    maxPlayers: 8,
    state: { phase: 'planning' },
    stateVersion: 3,
    closed: false,
    players: new Map([
      [
        'p_host',
        {
          id: 'p_host',
          name: 'H',
          role: 'host',
          token: 'th',
          connected: false,
          joinedAt: Date.now(),
        },
      ],
      [
        'p_2',
        {
          id: 'p_2',
          name: 'P2',
          role: 'player',
          token: 'tp',
          connected: false,
          joinedAt: Date.now(),
        },
      ],
    ]),
  });
  const svc = new LobbyService({ prisma });
  const restored = await svc.hydrate();
  assert.equal(restored, 1);
  assert.equal(svc.rooms.size, 1);
  const room = svc.getRoom('ABCD');
  assert.ok(room, 'room present in memory');
  assert.equal(room.stateVersion, 3);
  assert.deepEqual(room.state, { phase: 'planning' });
  assert.equal(room.players.size, 2);
  // token preserved → reconnect path survives
  const host = room.getPlayer('p_host');
  const expectedHash = require('node:crypto').createHash('sha256').update('th').digest('hex');
  assert.equal(host.token, expectedHash);
});

test('LobbyService.hydrate: no prisma → returns 0', async () => {
  const svc = new LobbyService();
  const restored = await svc.hydrate();
  assert.equal(restored, 0);
});

test('LobbyService.hydrate: skips already-loaded rooms (idempotent)', async () => {
  const prisma = createMockPrisma();
  await persistRoomAsync(prisma, {
    code: 'BCDF',
    hostId: 'p',
    campaignId: null,
    maxPlayers: 8,
    state: null,
    stateVersion: 0,
    closed: false,
    players: new Map([
      [
        'p',
        { id: 'p', name: 'H', role: 'host', token: 't', connected: false, joinedAt: Date.now() },
      ],
    ]),
  });
  const svc = new LobbyService({ prisma });
  await svc.hydrate();
  const second = await svc.hydrate();
  assert.equal(second, 0, 'second hydrate is no-op');
  assert.equal(svc.rooms.size, 1);
});
