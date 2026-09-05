// biomeMemory -- OD-059 (#1673) campaign-scoped READ-ONLY NARRATIVE biome-familiarity
// carry-over. Pure accumulate fn: { [unitId]: { [biomeId]: turns } }. Tolerant of
// garbage input, never mutates. Mirror of services/worldgen/biomeWound.js pure-fn shape.
//
// HARD CONSTRAINT (SoT 19.3 freeze): this is a NARRATIVE layer. It is band-safe by
// construction -- it shares NO namespace with the mechanical/inert unit primitive
// `unit.cumulative_biome_turns`. The combat sim reads none of it.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { accumulate } = require('../../apps/backend/services/campaign/biomeMemory');

test('accumulate: seeds a new {unitId:{biomeId:turns}} entry from empty', () => {
  const r = accumulate({}, 'p1', 'savana', 3);
  assert.deepEqual(r, { p1: { savana: 3 } });
});

test('accumulate: adds to an existing biome under the same unit (carry-over core)', () => {
  const r = accumulate({ p1: { savana: 3 } }, 'p1', 'savana', 4);
  assert.deepEqual(r, { p1: { savana: 7 } });
});

test('accumulate: keeps biomes in separate buckets under the same unit', () => {
  const r = accumulate({ p1: { savana: 3 } }, 'p1', 'caverna', 2);
  assert.deepEqual(r, { p1: { savana: 3, caverna: 2 } });
});

test('accumulate: keeps units in separate buckets', () => {
  const r = accumulate({ p1: { savana: 3 } }, 'p2', 'savana', 5);
  assert.deepEqual(r, { p1: { savana: 3 }, p2: { savana: 5 } });
});

test('accumulate: does not mutate the input object (immutable, returns new)', () => {
  const input = { p1: { savana: 3 } };
  const r = accumulate(input, 'p1', 'savana', 4);
  assert.deepEqual(input, { p1: { savana: 3 } }, 'input untouched');
  assert.notEqual(r, input, 'new top-level object');
  assert.notEqual(r.p1, input.p1, 'new nested object (no shared ref)');
});

test('accumulate: coerces delta to a non-negative integer (floors floats, drops negatives)', () => {
  assert.deepEqual(accumulate({}, 'p1', 'savana', 2.9), { p1: { savana: 2 } });
  assert.deepEqual(accumulate({}, 'p1', 'savana', -5), { p1: { savana: 0 } });
  assert.deepEqual(accumulate({}, 'p1', 'savana', 0), { p1: { savana: 0 } });
});

test('accumulate: tolerant of garbage memory input -> treated as empty', () => {
  assert.deepEqual(accumulate(null, 'p1', 'savana', 1), { p1: { savana: 1 } });
  assert.deepEqual(accumulate(undefined, 'p1', 'savana', 1), { p1: { savana: 1 } });
  assert.deepEqual(accumulate('garbage', 'p1', 'savana', 1), { p1: { savana: 1 } });
  assert.deepEqual(accumulate(42, 'p1', 'savana', 1), { p1: { savana: 1 } });
});

test('accumulate: tolerant of garbage delta -> no-op returning a clone', () => {
  assert.deepEqual(accumulate({ p1: { savana: 3 } }, 'p1', 'savana', NaN), { p1: { savana: 3 } });
  assert.deepEqual(accumulate({ p1: { savana: 3 } }, 'p1', 'savana', 'x'), { p1: { savana: 3 } });
  assert.deepEqual(accumulate({ p1: { savana: 3 } }, 'p1', 'savana', undefined), {
    p1: { savana: 3 },
  });
});

test('accumulate: missing unitId or biomeId -> no-op returning a clone (no garbage keys)', () => {
  assert.deepEqual(accumulate({ p1: { savana: 3 } }, null, 'savana', 5), { p1: { savana: 3 } });
  assert.deepEqual(accumulate({ p1: { savana: 3 } }, 'p1', null, 5), { p1: { savana: 3 } });
  assert.deepEqual(accumulate({ p1: { savana: 3 } }, '', '', 5), { p1: { savana: 3 } });
});

test('accumulate: GUARDRAIL rejects prototype-pollution keys (Codex P1) -- no global poison', () => {
  // unitId = __proto__ would otherwise index Object.prototype and poison every object.
  for (const evil of ['__proto__', 'constructor', 'prototype']) {
    const r1 = accumulate({ p1: { savana: 3 } }, evil, 'savana', 9);
    assert.deepEqual(r1, { p1: { savana: 3 } }, `reserved unitId ${evil} -> no-op clone`);
    const r2 = accumulate({ p1: { savana: 3 } }, 'p1', evil, 9);
    assert.deepEqual(r2, { p1: { savana: 3 } }, `reserved biomeId ${evil} -> no-op clone`);
  }
  // No prototype anywhere was polluted by any of the above writes.
  assert.equal({}.savana, undefined, 'Object.prototype not polluted');
  assert.equal({}.polluted, undefined, 'no stray polluted key');
  assert.equal(Object.prototype.savana, undefined, 'Object.prototype clean');
});
