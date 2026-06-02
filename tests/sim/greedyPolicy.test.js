'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { chooseRecruits } = require('../../tools/sim/greedy-policy');

test('chooseRecruits: one deterministic recruit id per cleared chapter', () => {
  assert.deepEqual(chooseRecruits({ step: 1 }), ['recruit_s1']);
  assert.deepEqual(chooseRecruits({ step: 4 }), ['recruit_s4']);
});

test('chooseRecruits: distinct ids across steps (roster grows, no collision)', () => {
  const a = chooseRecruits({ step: 1 })[0];
  const b = chooseRecruits({ step: 2 })[0];
  assert.notEqual(a, b);
});
