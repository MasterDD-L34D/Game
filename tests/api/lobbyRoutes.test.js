// M11 Phase A — Lobby REST endpoint tests.
// ADR-2026-04-20.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

function newApp() {
  const built = createApp({ databasePath: null });
  // Expose lobby on app.locals for tests that need direct service access
  // (host_transfer simulation, ghost timers). Routes already receive the
  // service via DI; this is purely a test ergonomic.
  built.app.locals.lobby = built.lobby;
  return built;
}

test('POST /api/lobby/create returns 4-letter code + host token', async () => {
  const { app, close } = newApp();
  try {
    const res = await request(app)
      .post('/api/lobby/create')
      .send({ host_name: 'Alice' })
      .expect(201);
    assert.equal(typeof res.body.code, 'string');
    assert.match(res.body.code, /^[BCDFGHJKLMNPQRSTVWXZ]{4}$/);
    assert.equal(typeof res.body.host_id, 'string');
    assert.equal(typeof res.body.host_token, 'string');
    assert.equal(res.body.max_players, 8);
    assert.equal(res.body.campaign_id, null);
  } finally {
    await close();
  }
});

test('POST /api/lobby/create 400 on missing host_name', async () => {
  const { app, close } = newApp();
  try {
    await request(app).post('/api/lobby/create').send({}).expect(400);
  } finally {
    await close();
  }
});

test('POST /api/lobby/join returns player_token + room snapshot', async () => {
  const { app, close } = newApp();
  try {
    const create = await request(app)
      .post('/api/lobby/create')
      .send({ host_name: 'Alice', campaign_id: 'campaign_abc' })
      .expect(201);
    const code = create.body.code;
    const join = await request(app)
      .post('/api/lobby/join')
      .send({ code, player_name: 'Bob' })
      .expect(201);
    assert.equal(typeof join.body.player_id, 'string');
    assert.equal(typeof join.body.player_token, 'string');
    assert.equal(join.body.room.code, code);
    assert.equal(join.body.room.campaign_id, 'campaign_abc');
    assert.equal(join.body.room.players.length, 2); // host + Bob
    const roles = join.body.room.players.map((p) => p.role).sort();
    assert.deepEqual(roles, ['host', 'player']);
  } finally {
    await close();
  }
});

test('POST /api/lobby/join 404 on unknown code', async () => {
  const { app, close } = newApp();
  try {
    await request(app)
      .post('/api/lobby/join')
      .send({ code: 'ZZZZ', player_name: 'Ghost' })
      .expect(404);
  } finally {
    await close();
  }
});

test('POST /api/lobby/join case-insensitive code match', async () => {
  const { app, close } = newApp();
  try {
    const create = await request(app)
      .post('/api/lobby/create')
      .send({ host_name: 'A' })
      .expect(201);
    const lower = create.body.code.toLowerCase();
    await request(app).post('/api/lobby/join').send({ code: lower, player_name: 'P' }).expect(201);
  } finally {
    await close();
  }
});

test('POST /api/lobby/close requires host_token, else 403', async () => {
  const { app, close } = newApp();
  try {
    const create = await request(app)
      .post('/api/lobby/create')
      .send({ host_name: 'Alice' })
      .expect(201);
    const code = create.body.code;
    await request(app).post('/api/lobby/close').send({ code, host_token: 'WRONG' }).expect(403);
    await request(app)
      .post('/api/lobby/close')
      .send({ code, host_token: create.body.host_token })
      .expect(200);
    // After close, room is gone → 404 on state lookup.
    await request(app).get(`/api/lobby/state?code=${code}`).expect(404);
  } finally {
    await close();
  }
});

test('GET /api/lobby/state returns snapshot', async () => {
  const { app, close } = newApp();
  try {
    const create = await request(app)
      .post('/api/lobby/create')
      .send({ host_name: 'Alice' })
      .expect(201);
    const code = create.body.code;
    const state = await request(app).get(`/api/lobby/state?code=${code}`).expect(200);
    assert.equal(state.body.room.code, code);
    assert.equal(state.body.room.players.length, 1);
    assert.equal(state.body.room.players[0].role, 'host');
  } finally {
    await close();
  }
});

test('POST /api/lobby/create respects max_players cap', async () => {
  const { app, close } = newApp();
  try {
    const create = await request(app)
      .post('/api/lobby/create')
      .send({ host_name: 'Alice', max_players: 3 })
      .expect(201);
    const code = create.body.code;
    // Fill: host + 2 more = 3 total, then reject the 4th.
    await request(app).post('/api/lobby/join').send({ code, player_name: 'B' }).expect(201);
    await request(app).post('/api/lobby/join').send({ code, player_name: 'C' }).expect(201);
    await request(app).post('/api/lobby/join').send({ code, player_name: 'D' }).expect(409);
  } finally {
    await close();
  }
});

test('GET /api/lobby/list lists open rooms', async () => {
  const { app, close } = newApp();
  try {
    await request(app).post('/api/lobby/create').send({ host_name: 'A' }).expect(201);
    await request(app).post('/api/lobby/create').send({ host_name: 'B' }).expect(201);
    const list = await request(app).get('/api/lobby/list').expect(200);
    assert.equal(list.body.count, 2);
    assert.ok(Array.isArray(list.body.rooms));
  } finally {
    await close();
  }
});

