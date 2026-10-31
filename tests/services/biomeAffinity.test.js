// Unit test for Subnautica habitat lifecycle modifier (biomeAffinity).
//
// Source: docs/research/2026-04-26-tier-a-extraction-matrix.md #9 Subnautica.
// Sprint 2 §I (autonomous plan 2026-04-27).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadAffinityMap,
  getBiomeAffinityModifier,
  _resetCache,
} = require('../../apps/backend/services/species/biomeAffinity');

test('loadAffinityMap returns Skiv map (dune_stalker)', () => {
  _resetCache();
  const map = loadAffinityMap('dune_stalker');
  assert.ok(map, 'dune_stalker map exists');
  assert.equal(map.hatchling, 'savana');
  assert.equal(map.juvenile, 'deserto');
  assert.equal(map.mature, 'caverna');
  assert.equal(map.apex, 'any');
});

test('hatchling Skiv in savana → bonus preferred', () => {
  _resetCache();
  const r = getBiomeAffinityModifier(
    { species_id: 'dune_stalker', lifecycle_phase: 'hatchling' },
    'savana',
  );
  assert.equal(r.affinity, 'preferred');
  assert.equal(r.attack_mod, 1);
  assert.equal(r.defense_mod, 1);
});

test('hatchling Skiv in deserto (non-affine) → penalty', () => {
  _resetCache();
  const r = getBiomeAffinityModifier(
    { species_id: 'dune_stalker', lifecycle_phase: 'hatchling' },
    'deserto',
  );
  assert.equal(r.affinity, 'penalty');
  assert.equal(r.defense_mod, -1);
});

test('apex Skiv free roam any biome', () => {
  _resetCache();
  for (const biome of ['savana', 'deserto', 'caverna', 'biome_random']) {
    const r = getBiomeAffinityModifier(
      { species_id: 'dune_stalker', lifecycle_phase: 'apex' },
      biome,
    );
    assert.equal(r.affinity, 'apex_free', `apex in ${biome}`);
    assert.equal(r.attack_mod, 0);
    assert.equal(r.defense_mod, 0);
  }
});

test('legacy phase free roam (Apex behavior continues)', () => {
  _resetCache();
  const r = getBiomeAffinityModifier(
    { species_id: 'dune_stalker', lifecycle_phase: 'legacy' },
    'caverna',
  );
  assert.equal(r.affinity, 'apex_free');
});

test('species without affinity_map → no modifier', () => {
  _resetCache();
  const r = getBiomeAffinityModifier(
    { species_id: 'unknown_species_xyz', lifecycle_phase: 'mature' },
    'savana',
  );
  assert.equal(r.affinity, 'no_affinity_map');
  assert.equal(r.attack_mod, 0);
  assert.equal(r.defense_mod, 0);
});

test('missing inputs → safe no-op', () => {
  _resetCache();
  assert.equal(getBiomeAffinityModifier(null, 'savana').affinity, 'unknown');
  assert.equal(getBiomeAffinityModifier({ species_id: 'x' }, null).affinity, 'unknown');
});
