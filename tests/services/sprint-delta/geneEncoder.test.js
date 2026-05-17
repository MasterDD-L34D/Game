// Sprint δ Meta Systemic — Pattern 1 tests (CK3 DNA encoding).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  encode,
  decode,
  diffMutations,
  isChildOf,
  computeGeneration,
  CHAIN_PREFIX,
  VERSION,
} = require('../../../apps/backend/services/meta/geneEncoder');

test('encode: deterministic — same inputs → same hash', () => {
  const a = encode({
    lineage_id: 'lin_alpha',
    applied_mutations: ['mut_a', 'mut_b', 'mut_c'],
    parent_dna: null,
  });
  const b = encode({
    lineage_id: 'lin_alpha',
    applied_mutations: ['mut_c', 'mut_a', 'mut_b'],
    parent_dna: null,
  });
  assert.equal(a, b, 'sorted mutation set should produce same hash');
  assert.match(a, new RegExp(`^${CHAIN_PREFIX}${VERSION}:root:[a-f0-9]{16}$`));
});

test('decode: round-trip extracts components', () => {
  const dna = encode({
    lineage_id: 'lin_beta',
    applied_mutations: ['mut_x'],
    parent_dna: null,
  });
  const decoded = decode(dna);
  assert.ok(decoded);
  assert.equal(decoded.version, VERSION);
  assert.equal(decoded.is_root, true);
  assert.equal(decoded.parent_hash, 'root');
  assert.match(decoded.self_hash, /^[a-f0-9]{16}$/);
});

test('encode: parent-child chain links correctly', () => {
  const parent = encode({
    lineage_id: 'lin_p',
    applied_mutations: ['mut_p1'],
    parent_dna: null,
  });
  const child = encode({
    lineage_id: 'lin_c',
    applied_mutations: ['mut_c1'],
    parent_dna: parent,
  });
  assert.notEqual(parent, child);
  assert.ok(isChildOf(parent, child), 'child should link to parent');
  assert.equal(isChildOf(child, parent), false, 'parent should not link to child');
});

test('diffMutations: added/removed/unchanged correctly classified', () => {
  const result = diffMutations(['a', 'b', 'c'], ['b', 'c', 'd']);
  assert.deepEqual(result.added, ['d']);
  assert.deepEqual(result.removed, ['a']);
  assert.deepEqual(result.unchanged, ['b', 'c']);
});

test('decode: defensive — malformed input returns null', () => {
  assert.equal(decode(null), null);
  assert.equal(decode(undefined), null);
  assert.equal(decode(''), null);
  assert.equal(decode('not_a_dna_chain'), null);
  assert.equal(decode('gn1:root'), null); // missing self_hash
  assert.equal(decode(42), null);
});

test('computeGeneration: walks parent chain via resolver', () => {
  const gen0 = encode({ lineage_id: 'g0', applied_mutations: [], parent_dna: null });
  const gen1 = encode({ lineage_id: 'g1', applied_mutations: [], parent_dna: gen0 });
  const gen2 = encode({ lineage_id: 'g2', applied_mutations: [], parent_dna: gen1 });
  const chainStore = new Map();
  chainStore.set(decode(gen0).self_hash, gen0);
  chainStore.set(decode(gen1).self_hash, gen1);
  chainStore.set(decode(gen2).self_hash, gen2);
  const resolver = (parent_hash) => chainStore.get(parent_hash) || null;
  assert.equal(computeGeneration(gen0, resolver), 0);
  assert.equal(computeGeneration(gen1, resolver), 1);
  assert.equal(computeGeneration(gen2, resolver), 2);
});
