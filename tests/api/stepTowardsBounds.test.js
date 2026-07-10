// tests/api/stepTowardsBounds.test.js
// TDD: verify that stepTowards honours the optional `bounds` parameter, mirroring
// the stepAway rect-bounds fix from the big-maps wave (2026-07-06).
//
// Root cause: stepTowards called clampPosition(next.x, next.y) WITHOUT bounds, so
// clampPosition fell back to GRID_SIZE-1 (=5). On grid_sized boards (16x12, 20x12,
// 18x10) every Sistema approach step landing beyond x=5 or y=5 collapsed into the
// 6x6 box: a unit at {x:10,y:5} approaching {x:2,y:5} declared move_to {x:5,y:5}
// (5-tile teleport), and a unit at x<=5 approaching rightwards got a null move
// (step clamped back onto itself -> "cannot approach" skip).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { stepTowards } = require('../../apps/backend/routes/sessionHelpers');
const { GRID_SIZE } = require('../../apps/backend/routes/sessionConstants');

// --- big-board regression: teleport case -----------------------------------

test('stepTowards: 16x12 bounds, approach from x=10 toward x=2 steps to x=9 (no teleport)', () => {
  const next = stepTowards({ x: 10, y: 5 }, { x: 2, y: 5 }, { width: 16, height: 12 });
  assert.deepEqual(next, { x: 9, y: 5 });
});

// --- big-board regression: stuck case ---------------------------------------

test('stepTowards: 16x12 bounds, unit at x=5 approaching right moves to x=6 (not stuck)', () => {
  const next = stepTowards({ x: 5, y: 2 }, { x: 10, y: 2 }, { width: 16, height: 12 });
  assert.deepEqual(next, { x: 6, y: 2 });
});

// --- legacy square scalar (stepAway dual-accept parity) ---------------------

test('stepTowards: scalar bounds 8 behaves as 8x8 square', () => {
  const next = stepTowards({ x: 5, y: 0 }, { x: 7, y: 0 }, 8);
  assert.deepEqual(next, { x: 6, y: 0 });
});

// --- backward-compat: no bounds keeps the GRID_SIZE clamp -------------------

test('stepTowards: without bounds clamps to GRID_SIZE-1 exactly as before', () => {
  const next = stepTowards({ x: 5, y: 0 }, { x: 10, y: 0 });
  assert.deepEqual(next, { x: GRID_SIZE - 1, y: 0 });
});

test('backward-compat: 6x6 bounds produce same result as no bounds', () => {
  const withBounds = stepTowards({ x: 3, y: 2 }, { x: 0, y: 2 }, { width: 6, height: 6 });
  const withoutBounds = stepTowards({ x: 3, y: 2 }, { x: 0, y: 2 });
  assert.deepEqual(withBounds, withoutBounds);
});
