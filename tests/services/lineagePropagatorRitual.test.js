// Skiv Goal 4 — legacy death mutation choice ritual tests.
//
// Covers:
//   1) Default behavior preserved (no options → all mutations propagated, BACK-COMPAT)
//   2) Subset filter (options.mutationsToLeave = ['m1', 'm2'] → only those propagated)
//   3) Empty array (options.mutationsToLeave = [] → no mutations propagated)
//   4) Bond hearts delta calc (50% threshold + 100% bonus + edge cases)
//
// Cross-ref: apps/backend/services/generation/lineagePropagator.js

'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  propagateLineage,
  inspectPool,
  reset,
  computeBondHeartsDelta,
} = require('../../apps/backend/services/generation/lineagePropagator');

beforeEach(() => {
  reset();
});

// --- 1) BACK-COMPAT: default behavior preserved -----------------------------

test('Goal 4 BACK-COMPAT: propagateLineage senza options propaga TUTTI applied_mutations (default behavior preserved)', () => {
  const legacy = {
    id: 'u-skiv-legacy-1',
    applied_mutations: ['mut_a', 'mut_b', 'mut_c'],
  };
  const result = propagateLineage(legacy, 'dune_stalker', 'savana');
  // Pre-Goal4 contract: tutto propagato.
  assert.equal(result.pool_size, 3);
  assert.deepEqual(result.written_traits.sort(), ['mut_a', 'mut_b', 'mut_c']);
  // New fields default to "no filter applied" semantics.
  assert.equal(result.filtered, false);
  assert.equal(result.total_applied, 3);
  assert.equal(result.left_count, 3);

  // Pool reflects full set.
  const pool = inspectPool('dune_stalker', 'savana');
  assert.deepEqual(pool.mutations.sort(), ['mut_a', 'mut_b', 'mut_c']);
});

// --- 2) Subset filter -------------------------------------------------------

test('Goal 4 SUBSET: options.mutationsToLeave filtra applied_mutations al subset specificato', () => {
  const legacy = {
    id: 'u-skiv-legacy-2',
    applied_mutations: ['mut_a', 'mut_b', 'mut_c', 'mut_d'],
  };
  const result = propagateLineage(legacy, 'dune_stalker', 'savana', {
    mutationsToLeave: ['mut_a', 'mut_c'],
  });
  // Solo 'mut_a' e 'mut_c' propagati; 'mut_b' e 'mut_d' restano fuori.
  assert.equal(result.filtered, true);
  assert.equal(result.total_applied, 4);
  assert.equal(result.left_count, 2);
  assert.deepEqual(result.written_traits.sort(), ['mut_a', 'mut_c']);
  assert.equal(result.pool_size, 2);

  // Verifica isolamento pool.
  const pool = inspectPool('dune_stalker', 'savana');
  assert.deepEqual(pool.mutations.sort(), ['mut_a', 'mut_c']);
  assert.ok(!pool.mutations.includes('mut_b'));
  assert.ok(!pool.mutations.includes('mut_d'));
});

test('Goal 4 SUBSET: mutationsToLeave referencia ID NON in applied_mutations → ignorato (intersection-only)', () => {
  const legacy = {
    id: 'u-skiv-legacy-2b',
    applied_mutations: ['mut_a', 'mut_b'],
  };
  const result = propagateLineage(legacy, 'dune_stalker', 'savana', {
    mutationsToLeave: ['mut_a', 'mut_unknown_xyz'],
  });
  // Solo 'mut_a' propagato; 'mut_unknown_xyz' non era in applied → ignorato.
  assert.equal(result.left_count, 1);
  assert.deepEqual(result.written_traits, ['mut_a']);
  assert.equal(result.pool_size, 1);
});

// --- 3) Empty array ---------------------------------------------------------

test('Goal 4 EMPTY: options.mutationsToLeave = [] → nessuna mutation propagata (allenatore decide nulla)', () => {
  const legacy = {
    id: 'u-skiv-legacy-3',
    applied_mutations: ['mut_a', 'mut_b', 'mut_c'],
  };
  const result = propagateLineage(legacy, 'dune_stalker', 'savana', {
    mutationsToLeave: [],
  });
  assert.equal(result.filtered, true);
  assert.equal(result.total_applied, 3);
  assert.equal(result.left_count, 0);
  assert.deepEqual(result.written_traits, []);
  assert.equal(result.pool_size, 0);

  // Pool resta vuoto.
  const pool = inspectPool('dune_stalker', 'savana');
  assert.equal(pool.pool_size, 0);
});

// --- 4) Bond hearts delta calc ---------------------------------------------

test('Goal 4 BOND DELTA: 100% lasciato → +1 heart, voice "Hai dato tutto"', () => {
  const r = computeBondHeartsDelta(3, 3);
  assert.equal(r.delta, +1);
  assert.equal(r.threshold, 'full');
  assert.match(r.voice_it, /Hai dato tutto/i);
});

test('Goal 4 BOND DELTA: < 50% lasciato → -1 heart, voice "Il vento porta solo certe ossa"', () => {
  // 1/3 = 33% < 50%
  const r = computeBondHeartsDelta(1, 3);
  assert.equal(r.delta, -1);
  assert.equal(r.threshold, 'partial_low');
  assert.match(r.voice_it, /vento|ossa/i);
});

test('Goal 4 BOND DELTA: 50-99% lasciato → 0 heart neutral, voice neutral desert metaphor', () => {
  // 2/3 ≈ 66% (>= 50% e < 100%)
  const r = computeBondHeartsDelta(2, 3);
  assert.equal(r.delta, 0);
  assert.equal(r.threshold, 'partial_high');
  assert.match(r.voice_it, /sabbia|lasci/i);

  // Edge case 50% esatto = neutral (>= 0.5).
  const r50 = computeBondHeartsDelta(2, 4);
  assert.equal(r50.delta, 0);
  assert.equal(r50.threshold, 'partial_high');
});

test('Goal 4 BOND DELTA: zero applied_mutations → delta 0, no voice (graceful)', () => {
  const r = computeBondHeartsDelta(0, 0);
  assert.equal(r.delta, 0);
  assert.equal(r.threshold, 'no_mutations');
  assert.equal(r.voice_it, null);
});

// --- 5) Malformed input edge cases (Gate 3 graceful degradation) -----------

test('Goal 4 EDGE: malformed mutationsToLeave (non-array) → throw TypeError', () => {
  const legacy = { id: 'u', applied_mutations: ['mut_a'] };
  assert.throws(
    () =>
      propagateLineage(legacy, 'dune_stalker', 'savana', {
        mutationsToLeave: 'mut_a',
      }),
    TypeError,
  );
  assert.throws(
    () =>
      propagateLineage(legacy, 'dune_stalker', 'savana', {
        mutationsToLeave: { 0: 'mut_a' },
      }),
    TypeError,
  );
});

test('Goal 4 EDGE: applied_mutations vuoto + mutationsToLeave omitted → no-op preserved', () => {
  const result = propagateLineage({ id: 'u', applied_mutations: [] }, 'dune_stalker', 'savana');
  assert.equal(result.pool_size, 0);
  assert.equal(result.filtered, false);
  assert.equal(result.left_count, 0);
});
