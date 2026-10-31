// Sprint C — Mating offspring roll tests (MHS 3-tier visual feedback).
//
// Coverage:
//   - lineage_id determinism (same parents = same id; order-independent)
//   - gene_slots inheritance (1 per parent, weighted)
//   - environmental_mutation pick (mutation_catalog vs biome trait fallback)
//   - tier distribution (no-glow / gold / rainbow rules)
//   - self-mate prevention
//   - rollOffspring integration on tracker (offspring registry)
//
// Cross-ref:
//   - apps/backend/services/metaProgression.js rollMatingOffspring
//   - data/core/mating.yaml gene_slots schema
//   - data/core/mutations/mutation_catalog.yaml

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  createMetaTracker,
  makeLineageId,
  inheritGeneSlots,
  pickEnvironmentalMutation,
  computeOffspringTier,
  rollMatingOffspring,
  TIER_NO_GLOW,
  TIER_GOLD,
  TIER_RAINBOW,
} = require('../../apps/backend/services/metaProgression');

// ─── lineage_id ─────────────────────────────────────────────────────

test('makeLineageId: deterministic — same input produces same id', () => {
  const id1 = makeLineageId('skiv_alpha', 'echo_beta');
  const id2 = makeLineageId('skiv_alpha', 'echo_beta');
  assert.equal(id1, id2);
  assert.match(id1, /^lineage_[0-9a-f]{8}$/);
});

test('makeLineageId: order-independent (commutative)', () => {
  const a = makeLineageId('skiv_alpha', 'echo_beta');
  const b = makeLineageId('echo_beta', 'skiv_alpha');
  assert.equal(a, b);
});

test('makeLineageId: distinct parents → distinct lineage', () => {
  const x = makeLineageId('skiv_alpha', 'echo_beta');
  const y = makeLineageId('skiv_alpha', 'crawler_gamma');
  assert.notEqual(x, y);
});

// ─── inheritGeneSlots ───────────────────────────────────────────────

test('inheritGeneSlots: returns 2 slots, one from each parent', () => {
  const a = { id: 'pa', gene_slots: [{ slot_id: 'corpo', value: 'agile' }] };
  const b = { id: 'pb', gene_slots: [{ slot_id: 'arti', value: 'forti' }] };
  const slots = inheritGeneSlots(a, b, {}, () => 0.5);
  assert.equal(slots.length, 2);
  assert.equal(slots[0].from, 'parent_a');
  assert.equal(slots[1].from, 'parent_b');
});

test('inheritGeneSlots: parent without gene_slots → fallback synthetic slot', () => {
  const a = { id: 'pa' };
  const b = { id: 'pb' };
  const slots = inheritGeneSlots(a, b, {}, () => 0.5);
  assert.equal(slots.length, 2);
  assert.ok(slots[0].slot_id);
  assert.ok(slots[1].slot_id);
});

test('inheritGeneSlots: weighted pick honors inheritance_weight', () => {
  // schema: corazza weight 0.8, arti weight 0.6 → corazza preferred
  const schema = {
    categories: {
      struttura: {
        slots: [
          { id: 'corazza', label_it: 'Corazza', inheritance_weight: 0.8 },
          { id: 'arti', label_it: 'Arti', inheritance_weight: 0.6 },
        ],
      },
    },
  };
  const a = {
    id: 'pa',
    gene_slots: [
      { slot_id: 'corazza', value: 'spessa' },
      { slot_id: 'arti', value: 'corti' },
    ],
  };
  const b = {
    id: 'pb',
    gene_slots: [{ slot_id: 'arti', value: 'lunghi' }],
  };
  // rng=0.1 (very low) → first weight slice (corazza w=0.8) selected for parent_a
  const slots = inheritGeneSlots(a, b, schema, () => 0.1);
  assert.equal(slots[0].slot_id, 'corazza');
  assert.equal(slots[0].label_it, 'Corazza');
});

// ─── pickEnvironmentalMutation ──────────────────────────────────────

