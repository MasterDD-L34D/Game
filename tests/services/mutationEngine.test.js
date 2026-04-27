// Sprint Spore Moderate (ADR-2026-04-26) — mutationEngine unit tests.
// Coverage: slot-conflict (S1) + applyMutationPure (S2) + mp budget (S3)
// + bingo 3×category (S6).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadMutationCatalog,
  _resetCacheForTest,
} = require('../../apps/backend/services/mutations/mutationCatalogLoader');
const {
  checkSlotConflict,
  checkMpBudget,
  applyMutationPure,
  computeMutationBingo,
  applyMutationBingoToUnit,
  BINGO_ARCHETYPES,
  BINGO_THRESHOLD,
} = require('../../apps/backend/services/mutations/mutationEngine');

function freshCatalog() {
  _resetCacheForTest();
  return loadMutationCatalog({ refresh: true });
}

// ─── S1 slot-conflict gating ──────────────────────────────────────────────

test('checkSlotConflict: empty applied_mutations → no conflict', () => {
  const catalog = freshCatalog();
  const unit = { id: 'u1', applied_mutations: [] };
  const r = checkSlotConflict(unit, 'artigli_freeze_to_glacier', catalog);
  assert.equal(r.conflict, false);
});

test('checkSlotConflict: same body_slot already occupied → conflict', () => {
  const catalog = freshCatalog();
  // artigli_freeze_to_glacier = appendage; artigli_grip_to_glass = appendage too
  const unit = { id: 'u1', applied_mutations: ['artigli_freeze_to_glacier'] };
  const r = checkSlotConflict(unit, 'artigli_grip_to_glass', catalog);
  assert.equal(r.conflict, true);
  assert.equal(r.slot, 'appendage');
  assert.equal(r.conflicting_mutation_id, 'artigli_freeze_to_glacier');
});

test('checkSlotConflict: different body_slot → no conflict', () => {
  const catalog = freshCatalog();
  // artigli_freeze (appendage) + ali_panic (back) = OK
  const unit = { id: 'u1', applied_mutations: ['artigli_freeze_to_glacier'] };
  const r = checkSlotConflict(unit, 'ali_panic_to_resonance', catalog);
  assert.equal(r.conflict, false);
});

test('checkSlotConflict: symbiotic null slot → never conflicts', () => {
  const catalog = freshCatalog();
  // 2 symbiotic entries: symbiosis_chemio_endosymbiont + filamenti_super_to_echo
  const unit = { id: 'u1', applied_mutations: ['symbiosis_chemio_endosymbiont'] };
  const r = checkSlotConflict(unit, 'filamenti_super_to_echo', catalog);
  assert.equal(r.conflict, false, 'two symbiotic mutations may coexist (ADR §S1 exception)');
});

test('checkSlotConflict: unknown mutation_id → no conflict (defensive)', () => {
  const catalog = freshCatalog();
  const r = checkSlotConflict({ applied_mutations: [] }, 'nope_does_not_exist', catalog);
  assert.equal(r.conflict, false);
});

// ─── S3 MP budget gating ──────────────────────────────────────────────────

test('checkMpBudget: sufficient mp → ok', () => {
  const catalog = freshCatalog();
  const entry = catalog.byId.artigli_freeze_to_glacier; // tier 2 → mp_cost 8
  const r = checkMpBudget({ mp: 10 }, entry);
  assert.equal(r.ok, true);
  assert.equal(r.required, 8);
  assert.equal(r.available, 10);
});

test('checkMpBudget: insufficient mp → not ok', () => {
  const catalog = freshCatalog();
  const entry = catalog.byId.carapace_segments_to_phase; // tier 3 → mp_cost 15
  const r = checkMpBudget({ mp: 5 }, entry);
  assert.equal(r.ok, false);
  assert.equal(r.required, 15);
  assert.equal(r.available, 5);
});

test('checkMpBudget: missing mp field treated as 0', () => {
  const catalog = freshCatalog();
  const entry = catalog.byId.artigli_freeze_to_glacier;
  const r = checkMpBudget({}, entry);
  assert.equal(r.ok, false);
  assert.equal(r.available, 0);
});

