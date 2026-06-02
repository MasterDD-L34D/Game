'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  chooseRecruits,
  chooseCourtship,
  chooseMating,
  RECRUIT_SPECIES_POOL,
} = require('../../tools/sim/greedy-policy');

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

test('chooseCourtship: deltas reach the canonical recruit gate (affinity>=0, trust>=2)', () => {
  const c = chooseCourtship({ step: 1 });
  assert.equal(c.npcId, 'courtship_s1');
  assert.equal(c.speciesId, RECRUIT_SPECIES_POOL[0]);
  // RECRUIT_AFFINITY_MIN=0 (default affinity already 0) + RECRUIT_TRUST_MIN=2.
  assert.ok(c.affinityDelta >= 0, `affinity delta keeps affinity >= 0, got ${c.affinityDelta}`);
  assert.ok(c.trustDelta >= 2, `trust delta reaches >= 2, got ${c.trustDelta}`);
});

test('chooseMating: no pair before step 2, distinct courtship parents from step 2 on', () => {
  assert.equal(chooseMating({ step: 1 }), null);
  const m = chooseMating({ step: 3 });
  assert.deepEqual(m, { parentA: 'courtship_s2', parentB: 'courtship_s3' });
  assert.notEqual(m.parentA, m.parentB);
});
