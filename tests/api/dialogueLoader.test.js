// TKT-M14-B Phase B — dialogueLoader unit tests.
//
// Covers loader API: loadConvictionBranches, getBranch, getChoice,
// findEligible (threshold + encounter scope).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadConvictionBranches,
  getBranch,
  getChoice,
  findEligible,
  _resetCache,
} = require('../../apps/backend/services/dialogueLoader');

test('dialogueLoader: loadConvictionBranches returns >=5 sample branches', () => {
  _resetCache();
  const branches = loadConvictionBranches();
  assert.ok(branches.length >= 5, `expected >=5 branches, got ${branches.length}`);
  for (const b of branches) {
    assert.ok(b.id, `branch missing id: ${JSON.stringify(b).slice(0, 100)}`);
    assert.ok(Array.isArray(b.choices), `branch ${b.id} choices not array`);
    assert.ok(b.choices.length >= 2, `branch ${b.id} needs >=2 choices`);
    for (const c of b.choices) {
      assert.ok(c.id, `branch ${b.id} choice missing id`);
      assert.ok(c.delta, `branch ${b.id} choice ${c.id} missing delta`);
    }
  }
});

test('dialogueLoader: getBranch finds branch by id (prisoner_choice canonical)', () => {
  _resetCache();
  const branch = getBranch('conv_branch_prisoner_choice');
  assert.ok(branch);
  assert.equal(branch.id, 'conv_branch_prisoner_choice');
  assert.equal(branch.choices.length, 3);
  const exec = branch.choices.find((c) => c.id === 'execute');
  assert.ok(exec);
  assert.equal(exec.delta.morality, -10);
});

test('dialogueLoader: getBranch returns null for unknown id', () => {
  _resetCache();
  assert.equal(getBranch('nonexistent_branch'), null);
  assert.equal(getBranch(null), null);
  assert.equal(getBranch(undefined), null);
});

test('dialogueLoader: findEligible returns all branches for neutral snapshot (no threshold)', () => {
  _resetCache();
  const eligible = findEligible({ utility: 50, liberty: 50, morality: 50 });
  // sample_01, sample_02, sample_04 have null axis_threshold; sample_03 needs
  // utility>=60 + liberty>=40 → NOT eligible at 50/50/50; sample_05 needs morality>=65 NOT eligible.
  // So 3 branches should be eligible at neutral.
  const ids = eligible.map((b) => b.id).sort();
  assert.ok(ids.includes('conv_branch_prisoner_choice'));
  assert.ok(ids.includes('conv_branch_resource_split'));
  assert.ok(ids.includes('conv_branch_skiv_drift_choice'));
  assert.ok(!ids.includes('conv_branch_betrayal_offer'), 'utility threshold not met');
  assert.ok(!ids.includes('conv_branch_pack_unity'), 'morality threshold not met');
});

test('dialogueLoader: findEligible respects axis_threshold (utility>=60 + liberty>=40)', () => {
  _resetCache();
  const eligible = findEligible({ utility: 70, liberty: 50, morality: 50 });
  const ids = eligible.map((b) => b.id);
  assert.ok(ids.includes('conv_branch_betrayal_offer'), 'betrayal_offer should be eligible');
});

test('dialogueLoader: findEligible empty for unmet morality threshold (pack_unity)', () => {
  _resetCache();
  const eligible = findEligible({ utility: 50, liberty: 50, morality: 30 });
  const ids = eligible.map((b) => b.id);
  assert.ok(!ids.includes('conv_branch_pack_unity'));
});

test('dialogueLoader: findEligible respects morality>=65 threshold (pack_unity)', () => {
  _resetCache();
  const eligible = findEligible({ utility: 50, liberty: 50, morality: 80 });
  const ids = eligible.map((b) => b.id);
  assert.ok(ids.includes('conv_branch_pack_unity'));
});

test('dialogueLoader: getChoice finds choice within branch', () => {
  _resetCache();
  const choice = getChoice('conv_branch_prisoner_choice', 'liberate');
  assert.ok(choice);
  assert.equal(choice.delta.liberty, 12);
  assert.equal(getChoice('conv_branch_prisoner_choice', 'nonexistent'), null);
  assert.equal(getChoice('nonexistent_branch', 'execute'), null);
});

test('dialogueLoader: findEligible handles null snapshot gracefully', () => {
  _resetCache();
  assert.deepEqual(findEligible(null), []);
  assert.deepEqual(findEligible(undefined), []);
});
