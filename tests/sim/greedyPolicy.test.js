'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { chooseRecruits, RECRUIT_SPECIES_POOL } = require('../../tools/sim/greedy-policy');

test('chooseRecruits: one recruit per cleared chapter with id + canonical species', () => {
  assert.deepEqual(chooseRecruits({ step: 1 }), [
    { npcId: 'recruit_s1', speciesId: RECRUIT_SPECIES_POOL[0] },
  ]);
  assert.deepEqual(chooseRecruits({ step: 4 }), [
    { npcId: 'recruit_s4', speciesId: RECRUIT_SPECIES_POOL[3] },
  ]);
});

test('chooseRecruits: distinct npc ids across steps (roster grows, no collision)', () => {
  const a = chooseRecruits({ step: 1 })[0];
  const b = chooseRecruits({ step: 2 })[0];
  assert.notEqual(a.npcId, b.npcId);
});

test('chooseRecruits: species cycles deterministically through the pool (wraps)', () => {
  const len = RECRUIT_SPECIES_POOL.length;
  assert.equal(chooseRecruits({ step: 1 })[0].speciesId, RECRUIT_SPECIES_POOL[0]);
  assert.equal(chooseRecruits({ step: len + 1 })[0].speciesId, RECRUIT_SPECIES_POOL[0]);
});
