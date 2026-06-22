'use strict';

// C2-imprint STEP 1 -- REST transport for the imprint beat (route plumbing + flag-gate).
// The full device-authority mark->hint flow is covered by tests/api/coopImprintBeat.test.js
// (happy-path quorum needs WS-connected players; here we exercise auth + gating + shape).
// Plan: docs/planning/2026-06-22-aa01-c2-imprint-build-spec.md

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
  return { app };
}

async function createAndJoin(app) {
  const { body: h } = await request(app).post('/api/lobby/create').send({ host_name: 'H' });
  const { body: j } = await request(app)
    .post('/api/lobby/join')
    .send({ code: h.code, player_name: 'Alice' });
  return { h, j };
}

// Run an async fn with IMPRINT_BEAT_ENABLED forced to a value, restoring it after.
async function withFlag(value, fn) {
  const prev = process.env.IMPRINT_BEAT_ENABLED;
  if (value === undefined) delete process.env.IMPRINT_BEAT_ENABLED;
  else process.env.IMPRINT_BEAT_ENABLED = value;
  try {
    return await fn();
  } finally {
    if (prev === undefined) delete process.env.IMPRINT_BEAT_ENABLED;
    else process.env.IMPRINT_BEAT_ENABLED = prev;
  }
}

test('POST /coop/imprint/open -> 409 imprint_disabled when flag OFF (band-neutral)', async () => {
  await withFlag(undefined, async () => {
    const { app } = buildApp();
    const { h } = await createAndJoin(app);
    await request(app).post('/api/coop/run/start').send({ code: h.code, host_token: h.host_token });
    const res = await request(app)
      .post('/api/coop/imprint/open')
      .send({ code: h.code, host_token: h.host_token });
    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'imprint_disabled');
  });
});

test('POST /coop/imprint/open -> 403 bad host token (flag ON)', async () => {
  await withFlag('true', async () => {
    const { app } = buildApp();
    const { h } = await createAndJoin(app);
    await request(app).post('/api/coop/run/start').send({ code: h.code, host_token: h.host_token });
    const res = await request(app)
      .post('/api/coop/imprint/open')
      .send({ code: h.code, host_token: 'bad' });
    assert.equal(res.status, 403);
  });
});

test('POST /coop/imprint/open -> 409 run not started (flag ON)', async () => {
  await withFlag('true', async () => {
    const { app } = buildApp();
    const { h } = await createAndJoin(app);
    const res = await request(app)
      .post('/api/coop/imprint/open')
      .send({ code: h.code, host_token: h.host_token });
    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'run_not_started');
  });
});

test('POST /coop/imprint/open -> 400 no_connected_players (no WS-connected device)', async () => {
  // The host must open AFTER players connect; a joined-but-not-WS-connected roster yields
  // an empty connected quorum -> reject (else the beat opens with no axis owners and can
  // never complete). The connected-open happy path is exercised e2e by the WS test.
  await withFlag('true', async () => {
    const { app } = buildApp();
    const { h } = await createAndJoin(app);
    await request(app).post('/api/coop/run/start').send({ code: h.code, host_token: h.host_token });
    const res = await request(app)
      .post('/api/coop/imprint/open')
      .send({ code: h.code, host_token: h.host_token });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'no_connected_players');
  });
});

test('POST /coop/imprint/mark -> 403 bad player token', async () => {
  const { app } = buildApp();
  const { h, j } = await createAndJoin(app);
  await request(app).post('/api/coop/run/start').send({ code: h.code, host_token: h.host_token });
  const res = await request(app).post('/api/coop/imprint/mark').send({
    code: h.code,
    player_id: j.player_id,
    player_token: 'bad',
    axis: 'locomotion',
    value: 'VELOCE',
  });
  assert.equal(res.status, 403);
});

test('POST /coop/imprint/mark -> 409 run not started', async () => {
  const { app } = buildApp();
  const { h, j } = await createAndJoin(app);
  const res = await request(app).post('/api/coop/imprint/mark').send({
    code: h.code,
    player_id: j.player_id,
    player_token: j.player_token,
    axis: 'locomotion',
    value: 'VELOCE',
  });
  assert.equal(res.status, 409);
});

test('POST /coop/imprint/mark -> 400 when beat not open (typed error)', async () => {
  const { app } = buildApp();
  const { h, j } = await createAndJoin(app);
  await request(app).post('/api/coop/run/start').send({ code: h.code, host_token: h.host_token });
  const res = await request(app).post('/api/coop/imprint/mark').send({
    code: h.code,
    player_id: j.player_id,
    player_token: j.player_token,
    axis: 'locomotion',
    value: 'VELOCE',
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'imprint_not_open');
});

test('POST /coop/imprint/cancel -> 409 imprint_disabled when flag OFF', async () => {
  await withFlag(undefined, async () => {
    const { app } = buildApp();
    const { h } = await createAndJoin(app);
    await request(app).post('/api/coop/run/start').send({ code: h.code, host_token: h.host_token });
    const res = await request(app)
      .post('/api/coop/imprint/cancel')
      .send({ code: h.code, host_token: h.host_token });
    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'imprint_disabled');
  });
});

test('POST /coop/imprint/cancel -> 403 bad host token (flag ON)', async () => {
  await withFlag('true', async () => {
    const { app } = buildApp();
    const { h } = await createAndJoin(app);
    await request(app).post('/api/coop/run/start').send({ code: h.code, host_token: h.host_token });
    const res = await request(app)
      .post('/api/coop/imprint/cancel')
      .send({ code: h.code, host_token: 'bad' });
    assert.equal(res.status, 403);
  });
});

test('POST /coop/imprint/force -> 409 imprint_disabled when flag OFF', async () => {
  await withFlag(undefined, async () => {
    const { app } = buildApp();
    const { h } = await createAndJoin(app);
    await request(app).post('/api/coop/run/start').send({ code: h.code, host_token: h.host_token });
    const res = await request(app)
      .post('/api/coop/imprint/force')
      .send({ code: h.code, host_token: h.host_token });
    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'imprint_disabled');
  });
});

test('POST /coop/imprint/force -> 403 bad host token (flag ON)', async () => {
  await withFlag('true', async () => {
    const { app } = buildApp();
    const { h } = await createAndJoin(app);
    await request(app).post('/api/coop/run/start').send({ code: h.code, host_token: h.host_token });
    const res = await request(app)
      .post('/api/coop/imprint/force')
      .send({ code: h.code, host_token: 'bad' });
    assert.equal(res.status, 403);
  });
});
