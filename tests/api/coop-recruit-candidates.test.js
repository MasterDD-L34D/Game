// Task 5 debrief-recruit producer slice -- threading recruit_candidates through
// the co-op debrief broadcast path.
//
// The /api/coop/combat/end route accepts an optional recruit_candidates array
// and stores it on run.debrief so it rides the existing debrief_payload
// broadcast to phones (alongside per_actor). No new WS message type, no new
// phase, no recruit/gate logic.
//
// Back-compat: absent recruit_candidates -> run.debrief unchanged.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

const { createLobbyRouter } = require('../../apps/backend/routes/lobby');
const { createCoopRouter } = require('../../apps/backend/routes/coop');
const { createCoopStore } = require('../../apps/backend/services/coop/coopStore');
const { LobbyService } = require('../../apps/backend/services/network/wsSession');
const { CoopOrchestrator } = require('../../apps/backend/services/coop/coopOrchestrator');

// ---- shared app factory (mirrors coopBroadcastDebriefPayload.test.js) ----

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

async function setupAtCombat(app, broadcasts) {
  let r = await request(app).post('/api/lobby/create').send({ host_name: 'Host', max_players: 4 });
  const code = r.body.code;
  const hostToken = r.body.host_token;
  r = await request(app).post('/api/lobby/join').send({ code, player_name: 'P1' });
  const playerId = r.body.player_id;
  const playerToken = r.body.player_token;
  await request(app)
    .post('/api/coop/run/start')
    .send({ code, host_token: hostToken, scenario_stack: ['enc_demo_01'] });
  await request(app).post('/api/coop/character/create').send({
    code,
    player_id: playerId,
    player_token: playerToken,
    name: 'Aria',
    form_id: 'istj',
    species_id: 'scagliato',
    job_id: 'guerriero',
  });
  await request(app)
    .post('/api/coop/world/confirm')
    .send({ code, host_token: hostToken, scenario_id: 'enc_demo_01' });
  broadcasts.length = 0;
  return { code, hostToken };
}

// ---- orchestrator unit tests (fast, no HTTP) ----

function setupOrchAtCombat() {
  const co = new CoopOrchestrator({ roomCode: 'TEST', hostId: 'p_h' });
  co.startRun({ scenarioStack: ['enc_demo_01'] });
  co.submitCharacter(
    'p_h',
    { name: 'Hero', form_id: 'istj', species_id: 'scagliato', job_id: 'guerriero' },
    { allPlayerIds: ['p_h'] },
  );
  co.confirmWorld();
  return co;
}

test('endCombat: recruit_candidates stored on run.debrief', () => {
  const co = setupOrchAtCombat();
  const candidates = [
    { npc_id: 'sis_a', species_id: 'polpo_araldo_sinaptico', forma: 'ESTJ', display_name: 'S' },
  ];
  co.endCombat({ outcome: 'victory', recruitCandidates: candidates });
  assert.deepEqual(co.run.debrief.recruit_candidates, candidates);
});

test('endCombat: recruit_candidates merged with existing debriefPayload per_actor', () => {
  const co = setupOrchAtCombat();
  const debriefPayload = { per_actor: { pg_a: { sentience_tier: 'T2' } } };
  const candidates = [{ npc_id: 'sis_b', species_id: 'anguis', forma: 'INTJ', display_name: 'B' }];
  co.endCombat({ outcome: 'victory', debriefPayload, recruitCandidates: candidates });
  assert.deepEqual(co.run.debrief.per_actor, debriefPayload.per_actor);
  assert.deepEqual(co.run.debrief.recruit_candidates, candidates);
});

test('endCombat: empty array recruit_candidates -- not stored (back-compat)', () => {
  const co = setupOrchAtCombat();
  co.endCombat({ outcome: 'victory', recruitCandidates: [] });
  assert.equal(co.run.debrief, undefined, 'empty recruit_candidates must not set run.debrief');
});

test('endCombat: absent recruit_candidates -- run.debrief unchanged (back-compat)', () => {
  const co = setupOrchAtCombat();
  co.endCombat({ outcome: 'victory' });
  assert.equal(co.run.debrief, undefined);
});

