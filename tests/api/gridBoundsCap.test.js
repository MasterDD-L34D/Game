// tests/api/gridBoundsCap.test.js -- A04/CWE-20 asymmetric grid-bounds validation.
//
// Security regression guard (audit follow-up from PR #3253 review, PRE-existing issue):
// the /start inline-encounter path derived normaliseUnitsPayload clamp bounds from
// req.body.encounter.grid.{width,height} validating only Number.isFinite, WITHOUT the
// [4,20] integer cap that isAuthoredGrid (services/party/loader.js, grid_size path)
// enforces. A LAN peer could send encounter.grid.width=9999 (finite) and place an
// initial unit at x=9998 -- far outside the REAL board resolved by resolveBoardSize
// (party fill-ratio or authored grid_size, always <= 20). Gameplay glitch, co-op LAN
// threat model.
'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');
const { normaliseGridBounds } = require('../../apps/backend/routes/sessionHelpers');

// --- route-level: the actual attack vector --------------------------------

test('/start: unit at x=9998 with declared grid 9999x9999 is clamped inside the REAL board', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app)
    .post('/api/session/start')
    .send({
      units: [
        { id: 'p1', controlled_by: 'player', position: { x: 0, y: 0 }, hp: 20, ap: 3 },
        { id: 'e_ghost', controlled_by: 'sistema', position: { x: 9998, y: 9998 }, hp: 20 },
      ],
      encounter: { grid: { width: 9999, height: 9999 } },
    });
  assert.equal(res.status, 200);
  const grid = res.body.state.grid;
  // The played board is resolved by resolveBoardSize and is always schema-capped.
  assert.ok(grid.width <= 20, `real board width ${grid.width} must be <= 20`);
  assert.ok(grid.height <= 20, `real board height ${grid.height} must be <= 20`);
  // Every initial unit must sit INSIDE the real board (the security property).
  for (const u of res.body.state.units) {
    assert.ok(
      u.position.x <= grid.width - 1,
      `unit ${u.id} x=${u.position.x} outside real board width ${grid.width}`,
    );
    assert.ok(
      u.position.y <= grid.height - 1,
      `unit ${u.id} y=${u.position.y} outside real board height ${grid.height}`,
    );
  }
});

test('/start: legit inline 8x8 grid still keeps a unit at x=7 (PR #3065 behavior preserved)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app)
    .post('/api/session/start')
    .send({
      units: [
        { id: 'p1', controlled_by: 'player', position: { x: 0, y: 0 }, hp: 20, ap: 3 },
        { id: 'e_edge', controlled_by: 'sistema', position: { x: 7, y: 7 }, hp: 20 },
      ],
      encounter: { grid: { width: 8, height: 8 } },
    });
  assert.equal(res.status, 200);
  const edge = res.body.state.units.find((u) => u.id === 'e_edge');
  assert.equal(edge.position.x, 7, 'legit 8x8 right-edge unit must not be clamped');
  assert.equal(edge.position.y, 7, 'legit 8x8 bottom-edge unit must not be clamped');
});

// --- helper-level: normaliseGridBounds mirrors isAuthoredGrid bounds -------

test('normaliseGridBounds: rejects width=9999 fail-closed (null), accepts 8x8', () => {
  assert.equal(normaliseGridBounds({ width: 9999, height: 9999 }), null);
  assert.deepEqual(normaliseGridBounds({ width: 8, height: 8 }), { width: 8, height: 8 });
});

test('normaliseGridBounds: accepts schema boundaries [4,20] and numeric-string coercion', () => {
  assert.deepEqual(normaliseGridBounds({ width: 4, height: 20 }), { width: 4, height: 20 });
  assert.deepEqual(normaliseGridBounds({ width: '8', height: '10' }), { width: 8, height: 10 });
});

test('normaliseGridBounds: rejects out-of-cap, non-integer and malformed input (fail-closed null)', () => {
  assert.equal(normaliseGridBounds({ width: 3, height: 8 }), null);
  assert.equal(normaliseGridBounds({ width: 8, height: 21 }), null);
  assert.equal(normaliseGridBounds({ width: 0, height: -5 }), null);
  assert.equal(normaliseGridBounds({ width: 8.5, height: 8 }), null);
  assert.equal(normaliseGridBounds({ width: NaN, height: 8 }), null);
  assert.equal(normaliseGridBounds({ width: Infinity, height: 8 }), null);
  assert.equal(normaliseGridBounds({ width: 8 }), null);
  assert.equal(normaliseGridBounds({}), null);
  assert.equal(normaliseGridBounds(null), null);
  assert.equal(normaliseGridBounds(undefined), null);
  assert.equal(normaliseGridBounds('8x8'), null);
});
