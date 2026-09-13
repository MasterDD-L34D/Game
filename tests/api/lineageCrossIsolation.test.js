// Fase-2 (Spore S5) — cross-lineage isolation fix.
//
// Bug (lineagePropagator.js:14-15, deferred): the legacy-mutation pool was
// keyed only by (species_id, biome_id), so two distinct lineage_id in the same
// species+biome SHARED the pool — a newborn of lineage A could inherit
// mutations left by lineage B. Decision #3 (master-dd 2026-05-26): the two
// inheritance paths must stay distinct; fix cross-lineage isolation.
//
// Design (hybrid, back-compat): pool partitioned by lineage. Legacy units with
// a `lineage_id` write to that lineage's partition; un-lineaged legacy writes
// to the shared AMBIENT partition (environmental drift, preserved). A newborn
// inherits from AMBIENT ∪ its-own-lineage, NEVER from other lineages.
//
// Placed tests/api/ (CI-globbed by run-test-api.cjs; tests/services/ is NOT in
// any runner glob — RECON-04a §3.3 finding).

'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  propagateLineage,
  inheritFromLineage,
  reset,
} = require('../../apps/backend/services/generation/lineagePropagator');

beforeEach(() => reset());

test('lineage isolation: lineage-tagged legacy pools do NOT cross-contaminate inheritance', () => {
  // Lineage A + B legacy units propagate in the SAME species+biome.
  propagateLineage(
    { id: 'la', lineage_id: 'A', applied_mutations: ['mut_a'] },
    'dune_stalker',
    'savana',
  );
  propagateLineage(
    { id: 'lb', lineage_id: 'B', applied_mutations: ['mut_b'] },
    'dune_stalker',
    'savana',
  );
  // Newborn of lineage A inherits — forcing max picks. Must get ONLY mut_a.
  const res = inheritFromLineage(
    { id: 'nb-a', applied_mutations: [], trait_ids: [] },
    'dune_stalker',
    'savana',
    'A',
    { min: 5, max: 5, rng: () => 0 },
  );
  assert.deepEqual(
    res.inherited.sort(),
    ['mut_a'],
    'lineage A newborn inherits only lineage A legacy',
  );
  assert.ok(!res.inherited.includes('mut_b'), 'no cross-lineage leak from lineage B');
});

test('lineage isolation: AMBIENT (un-lineaged) drift still inherited by any lineage', () => {
  // Un-lineaged legacy -> AMBIENT partition = shared environmental drift (preserved).
  propagateLineage({ id: 'amb', applied_mutations: ['mut_ambient'] }, 'dune_stalker', 'savana');
  const res = inheritFromLineage(
    { id: 'nb', applied_mutations: [], trait_ids: [] },
    'dune_stalker',
    'savana',
    'any-lineage',
    { min: 1, max: 1, rng: () => 0 },
  );
  assert.deepEqual(res.inherited, ['mut_ambient'], 'ambient drift inherited regardless of lineage');
});