// ─── S2 applyMutationPure ─────────────────────────────────────────────────

test('applyMutationPure: trait_swap applied + mutation tracked + mp deducted', () => {
  const catalog = freshCatalog();
  const unit = {
    id: 'u1',
    trait_ids: ['artigli_ipo_termici'],
    applied_mutations: [],
    mp: 10,
  };
  const r = applyMutationPure(unit, 'artigli_freeze_to_glacier', catalog);
  // remove → artigli_ipo_termici, add → artigli_sghiaccio_glaciale
  assert.ok(!r.unit.trait_ids.includes('artigli_ipo_termici'), 'old trait removed');
  assert.ok(r.unit.trait_ids.includes('artigli_sghiaccio_glaciale'), 'new trait added');
  assert.deepEqual(r.unit.applied_mutations, ['artigli_freeze_to_glacier']);
  assert.equal(r.unit.mp, 2, 'mp deducted by mp_cost (10-8=2)');
  assert.equal(r.mp_spent, 8);
  assert.equal(r.applied_event.body_slot, 'appendage');
  assert.equal(r.applied_event.category, 'physiological');
});

test('applyMutationPure: derived_ability_id emerges into unit.abilities when set', () => {
  // derived_ability_id è null per tutte 36 entries shipped — patch catalog inline
  const catalog = freshCatalog();
  catalog.byId.artigli_freeze_to_glacier.derived_ability_id = 'ability_glacial_bite';
  const unit = {
    id: 'u1',
    trait_ids: ['artigli_ipo_termici'],
    applied_mutations: [],
    abilities: ['existing_ability'],
    mp: 10,
  };
  const r = applyMutationPure(unit, 'artigli_freeze_to_glacier', catalog);
  assert.ok(r.unit.abilities.includes('ability_glacial_bite'), 'derived ability added');
  assert.ok(r.unit.abilities.includes('existing_ability'), 'existing ability preserved');
  assert.equal(r.derived_ability_id, 'ability_glacial_bite');
});

test('applyMutationPure: deductMp=false skips MP deduction', () => {
  const catalog = freshCatalog();
  const unit = {
    id: 'u1',
    trait_ids: ['artigli_ipo_termici'],
    applied_mutations: [],
    mp: 10,
  };
  const r = applyMutationPure(unit, 'artigli_freeze_to_glacier', catalog, { deductMp: false });
  assert.equal(r.unit.mp, 10, 'mp untouched');
  assert.equal(r.mp_spent, 0);
});

test('applyMutationPure: throws on unknown mutation_id', () => {
  const catalog = freshCatalog();
  assert.throws(
    () => applyMutationPure({}, 'nope_unknown', catalog),
    /mutation_not_found:nope_unknown/,
  );
});

test('applyMutationPure: idempotent applied_mutations (no double-push)', () => {
  const catalog = freshCatalog();
  const unit = {
    id: 'u1',
    trait_ids: ['artigli_sghiaccio_glaciale'],
    applied_mutations: ['artigli_freeze_to_glacier'],
    mp: 20,
  };
  const r = applyMutationPure(unit, 'artigli_freeze_to_glacier', catalog);
  assert.deepEqual(r.unit.applied_mutations, ['artigli_freeze_to_glacier']);
});

// ─── S6 bingo 3×category ──────────────────────────────────────────────────

test('computeMutationBingo: 0 mutations → empty archetypes', () => {
  const catalog = freshCatalog();
  const r = computeMutationBingo({ applied_mutations: [] }, catalog);
  assert.deepEqual(r.archetypes, []);
  assert.deepEqual(r.counts, {});
});

test('computeMutationBingo: 2 same category → no archetype yet', () => {
  const catalog = freshCatalog();
  const r = computeMutationBingo(
    { applied_mutations: ['artigli_freeze_to_glacier', 'ali_panic_to_resonance'] },
    catalog,
  );
  assert.equal(r.counts.physiological, 2);
  assert.equal(r.archetypes.length, 0);
});

