'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  recordOffspring,
  getTribesEmergent,
  _resetLineageRegistry,
} = require('../../apps/backend/services/metaProgression');

const MEAN = { utility: 0.5, liberty: 0.5, morality: 0.5 };

test('getTribesEmergent: tribe epigenome diverged beyond threshold -> is_distinct_form', () => {
  _resetLineageRegistry();
  for (let i = 0; i < 3; i++) {
    recordOffspring({
      unit_id: `d${i}`,
      lineage_id: 'DIV',
      generation: i,
      born_at_biome: 'dune',
      epigenome: { utility: 0.75, liberty: 0.5, morality: 0.5 },
    });
  }
  const tribes = getTribesEmergent({ speciesMean: MEAN, divergenceThreshold: 0.15 });
  const t = tribes.find((x) => x.tribe_id === 'DIV');
  assert.ok(t);
  assert.ok(Math.abs(t.epigenetic_divergence - 0.25) < 1e-9);
  assert.equal(t.is_distinct_form, true);
});

test('getTribesEmergent: tribe near species mean -> not distinct form', () => {
  _resetLineageRegistry();
  for (let i = 0; i < 3; i++) {
    recordOffspring({
      unit_id: `n${i}`,
      lineage_id: 'NEAR',
      generation: i,
      born_at_biome: 'dune',
      epigenome: { utility: 0.52, liberty: 0.5, morality: 0.5 },
    });
  }
  const tribes = getTribesEmergent({ speciesMean: MEAN, divergenceThreshold: 0.15 });
  const t = tribes.find((x) => x.tribe_id === 'NEAR');
  assert.ok(t);
  assert.equal(t.is_distinct_form, false);
});

test('getTribesEmergent: no args still works (defaults; back-compat with getTribeForUnit)', () => {
  _resetLineageRegistry();
  for (let i = 0; i < 3; i++) {
    recordOffspring({ unit_id: `z${i}`, lineage_id: 'Z', generation: i, born_at_biome: 'dune' });
  }
  const tribes = getTribesEmergent();
  const t = tribes.find((x) => x.tribe_id === 'Z');
  assert.ok(t);
  // no epigenome on members -> tribe mean = species default 0.5 -> divergence 0
  assert.equal(t.is_distinct_form, false);
  assert.equal(t.epigenetic_divergence, 0);
});
