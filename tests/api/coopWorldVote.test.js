// M18 — World vote integration tests.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { createLobbyRouter } = require('../../apps/backend/routes/lobby');
const { createCoopRouter } = require('../../apps/backend/routes/coop');
const { createCoopStore } = require('../../apps/backend/services/coop/coopStore');
const { LobbyService } = require('../../apps/backend/services/network/wsSession');

function buildApp() {
  const lobby = new LobbyService();
  const coopStore = createCoopStore({ lobby });
  const app = express();
  app.use(express.json());
  app.use('/api', createLobbyRouter({ lobby }));
  app.use('/api', createCoopRouter({ lobby, coopStore }));
  return { app };
}

async function bootstrapWorldSetup(app) {
  const { body: h } = await request(app).post('/api/lobby/create').send({ host_name: 'H' });
  const { body: j1 } = await request(app)
    .post('/api/lobby/join')
    .send({ code: h.code, player_name: 'Alice' });
  const { body: j2 } = await request(app)
    .post('/api/lobby/join')
    .send({ code: h.code, player_name: 'Bruno' });
  await request(app).post('/api/coop/run/start').send({ code: h.code, host_token: h.host_token });
  await request(app).post('/api/coop/character/create').send({
    code: h.code,
    player_id: j1.player_id,
    player_token: j1.player_token,
    name: 'Aria',
    form_id: 'istj',
  });
  await request(app).post('/api/coop/character/create').send({
    code: h.code,
    player_id: j2.player_id,
    player_token: j2.player_token,
    name: 'Bruno',
    form_id: 'enfp',
  });
  return { host: h, p1: j1, p2: j2 };
}

test('POST /api/coop/world/vote records accept + updates tally', async () => {
  const { app } = buildApp();
  const { host, p1 } = await bootstrapWorldSetup(app);
  const res = await request(app).post('/api/coop/world/vote').send({
    code: host.code,
    player_id: p1.player_id,
    player_token: p1.player_token,
    accept: true,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.phase, 'world_setup');
  assert.equal(res.body.tally.accept, 1);
  assert.equal(res.body.tally.reject, 0);
});

test('player may change vote (latest wins)', async () => {
  const { app } = buildApp();
  const { host, p1 } = await bootstrapWorldSetup(app);
  await request(app).post('/api/coop/world/vote').send({
    code: host.code,
    player_id: p1.player_id,
    player_token: p1.player_token,
    accept: true,
  });
  const res = await request(app).post('/api/coop/world/vote').send({
    code: host.code,
    player_id: p1.player_id,
    player_token: p1.player_token,
    accept: false,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.tally.accept, 0);
  assert.equal(res.body.tally.reject, 1);
});

test('vote rejected with bad token', async () => {
  const { app } = buildApp();
  const { host, p1 } = await bootstrapWorldSetup(app);
  const res = await request(app).post('/api/coop/world/vote').send({
    code: host.code,
    player_id: p1.player_id,
    player_token: 'bad',
    accept: true,
  });
  assert.equal(res.status, 403);
});

test('vote rejected outside world_setup phase (after confirm)', async () => {
  const { app } = buildApp();
  const { host, p1 } = await bootstrapWorldSetup(app);
  await request(app)
    .post('/api/coop/world/confirm')
    .send({ code: host.code, host_token: host.host_token });
  const res = await request(app).post('/api/coop/world/vote').send({
    code: host.code,
    player_id: p1.player_id,
    player_token: p1.player_token,
    accept: true,
  });
  assert.equal(res.status, 400);
});

test('tally includes pending for not-yet-voted players', async () => {
  const { app } = buildApp();
  const { host, p1 } = await bootstrapWorldSetup(app);
  const res = await request(app).post('/api/coop/world/vote').send({
    code: host.code,
    player_id: p1.player_id,
    player_token: p1.player_token,
    accept: true,
  });
  assert.equal(res.body.tally.accept, 1);
  assert.equal(res.body.tally.pending, 1);
  assert.equal(res.body.tally.total, 2);
});
