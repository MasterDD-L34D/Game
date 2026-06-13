// W5-bb — biomeAdapter.js tests.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  adaptBiome,
  listBiomeIds,
  _resetCache,
} = require('../../../apps/backend/services/coop/biomeAdapter');

function reset() {
  _resetCache();
}

test('adaptBiome savana returns canonical W5 schema', () => {
  reset();
  const w = adaptBiome('savana');
  assert.equal(w.biome_id, 'savana');
  assert.ok(typeof w.biome_label_it === 'string' && w.biome_label_it.length > 0);
  assert.ok(['low', 'medium', 'high'].includes(w.pressure));
  assert.ok(Array.isArray(w.hazards));
});

test('adaptBiome unknown biome returns empty', () => {
  reset();
  const w = adaptBiome('biome_inesistente');
  assert.deepEqual(w, {});
});

test('adaptBiome empty biomeId returns empty', () => {
  reset();
  const w = adaptBiome('');
  assert.deepEqual(w, {});
});

test('listBiomeIds returns non-empty array', () => {
  reset();
  const ids = listBiomeIds();
  assert.ok(Array.isArray(ids));
  assert.ok(ids.length >= 5);
});

test('listBiomeIds includes savana', () => {
  reset();
  const ids = listBiomeIds();
  assert.ok(ids.includes('savana'));
});

test('adaptBiome custom biomesPath fallback', () => {
  reset();
  const w = adaptBiome('savana', { biomesPath: '/tmp/nonexistent.yaml' });
  assert.deepEqual(w, {});
});
