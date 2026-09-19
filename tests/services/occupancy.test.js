// tests/services/occupancy.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { occupiedSetFromUnits } = require('../../apps/backend/services/combat/occupancy');

test('builds "x,y" keys from live positioned units', () => {
  const units = [
    { id: 'a', hp: 5, position: { x: 1, y: 2 } },
    { id: 'b', hp: 1, position: { x: 0, y: 0 } },
  ];
  assert.deepEqual(occupiedSetFromUnits(units), new Set(['1,2', '0,0']));
});

test('skips dead, hp-less and negative-hp units ((hp ?? 0) > 0 gate)', () => {
  const units = [
    { id: 'dead', hp: 0, position: { x: 1, y: 1 } },
    { id: 'nohp', position: { x: 2, y: 2 } },
    { id: 'neg', hp: -3, position: { x: 3, y: 3 } },
    { id: 'frac', hp: 0.5, position: { x: 4, y: 4 } },
  ];
  assert.deepEqual(occupiedSetFromUnits(units), new Set(['4,4']));
});

test('skips null entries and positionless units', () => {
  const units = [
    null,
    undefined,
    { id: 'nopos', hp: 5 },
    { id: 'ok', hp: 5, position: { x: 5, y: 6 } },
  ];
  assert.deepEqual(occupiedSetFromUnits(units), new Set(['5,6']));
});

test('null/undefined units input -> empty set', () => {
  assert.deepEqual(occupiedSetFromUnits(null), new Set());
  assert.deepEqual(occupiedSetFromUnits(undefined), new Set());
});

test('excludeId skips exactly that unit (self-exclusion for move planning)', () => {
  const units = [
    { id: 'self', hp: 5, position: { x: 1, y: 1 } },
    { id: 'other', hp: 5, position: { x: 2, y: 2 } },
  ];
  assert.deepEqual(occupiedSetFromUnits(units, { excludeId: 'self' }), new Set(['2,2']));
  // no excludeId -> self included
  assert.deepEqual(occupiedSetFromUnits(units), new Set(['1,1', '2,2']));
});

test('requireFinite drops non-finite coordinates; default keeps them raw', () => {
  const units = [
    { id: 'ok', hp: 5, position: { x: 1, y: 1 } },
    { id: 'nan', hp: 5, position: { x: NaN, y: 2 } },
    { id: 'str', hp: 5, position: { x: '3', y: 3 } },
  ];
  // losForGrid._unitBlocker semantics: strict finite gate.
  assert.deepEqual(occupiedSetFromUnits(units, { requireFinite: true }), new Set(['1,1']));
  // abilityExecutor/probe semantics: no finite gate, keys built as-is.
  assert.deepEqual(occupiedSetFromUnits(units), new Set(['1,1', 'NaN,2', '3,3']));
});

test('returned Set is a plain mutable Set (probes delete/add on it)', () => {
  const occ = occupiedSetFromUnits([{ id: 'a', hp: 5, position: { x: 1, y: 1 } }]);
  occ.delete('1,1');
  occ.add('9,9');
  assert.deepEqual(occ, new Set(['9,9']));
});
