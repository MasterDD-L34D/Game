// fase-2c grid-wiring (ADR-2026-07-03): POST /api/session/start must honor an encounter that opts
// into board_scale:'grid_sized' (board = authored grid_size), while board_scale:'party_sized'
// (or absent) keeps the party fill-ratio board (gridSizeFor), byte-identical to legacy.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

const units = [
  { id: 'p1', controlled_by: 'player', hp: 10, max_hp: 10, position: { x: 0, y: 0 } },
  { id: 's1', controlled_by: 'sistema', hp: 10, max_hp: 10, position: { x: 1, y: 1 } },
];

test('grid_sized encounter sizes the played board from grid_size', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app)
    .post('/api/session/start')
    .send({ units, encounter: { board_scale: 'grid_sized', grid_size: [14, 14] } });
  assert.equal(res.status, 200);
  assert.equal(res.body.state.grid.width, 14);
  assert.equal(res.body.state.grid.height, 14);
});

test('party_sized encounter ignores grid_size, keeps party fill-ratio board', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app)
    .post('/api/session/start')
    .send({ units, encounter: { board_scale: 'party_sized', grid_size: [14, 14] } });
  assert.equal(res.status, 200);
  // 1 player deployed -> gridSizeFor(1) -> 6x6; authored grid_size ignored under party_sized.
  assert.equal(res.body.state.grid.width, 6);
  assert.equal(res.body.state.grid.height, 6);
});

test('absent encounter keeps party fill-ratio board (legacy default)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app).post('/api/session/start').send({ units });
  assert.equal(res.status, 200);
  assert.equal(res.body.state.grid.width, 6);
  assert.equal(res.body.state.grid.height, 6);
});

// fase-2c follow-up: positions must clamp against the AUTHORED board, not GRID_SIZE.
// Regression: authored spawns at x/y > 5 collapsed onto the legacy 6x6 corner.
test('grid_sized inline encounter keeps unit positions beyond the legacy 6x6 clamp', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const farUnits = [
    { id: 'p1', controlled_by: 'player', hp: 10, max_hp: 10, position: { x: 0, y: 5 } },
    { id: 's1', controlled_by: 'sistema', hp: 10, max_hp: 10, position: { x: 13, y: 13 } },
  ];
  const res = await request(app)
    .post('/api/session/start')
    .send({ units: farUnits, encounter: { board_scale: 'grid_sized', grid_size: [14, 14] } });
  assert.equal(res.status, 200);
  const s1 = res.body.state.units.find((u) => u.id === 's1');
  assert.deepEqual({ x: s1.position.x, y: s1.position.y }, { x: 13, y: 13 });
});

test('grid_sized encounter_id (YAML) keeps authored far spawns on the played board', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const farUnits = [
    { id: 'p1', controlled_by: 'player', hp: 10, max_hp: 10, position: { x: 0, y: 5 } },
    { id: 's1', controlled_by: 'sistema', hp: 10, max_hp: 10, position: { x: 13, y: 5 } },
  ];
  // First grid_sized encounter on disk (16x12): enc_badlands_dorsale_ferrosa_01.
  const res = await request(app)
    .post('/api/session/start')
    .send({ units: farUnits, encounter_id: 'enc_badlands_dorsale_ferrosa_01' });
  assert.equal(res.status, 200);
  assert.equal(res.body.state.grid.width, 16);
  assert.equal(res.body.state.grid.height, 12);
  const s1 = res.body.state.units.find((u) => u.id === 's1');
  assert.deepEqual({ x: s1.position.x, y: s1.position.y }, { x: 13, y: 5 });
});
