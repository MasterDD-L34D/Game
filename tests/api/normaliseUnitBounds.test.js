// tests/api/normaliseUnitBounds.test.js
// TDD: verify that normaliseUnit / normaliseUnitsPayload / clampPosition honour
// the optional `bounds` parameter introduced to fix the 8x8-encounter clamping bug.
//
// Regression guard: https://github.com/MasterDD-L34D/Game/pull/3065 (Codex P2)
// Root cause: clampPosition used GRID_SIZE-1 (=5) unconditionally, so a unit at
// {x:7} on a declared 8x8 encounter was silently moved to x=5.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normaliseUnit,
  normaliseUnitsPayload,
} = require('../../apps/backend/routes/sessionHelpers');
const { GRID_SIZE } = require('../../apps/backend/routes/sessionConstants');

// --- normaliseUnit with 8x8 bounds ----------------------------------------

test('normaliseUnit: unit at {x:7,y:7} with 8x8 bounds stays at (7,7)', () => {
  const bounds = { width: 8, height: 8 };
  const unit = normaliseUnit(
    { id: 'u1', position: { x: 7, y: 7 }, controlled_by: 'sistema' },
    0,
    bounds,
  );
  assert.equal(unit.position.x, 7, 'x should not be clamped');
  assert.equal(unit.position.y, 7, 'y should not be clamped');
});

test('normaliseUnit: unit at {x:7,y:7} with NO bounds clamps to GRID_SIZE-1', () => {
  const unit = normaliseUnit(
    { id: 'u1', position: { x: 7, y: 7 }, controlled_by: 'sistema' },
    0,
    // no bounds
  );
  assert.equal(unit.position.x, GRID_SIZE - 1, 'x should clamp to GRID_SIZE-1');
  assert.equal(unit.position.y, GRID_SIZE - 1, 'y should clamp to GRID_SIZE-1');
});

test('normaliseUnit: unit at {x:7,y:7} with 6x6 bounds clamps to 5', () => {
  const bounds = { width: 6, height: 6 };
  const unit = normaliseUnit(
    { id: 'u1', position: { x: 7, y: 7 }, controlled_by: 'sistema' },
    0,
    bounds,
  );
  assert.equal(unit.position.x, 5, 'x should clamp to 5 on a 6x6 grid');
  assert.equal(unit.position.y, 5, 'y should clamp to 5 on a 6x6 grid');
});

// --- normaliseUnit: fallback position also uses bounds ----------------------

test('normaliseUnit: fallback position (no position field, fallbackIndex>0) uses bounds max', () => {
  const bounds = { width: 8, height: 8 };
  const unit = normaliseUnit({ id: 'e1', controlled_by: 'sistema' }, 1, bounds);
  // fallbackIndex=1 -> fallback is { x: maxX, y: maxY }
  assert.equal(unit.position.x, 7);
  assert.equal(unit.position.y, 7);
});

test('normaliseUnit: fallback position without bounds falls back to GRID_SIZE-1', () => {
  const unit = normaliseUnit({ id: 'e1', controlled_by: 'sistema' }, 1);
  assert.equal(unit.position.x, GRID_SIZE - 1);
  assert.equal(unit.position.y, GRID_SIZE - 1);
});

// --- normaliseUnitsPayload with bounds -------------------------------------

test('normaliseUnitsPayload: passes bounds to each unit normalisation', () => {
  const bounds = { width: 8, height: 8 };
  const raw = [
    { id: 'p1', position: { x: 0, y: 0 }, controlled_by: 'player' },
    { id: 'e1', position: { x: 7, y: 5 }, controlled_by: 'sistema' },
  ];
  const units = normaliseUnitsPayload(raw, bounds);
  assert.equal(units[0].position.x, 0);
  assert.equal(units[1].position.x, 7, 'right-edge unit must not be clamped');
});

test('normaliseUnitsPayload: without bounds clamps all to GRID_SIZE-1', () => {
  const raw = [{ id: 'e1', position: { x: 7, y: 7 }, controlled_by: 'sistema' }];
  const units = normaliseUnitsPayload(raw);
  assert.equal(units[0].position.x, GRID_SIZE - 1);
  assert.equal(units[0].position.y, GRID_SIZE - 1);
});

// --- backward-compat: 6x6 is identical to no-bounds -----------------------

test('backward-compat: 6x6 bounds produce same result as no bounds', () => {
  const raw = [{ id: 'u1', position: { x: 3, y: 2 }, controlled_by: 'player' }];
  const withBounds = normaliseUnitsPayload(raw, { width: 6, height: 6 });
  const withoutBounds = normaliseUnitsPayload(raw);
  assert.deepEqual(withBounds[0].position, withoutBounds[0].position);
});
