// Unit tests lobby persistence adapter — fake Prisma, verifies write-through.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { LobbyService } = require('../../apps/backend/services/network/wsSession');

function makeFakePrisma() {
  const rooms = new Map();
  const players = new Map();
  return {
    _rooms: rooms,
    _players: players,
    lobbyRoom: {
      async findMany({ where, include } = {}) {
        const all = Array.from(rooms.values());
        const filtered = where
          ? all.filter((r) => Object.entries(where).every(([k, v]) => r[k] === v))
          : all;
        if (include?.players) {
          return filtered.map((r) => ({
            ...r,
            players: Array.from(players.values()).filter((p) => p.roomCode === r.code),
          }));
        }
        return filtered;
      },
      async upsert({ where, update, create }) {
        if (rooms.has(where.code)) {
          rooms.set(where.code, { ...rooms.get(where.code), ...update });
        } else {
          const { players: playerCreate, ...rest } = create;
          rooms.set(where.code, { closed: false, stateVersion: 0, lastState: null, ...rest });
          if (playerCreate?.create) {
            for (const p of playerCreate.create) {
              players.set(p.id, { ...p, roomCode: where.code });
            }
          }
        }
      },
      async update({ where, data }) {
        if (!rooms.has(where.code)) throw new Error('not_found');
        rooms.set(where.code, { ...rooms.get(where.code), ...data });
      },
    },
    lobbyPlayer: {
      async upsert({ where, update, create }) {
        if (players.has(where.id)) {
          players.set(where.id, { ...players.get(where.id), ...update });
        } else {
          players.set(where.id, { id: where.id, ...create });
        }
      },
      async update({ where, data }) {
        if (!players.has(where.id)) throw new Error('not_found');
        players.set(where.id, { ...players.get(where.id), ...data });
      },
    },
    async $disconnect() {},
  };
}

function makeAdapter(lobby, prisma) {
  process.env.LOBBY_PRISMA_ENABLED = 'true';
  const {
    createLobbyPersistence,
  } = require('../../apps/backend/services/network/lobbyPersistence');
  const adapter = createLobbyPersistence({ lobby, prisma });
  lobby.setPersistence(adapter);
  return adapter;
}

test.beforeEach(() => {
  delete require.cache[require.resolve('../../apps/backend/services/network/lobbyPersistence')];
});

test('persistence disabled by default → setPersistence noop safe', () => {
  const lobby = new LobbyService();
  const res = lobby.createRoom({ hostName: 'H' });
  assert.ok(res.code);
  assert.ok(res.host_token);
});

test('createRoom → persistCreate writes room + host player', async () => {
  const lobby = new LobbyService();
  const prisma = makeFakePrisma();
  makeAdapter(lobby, prisma);
  const { code } = lobby.createRoom({ hostName: 'Alice', maxPlayers: 4 });
  // wait tick for async persist
  await new Promise((r) => setImmediate(r));
  assert.ok(prisma._rooms.has(code));
  const row = prisma._rooms.get(code);
  assert.equal(row.hostName, 'Alice');
  assert.equal(row.maxPlayers, 4);
  assert.equal(row.closed, false);
  assert.equal(Array.from(prisma._players.values()).filter((p) => p.roomCode === code).length, 1);
});

test('joinRoom → persistJoin adds player row', async () => {
  const lobby = new LobbyService();
  const prisma = makeFakePrisma();
  makeAdapter(lobby, prisma);
  const { code } = lobby.createRoom({ hostName: 'H' });
  lobby.joinRoom({ code, playerName: 'Bob' });
  await new Promise((r) => setImmediate(r));
  const rows = Array.from(prisma._players.values()).filter((p) => p.roomCode === code);
  assert.equal(rows.length, 2); // host + bob
  const bob = rows.find((p) => p.name === 'Bob');
  assert.ok(bob);
  assert.equal(bob.role, 'player');
});

test('closeRoom → persistClose marks closed=true', async () => {
  const lobby = new LobbyService();
  const prisma = makeFakePrisma();
  makeAdapter(lobby, prisma);
  const { code, host_token } = lobby.createRoom({ hostName: 'H' });
  lobby.closeRoom({ code, hostToken: host_token });
  await new Promise((r) => setImmediate(r));
  assert.equal(prisma._rooms.get(code).closed, true);
});

test('hydrate: open rooms restored into service + closed rooms skipped', async () => {
  const lobby = new LobbyService();
  const prisma = makeFakePrisma();
  // pre-seed DB
  prisma._rooms.set('ALIV', {
    code: 'ALIV',
    hostId: 'p_h1',
    hostName: 'HostAlive',
    campaignId: null,
    maxPlayers: 4,
    hostTransferGraceMs: 30000,
    closed: false,
    stateVersion: 3,
    lastState: JSON.stringify({ turn: 5 }),
  });
  prisma._rooms.set('GONE', {
    code: 'GONE',
    hostId: 'p_h2',
    hostName: 'HostGone',
    campaignId: null,
    maxPlayers: 4,
    hostTransferGraceMs: 30000,
    closed: true,
  });
  prisma._players.set('p_h1', {
    id: 'p_h1',
    roomCode: 'ALIV',
    name: 'HostAlive',
    role: 'host',
    token: 'tok-h1',
    connected: false,
    joinedAt: new Date(),
  });
  const adapter = makeAdapter(lobby, prisma);
  const stats = await adapter.hydrate();
  assert.equal(stats.rooms, 1);
  assert.equal(stats.players, 1);
  const room = lobby.getRoom('ALIV');
  assert.ok(room);
  assert.equal(room.hostId, 'p_h1');
  assert.equal(room.stateVersion, 3);
  assert.deepEqual(room.state, { turn: 5 });
  assert.equal(lobby.getRoom('GONE'), null);
});

test('persistence write failure is swallowed + logged (service stays healthy)', async () => {
  const lobby = new LobbyService();
  const prisma = makeFakePrisma();
  prisma.lobbyRoom.upsert = async () => {
    throw new Error('db_down');
  };
  const warns = [];
  const origWarn = console.warn;
  console.warn = (...args) => warns.push(args.join(' '));
  try {
    makeAdapter(lobby, prisma);
    const res = lobby.createRoom({ hostName: 'H' });
    await new Promise((r) => setImmediate(r));
    assert.ok(res.code);
    assert.ok(warns.some((w) => w.includes('persistCreate failed')));
  } finally {
    console.warn = origWarn;
  }
});