// B-NEW-4 fix 2026-05-08 — phone exit + reopen now probes /lobby/rejoin
// to validate the localStorage session before bouncing to the game shell.
test('POST /api/lobby/rejoin returns room snapshot for valid host token', async () => {
  const { app, close } = newApp();
  try {
    const create = await request(app)
      .post('/api/lobby/create')
      .send({ host_name: 'Alice' })
      .expect(201);
    const { code, host_id, host_token } = create.body;
    const res = await request(app)
      .post('/api/lobby/rejoin')
      .send({ code, player_id: host_id, player_token: host_token })
      .expect(200);
    assert.equal(res.body.code, code);
    assert.equal(res.body.player_id, host_id);
    assert.equal(res.body.role, 'host');
    assert.equal(res.body.room.code, code);
  } finally {
    await close();
  }
});

test('POST /api/lobby/rejoin works for joined player tokens', async () => {
  const { app, close } = newApp();
  try {
    const create = await request(app)
      .post('/api/lobby/create')
      .send({ host_name: 'Alice' })
      .expect(201);
    const code = create.body.code;
    const join = await request(app)
      .post('/api/lobby/join')
      .send({ code, player_name: 'Bob' })
      .expect(201);
    const res = await request(app)
      .post('/api/lobby/rejoin')
      .send({ code, player_id: join.body.player_id, player_token: join.body.player_token })
      .expect(200);
    assert.equal(res.body.role, 'player');
    assert.equal(res.body.player_id, join.body.player_id);
  } finally {
    await close();
  }
});

test('POST /api/lobby/rejoin 400 on missing fields', async () => {
  const { app, close } = newApp();
  try {
    await request(app).post('/api/lobby/rejoin').send({}).expect(400);
    await request(app).post('/api/lobby/rejoin').send({ code: 'ABCD' }).expect(400);
  } finally {
    await close();
  }
});

// B-NEW-4-bis fix 2026-05-08 (agent-driven smoke iter4) — distinguish
// 404 (never existed) from 410 (recently closed) on the rejoin path.
test('POST /api/lobby/rejoin 410 on room closed within TTL window', async () => {
  const { app, close } = newApp();
  try {
    const create = await request(app)
      .post('/api/lobby/create')
      .send({ host_name: 'Alice' })
      .expect(201);
    const { code, host_id, host_token } = create.body;
    // Close the room → removes from live registry, marks recently_closed.
    await request(app).post('/api/lobby/close').send({ code, host_token }).expect(200);
    const res = await request(app)
      .post('/api/lobby/rejoin')
      .send({ code, player_id: host_id, player_token: host_token })
      .expect(410);
    assert.equal(res.body.error, 'room_closed');
  } finally {
    await close();
  }
});

test('POST /api/lobby/rejoin 404 on unknown code', async () => {
  const { app, close } = newApp();
  try {
    await request(app)
      .post('/api/lobby/rejoin')
      .send({ code: 'ZZZZ', player_id: 'p_x', player_token: 'tok' })
      .expect(404);
  } finally {
    await close();
  }
});

// Codex P2 #2133: post host_transfer demotion the old host token still
// authenticates but the player_role is now `player`. Caller must trust
// the response role over the local cached one.
test('POST /api/lobby/rejoin reflects current role after host_transfer demotion', async () => {
  const { app, close } = newApp();
  try {
    const create = await request(app)
      .post('/api/lobby/create')
      .send({ host_name: 'Alice' })
      .expect(201);
    const code = create.body.code;
    const join = await request(app)
      .post('/api/lobby/join')
      .send({ code, player_name: 'Bob' })
      .expect(201);
    // Promote Bob to host (simulates host_transfer fired by grace timer).
    const {
      LobbyService: _LobbyService,
    } = require('../../apps/backend/services/network/wsSession');
    void _LobbyService; // silence unused-import lint when present.
    // Reach into app via supertest indirection: call the same global
    // service used by routes.
    const lobby = app.locals.lobby;
    const room = lobby.getRoom(code);
    room.transferHostTo(join.body.player_id, { reason: 'test_promotion' });
    // Old host token still authenticates → response now reports role=player.
    const ex = await request(app)
      .post('/api/lobby/rejoin')
      .send({
        code,
        player_id: create.body.host_id,
        player_token: create.body.host_token,
      })
      .expect(200);
    assert.equal(ex.body.role, 'player');
    assert.equal(ex.body.room.host_id, join.body.player_id);
  } finally {
    await close();
  }
});

test('POST /api/lobby/rejoin 401 on token mismatch', async () => {
  const { app, close } = newApp();
  try {
    const create = await request(app)
      .post('/api/lobby/create')
      .send({ host_name: 'Alice' })
      .expect(201);
    await request(app)
      .post('/api/lobby/rejoin')
      .send({
        code: create.body.code,
        player_id: create.body.host_id,
        player_token: 'WRONG_TOKEN',
      })
      .expect(401);
  } finally {
    await close();
  }
});
