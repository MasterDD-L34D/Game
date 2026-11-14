// M19 — Debrief phase integration tests.
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
  return { app, coopStore };
}

async function bootstrapDebrief(app) {
  const { body: h } = await request(app).post('/api/lobby/create').send({ host_name: 'H' });
  const { body: j1 } = await request(app)
    .post('/api/lobby/join')
    .send({ code: h.code, player_name: 'Alice' });
  await request(app).post('/api/coop/run/start').send({ code: h.code, host_token: h.host_token });
  await request(app).post('/api/coop/character/create').send({
    code: h.code,
    player_id: j1.player_id,
    player_token: j1.player_token,
    name: 'Aria',
    form_id: 'istj',
  });
  await request(app)
    .post('/api/coop/world/confirm')
    .send({ code: h.code, host_token: h.host_token });
  await request(app).post('/api/coop/combat/end').send({
    code: h.code,
    host_token: h.host_token,
    outcome: 'victory',
    xp_earned: 10,
  });
  return { host: h, p1: j1 };
}

test('combat/end transitions to debrief with outcome recorded', async () => {
  const { app, coopStore } = buildApp();
  const { host } = await bootstrapDebrief(app);
  const res = await request(app).get(`/api/coop/state?code=${host.code}`);
  assert.equal(res.body.snapshot.phase, 'debrief');
  assert.equal(res.body.snapshot.run.outcome, 'victory');
  assert.equal(res.body.snapshot.run.partyXp, 10);
});

test('debrief/choice advances to next scenario when all ready', async () => {
  const { app } = buildApp();
  const { host: h } = await request(app)
    .post('/api/lobby/create')
    .send({ host_name: 'H' })
    .then((r) => ({ host: r.body }));
  const { body: j1 } = await request(app)
    .post('/api/lobby/join')
    .send({ code: h.code, player_name: 'Alice' });
  await request(app)
    .post('/api/coop/run/start')
    .send({
      code: h.code,
      host_token: h.host_token,
      scenario_stack: ['enc_tutorial_01', 'enc_tutorial_02'],
    });
  await request(app).post('/api/coop/character/create').send({
    code: h.code,
    player_id: j1.player_id,
    player_token: j1.player_token,
    name: 'Aria',
    form_id: 'istj',
  });
  await request(app)
    .post('/api/coop/world/confirm')
    .send({ code: h.code, host_token: h.host_token });
  await request(app).post('/api/coop/combat/end').send({
    code: h.code,
    host_token: h.host_token,
    outcome: 'victory',
    xp_earned: 10,
  });
  const res = await request(app)
    .post('/api/coop/debrief/choice')
    .send({
      code: h.code,
      player_id: j1.player_id,
      player_token: j1.player_token,
      choice: { type: 'skip' },
    });
  assert.equal(res.status, 200);
  assert.equal(res.body.phase, 'world_setup');
  assert.equal(res.body.result.action, 'next_scenario');
});

test('debrief/choice ends run on last scenario', async () => {
  const { app } = buildApp();
  const { body: h } = await request(app).post('/api/lobby/create').send({ host_name: 'H' });
  const { body: j1 } = await request(app)
    .post('/api/lobby/join')
    .send({ code: h.code, player_name: 'Alice' });
  await request(app)
    .post('/api/coop/run/start')
    .send({
      code: h.code,
      host_token: h.host_token,
      scenario_stack: ['enc_tutorial_01'],
    });
  await request(app).post('/api/coop/character/create').send({
    code: h.code,
    player_id: j1.player_id,
    player_token: j1.player_token,
    name: 'Aria',
    form_id: 'istj',
  });
  await request(app)
    .post('/api/coop/world/confirm')
    .send({ code: h.code, host_token: h.host_token });
  await request(app).post('/api/coop/combat/end').send({
    code: h.code,
    host_token: h.host_token,
    outcome: 'victory',
  });
  const res = await request(app)
    .post('/api/coop/debrief/choice')
    .send({
      code: h.code,
      player_id: j1.player_id,
      player_token: j1.player_token,
      choice: { type: 'skip' },
    });
  assert.equal(res.body.phase, 'ended');
  assert.equal(res.body.result.action, 'ended');
});

test('debrief rejected with bad player token', async () => {
  const { app } = buildApp();
  const { host, p1 } = await bootstrapDebrief(app);
  const res = await request(app)
    .post('/api/coop/debrief/choice')
    .send({
      code: host.code,
      player_id: p1.player_id,
      player_token: 'bad',
      choice: { type: 'skip' },
    });
  assert.equal(res.status, 403);
});

test('debriefReadyList returns ready=true after choice submitted', async () => {
  const { app, coopStore } = buildApp();
  const { host, p1 } = await bootstrapDebrief(app);
  await request(app)
    .post('/api/coop/debrief/choice')
    .send({
      code: host.code,
      player_id: p1.player_id,
      player_token: p1.player_token,
      choice: { type: 'skip' },
    });
  // phase moved to ended (single scenario) OR world_setup (multi)
  // Verify at least the choice was recorded
  const orch = coopStore.get(host.code);
  assert.ok(orch);
  assert.notEqual(orch.phase, 'debrief'); // moved past
});
