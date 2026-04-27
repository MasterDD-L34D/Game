// CAP-15b — REST /api/coop/imprint/* integration tests (in-process Express).
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

let request;
try {
  request = require('supertest');
} catch {
  request = null;
}

function jsonCall(app, method, url, body) {
  return new Promise((resolve) => {
    const req = { method, url, headers: {}, body };
    const res = {
      statusCode: 200,
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

async function setup4Players(app) {
  const createRes = await post(app, '/api/lobby/create', { host_name: 'Host', max_players: 5 });
  const { code, host_token: hostToken } = createRes.body;
  const players = [];
  for (const name of ['Alice', 'Bob', 'Cara', 'Dan']) {
    const j = await post(app, '/api/lobby/join', { code, player_name: name });
    players.push({ name, id: j.body.player_id, token: j.body.player_token });
  }
  return { code, hostToken, players };
}

test('CAP-15b happy: imprint/start moves phase lobby → imprint', async () => {
  const { app } = buildApp();
  const { code, hostToken } = await setup4Players(app);
  const res = await post(app, '/api/coop/imprint/start', {
    code,
    host_token: hostToken,
    scenario_stack: ['enc_tutorial_01'],
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.phase, 'imprint');
  assert.equal(res.body.mode, 'imprint_v2');
  assert.deepEqual(res.body.scenario_stack, ['enc_tutorial_01']);
});

test('CAP-15b imprint/choice 1/4: phase stays imprint, ready_list shows 1 ready', async () => {
  const { app } = buildApp();
  const { code, hostToken, players } = await setup4Players(app);
  await post(app, '/api/coop/imprint/start', { code, host_token: hostToken });
  const res = await post(app, '/api/coop/imprint/choice', {
    code,
    player_id: players[0].id,
    player_token: players[0].token,
    axis: 'locomotion',
    value: 'VELOCE',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.phase, 'imprint');
  assert.equal(res.body.choice.axis, 'locomotion');
  assert.equal(res.body.choice.value, 'VELOCE');
  assert.ok(Array.isArray(res.body.ready_list));
  const readyCount = res.body.ready_list.filter((r) => r.ready).length;
  assert.equal(readyCount, 1);
  assert.equal(res.body.biome, undefined);
});

test('CAP-15b imprint/choice 4/4: phase auto-advances to combat + biome resolved', async () => {
  const { app } = buildApp();
  const { code, hostToken, players } = await setup4Players(app);
  await post(app, '/api/coop/imprint/start', { code, host_token: hostToken });
  const choices = [
    { axis: 'locomotion', value: 'VELOCE' },
    { axis: 'offense', value: 'PROFONDA' },
    { axis: 'defense', value: 'DURA' },
    { axis: 'senses', value: 'LONTANO' },
  ];
  let lastRes;
  for (let i = 0; i < 4; i += 1) {
    lastRes = await post(app, '/api/coop/imprint/choice', {
      code,
      player_id: players[i].id,
      player_token: players[i].token,
      ...choices[i],
    });
    assert.equal(lastRes.status, 200);
  }
  // After 4th choice, phase auto-advances to combat
  assert.equal(lastRes.body.phase, 'combat');
  assert.ok(lastRes.body.biome, 'biome must be resolved');
  assert.ok(typeof lastRes.body.biome.biome_id === 'string');
  assert.ok(typeof lastRes.body.biome.base_biome_id === 'string');
  assert.ok(Array.isArray(lastRes.body.biome.applied_modulations));
});

test('CAP-15b imprint/choice rejects ghost player (not in room)', async () => {
  const { app } = buildApp();
  const { code, hostToken, players } = await setup4Players(app);
  await post(app, '/api/coop/imprint/start', { code, host_token: hostToken });
  const res = await post(app, '/api/coop/imprint/choice', {
    code,
    player_id: 'ghost_player',
    player_token: players[0].token, // wrong token for ghost id
    axis: 'locomotion',
    value: 'VELOCE',
  });
  // Ghost rejected at auth layer (player_auth_failed).
  assert.equal(res.status, 403);
});

test('CAP-15b imprint/start rejects missing code (host auth fail)', async () => {
  const { app } = buildApp();
  const res = await post(app, '/api/coop/imprint/start', { host_token: 'nope' });
  assert.equal(res.status, 403);
  assert.equal(res.body.error, 'host_auth_failed');
});

test('CAP-15b imprint/state returns 404 for unknown room', async () => {
  const { app } = buildApp();
  const res = await get(app, '/api/coop/imprint/state?code=ZZZZ');
  assert.equal(res.status, 404);
});

test('CAP-15b imprint/state returns ready_list + aggregate after partial choices', async () => {
  const { app } = buildApp();
  const { code, hostToken, players } = await setup4Players(app);
  await post(app, '/api/coop/imprint/start', { code, host_token: hostToken });
  await post(app, '/api/coop/imprint/choice', {
    code,
    player_id: players[0].id,
    player_token: players[0].token,
    axis: 'locomotion',
    value: 'SILENZIOSA',
  });
  await post(app, '/api/coop/imprint/choice', {
    code,
    player_id: players[1].id,
    player_token: players[1].token,
    axis: 'offense',
    value: 'RAPIDA',
  });
  const res = await get(app, `/api/coop/imprint/state?code=${code}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.phase, 'imprint');
  assert.equal(res.body.ready_list.length, 4);
  assert.equal(res.body.ready_list.filter((r) => r.ready).length, 2);
  // Aggregate is null until 4/4 axes covered
  assert.equal(res.body.choices_aggregate, null);
  assert.equal(res.body.biome, null);
});

test('CAP-15b imprint/choice rejects invalid axis', async () => {
  const { app } = buildApp();
  const { code, hostToken, players } = await setup4Players(app);
  await post(app, '/api/coop/imprint/start', { code, host_token: hostToken });
  const res = await post(app, '/api/coop/imprint/choice', {
    code,
    player_id: players[0].id,
    player_token: players[0].token,
    axis: 'flight', // invalid
    value: 'VELOCE',
  });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /invalid_axis/);
});
