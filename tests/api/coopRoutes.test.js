// M17 — REST /api/coop/* integration tests (in-process Express).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
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
  return { app, lobby, coopStore };
}

async function jsonCall(app, method, path, body) {
  return new Promise((resolve) => {
    const req = { method, url: path, headers: {}, body };
    const res = {
      statusCode: 200,
      headers: {},
      _body: null,
      setHeader() {},
      getHeader() {},
      status(c) {
        this.statusCode = c;
        return this;
      },
      json(obj) {
        this._body = obj;
        resolve({ status: this.statusCode, body: obj });
      },
      send(obj) {
        this._body = obj;
        resolve({ status: this.statusCode, body: obj });
      },
      end() {
        resolve({ status: this.statusCode, body: this._body });
      },
    };
    app._router.handle(req, res, () => resolve({ status: 404, body: null }));
  });
}

// Use supertest for cleaner test — fallback to raw if not installed.
let request;
try {
  request = require('supertest');
} catch {
  request = null;
}

async function post(app, path, body) {
  if (request) {
    const res = await request(app).post(path).send(body).set('Content-Type', 'application/json');
    return { status: res.status, body: res.body };
  }
  return jsonCall(app, 'POST', path, body);
}
async function get(app, path) {
  if (request) {
    const res = await request(app).get(path);
    return { status: res.status, body: res.body };
  }
  return jsonCall(app, 'GET', path, null);
}

test('POST /api/coop/run/start requires host_token', async () => {
  const { app } = buildApp();
  const res = await post(app, '/api/coop/run/start', { code: 'ABCD' });
  assert.equal(res.status, 403);
});

test('full flow: create room → join → run start → character create → world confirm', async () => {
  const { app } = buildApp();
  const createRes = await post(app, '/api/lobby/create', { host_name: 'Host', max_players: 4 });
  assert.ok(createRes.status === 200 || createRes.status === 201);
  const { code, host_token: hostToken } = createRes.body;

  const joinRes = await post(app, '/api/lobby/join', { code, player_name: 'Alice' });
  assert.ok(joinRes.status === 200 || joinRes.status === 201);
  const { player_id: aliceId, player_token: aliceToken } = joinRes.body;

  const runRes = await post(app, '/api/coop/run/start', {
    code,
    host_token: hostToken,
    scenario_stack: ['enc_tutorial_01'],
  });
  assert.equal(runRes.status, 201);
  assert.equal(runRes.body.phase, 'character_creation');

  const charRes = await post(app, '/api/coop/character/create', {
    code,
    player_id: aliceId,
    player_token: aliceToken,
    name: 'Aria',
    form_id: 'istj_custode',
    species_id: 'scagliato',
    job_id: 'vanguard',
  });
  assert.equal(charRes.status, 201);
  // Single player = all ready, phase auto transitions
  assert.equal(charRes.body.phase, 'world_setup');

  const stateRes = await get(app, `/api/coop/state?code=${code}`);
  assert.equal(stateRes.status, 200);
  assert.equal(stateRes.body.snapshot.phase, 'world_setup');
  assert.equal(stateRes.body.snapshot.characters.length, 1);
  assert.equal(stateRes.body.snapshot.characters[0].name, 'Aria');

  const worldRes = await post(app, '/api/coop/world/confirm', {
    code,
    host_token: hostToken,
    scenario_id: 'enc_tutorial_01',
  });
  assert.equal(worldRes.status, 200);
  assert.equal(worldRes.body.phase, 'combat');
  assert.ok(Array.isArray(worldRes.body.session_start_payload?.units));
  assert.equal(worldRes.body.session_start_payload.units[0].owner_id, aliceId);
});

test('character/create rejects invalid spec', async () => {
  const { app } = buildApp();
  const createRes = await post(app, '/api/lobby/create', { host_name: 'H' });
  const { code, host_token: hostToken } = createRes.body;
  const joinRes = await post(app, '/api/lobby/join', { code, player_name: 'P' });
  await post(app, '/api/coop/run/start', { code, host_token: hostToken });
  const res = await post(app, '/api/coop/character/create', {
    code,
    player_id: joinRes.body.player_id,
    player_token: joinRes.body.player_token,
    name: '',
    form_id: '',
  });
  assert.equal(res.status, 400);
});

