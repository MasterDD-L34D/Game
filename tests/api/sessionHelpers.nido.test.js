// OD-001 Path A Sprint A — checkNidoUnlock helper tests.
//
// Pure helper, no I/O, no closure. Test matrix:
//   - default (empty session): false
//   - meta.nido_unlocked === true: true
//   - biome_arc_completed + missions_in_biome_count >= 3: true
//   - biome_arc_completed + count < 3: false
//   - env NIDO_UNLOCKED=true override: true
//   - publicSessionView includes nido_unlocked field

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { checkNidoUnlock, publicSessionView } = require('../../apps/backend/routes/sessionHelpers');

test('checkNidoUnlock: empty session returns false', () => {
  assert.equal(checkNidoUnlock({}), false);
  assert.equal(checkNidoUnlock(null), false);
  assert.equal(checkNidoUnlock(undefined), false);
});

test('checkNidoUnlock: meta.nido_unlocked === true returns true', () => {
  const session = { meta: { nido_unlocked: true } };
  assert.equal(checkNidoUnlock(session), true);
});

test('checkNidoUnlock: biome_arc_completed + 3 missions returns true', () => {
  const session = {
    meta: { biome_arc_completed: true, missions_in_biome_count: 3 },
  };
  assert.equal(checkNidoUnlock(session), true);
});

test('checkNidoUnlock: biome_arc_completed + 2 missions returns false', () => {
  const session = {
    meta: { biome_arc_completed: true, missions_in_biome_count: 2 },
  };
  assert.equal(checkNidoUnlock(session), false);
});

test('checkNidoUnlock: biome_arc_completed=false even with 5 missions returns false', () => {
  const session = {
    meta: { biome_arc_completed: false, missions_in_biome_count: 5 },
  };
  assert.equal(checkNidoUnlock(session), false);
});

test('checkNidoUnlock: env NIDO_UNLOCKED=true overrides everything', () => {
  const original = process.env.NIDO_UNLOCKED;
  try {
    process.env.NIDO_UNLOCKED = 'true';
    assert.equal(checkNidoUnlock({}), true);
    assert.equal(checkNidoUnlock({ meta: { nido_unlocked: false } }), true);
  } finally {
    if (original === undefined) delete process.env.NIDO_UNLOCKED;
    else process.env.NIDO_UNLOCKED = original;
  }
});

test('publicSessionView exposes nido_unlocked: false by default', () => {
  // Minimal session shape for publicSessionView (uses grid + units + events).
  const session = {
    session_id: 's1',
    turn: 0,
    active_unit: null,
    units: [],
    grid: { width: 6, height: 6 },
    events: [],
    sistema_pressure: 0,
  };
  const view = publicSessionView(session);
  assert.equal(view.nido_unlocked, false);
});

test('publicSessionView exposes nido_unlocked: true when meta flag set', () => {
  const session = {
    session_id: 's1',
    turn: 0,
    active_unit: null,
    units: [],
    grid: { width: 6, height: 6 },
    events: [],
    sistema_pressure: 0,
    meta: { nido_unlocked: true },
  };
  const view = publicSessionView(session);
  assert.equal(view.nido_unlocked, true);
});
