// GAP-C fase-3 -- POST /api/coop/route/open: the host (TV), having received
// choice_required + route_choice.candidates from POST /api/campaign/advance,
// opens the co-op route choice. The server stores the candidates on the
// orchestrator + broadcasts `route_choice` (the render model) and an initial
// `route_tally` to phones, which then vote per node_id (route_vote WS intent).
//
// Mirrors coop-recruit-candidates.test.js (host posts data -> broadcast to
// phones). Flag-gated upstream: when META_NETWORK_ROUTING is OFF, /advance
// never returns choice_required, so this endpoint is never reached (band-safe).
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

const CANDS = [
  { node_id: 'BADLANDS', biome_id: 'badlands', weight: 0.7, encounter_id: 'enc_a' },
  { node_id: 'CRYOSTEPPE', biome_id: 'cryosteppe', weight: 0.9, encounter_id: 'enc_b' },
];

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

test('POST /coop/route/open: broadcasts route_choice with candidates', async () => {
  const { app, broadcasts } = buildApp();
  const { code, hostToken } = await setupRun(app);
  broadcasts.length = 0;
  const res = await request(app)
    .post('/api/coop/route/open')
    .send({ code, host_token: hostToken, candidates: CANDS });
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  const rc = broadcasts.find((b) => b.msg.type === 'route_choice');
  assert.ok(rc, 'route_choice must be broadcast');
  assert.deepEqual(
    rc.msg.payload.candidates.map((c) => c.node_id),
    ['BADLANDS', 'CRYOSTEPPE'],
  );
});

test('POST /coop/route/open: also broadcasts an initial (empty) route_tally', async () => {
  const { app, broadcasts } = buildApp();
  const { code, hostToken } = await setupRun(app);
  broadcasts.length = 0;
  await request(app)
    .post('/api/coop/route/open')
    .send({ code, host_token: hostToken, candidates: CANDS });
  const rt = broadcasts.find((b) => b.msg.type === 'route_tally');
  assert.ok(rt, 'route_tally must be broadcast');
  assert.equal(rt.msg.payload.leading_node_id, null, 'no votes yet -> no leader');
  assert.equal(rt.msg.payload.tallies.length, 0);
});

test('POST /coop/route/open: empty candidates -> 400 + no broadcast', async () => {
  const { app, broadcasts } = buildApp();
  const { code, hostToken } = await setupRun(app);
  broadcasts.length = 0;
  const res = await request(app)
    .post('/api/coop/route/open')
    .send({ code, host_token: hostToken, candidates: [] });
  assert.equal(res.status, 400);
  assert.equal(
    broadcasts.some((b) => b.msg.type === 'route_choice'),
    false,
  );
});

test('POST /coop/route/open: missing host_token -> 403', async () => {
  const { app } = buildApp();
  const { code } = await setupRun(app);
  const res = await request(app).post('/api/coop/route/open').send({ code, candidates: CANDS });
  assert.equal(res.status, 403);
});

test('POST /coop/route/open: run not started -> 409', async () => {
  const { app } = buildApp();
  let r = await request(app).post('/api/lobby/create').send({ host_name: 'TV', max_players: 4 });
  const code = r.body.code;
  const hostToken = r.body.host_token;
  const res = await request(app)
    .post('/api/coop/route/open')
    .send({ code, host_token: hostToken, candidates: CANDS });
  assert.equal(res.status, 409);
});
