// P4 Thought Cabinet — pure evaluator tests.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadThoughts,
  resetCache,
  evaluateThoughts,
  thoughtsByAxis,
  describeThought,
  matchesThreshold,
} = require('../../apps/backend/services/thoughts/thoughtCabinet');

test('loadThoughts: returns 18 thoughts across 3 axes (E_I + S_N + J_P)', () => {
  resetCache();
  const catalog = loadThoughts();
  const ids = Object.keys(catalog.thoughts);
  assert.equal(ids.length, 18);
  const by = thoughtsByAxis(catalog);
  assert.equal(by.E_I.length, 6);
  assert.equal(by.S_N.length, 6);
  assert.equal(by.J_P.length, 6);
  assert.equal(by.T_F.length, 0);
});

test('loadThoughts: every entry has axis + direction + threshold + title_it', () => {
  resetCache();
  const catalog = loadThoughts();
  for (const [id, e] of Object.entries(catalog.thoughts)) {
    assert.ok(e.axis, `${id} missing axis`);
    assert.ok(['low', 'high'].includes(e.direction), `${id} bad direction`);
    assert.equal(typeof e.threshold, 'number', `${id} bad threshold`);
    assert.ok(e.title_it, `${id} missing title_it`);
    assert.ok(e.flavor_it, `${id} missing flavor_it`);
    assert.ok([1, 2, 3].includes(e.tier), `${id} bad tier`);
  }
});

test('matchesThreshold: low direction matches when value ≤ threshold', () => {
  assert.equal(matchesThreshold(0.3, 'low', 0.35), true);
  assert.equal(matchesThreshold(0.35, 'low', 0.35), true);
  assert.equal(matchesThreshold(0.4, 'low', 0.35), false);
});

test('matchesThreshold: high direction matches when value ≥ threshold', () => {
  assert.equal(matchesThreshold(0.7, 'high', 0.65), true);
  assert.equal(matchesThreshold(0.65, 'high', 0.65), true);
  assert.equal(matchesThreshold(0.6, 'high', 0.65), false);
});

test('matchesThreshold: null/undefined/NaN never match', () => {
  assert.equal(matchesThreshold(null, 'low', 0.5), false);
  assert.equal(matchesThreshold(undefined, 'high', 0.5), false);
  assert.equal(matchesThreshold(NaN, 'low', 0.5), false);
});

test('evaluateThoughts: no axes → empty', () => {
  const res = evaluateThoughts(null);
  assert.deepEqual(res, { unlocked: [], newly: [] });
});

test('evaluateThoughts: E extreme (0.12) unlocks all 3 E tiers', () => {
  resetCache();
  const axes = { E_I: { value: 0.12, coverage: 'full' } };
  const { unlocked, newly } = evaluateThoughts(axes);
  assert.ok(unlocked.includes('e_voce_collettiva'));
  assert.ok(unlocked.includes('e_scintilla_carisma'));
  assert.ok(unlocked.includes('e_campione_folla'));
  assert.equal(newly.length, 3);
  // opposite pole must NOT unlock
  assert.ok(!unlocked.includes('i_osservatore'));
});

test('evaluateThoughts: I moderate (0.68) unlocks only tier 1', () => {
  const axes = { E_I: { value: 0.68, coverage: 'full' } };
  const { unlocked } = evaluateThoughts(axes);
  assert.ok(unlocked.includes('i_osservatore'));
  assert.ok(!unlocked.includes('i_calcolo_silente'));
  assert.ok(!unlocked.includes('i_lupo_solitario'));
});

test('evaluateThoughts: cumulative — alreadyUnlocked not duplicated in newly', () => {
  // value 0.2 unlocks tier1 (0.35) + tier2 (0.25) but not tier3 (0.15).
  const axes = { E_I: { value: 0.2, coverage: 'full' } };
  const already = ['e_voce_collettiva'];
  const { unlocked, newly } = evaluateThoughts(axes, already);
  assert.ok(!newly.includes('e_voce_collettiva'));
  assert.ok(newly.includes('e_scintilla_carisma'));
  assert.equal(newly.length, 1);
  assert.equal(unlocked.length, 2);
});

test('evaluateThoughts: dead-band (0.5) unlocks nothing', () => {
  const axes = {
    E_I: { value: 0.5, coverage: 'full' },
    S_N: { value: 0.5, coverage: 'full' },
    J_P: { value: 0.5, coverage: 'full' },
  };
  const { unlocked, newly } = evaluateThoughts(axes);
  assert.equal(unlocked.length, 0);
  assert.equal(newly.length, 0);
});

test('evaluateThoughts: null axis value skipped cleanly', () => {
  const axes = {
    E_I: { value: null, coverage: 'full' },
    S_N: { value: 0.9, coverage: 'full' },
  };
  const { unlocked } = evaluateThoughts(axes);
  // S 0.9 → passes all 3 S thresholds (0.65, 0.75, 0.85)
  assert.ok(unlocked.includes('s_occhio_pratico'));
  assert.ok(unlocked.includes('s_metodologia_ferro'));
  assert.ok(unlocked.includes('s_veterano_terreno'));
  // E_I null → no E/I thought
  assert.ok(!unlocked.includes('e_voce_collettiva'));
  assert.ok(!unlocked.includes('i_osservatore'));
});

test('evaluateThoughts: mixed axes with partial coverage', () => {
  const axes = {
    E_I: { value: 0.2, coverage: 'full' },
    S_N: { value: 0.7, coverage: 'partial' },
    J_P: { value: 0.3, coverage: 'partial' },
  };
  const { unlocked } = evaluateThoughts(axes);
  // E 0.2 → tier 1+2 (0.35, 0.25); tier 3 (0.15) NO
  assert.ok(unlocked.includes('e_voce_collettiva'));
  assert.ok(unlocked.includes('e_scintilla_carisma'));
  assert.ok(!unlocked.includes('e_campione_folla'));
  // S 0.7 → tier 1 only (0.65)
  assert.ok(unlocked.includes('s_occhio_pratico'));
  assert.ok(!unlocked.includes('s_metodologia_ferro'));
  // P 0.3 → tier 1 (0.35) only
  assert.ok(unlocked.includes('p_adattatore'));
  assert.ok(!unlocked.includes('p_improvvisatore'));
});

test('describeThought: returns shape with id + all fields', () => {
  const d = describeThought('e_voce_collettiva');
  assert.equal(d.id, 'e_voce_collettiva');
  assert.equal(d.axis, 'E_I');
  assert.equal(d.direction, 'low');
  assert.equal(d.tier, 1);
  assert.ok(d.title_it);
});

test('describeThought: unknown id → null', () => {
  assert.equal(describeThought('nope_missing'), null);
});

test('evaluateThoughts: Set input for alreadyUnlocked works', () => {
  const axes = { E_I: { value: 0.1, coverage: 'full' } };
  const already = new Set(['e_voce_collettiva']);
  const { unlocked, newly } = evaluateThoughts(axes, already);
  assert.equal(unlocked.length, 3);
  assert.equal(newly.length, 2);
});

test('evaluateThoughts: axes value exactly at threshold is inclusive', () => {
  const axes = { E_I: { value: 0.35, coverage: 'full' } };
  const { unlocked } = evaluateThoughts(axes);
  assert.ok(unlocked.includes('e_voce_collettiva'));
});