test('pickEnvironmentalMutation: mutation_catalog match by biome', () => {
  const catalog = {
    byId: {
      mut_x: { tier: 1, biome_boost: ['savana'], name_it: 'X' },
      mut_y: { tier: 2, biome_boost: ['cryosteppe'], name_it: 'Y' },
    },
  };
  const mut = pickEnvironmentalMutation({
    biomeId: 'savana',
    mutationCatalog: catalog,
    rng: () => 0,
  });
  assert.equal(mut.id, 'mut_x');
  assert.equal(mut.type, 'mutation');
  assert.equal(mut.tier, 1);
});

test('pickEnvironmentalMutation: fallback to biome trait pool when no catalog match', () => {
  const mut = pickEnvironmentalMutation({
    biomeId: 'unknown_biome',
    mutationCatalog: { byId: {} },
    biomeTraitsPool: ['trait_alpha'],
    rng: () => 0,
  });
  assert.equal(mut.id, 'trait_alpha');
  assert.equal(mut.type, 'trait');
  assert.equal(mut.source, 'biome_trait_pool');
});

test('pickEnvironmentalMutation: empty fallback when no catalog + no pool', () => {
  const mut = pickEnvironmentalMutation({ biomeId: 'x' });
  assert.equal(mut.id, null);
  assert.equal(mut.type, 'none');
});

// ─── computeOffspringTier ───────────────────────────────────────────

test('computeOffspringTier: GOLD when both gene slots match same slot_id', () => {
  const tier = computeOffspringTier({
    inheritedSlots: [
      { slot_id: 'corpo', from: 'parent_a' },
      { slot_id: 'corpo', from: 'parent_b' },
    ],
    environmentalMutation: { tier: 0 },
  });
  assert.equal(tier, TIER_GOLD);
});

test('computeOffspringTier: RAINBOW when env mutation tier >= 2 (rare)', () => {
  const tier = computeOffspringTier({
    inheritedSlots: [
      { slot_id: 'corpo', from: 'parent_a' },
      { slot_id: 'arti', from: 'parent_b' },
    ],
    environmentalMutation: { type: 'mutation', tier: 2 },
  });
  assert.equal(tier, TIER_RAINBOW);
});

test('computeOffspringTier: NO-GLOW default (no slot match, no rare mutation)', () => {
  const tier = computeOffspringTier({
    inheritedSlots: [
      { slot_id: 'corpo', from: 'parent_a' },
      { slot_id: 'arti', from: 'parent_b' },
    ],
    environmentalMutation: { type: 'mutation', tier: 1 },
  });
  assert.equal(tier, TIER_NO_GLOW);
});

test('computeOffspringTier: RAINBOW takes priority over GOLD', () => {
  // Both slot match AND rare mutation → rainbow wins.
  const tier = computeOffspringTier({
    inheritedSlots: [
      { slot_id: 'corpo', from: 'parent_a' },
      { slot_id: 'corpo', from: 'parent_b' },
    ],
    environmentalMutation: { type: 'mutation', tier: 2 },
  });
  assert.equal(tier, TIER_RAINBOW);
});

// ─── rollMatingOffspring ────────────────────────────────────────────

test('rollMatingOffspring: returns full offspring spec', () => {
  const result = rollMatingOffspring({
    parentA: { id: 'pa', trait_ids: ['t1'], gene_slots: [{ slot_id: 'corpo', value: 'a' }] },
    parentB: { id: 'pb', trait_ids: ['t2'], gene_slots: [{ slot_id: 'arti', value: 'b' }] },
    biomeId: 'savana',
    context: { rng: () => 0.5 },
  });
  assert.equal(result.success, true);
  assert.ok(result.offspring);
  assert.equal(result.offspring.parent_a_id, 'pa');
  assert.equal(result.offspring.parent_b_id, 'pb');
  assert.equal(result.offspring.biome_id_at_mating, 'savana');
  assert.equal(result.offspring.predicted_lifecycle_phase, 'hatchling');
  assert.match(result.offspring.lineage_id, /^lineage_[0-9a-f]{8}$/);
  assert.equal(result.offspring.gene_slots.length, 2);
  assert.ok(result.visual_hints);
  assert.ok(['no-glow', 'gold', 'rainbow'].includes(result.tier));
});

