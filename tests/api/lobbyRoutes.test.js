// M11 Phase A — Lobby REST endpoint tests.
// ADR-2026-04-20.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

function newApp() {
  return createApp({ databasePath: null });
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
