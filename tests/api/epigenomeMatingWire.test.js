'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { rollMatingOffspring } = require('../../apps/backend/services/metaProgression');
const { loadEpigenomeConfig } = require('../../apps/backend/services/genetics/epigenome');

test('rollMatingOffspring: epigenome INERT without context.epigenomeConfig (back-compat)', () => {
  const r = rollMatingOffspring({
    parentA: { id: 'a', epigenome: { utility: 0.9, liberty: 0.5, morality: 0.5 } },
    parentB: { id: 'b', epigenome: { utility: 0.9, liberty: 0.5, morality: 0.5 } },
    biomeId: 'dune',
  });
  assert.equal(r.success, true);
  assert.equal(r.offspring.epigenome, undefined);
  assert.equal(r.offspring.epigenetic_memory, undefined);
});

test('rollMatingOffspring: with config + parent epigenomes -> offspring epigenome + discrete memory + grant', () => {
  const cfg = loadEpigenomeConfig();
  const r = rollMatingOffspring({
    parentA: { id: 'a', epigenome: { utility: 1.0, liberty: 0.5, morality: 0.5 } },
    parentB: { id: 'b', epigenome: { utility: 1.0, liberty: 0.5, morality: 0.5 } },
    biomeId: 'dune',
    context: { epigenomeConfig: cfg, speciesMean: { utility: 0.5, liberty: 0.5, morality: 0.5 } },
  });
  assert.equal(r.success, true);
  assert.ok(Math.abs(r.offspring.epigenome.utility - 0.563) < 1e-9);
  assert.equal(r.offspring.epigenetic_memory.memory_id, 'memoria_efficienza');
  assert.equal(r.offspring.memoria_ambientale.source, 'epigenome');
  // parent bias strength = 0.5 >= grant_threshold 0.1 -> grant 1
  assert.equal(r.offspring.epigenome_fragment_grant, 1);
});
