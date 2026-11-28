'use strict';
// fase-2c grid-wiring (ADR-2026-07-03): resolveBoardSize is the single point that decides the
// played board. 'party_sized' (default/absent) must be byte-identical to the legacy gridSizeFor
// path; 'grid_sized' returns the authored encounter.grid_size. See services/party/loader.js.

const test = require('node:test');
const assert = require('node:assert');
const {
  resolveBoardSize,
  isAuthoredGrid,
  gridSizeFor,
  getModulation,
} = require('../../services/party/loader');

test('party_sized/absent board_scale is byte-identical to gridSizeFor', () => {
  for (const n of [1, 2, 4, 5, 6, 7, 8]) {
    assert.deepStrictEqual(resolveBoardSize(n, null, undefined), gridSizeFor(n));
    assert.deepStrictEqual(
      resolveBoardSize(n, { board_scale: 'party_sized' }, undefined),
      gridSizeFor(n),
    );
    assert.deepStrictEqual(resolveBoardSize(n, {}, undefined), gridSizeFor(n));
    // an authored grid_size present but board_scale != grid_sized stays party_sized (ignored).
    assert.deepStrictEqual(
      resolveBoardSize(n, { board_scale: 'party_sized', grid_size: [16, 16] }, undefined),
      gridSizeFor(n),
    );
  }
});

test('modulation preset folds into deployed for party_sized (mirrors legacy session.js)', () => {
  // 'full' -> deployed 8 -> 10x10, distinct from raw count 1 -> 6x6, so the fold is observable.
  const full = getModulation('full');
  assert.ok(full && Number.isInteger(full.deployed) && full.deployed !== 1);
  assert.deepStrictEqual(resolveBoardSize(1, null, 'full'), gridSizeFor(full.deployed));
  assert.notDeepStrictEqual(resolveBoardSize(1, null, 'full'), gridSizeFor(1));
  // unknown modulation name -> no override -> raw deployed used.
  assert.deepStrictEqual(resolveBoardSize(2, null, 'nope_not_a_preset'), gridSizeFor(2));
});

test('grid_sized board_scale returns the authored grid_size', () => {
  assert.deepStrictEqual(
    resolveBoardSize(2, { board_scale: 'grid_sized', grid_size: [12, 12] }, undefined),
    [12, 12],
  );
  // grid_sized ignores modulation and deployed entirely.
  assert.deepStrictEqual(
    resolveBoardSize(8, { board_scale: 'grid_sized', grid_size: [16, 10] }, 'full'),
    [16, 10],
  );
});

test('grid_sized with invalid grid_size falls back to party_sized (fail-safe)', () => {
  const bad = [
    { board_scale: 'grid_sized', grid_size: [3, 3] }, // below min 4
    { board_scale: 'grid_sized', grid_size: [21, 21] }, // above max 20
    { board_scale: 'grid_sized', grid_size: [10] }, // wrong arity
    { board_scale: 'grid_sized', grid_size: [10, 'x'] }, // non-integer
    { board_scale: 'grid_sized', grid_size: [10.5, 10] }, // float
    { board_scale: 'grid_sized' }, // missing grid_size
    { board_scale: 'grid_sized', grid_size: null },
  ];
  for (const enc of bad) {
    assert.deepStrictEqual(resolveBoardSize(4, enc, undefined), gridSizeFor(4));
    assert.strictEqual(isAuthoredGrid(enc), false);
  }
});

test('isAuthoredGrid true only for a valid grid_sized encounter', () => {
  assert.strictEqual(isAuthoredGrid({ board_scale: 'grid_sized', grid_size: [12, 12] }), true);
  assert.strictEqual(isAuthoredGrid({ board_scale: 'grid_sized', grid_size: [4, 20] }), true);
  assert.strictEqual(isAuthoredGrid({ board_scale: 'party_sized', grid_size: [12, 12] }), false);
  assert.strictEqual(isAuthoredGrid(null), false);
  assert.strictEqual(isAuthoredGrid(undefined), false);
});

test('resolveBoardSize returns a fresh array (no aliasing of encounter.grid_size)', () => {
  const enc = { board_scale: 'grid_sized', grid_size: [12, 12] };
  const out = resolveBoardSize(2, enc, undefined);
  out[0] = 99;
  assert.strictEqual(enc.grid_size[0], 12); // caller mutation must not corrupt the encounter
});