test('endCombat: non-array recruit_candidates ignored silently', () => {
  const co = setupOrchAtCombat();
  co.endCombat({ outcome: 'victory', recruitCandidates: 'bad' });
  assert.equal(co.run.debrief, undefined);
});

test('endCombat: recruit_candidates only (no debriefPayload) sets run.debrief', () => {
  const co = setupOrchAtCombat();
  const candidates = [
    { npc_id: 'sis_c', species_id: 'lupinus_velo', forma: 'INFP', display_name: 'C' },
  ];
  co.endCombat({ outcome: 'victory', recruitCandidates: candidates });
  assert.ok(typeof co.run.debrief === 'object');
  assert.deepEqual(co.run.debrief.recruit_candidates, candidates);
  assert.equal('per_actor' in co.run.debrief, false);
});

// ---- route integration tests (HTTP + broadcast) ----

test('POST /coop/combat/end: recruit_candidates in body stored + broadcast in debrief_payload', async () => {
  const { app, broadcasts } = buildApp();
  const { code, hostToken } = await setupAtCombat(app, broadcasts);
  const candidates = [
    { npc_id: 'sis_a', species_id: 'polpo_araldo_sinaptico', forma: 'ESTJ', display_name: 'S' },
  ];
  const res = await request(app).post('/api/coop/combat/end').send({
    code,
    host_token: hostToken,
    outcome: 'victory',
    recruit_candidates: candidates,
  });
  assert.equal(res.status, 200);
  const dpMsg = broadcasts.find((b) => b.msg.type === 'debrief_payload');
  assert.ok(dpMsg, 'debrief_payload must be broadcast');
  assert.deepEqual(dpMsg.msg.payload.recruit_candidates, candidates);
});

test('POST /coop/combat/end: recruit_candidates + debrief_payload both surface in broadcast', async () => {
  const { app, broadcasts } = buildApp();
  const { code, hostToken } = await setupAtCombat(app, broadcasts);
  const perActor = { pg_x: { sentience_tier: 'T3' } };
  const candidates = [{ npc_id: 'sis_d', species_id: 'anguis', forma: 'ISTP', display_name: 'D' }];
  await request(app)
    .post('/api/coop/combat/end')
    .send({
      code,
      host_token: hostToken,
      outcome: 'victory',
      debrief_payload: { per_actor: perActor },
      recruit_candidates: candidates,
    });
  const dpMsg = broadcasts.find((b) => b.msg.type === 'debrief_payload');
  assert.ok(dpMsg, 'debrief_payload must be broadcast');
  assert.deepEqual(dpMsg.msg.payload.per_actor, perActor);
  assert.deepEqual(dpMsg.msg.payload.recruit_candidates, candidates);
});

test('POST /coop/combat/end: absent recruit_candidates -- no debrief_payload broadcast (back-compat)', async () => {
  const { app, broadcasts } = buildApp();
  const { code, hostToken } = await setupAtCombat(app, broadcasts);
  const res = await request(app).post('/api/coop/combat/end').send({
    code,
    host_token: hostToken,
    outcome: 'victory',
  });
  assert.equal(res.status, 200);
  const types = broadcasts.map((b) => b.msg.type);
  assert.equal(
    types.includes('debrief_payload'),
    false,
    `no debrief_payload broadcast expected when absent; got: ${types}`,
  );
});

test('POST /coop/combat/end: empty recruit_candidates array -- no debrief_payload broadcast', async () => {
  const { app, broadcasts } = buildApp();
  const { code, hostToken } = await setupAtCombat(app, broadcasts);
  const res = await request(app).post('/api/coop/combat/end').send({
    code,
    host_token: hostToken,
    outcome: 'victory',
    recruit_candidates: [],
  });
  assert.equal(res.status, 200);
  const types = broadcasts.map((b) => b.msg.type);
  assert.equal(
    types.includes('debrief_payload'),
    false,
    `no debrief_payload broadcast expected for empty array; got: ${types}`,
  );
});
