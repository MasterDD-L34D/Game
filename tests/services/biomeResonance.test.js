// Biome resonance — pure unit tests for Skiv ticket #4 (Sprint A).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadSpeciesAffinityMap,
  resetCache,
  getSpeciesBiomeAffinity,
  hasResonance,
} = require('../../apps/backend/services/combat/biomeResonance');

test('loadSpeciesAffinityMap: parses biome_affinity from species YAML', () => {
  resetCache();
  const map = loadSpeciesAffinityMap();
  // dune_stalker has biome_affinity: savana per species.yaml
  assert.equal(map.dune_stalker, 'savana');
  // polpo_araldo_sinaptico has biome_affinity: frattura_abissale_sinaptica
  assert.equal(map.polpo_araldo_sinaptico, 'frattura_abissale_sinaptica');
});

test('loadSpeciesAffinityMap: caches result; force=true reloads', () => {
  resetCache();
  const a = loadSpeciesAffinityMap();
  const b = loadSpeciesAffinityMap();
  assert.equal(a, b, 'same reference when cached');
  const c = loadSpeciesAffinityMap({ force: true });
  // After force reload the content equals but the reference may differ.
  assert.deepEqual(a, c);
});

test('getSpeciesBiomeAffinity: returns affinity string', () => {
  resetCache();
  assert.equal(getSpeciesBiomeAffinity('dune_stalker'), 'savana');
});

test('getSpeciesBiomeAffinity: returns null for unknown species', () => {
  resetCache();
  assert.equal(getSpeciesBiomeAffinity('no_such_species'), null);
});

test('getSpeciesBiomeAffinity: null/empty input → null', () => {
  resetCache();
  assert.equal(getSpeciesBiomeAffinity(''), null);
  assert.equal(getSpeciesBiomeAffinity(null), null);
  assert.equal(getSpeciesBiomeAffinity(undefined), null);
  assert.equal(getSpeciesBiomeAffinity(123), null); // non-string
});

test('hasResonance: matching species + biome → true', () => {
  resetCache();
  assert.equal(hasResonance('dune_stalker', 'savana'), true);
});

test('hasResonance: mismatched biome → false', () => {
  resetCache();
  assert.equal(hasResonance('dune_stalker', 'frattura_abissale_sinaptica'), false);
});

test('hasResonance: unknown species → false', () => {
  resetCache();
  assert.equal(hasResonance('no_such', 'savana'), false);
});

test('hasResonance: null/empty inputs → false', () => {
  resetCache();
  assert.equal(hasResonance('', 'savana'), false);
  assert.equal(hasResonance('dune_stalker', ''), false);
  assert.equal(hasResonance(null, 'savana'), false);
  assert.equal(hasResonance('dune_stalker', null), false);
});

test('hasResonance: non-string types → false', () => {
  resetCache();
  assert.equal(hasResonance(123, 'savana'), false);
  assert.equal(hasResonance('dune_stalker', { biome: 'savana' }), false);
});

test('hasResonance: case-sensitive match required', () => {
  resetCache();
  assert.equal(hasResonance('dune_stalker', 'Savana'), false);
  assert.equal(hasResonance('dune_stalker', 'SAVANA'), false);
});

test('hasResonance: with explicit map override', () => {
  const customMap = { test_species: 'test_biome' };
  assert.equal(hasResonance('test_species', 'test_biome', { map: customMap }), true);
  assert.equal(hasResonance('test_species', 'other', { map: customMap }), false);
  assert.equal(hasResonance('unknown', 'test_biome', { map: customMap }), false);
});
