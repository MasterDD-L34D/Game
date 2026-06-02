'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { checkInvariants } = require('../../tools/sim/full-loop-invariants');

test('checkInvariants: a clean step has no violations', () => {
  assert.deepEqual(
    checkInvariants({
      advanceStatus: 200,
      outcome: 'victory',
      peEarned: 3,
      survivors: ['a'],
      sourceRosterIds: ['a', 'b'],
    }),
    [],
  );
});

test('checkInvariants: flags non-200 advance, bad outcome, negative pe, and foreign survivor', () => {
  const v = checkInvariants({
    advanceStatus: 500,
    outcome: 'win',
    peEarned: -1,
    survivors: ['ghost'],
    sourceRosterIds: ['a', 'b'],
  });
  assert.equal(v.length, 4, JSON.stringify(v));
});

test('checkInvariants: survivors must be a subset of the source roster (roster identity)', () => {
  assert.deepEqual(
    checkInvariants({
      advanceStatus: 200,
      outcome: 'defeat',
      peEarned: 0,
      survivors: [],
      sourceRosterIds: ['a', 'b'],
    }),
    [],
  );
});
