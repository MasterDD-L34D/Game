// 2026-05-15 Bundle C follow-up — broadcastCoopState emits debrief_payload
// type when orch.run.debrief present (#2269 wire). Closes phase-3 cross-stack
// surface for Godot v2 #269 + #270 phone DebriefView reveal.

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
  // Capture all broadcasts emitted to rooms via LobbyService.
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

async function _setupAtCombat(app, broadcasts) {
  let r = await request(app).post('/api/lobby/create').send({ host_name: 'Host', max_players: 4 });
  const code = r.body.code;
  const hostToken = r.body.host_token;
  r = await request(app).post('/api/lobby/join').send({ code, player_name: 'A' });
  const playerId = r.body.player_id;
  const playerToken = r.body.player_token;
  await request(app)
    .post('/api/coop/run/start')
    .send({ code, host_token: hostToken, scenario_stack: ['enc_demo_01'] });
  await request(app).post('/api/coop/character/create').send({
    code,
    player_id: playerId,
    player_token: playerToken,
    name: 'A',
    form_id: 'istj',
    species_id: 'x',
    job_id: 'guerriero',
  });
  await request(app)
    .post('/api/coop/world/confirm')
    .send({ code, host_token: hostToken, scenario_id: 'enc_demo_01' });
  // Reset broadcast log to only capture debrief-phase emissions.
  broadcasts.length = 0;
  return { code, hostToken };
}

test('broadcastCoopState emits debrief_payload when run.debrief present', async () => {
  const { app, broadcasts } = buildApp();
  const { code, hostToken } = await _setupAtCombat(app, broadcasts);
  const payload = {
    per_actor: {
      p_h: {
        sentience_tier: 'T3',
        conviction_axis: { utility: 60, liberty: 50, morality: 55 },
        ennea_archetype: 'Mediatore',
      },
    },
  };
  const res = await request(app)
    .post('/api/coop/combat/end')
    .send({ code, host_token: hostToken, outcome: 'victory', debrief_payload: payload });
  assert.equal(res.status, 200);
  const types = broadcasts.map((b) => b.msg.type);
  assert.ok(types.includes('debrief_payload'), `expected debrief_payload broadcast: ${types}`);
  const dpMsg = broadcasts.find((b) => b.msg.type === 'debrief_payload');
  assert.deepEqual(dpMsg.msg.payload, payload);
});

test('broadcastCoopState skips debrief_payload when payload absent (back-compat)', async () => {
  const { app, broadcasts } = buildApp();
  const { code, hostToken } = await _setupAtCombat(app, broadcasts);
  const res = await request(app)
    .post('/api/coop/combat/end')
    .send({ code, host_token: hostToken, outcome: 'victory' });
  assert.equal(res.status, 200);
  const types = broadcasts.map((b) => b.msg.type);
  assert.equal(
    types.includes('debrief_payload'),
    false,
    `no debrief_payload broadcast expected; got: ${types}`,
  );
});

test('debrief_payload broadcast ordered after debrief_ready_list', async () => {
  const { app, broadcasts } = buildApp();
  const { code, hostToken } = await _setupAtCombat(app, broadcasts);
  await request(app)
    .post('/api/coop/combat/end')
    .send({
      code,
      host_token: hostToken,
      outcome: 'victory',
      debrief_payload: { per_actor: { p_h: { sentience_tier: 'T4' } } },
    });
  const types = broadcasts.map((b) => b.msg.type);
  const dpIdx = types.indexOf('debrief_payload');
  const rdyIdx = types.indexOf('debrief_ready_list');
  assert.ok(dpIdx > rdyIdx, `expected debrief_payload AFTER debrief_ready_list: ${types}`);
});

test('debrief_payload broadcast NOT emitted in non-debrief phase', async () => {
  const { app, broadcasts } = buildApp();
  let r = await request(app).post('/api/lobby/create').send({ host_name: 'Host', max_players: 4 });
  const code = r.body.code;
  const hostToken = r.body.host_token;
  await request(app).post('/api/lobby/join').send({ code, player_name: 'A' });
  await request(app)
    .post('/api/coop/run/start')
    .send({ code, host_token: hostToken, scenario_stack: ['enc_demo_01'] });
  // No combat → no debrief phase → no debrief_payload broadcast.
  const types = broadcasts.map((b) => b.msg.type);
  assert.equal(types.includes('debrief_payload'), false);
});
