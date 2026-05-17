// W5.5 codex fix — listArchetypesForBiome unknown-biome handling tests.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  listArchetypesForBiome,
  _resetCache,
} = require('../../../apps/backend/services/companion/companionPicker');

function reset() {
  _resetCache();
}

test('listArchetypesForBiome unknown biome returns empty (no savana fallback)', () => {
  reset();
  // Codex W5.5 P2 fix: function doc says "[] when biome unknown" but
  // _resolveBiomePool falls back to savana. Direct lookup must match
  // doc contract: unknown → [].
  const result = listArchetypesForBiome('alien_world');
  assert.deepEqual(result, []);
});

test('listArchetypesForBiome empty/non-string returns empty', () => {
  reset();
  assert.deepEqual(listArchetypesForBiome(''), []);
  assert.deepEqual(listArchetypesForBiome(null), []);
  assert.deepEqual(listArchetypesForBiome(undefined), []);
});

test('listArchetypesForBiome savana returns non-empty list', () => {
  reset();
  const result = listArchetypesForBiome('savana');
  assert.ok(Array.isArray(result));
  assert.ok(result.length > 0, 'savana pool exists in YAML');
});

test('listArchetypesForBiome missing pool path returns empty', () => {
  reset();
  const result = listArchetypesForBiome('savana', { poolPath: '/tmp/nonexistent.yaml' });
  assert.deepEqual(result, []);
});
