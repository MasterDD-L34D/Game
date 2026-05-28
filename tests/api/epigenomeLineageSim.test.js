'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { runLineageSim } = require('../../tools/sim/epigenome_lineage_sim');

test('determinism: same seed -> identical report', () => {
  const a = runLineageSim({
    profile: 'strong_utility',
    generations: 4,
    sessionsPerGen: 5,
    lineages: 10,
    seed: 42,
  });
  const b = runLineageSim({
    profile: 'strong_utility',
    generations: 4,
    sessionsPerGen: 5,
    lineages: 10,
    seed: 42,
  });
  assert.deepEqual(a.by_gen, b.by_gen);
});
