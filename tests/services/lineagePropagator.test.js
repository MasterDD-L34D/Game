// Sprint B Spore S5 — lineagePropagator unit tests.

'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  propagateLineage,
  inheritFromLineage,
  inspectPool,
  reset,
} = require('../../apps/backend/services/generation/lineagePropagator');

beforeEach(() => {
  reset();
});

// --- propagate -----------------------------------------------------------

test('propagateLineage: legacy unit with 3 mutations → pool size 3', () => {
  const legacy = {
    id: 'u-skiv-001',
    applied_mutations: [
      'artigli_freeze_to_glacier',
      'denti_bleed_to_chelate',
      'mantello_camouflage',
    ],
  };
  const result = propagateLineage(legacy, 'dune_stalker', 'savana');
  assert.equal(result.pool_size, 3);
  assert.deepEqual(result.written_traits.sort(), [
    'artigli_freeze_to_glacier',
    'denti_bleed_to_chelate',
    'mantello_camouflage',
  ]);
  assert.equal(result.species_id, 'dune_stalker');
  assert.equal(result.biome_id, 'savana');
});

test('propagateLineage: dedup across multiple legacy units', () => {
  propagateLineage({ id: 'u1', applied_mutations: ['mut_a', 'mut_b'] }, 'dune_stalker', 'savana');
  const r2 = propagateLineage(
    { id: 'u2', applied_mutations: ['mut_b', 'mut_c'] },
    'dune_stalker',
    'savana',
  );
  // mut_b already in pool → only mut_c written this call.
  assert.deepEqual(r2.written_traits, ['mut_c']);
  assert.equal(r2.pool_size, 3);
});

test('propagateLineage: empty applied_mutations → no-op, pool_size 0', () => {
  const result = propagateLineage({ id: 'u', applied_mutations: [] }, 'dune_stalker', 'savana');
  assert.equal(result.pool_size, 0);
  assert.deepEqual(result.written_traits, []);
});

test('propagateLineage: missing applied_mutations field → graceful no-op', () => {
  const result = propagateLineage({ id: 'u' }, 'dune_stalker', 'savana');
  assert.equal(result.pool_size, 0);
  assert.deepEqual(result.written_traits, []);
});

test('propagateLineage: invalid input throws', () => {
  assert.throws(() => propagateLineage(null, 'dune_stalker', 'savana'), TypeError);
  assert.throws(() => propagateLineage({}, '', 'savana'), TypeError);
  assert.throws(() => propagateLineage({}, 'dune_stalker', ''), TypeError);
});

// --- inherit -------------------------------------------------------------

test('inheritFromLineage: pool with 5 mutations → newborn riceve 1-2 random', () => {
  propagateLineage(
    { id: 'src', applied_mutations: ['m1', 'm2', 'm3', 'm4', 'm5'] },
    'dune_stalker',
    'savana',
  );
  // Deterministic RNG: always returns 0.5 → middle picks.
  const rng = () => 0.5;
  const result = inheritFromLineage(
    { id: 'newborn', applied_mutations: [], trait_ids: [] },
    'dune_stalker',
    'savana',
    'lineage-skiv',
    { rng },
  );
  assert.ok(result.inherited.length >= 1 && result.inherited.length <= 2);
  // Inherited mutations should appear in unit.applied_mutations + trait_ids (free grant).
  for (const mid of result.inherited) {
    assert.ok(result.unit.applied_mutations.includes(mid));
    assert.ok(result.unit.trait_ids.includes(mid));
  }
  assert.equal(result.pool_consumed, false);
  assert.equal(result.pool_size, 5);
  assert.equal(result.lineage_id, 'lineage-skiv');
});

test('inheritFromLineage: pool vuoto → newborn riceve [] (graceful)', () => {
  const result = inheritFromLineage(
    { id: 'newborn', applied_mutations: [], trait_ids: ['base_trait'] },
    'dune_stalker',
    'tundra',
  );
  assert.deepEqual(result.inherited, []);
  assert.equal(result.pool_size, 0);
  // Unit preserved (no mutation added).
  assert.deepEqual(result.unit.trait_ids, ['base_trait']);
});

test('inheritFromLineage: cross-biome isolation — savana pool NON ereditata in deserto', () => {
  propagateLineage(
    { id: 'src', applied_mutations: ['savana_mut_1', 'savana_mut_2'] },
    'dune_stalker',
    'savana',
  );
  const result = inheritFromLineage(
    { id: 'newborn-deserto', applied_mutations: [], trait_ids: [] },
    'dune_stalker',
    'deserto',
  );
  assert.deepEqual(result.inherited, []);
  assert.equal(result.pool_size, 0);
});

test('inheritFromLineage: same-species cross-lineage — pool condiviso (per ora)', () => {
  // Lineage A propaga
  propagateLineage({ id: 'src-a', applied_mutations: ['mut_lineage_a'] }, 'dune_stalker', 'savana');
  // Lineage B propaga nello stesso (species, biome)
  propagateLineage({ id: 'src-b', applied_mutations: ['mut_lineage_b'] }, 'dune_stalker', 'savana');
  // Newborn lineage C eredita da pool condiviso → può ricevere o A o B.
  const result = inheritFromLineage(
    { id: 'newborn-c', applied_mutations: [], trait_ids: [] },
    'dune_stalker',
    'savana',
    'lineage-c',
    { min: 2, max: 2 }, // forza 2 per testare entrambi
  );
  assert.equal(result.inherited.length, 2);
  assert.deepEqual(result.inherited.sort(), ['mut_lineage_a', 'mut_lineage_b']);
});

test('inheritFromLineage: rispetta cap min/max e non eccede pool size', () => {
  propagateLineage({ id: 'src', applied_mutations: ['only_one'] }, 'dune_stalker', 'savana');
  // Anche se max=5, pool ha 1 → eredita 1.
  const result = inheritFromLineage(
    { id: 'newborn', applied_mutations: [], trait_ids: [] },
    'dune_stalker',
    'savana',
    null,
    { min: 1, max: 5 },
  );
  assert.equal(result.inherited.length, 1);
  assert.equal(result.inherited[0], 'only_one');
});

test('inheritFromLineage: newborn con applied_mutations preesistenti → dedup', () => {
  propagateLineage(
    { id: 'src', applied_mutations: ['shared_mut', 'unique_mut'] },
    'dune_stalker',
    'savana',
  );
  const result = inheritFromLineage(
    { id: 'newborn', applied_mutations: ['shared_mut'], trait_ids: ['shared_mut', 'innate'] },
    'dune_stalker',
    'savana',
    null,
    { min: 2, max: 2 },
  );
  // shared_mut già presente → applied_mutations resta dedup.
  const sharedCount = result.unit.applied_mutations.filter((m) => m === 'shared_mut').length;
  assert.equal(sharedCount, 1);
  assert.ok(result.unit.trait_ids.includes('innate'));
});

// --- inspectPool ---------------------------------------------------------

test('inspectPool: read-only inspection di pool popolato vs vuoto', () => {
  const empty = inspectPool('dune_stalker', 'savana');
  assert.equal(empty.pool_size, 0);
  assert.deepEqual(empty.mutations, []);

  propagateLineage({ id: 'u', applied_mutations: ['m1', 'm2'] }, 'dune_stalker', 'savana');
  const populated = inspectPool('dune_stalker', 'savana');
  assert.equal(populated.pool_size, 2);
  assert.deepEqual(populated.mutations.sort(), ['m1', 'm2']);
});
