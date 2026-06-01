'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  applyBaseAbilityResourceEarn,
} = require('../../apps/backend/services/progression/progressionApply');

// TKT-JOB-PHASEC OQ-PE (PE-complete verdict). Base aberrant PE earn:
// mutation_burst generates +1 PE/round (capped once/round via _pe_on_mb_round)
// so aberrant_overdrive (cost_pe:5, #2522) is reachable by normal play. The earn
// is BASE (not perk-gated) and lives OUTSIDE applyPerkAbilityUseEffects to keep
// that hook's "no perks = no-op" contract intact.

test('base PE earn: mutation_burst grants +1 PE', () => {
  const actor = { id: 'ab', pe: 0, job: 'aberrant' };
  applyBaseAbilityResourceEarn(actor, 'mutation_burst', { round: 1 });
  assert.strictEqual(actor.pe, 1);
});

test('base PE earn: capped once per round', () => {
  const actor = { id: 'ab', pe: 0, job: 'aberrant' };
  applyBaseAbilityResourceEarn(actor, 'mutation_burst', { round: 1 });
  applyBaseAbilityResourceEarn(actor, 'mutation_burst', { round: 1 });
  assert.strictEqual(actor.pe, 1, 'second use in the same round does not re-earn');
});

test('base PE earn: earns again in a new round', () => {
  const actor = { id: 'ab', pe: 0, job: 'aberrant' };
  applyBaseAbilityResourceEarn(actor, 'mutation_burst', { round: 1 });
  applyBaseAbilityResourceEarn(actor, 'mutation_burst', { round: 2 });
  assert.strictEqual(actor.pe, 2);
});

test('base PE earn: no earn on a different ability', () => {
  const actor = { id: 'ab', pe: 0, job: 'aberrant' };
  applyBaseAbilityResourceEarn(actor, 'phenotype_shift', { round: 1 });
  assert.strictEqual(actor.pe, 0);
});

test('base PE earn: reaches the overdrive gate (5 PE) over 5 rounds', () => {
  const actor = { id: 'ab', pe: 0, job: 'aberrant' };
  for (let r = 1; r <= 5; r += 1) {
    applyBaseAbilityResourceEarn(actor, 'mutation_burst', { round: r });
  }
  assert.strictEqual(actor.pe, 5, 'aberrant_overdrive cost_pe:5 is now reachable');
});

test('base PE earn: applied[] reports the earn', () => {
  const actor = { id: 'ab', pe: 0, job: 'aberrant' };
  const res = applyBaseAbilityResourceEarn(actor, 'mutation_burst', { round: 1 });
  assert.deepStrictEqual(res.applied, [{ tag: 'pe_on_mutation_burst', pe: 1 }]);
});

test('base PE earn: a non-aberrant submitting mutation_burst earns NO PE (Codex P2 #2526)', () => {
  const actor = { id: 'sk', pe: 0, job: 'stalker' };
  applyBaseAbilityResourceEarn(actor, 'mutation_burst', { round: 1 });
  assert.strictEqual(actor.pe, 0, 'PE is the aberrant resource — non-aberrants cannot farm it');
});

test('base PE earn: undefined actor is a no-op', () => {
  const res = applyBaseAbilityResourceEarn(undefined, 'mutation_burst', { round: 1 });
  assert.deepStrictEqual(res.applied, []);
});
