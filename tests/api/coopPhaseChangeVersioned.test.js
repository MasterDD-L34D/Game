// G1 #2746 — coop phase_change broadcast must be VERSIONED.
//
// broadcastCoopState (routes/coop.js) emitted phase_change via raw
// room.broadcast (no `version` key). The Godot phone client drops
// unversioned frames as unknown_type -> phone stuck on a blank screen
// (root cause of item-3 finding-1, deterministic not flaky). Fix routes
// the broadcast through room.publishEvent('phase_change', ...) which
// version-stamps + ledger-records while preserving the rich payload
// (phase/round/scenario/session_id/campaign_id from buildPhaseChangePayload).
//
// Ref: MasterDD-L34D/Game#2746 voce G1.

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
  // Capture all broadcasts emitted to rooms via LobbyService. publishEvent
  // delegates to room.broadcast internally, so wrapping broadcast captures
  // both raw and versioned frames (with the `version` field when present).
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

async function startRun(app) {
  let r = await request(app).post('/api/lobby/create').send({ host_name: 'Host', max_players: 4 });
  const code = r.body.code;
  const hostToken = r.body.host_token;
  r = await request(app).post('/api/lobby/join').send({ code, player_name: 'A' });
  const playerId = r.body.player_id;
  const playerToken = r.body.player_token;
  await request(app)
    .post('/api/coop/run/start')
    .send({ code, host_token: hostToken, scenario_stack: ['enc_demo_01'] });
  return { code, hostToken, playerId, playerToken };
}

function phaseChanges(broadcasts) {
  return broadcasts.filter((b) => b.msg.type === 'phase_change').map((b) => b.msg);
}

test('G1: REST broadcastCoopState emits phase_change WITH version', async () => {
  const { app, broadcasts } = buildApp();
  await startRun(app);
  const pcs = phaseChanges(broadcasts);
  assert.ok(pcs.length >= 1, `expected at least one phase_change broadcast, got ${pcs.length}`);
  for (const pc of pcs) {
    assert.equal(
      typeof pc.version,
      'number',
      `phase_change missing numeric version: ${JSON.stringify(pc)}`,
    );
    assert.ok(pc.version >= 1, `phase_change version must be >= 1, got ${pc.version}`);
  }
});

test('G1: versioned phase_change preserves the rich payload (no regression)', async () => {
  const { app, broadcasts } = buildApp();
  const { code, hostToken, playerId, playerToken } = await startRun(app);
  broadcasts.length = 0;
  await request(app).post('/api/coop/character/create').send({
    code,
    player_id: playerId,
    player_token: playerToken,
    name: 'A',
    form_id: 'istj',
    species_id: 'x',
    job_id: 'guerriero',
  });
  const pcs = phaseChanges(broadcasts);
  assert.ok(pcs.length >= 1, 'expected a phase_change after character/create');
  const pc = pcs[pcs.length - 1];
  // Rich payload fields from buildPhaseChangePayload must survive the switch.
  assert.equal(typeof pc.version, 'number');
  assert.ok('phase' in pc.payload, 'payload.phase missing');
  assert.ok('round' in pc.payload, 'payload.round missing (rich payload lost)');
  assert.ok('scenario' in pc.payload, 'payload.scenario missing (rich payload lost)');
  assert.ok('campaign_id' in pc.payload, 'payload.campaign_id missing');
  assert.ok('session_id' in pc.payload, 'payload.session_id missing');
});

test('G1: phase_change version is monotonic across REST broadcasts', async () => {
  const { app, broadcasts } = buildApp();
  const { code, hostToken, playerId, playerToken } = await startRun(app);
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
  const versions = phaseChanges(broadcasts).map((m) => m.version);
  assert.ok(versions.length >= 2, `expected >=2 versioned phase_change, got ${versions.length}`);
  for (let i = 1; i < versions.length; i += 1) {
    assert.ok(
      versions[i] >= versions[i - 1],
      `version non-monotonic: v[${i}]=${versions[i]} < v[${i - 1}]=${versions[i - 1]}`,
    );
  }
});
