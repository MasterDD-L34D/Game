// SPEC-J sez.5 -- POST /api/coop/lethal/open: the host opens a per-player
// lethal-consent round and the server broadcasts the anonymous waiting snapshot
// (lethal_consent_open, F5: counts only). Players then confirm via the
// lethal_consent_confirm WS intent (orchestrator-tested separately). Mirrors
// coopRouteChoiceBroadcast.test.js (host posts -> broadcast to phones).
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
  const broadcasts = [];
  const origGetRoom = lobby.getRoom.bind(lobby);
  lobby.getRoom = function (code) {
    const room = origGetRoom(code);
    if (room && !room.__broadcastWrapped) {
      const origBroadcast = room.broadcast.bind(room);
      room.broadcast = function (msg) {
        broadcasts.push({ code, msg });
        return origBroadcast(msg);
      };
      room.__broadcastWrapped = true;
    }
    return room;
  };
  const app = express();
  app.use(express.json());
  app.use('/api', createLobbyRouter({ lobby }));
  app.use('/api', createCoopRouter({ lobby, coopStore }));
  return { app, lobby, coopStore, broadcasts };
}

async function setupRun(app) {
  let r = await request(app).post('/api/lobby/create').send({ host_name: 'TV', max_players: 4 });
  const code = r.body.code;
  const hostToken = r.body.host_token;
  await request(app).post('/api/lobby/join').send({ code, player_name: 'P1' });
  await request(app)
    .post('/api/coop/run/start')
    .send({ code, host_token: hostToken, scenario_stack: ['enc_demo_01'] });
  return { code, hostToken };
}

test('POST /coop/lethal/open: broadcasts anonymous lethal_consent_open snapshot', async () => {
  const { app, broadcasts } = buildApp();
  const { code, hostToken } = await setupRun(app);
  broadcasts.length = 0;
  const res = await request(app)
    .post('/api/coop/lethal/open')
    .send({ code, host_token: hostToken, at_risk_player_ids: ['p1', 'p2'], timeout_ms: 5000 });
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.consent.total, 2);
  assert.equal(res.body.consent.confirmed_count, 0);
  const ev = broadcasts.find((b) => b.msg.type === 'lethal_consent_open');
  assert.ok(ev, 'lethal_consent_open must be broadcast');
  assert.equal(ev.msg.payload.total, 2);
  assert.equal(ev.msg.payload.status, 'pending');
  // F5: the broadcast must NOT leak the per-player roster.
  assert.equal(ev.msg.payload.at_risk, undefined);
});

test('POST /coop/lethal/open: empty at-risk -> 400 (must NOT trivially grant lethal)', async () => {
  const { app } = buildApp();
  const { code, hostToken } = await setupRun(app);
  const res = await request(app)
    .post('/api/coop/lethal/open')
    .send({ code, host_token: hostToken, at_risk_player_ids: [] });
  assert.equal(res.status, 400);
});

test('POST /coop/lethal/open: all-non-string at-risk -> 400 (no empty-grant via type hole)', async () => {
  const { app } = buildApp();
  const { code, hostToken } = await setupRun(app);
  const res = await request(app)
    .post('/api/coop/lethal/open')
    .send({ code, host_token: hostToken, at_risk_player_ids: [1, 2, null] });
  assert.equal(res.status, 400);
});

test('POST /coop/lethal/open: missing at_risk_player_ids -> 400', async () => {
  const { app } = buildApp();
  const { code, hostToken } = await setupRun(app);
  const res = await request(app)
    .post('/api/coop/lethal/open')
    .send({ code, host_token: hostToken });
  assert.equal(res.status, 400);
});

test('POST /coop/lethal/cancel: host aborts a stuck round -> soft + broadcast (no hang)', async () => {
  const { app, broadcasts } = buildApp();
  const { code, hostToken } = await setupRun(app);
  await request(app)
    .post('/api/coop/lethal/open')
    .send({ code, host_token: hostToken, at_risk_player_ids: ['p1', 'p2'] });
  broadcasts.length = 0;
  const res = await request(app)
    .post('/api/coop/lethal/cancel')
    .send({ code, host_token: hostToken });
  assert.equal(res.status, 200);
  assert.equal(res.body.outcome, 'soft', 'abort resolves to soft (NON parte lethal)');
  const ev = broadcasts.find((b) => b.msg.type === 'lethal_consent_resolved');
  assert.ok(ev, 'lethal_consent_resolved broadcast');
  assert.equal(ev.msg.payload.outcome, 'soft');
});

test('POST /coop/lethal/cancel: missing host_token -> 403', async () => {
  const { app } = buildApp();
  const { code } = await setupRun(app);
  const res = await request(app).post('/api/coop/lethal/cancel').send({ code });
  assert.equal(res.status, 403);
});

test('POST /coop/lethal/open: missing host_token -> 403', async () => {
  const { app } = buildApp();
  const { code } = await setupRun(app);
  const res = await request(app)
    .post('/api/coop/lethal/open')
    .send({ code, at_risk_player_ids: ['p1'] });
  assert.equal(res.status, 403);
});

test('POST /coop/lethal/open: run not started -> 409', async () => {
  const { app } = buildApp();
  let r = await request(app).post('/api/lobby/create').send({ host_name: 'TV', max_players: 4 });
  const code = r.body.code;
  const hostToken = r.body.host_token;
  const res = await request(app)
    .post('/api/coop/lethal/open')
    .send({ code, host_token: hostToken, at_risk_player_ids: ['p1'] });
  assert.equal(res.status, 409);
});