test('world/confirm requires run started', async () => {
  const { app } = buildApp();
  const createRes = await post(app, '/api/lobby/create', { host_name: 'H' });
  const { code, host_token: hostToken } = createRes.body;
  const res = await post(app, '/api/coop/world/confirm', {
    code,
    host_token: hostToken,
    scenario_id: 'enc_tutorial_01',
  });
  assert.equal(res.status, 409);
});

test('state endpoint returns 404 for unknown room', async () => {
  const { app } = buildApp();
  const res = await get(app, '/api/coop/state?code=ZZZZ');
  assert.equal(res.status, 404);
});

test('F-2: POST /api/coop/run/force-advance unsticks character_creation', async () => {
  const { app } = buildApp();
  const createRes = await post(app, '/api/lobby/create', { host_name: 'H', max_players: 4 });
  const { code, host_token: hostToken } = createRes.body;
  await post(app, '/api/lobby/join', { code, player_name: 'Alice' });
  await post(app, '/api/lobby/join', { code, player_name: 'Bob' });
  await post(app, '/api/coop/run/start', { code, host_token: hostToken });
  // Neither Alice nor Bob submits → stuck in character_creation.
  const res = await post(app, '/api/coop/run/force-advance', {
    code,
    host_token: hostToken,
    reason: 'alice_offline',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.phase, 'world_setup');
  assert.equal(res.body.previous_phase, 'character_creation');
});

test('F-2: force-advance rejects non-host caller', async () => {
  const { app } = buildApp();
  const createRes = await post(app, '/api/lobby/create', { host_name: 'H' });
  const { code, host_token: hostToken } = createRes.body;
  await post(app, '/api/coop/run/start', { code, host_token: hostToken });
  const res = await post(app, '/api/coop/run/force-advance', {
    code,
    host_token: 'wrong_token',
  });
  assert.equal(res.status, 403);
});

test('F-2: force-advance rejects when not_in_allowed_phase', async () => {
  const { app } = buildApp();
  const createRes = await post(app, '/api/lobby/create', { host_name: 'H' });
  const { code, host_token: hostToken } = createRes.body;
  // No run started yet → orch absent → 409.
  const res1 = await post(app, '/api/coop/run/force-advance', { code, host_token: hostToken });
  assert.equal(res1.status, 409);

  await post(app, '/api/coop/run/start', { code, host_token: hostToken });
  const joinRes = await post(app, '/api/lobby/join', { code, player_name: 'Alice' });
  await post(app, '/api/coop/character/create', {
    code,
    player_id: joinRes.body.player_id,
    player_token: joinRes.body.player_token,
    name: 'Aria',
    form_id: 'istj',
  });
  await post(app, '/api/coop/world/confirm', { code, host_token: hostToken });
  // Now in combat — force-advance should be rejected.
  const res2 = await post(app, '/api/coop/run/force-advance', { code, host_token: hostToken });
  assert.equal(res2.status, 400);
  assert.ok(res2.body.error?.startsWith('force_advance_not_allowed_from:combat'));
});

test('combat/end transitions combat → debrief (host authed)', async () => {
  const { app } = buildApp();
  const createRes = await post(app, '/api/lobby/create', { host_name: 'H' });
  const { code, host_token: hostToken } = createRes.body;
  const joinRes = await post(app, '/api/lobby/join', { code, player_name: 'Alice' });
  await post(app, '/api/coop/run/start', { code, host_token: hostToken });
  await post(app, '/api/coop/character/create', {
    code,
    player_id: joinRes.body.player_id,
    player_token: joinRes.body.player_token,
    name: 'Aria',
    form_id: 'istj',
  });
  await post(app, '/api/coop/world/confirm', { code, host_token: hostToken });
  const endRes = await post(app, '/api/coop/combat/end', {
    code,
    host_token: hostToken,
    outcome: 'victory',
    xp_earned: 10,
  });
  assert.equal(endRes.status, 200);
  assert.equal(endRes.body.phase, 'debrief');
});
