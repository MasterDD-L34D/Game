// SPEC-K K-05 — Nido next-mission readiness quorum.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { CoopOrchestrator } = require('../../apps/backend/services/coop/coopOrchestrator');
const { createLobbyRouter } = require('../../apps/backend/routes/lobby');
const { createCoopRouter } = require('../../apps/backend/routes/coop');
const { createCoopStore } = require('../../apps/backend/services/coop/coopStore');
const { LobbyService } = require('../../apps/backend/services/network/wsSession');

function nidoOrch() {
  const co = new CoopOrchestrator({ roomCode: 'QUOR', hostId: 'p_h' });
  co._setPhase('nido');
  return co;
}

// ---- orchestrator (direct) ----

test('markMissionReady throws outside nido', () => {
  const co = new CoopOrchestrator({ roomCode: 'QUOR', hostId: 'p_h' }); // phase = lobby
  assert.throws(() => co.markMissionReady('p1', {}), /not_in_nido/);
});

test('markMissionReady records ready + tally; idempotent re-mark', () => {
  const co = nidoOrch();
  const all = ['p_h', 'p1'];
  let t = co.markMissionReady('p1', { ready: true, allPlayerIds: all });
  assert.equal(t.ready, 1);
  assert.equal(t.total, 2);
  assert.equal(t.pending, 1); // p_h not yet
  // re-mark same player -> still one entry (replaces)
  t = co.markMissionReady('p1', { ready: true, allPlayerIds: all });
  assert.equal(t.ready, 1);
  assert.equal(Object.keys(t.per_player).length, 1);
});

test('ready=false retracts (not counted ready, but cast)', () => {
  const co = nidoOrch();
  const all = ['p_h', 'p1'];
  co.markMissionReady('p1', { ready: true, allPlayerIds: all });
  const t = co.markMissionReady('p1', { ready: false, allPlayerIds: all });
  assert.equal(t.ready, 0);
  assert.equal(t.pending, 1); // p1 cast (not pending), p_h still pending
});

test('all_connected_ready: true only when every CONNECTED player is ready', () => {
  const co = nidoOrch();
  const all = ['p_h', 'p1', 'p2'];
  // p2 offline (connected = host + p1). p1 ready, host not yet -> false
  let t = co.markMissionReady('p1', {
    ready: true,
    allPlayerIds: all,
    connectedPlayerIds: ['p_h', 'p1'],
  });
  assert.equal(t.all_connected_ready, false);
  assert.equal(t.connected_pending, 1);
  // host ready -> both connected ready -> true (p2 offline does not block)
  t = co.markMissionReady('p_h', {
    ready: true,
    allPlayerIds: all,
    connectedPlayerIds: ['p_h', 'p1'],
  });
  assert.equal(t.all_connected_ready, true);
  assert.equal(t.connected_ready, 2);
});

test('all_connected_ready false with zero connected participants', () => {
  const co = nidoOrch();
  const t = co.missionReadyTally(['p_h', 'p1'], []);
  assert.equal(t.all_connected_ready, false);
});

test('missionReadyVotes cleared on startRun (mirror worldVotes)', () => {
  const co = nidoOrch();
  co.markMissionReady('p1', { ready: true, allPlayerIds: ['p1'] });
  assert.equal(co.missionReadyVotes.size, 1);
  // startRun only runs from lobby|ended; force 'ended' to exercise its reset.
  co._setPhase('ended');
  co.startRun({ scenarioStack: ['enc_tutorial_01'] });
  assert.equal(co.missionReadyVotes.size, 0);
});

// ---- route error paths ----

function buildApp() {
  const lobby = new LobbyService();
  const coopStore = createCoopStore({ lobby });
  const app = express();
  app.use(express.json());
  app.use('/api', createLobbyRouter({ lobby }));
  app.use('/api', createCoopRouter({ lobby, coopStore }));
  return { app };
}

async function createAndJoin(app) {
  const { body: h } = await request(app).post('/api/lobby/create').send({ host_name: 'H' });
  const { body: j } = await request(app)
    .post('/api/lobby/join')
    .send({ code: h.code, player_name: 'Alice' });
  return { h, j };
}

test('POST /coop/mission/ready -> 403 bad token', async () => {
  const { app } = buildApp();
  const { h, j } = await createAndJoin(app);
  const res = await request(app)
    .post('/api/coop/mission/ready')
    .send({ code: h.code, player_id: j.player_id, player_token: 'bad' });
  assert.equal(res.status, 403);
});

test('POST /coop/mission/ready -> 409 run not started', async () => {
  const { app } = buildApp();
  const { h, j } = await createAndJoin(app);
  const res = await request(app)
    .post('/api/coop/mission/ready')
    .send({ code: h.code, player_id: j.player_id, player_token: j.player_token });
  assert.equal(res.status, 409);
});