test('computeMutationBingo: 3 physiological → tank_plus archetype', () => {
  const catalog = freshCatalog();
  const r = computeMutationBingo(
    {
      applied_mutations: [
        'artigli_freeze_to_glacier',
        'ali_panic_to_resonance',
        'denti_bleed_to_chelate',
      ],
    },
    catalog,
  );
  assert.equal(r.counts.physiological, 3);
  assert.equal(r.archetypes.length, 1);
  assert.equal(r.archetypes[0].archetype, 'tank_plus');
  assert.equal(r.archetypes[0].passive_token, 'archetype_tank_plus_dr1');
  assert.equal(r.archetypes[0].count, 3);
});

test('computeMutationBingo: multi-bingo possible (3 physiological + 3 sensorial)', () => {
  const catalog = freshCatalog();
  const r = computeMutationBingo(
    {
      applied_mutations: [
        'artigli_freeze_to_glacier',
        'ali_panic_to_resonance',
        'denti_bleed_to_chelate',
        'eyes_kinetic_to_crystal',
        'antenne_track_to_storm',
        'occhi_tension_to_kinetic',
      ],
    },
    catalog,
  );
  assert.equal(r.archetypes.length, 2);
  const ids = r.archetypes.map((a) => a.archetype).sort();
  assert.deepEqual(ids, ['scout_plus', 'tank_plus']);
});

test('computeMutationBingo: BINGO_THRESHOLD = 3 (constant lock)', () => {
  assert.equal(BINGO_THRESHOLD, 3);
});

test('computeMutationBingo: BINGO_ARCHETYPES has 5 categories', () => {
  const cats = Object.keys(BINGO_ARCHETYPES).sort();
  assert.deepEqual(cats, [
    'behavioral',
    'environmental',
    'physiological',
    'sensorial',
    'symbiotic',
  ]);
});

test('computeMutationBingo: ignora applied_mutations id non in catalog', () => {
  const catalog = freshCatalog();
  const r = computeMutationBingo(
    { applied_mutations: ['ghost_id_not_in_catalog', 'artigli_freeze_to_glacier'] },
    catalog,
  );
  assert.equal(r.counts.physiological, 1);
  assert.equal(r.archetypes.length, 0);
});

// ─── applyMutationBingoToUnit (resolver-side hydration) ───────────────────

test('applyMutationBingoToUnit: hydrates _archetype_passives + _archetype_meta', () => {
  const catalog = freshCatalog();
  const unit = {
    id: 'u',
    applied_mutations: [
      'artigli_freeze_to_glacier',
      'ali_panic_to_resonance',
      'denti_bleed_to_chelate',
    ],
  };
  const r = applyMutationBingoToUnit(unit, catalog);
  assert.deepEqual(unit._archetype_passives, ['archetype_tank_plus_dr1']);
  assert.equal(unit._archetype_meta.length, 1);
  assert.equal(unit._archetype_meta[0].archetype, 'tank_plus');
  assert.equal(r.passive_tokens.length, 1);
});

test('applyMutationBingoToUnit: zero bingo → empty arrays', () => {
  const catalog = freshCatalog();
  const unit = { id: 'u', applied_mutations: ['artigli_freeze_to_glacier'] };
  applyMutationBingoToUnit(unit, catalog);
  assert.deepEqual(unit._archetype_passives, []);
  assert.deepEqual(unit._archetype_meta, []);
});

test('applyMutationBingoToUnit: idempotent (overwrite, not append)', () => {
  const catalog = freshCatalog();
  const unit = {
    id: 'u',
    _archetype_passives: ['stale_token'], // pre-existing stale value
    applied_mutations: [
      'artigli_freeze_to_glacier',
      'ali_panic_to_resonance',
      'denti_bleed_to_chelate',
    ],
  };
  applyMutationBingoToUnit(unit, catalog);
  assert.deepEqual(unit._archetype_passives, ['archetype_tank_plus_dr1']);
});
