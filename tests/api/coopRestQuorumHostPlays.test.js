// #2709 -- REST lifecycle quorum role-aware (mirror del fix WS #2707/#2708).
// Bug: routes/coop.js allPlayerIds() esclude SEMPRE l'host -> (1) host-plays via
// REST = bounce F-3 player_not_in_room; (2) flusso misto WS/REST = stallo del
// gate strict-size (characters include host, expected no). Fix: quorum
// self-selecting (host conta solo se submitter o gia' proprietario di un PG).
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

async function bootstrap(app) {
  const { body: h } = await request(app).post('/api/lobby/create').send({ host_name: 'Capo' });
  const { body: p1 } = await request(app)
    .post('/api/lobby/join')
    .send({ code: h.code, player_name: 'Alice' });
  await request(app).post('/api/coop/run/start').send({ code: h.code, host_token: h.host_token });
  return { h, p1 };
}

function submitChar(app, code, pid, token, name) {
  return request(app).post('/api/coop/character/create').send({
    code,
    player_id: pid,
    player_token: token,
    name,
    form_id: 'istj',
  });
}

async function phaseOf(app, code) {
  const res = await request(app).get(`/api/coop/state?code=${code}`);
  return res.body.snapshot.phase;
}

test('host-plays: host character/create via REST accepted (was F-3 bounce)', async () => {
  const { app } = buildApp();
  const { h } = await bootstrap(app);
  const res = await submitChar(app, h.code, h.host_id, h.host_token, 'CapoPG');
  assert.ok(res.status < 300, `expected 2xx, got ${res.status}: ${JSON.stringify(res.body)}`);
});

test('mixed quorum: host PG + player PG -> world_setup (was permanent stall)', async () => {
  const { app } = buildApp();
  const { h, p1 } = await bootstrap(app);
  const hostRes = await submitChar(app, h.code, h.host_id, h.host_token, 'CapoPG');
  assert.ok(hostRes.status < 300, `host submit failed: ${hostRes.status}`);
  // host has a PG -> counts in the quorum -> phase must NOT advance yet
  assert.equal(await phaseOf(app, h.code), 'character_creation');
  const p1Res = await submitChar(app, h.code, p1.player_id, p1.player_token, 'Aria');
  assert.ok(p1Res.status < 300, `p1 submit failed: ${p1Res.status}`);
  assert.equal(await phaseOf(app, h.code), 'world_setup', 'both PGs in -> advance');
});

test('TV-mirror regression: host never submits -> players-only quorum advances', async () => {
  const { app } = buildApp();
  const { h, p1 } = await bootstrap(app);
  const p1Res = await submitChar(app, h.code, p1.player_id, p1.player_token, 'Aria');
  assert.ok(p1Res.status < 300);
  assert.equal(await phaseOf(app, h.code), 'world_setup', 'host (TV) excluded from quorum');
});
