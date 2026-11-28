// Species base-stats loader tests (#2691). Covers the data-derived STAT_BOUNDS
// path + the safe fallback to the pre-#2691 hardcoded defaults.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  loadBaseStats,
  deriveStatBounds,
  FALLBACK_BOUNDS,
  DATASET_PATH,
  _resetCache,
} = require('../../apps/backend/services/speciesBaseStats');

test('loadBaseStats: real dataset -> 15 canonical species, each {speed,hp_max}', () => {
  _resetCache();
  const stats = loadBaseStats();
  assert.ok(stats && typeof stats === 'object');
  const ids = Object.keys(stats);
  assert.equal(ids.length, 15, `expected 15 species, got ${ids.length}`);
  for (const id of ids) {
    assert.ok(Number.isInteger(stats[id].speed), `${id}.speed integer`);
    assert.ok(Number.isInteger(stats[id].hp_max), `${id}.hp_max integer`);
    assert.ok(stats[id].speed >= 1 && stats[id].speed <= 6, `${id}.speed in 1..6`);
    assert.ok(stats[id].hp_max >= 1, `${id}.hp_max positive`);
  }
});

test('deriveStatBounds: real dataset -> min/max over speed + hp_max', () => {
  _resetCache();
  const bounds = deriveStatBounds();
  // Authored dataset spans: speed {1..6}, hp_max {5..22}.
  assert.deepEqual(bounds, {
    speed: { min: 1, max: 6 },
    hp: { min: 5, max: 22 },
  });
});

test('deriveStatBounds: differs from the hardcoded fallback (proves data-derived)', () => {
  _resetCache();
  const bounds = deriveStatBounds();
  // hp band widened from the fallback 6-20 to the real dataset 5-22.
  assert.notDeepEqual(bounds.hp, FALLBACK_BOUNDS.hp);
});

test('deriveStatBounds: missing file -> FALLBACK_BOUNDS (never throws)', () => {
  _resetCache();
  const bogus = path.join(__dirname, '__does_not_exist__.yaml');
  const bounds = deriveStatBounds(bogus);
  assert.deepEqual(bounds, FALLBACK_BOUNDS);
});

test('loadBaseStats: malformed file (no species block) -> null', () => {
  _resetCache();
  // package.json parses as an object but has no `species` key -> null.
  const notSpecies = path.join(__dirname, '..', '..', 'package.json');
  assert.equal(loadBaseStats(notSpecies), null);
});

test('loadBaseStats: canonical path is memoized (same reference)', () => {
  _resetCache();
  const a = loadBaseStats();
  const b = loadBaseStats();
  assert.equal(a, b, 'cached load returns the same object reference');
});

test('DATASET_PATH points at data/core/species/base_stats.yaml', () => {
  assert.ok(DATASET_PATH.replace(/\\/g, '/').endsWith('data/core/species/base_stats.yaml'));
});
