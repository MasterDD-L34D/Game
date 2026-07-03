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
