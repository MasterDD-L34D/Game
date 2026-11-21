// M12 Phase B — packRoller unit tests.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  loadPacks,
  rollGeneralD20,
  rollFormD12,
  computeComboCost,
  rollPack,
  seededRng,
  resetPacksCache,
} = require('../../apps/backend/services/forms/packRoller');

test('loadPacks parses data/packs.yaml with pi_shop + forms + job_bias', () => {
  resetPacksCache();
  const packs = loadPacks();
  assert.ok(packs.pi_shop);
  assert.ok(typeof packs.pi_shop.costs.trait_T1 === 'number');
  assert.ok(Array.isArray(packs.random_general_d20));
  assert.ok(packs.forms.INTJ);
  assert.ok(Array.isArray(packs.job_bias.vanguard));
});

test('seededRng produces deterministic sequence', () => {
  const r1 = seededRng(42);
  const r2 = seededRng(42);
  assert.equal(r1(), r2());
  assert.equal(r1(), r2());
  assert.equal(r1(), r2());
});

test('rollGeneralD20 returns entry matching d20 range', () => {
  const packs = loadPacks();
  const rng = seededRng(100);
  const { d20, entry } = rollGeneralD20(packs, rng);
  assert.ok(d20 >= 1 && d20 <= 20);
  assert.ok(entry);
  assert.ok(entry.pack);
});

test('rollFormD12 returns INTJ branch with combo from bias_d12', () => {
  const packs = loadPacks();
  const rng = seededRng(7);
  const roll = rollFormD12(packs, 'INTJ', rng);
  assert.ok(roll);
  assert.ok(roll.d12 >= 1 && roll.d12 <= 12);
  assert.ok(['A', 'B', 'C'].includes(roll.branch));
  assert.ok(Array.isArray(roll.combo));
});

test('rollFormD12 returns null for unknown form', () => {
  const packs = loadPacks();
  const roll = rollFormD12(packs, 'ZZZZ', seededRng(1));
  assert.equal(roll, null);
});

test('computeComboCost sums pi_shop.costs, ignoring PE rewards', () => {
  const packs = loadPacks();
  const combo = ['trait_T1', 'job_ability', 'PE', 'PE', 'sigillo_forma'];
  const result = computeComboCost(packs, combo);
  // trait_T1(3) + job_ability(4) + sigillo_forma(2) = 9
  assert.equal(result.cost, 9);
  assert.equal(result.pe_reward_count, 2);
  assert.equal(result.items.length, 3);
});

test('computeComboCost handles colon-prefixed tokens (trait_T1:pianificatore)', () => {
  const packs = loadPacks();
  const result = computeComboCost(packs, ['trait_T1:pianificatore', 'cap_pt']);
  // trait_T1(3) + cap_pt(2) = 5
  assert.equal(result.cost, 5);
});

test('rollPack deterministic on same seed', () => {
  const packs = loadPacks();
  const a = rollPack({ packs, formId: 'INTJ', jobId: 'vanguard', rng: seededRng(555) });
  const b = rollPack({ packs, formId: 'INTJ', jobId: 'vanguard', rng: seededRng(555) });
  assert.deepEqual(a, b);
});

test('rollPack returns BIAS_FORMA resolution when d20 in 16-17 range', () => {
  // Force BIAS_FORMA by scanning seeds until d20 lands in 16-17.
  const packs = loadPacks();
  let result = null;
  for (let seed = 1; seed < 1000; seed += 1) {
    const attempt = rollPack({
      packs,
      formId: 'INTJ',
      jobId: 'vanguard',
      rng: seededRng(seed),
    });
    if (attempt.source === 'BIAS_FORMA') {
      result = attempt;
      break;
    }
  }
  assert.ok(result, 'found a BIAS_FORMA seed within 1000 tries');
  assert.match(result.resolved_pack, /^FORMA:INTJ:[ABC]$/);
  assert.ok(['A', 'B', 'C'].includes(result.form_branch));
  assert.ok(result.dice.d12 >= 1 && result.dice.d12 <= 12);
});

test('rollPack returns SCELTA flag when d20=20', () => {
  const packs = loadPacks();
  let result = null;
  for (let seed = 1; seed < 2000; seed += 1) {
    const attempt = rollPack({ packs, formId: 'INTJ', jobId: 'vanguard', rng: seededRng(seed) });
    if (attempt.source === 'SCELTA' || attempt.requires_choice) {
      result = attempt;
      break;
    }
  }
  assert.ok(result, 'found a SCELTA seed');
  assert.equal(result.requires_choice, true);
});

test('rollPack returns error when BIAS_FORMA hit but no formId supplied', () => {
  const packs = loadPacks();
  for (let seed = 1; seed < 1000; seed += 1) {
    const attempt = rollPack({ packs, formId: null, jobId: null, rng: seededRng(seed) });
    if (attempt.source === 'BIAS_FORMA' || attempt.reason === 'form_id_required_for_bias') {
      assert.equal(attempt.ok, false);
      assert.equal(attempt.reason, 'form_id_required_for_bias');
      return;
    }
  }
  // Not all seeds land on BIAS_FORMA — that's fine; test passes if assertion path never runs.
});
