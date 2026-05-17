// Test /api/party/* endpoints + session /start modulation param.
// ADR-2026-04-17 co-op scaling 4→8.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

test('GET /api/party/config returns party config', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app).get('/api/party/config').expect(200);
    assert.ok(res.body.party);
    assert.equal(res.body.party.max_players_coop, 8);
    assert.equal(res.body.party.max_deployed_per_encounter, 8);
  } finally {
    await close();
  }
});

test('GET /api/party/modulations returns 11 presets', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app).get('/api/party/modulations').expect(200);
    assert.ok(Array.isArray(res.body.modulations));
    assert.equal(res.body.modulations.length, 11);
    const full = res.body.modulations.find((m) => m.id === 'full');
    assert.ok(full);
    assert.equal(full.deployed, 8);
  } finally {
    await close();
  }
});

test('GET /api/party/modulations/:id returns preset + grid_size', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app).get('/api/party/modulations/full').expect(200);
    assert.equal(res.body.id, 'full');
    assert.equal(res.body.deployed, 8);
    assert.deepEqual(res.body.grid_size, [10, 10]);

    const quartet = await request(app).get('/api/party/modulations/quartet').expect(200);
    assert.deepEqual(quartet.body.grid_size, [6, 6]);
  } finally {
    await close();
  }
});

test('GET /api/party/modulations/:id 404 on unknown', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    await request(app).get('/api/party/modulations/nonexistent').expect(404);
  } finally {
    await close();
  }
});

test('GET /api/party/grid-size?deployed=N maps to scaling tiers', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const r1 = await request(app).get('/api/party/grid-size?deployed=3').expect(200);
    assert.deepEqual(r1.body.grid_size, [6, 6]);
    const r2 = await request(app).get('/api/party/grid-size?deployed=5').expect(200);
    assert.deepEqual(r2.body.grid_size, [8, 8]);
    const r3 = await request(app).get('/api/party/grid-size?deployed=8').expect(200);
    assert.deepEqual(r3.body.grid_size, [10, 10]);
  } finally {
    await close();
  }
});

test('POST /api/session/start with modulation scales grid', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const units = [
      {
        id: 'p1',
        species: 'velox',
        job: 'skirmisher',
        hp: 10,
        ap: 2,
        attack_range: 2,
        initiative: 14,
        position: { x: 2, y: 2 },
        controlled_by: 'player',
      },
      {
        id: 'sis1',
        species: 'mole',
        job: 'tank',
        hp: 10,
        ap: 2,
        attack_range: 1,
        initiative: 10,
        position: { x: 4, y: 4 },
        controlled_by: 'sistema',
      },
    ];
    const res = await request(app)
      .post('/api/session/start')
      .send({ units, modulation: 'full' })
      .expect(200);
    // Session state has 10x10 grid via preset 'full' (deployed=8 → 10x10)
    const state = await request(app)
      .get(`/api/session/state?session_id=${res.body.session_id}`)
      .expect(200);
    assert.ok(state.body.grid, 'session.grid exposed');
    assert.equal(state.body.grid.width, 10);
    assert.equal(state.body.grid.height, 10);
    assert.equal(state.body.grid_size, 10);
  } finally {
    await close();
  }
});

test('POST /api/session/start without modulation defaults grid to player count', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    // 2 players → 6x6
    const units = [
      {
        id: 'p1',
        species: 'velox',
        job: 'skirmisher',
        hp: 10,
        ap: 2,
        attack_range: 2,
        initiative: 14,
        position: { x: 1, y: 1 },
        controlled_by: 'player',
      },
      {
        id: 'p2',
        species: 'velox',
        job: 'skirmisher',
        hp: 10,
        ap: 2,
        attack_range: 2,
        initiative: 13,
        position: { x: 2, y: 2 },
        controlled_by: 'player',
      },
      {
        id: 'sis1',
        species: 'mole',
        job: 'tank',
        hp: 10,
        ap: 2,
        attack_range: 1,
        initiative: 10,
        position: { x: 4, y: 4 },
        controlled_by: 'sistema',
      },
    ];
    const res = await request(app).post('/api/session/start').send({ units }).expect(200);
    const state = await request(app)
      .get(`/api/session/state?session_id=${res.body.session_id}`)
      .expect(200);
    assert.equal(state.body.grid?.width, 6);
    assert.equal(state.body.grid?.height, 6);
    assert.equal(state.body.grid_size, 6);
  } finally {
    await close();
  }
});