test('rollMatingOffspring: prevents self-mate (parentA.id == parentB.id)', () => {
  const result = rollMatingOffspring({
    parentA: { id: 'self' },
    parentB: { id: 'self' },
    biomeId: 'savana',
  });
  assert.equal(result.success, false);
  assert.equal(result.reason, 'self_mate_prevented');
});

test('rollMatingOffspring: throws on missing parents', () => {
  assert.throws(() => rollMatingOffspring({ parentA: null, parentB: { id: 'b' } }));
  assert.throws(() => rollMatingOffspring({}));
});

test('rollMatingOffspring: gold tier when inherited slots same slot_id', () => {
  // Both parents only have 'corpo' slot → both inherited slots will be 'corpo'.
  const result = rollMatingOffspring({
    parentA: { id: 'pa', gene_slots: [{ slot_id: 'corpo', value: 'a' }] },
    parentB: { id: 'pb', gene_slots: [{ slot_id: 'corpo', value: 'b' }] },
    biomeId: 'savana',
    context: { rng: () => 0.5, mutationCatalog: { byId: {} } },
  });
  assert.equal(result.success, true);
  assert.equal(result.tier, TIER_GOLD);
  assert.ok(result.offspring.tier_bonus_traits.length >= 0);
});

test('rollMatingOffspring: rainbow tier when env mutation is rare', () => {
  const catalog = {
    byId: {
      mut_rare: { tier: 2, biome_boost: ['cryosteppe'], name_it: 'Rare X' },
    },
  };
  const result = rollMatingOffspring({
    parentA: {
      id: 'pa',
      trait_ids: ['t1', 't2', 't3'],
      gene_slots: [{ slot_id: 'corpo', value: 'a' }],
    },
    parentB: {
      id: 'pb',
      trait_ids: ['t4', 't5'],
      gene_slots: [{ slot_id: 'arti', value: 'b' }],
    },
    biomeId: 'cryosteppe',
    context: { mutationCatalog: catalog, rng: () => 0.5 },
  });
  assert.equal(result.tier, TIER_RAINBOW);
  assert.equal(result.offspring.environmental_mutation.id, 'mut_rare');
  // Rainbow → +2 bonus traits
  assert.equal(result.offspring.tier_bonus_traits.length, 2);
});

// ─── tracker.rollOffspring integration ──────────────────────────────

test('tracker.rollOffspring: appends offspring to registry on success', () => {
  const tracker = createMetaTracker();
  const result = tracker.rollOffspring({
    parentA: { id: 'pa', gene_slots: [{ slot_id: 'corpo', value: 'a' }] },
    parentB: { id: 'pb', gene_slots: [{ slot_id: 'arti', value: 'b' }] },
    biomeId: 'savana',
    context: { rng: () => 0.5 },
  });
  assert.equal(result.success, true);
  const list = tracker.listOffspring();
  assert.equal(list.length, 1);
  assert.equal(list[0].parent_a_id, 'pa');
  assert.ok(list[0].created_at);
});

test('tracker.rollOffspring: self_mate does NOT append offspring', () => {
  const tracker = createMetaTracker();
  const result = tracker.rollOffspring({
    parentA: { id: 'self' },
    parentB: { id: 'self' },
    biomeId: 'savana',
  });
  assert.equal(result.success, false);
  assert.equal(tracker.listOffspring().length, 0);
});

test('tracker.addOffspring: appends external offspring entry', () => {
  const tracker = createMetaTracker();
  const entry = tracker.addOffspring({
    lineage_id: 'lineage_deadbeef',
    gene_slots: [],
    tier: 'no-glow',
  });
  assert.ok(entry);
  assert.ok(entry.added_at);
  assert.equal(tracker.listOffspring().length, 1);
});
