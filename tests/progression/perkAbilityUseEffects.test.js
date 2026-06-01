'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  applyPerkAbilityUseEffects,
  applyPerkKillEffects,
} = require('../../apps/backend/services/progression/progressionApply');
const { createAbilityExecutor } = require('../../apps/backend/services/abilityExecutor');

// TKT-JOB-PHASEC slice 4 (Cat F, OQ-F verdict A: event-pure subset).
// applyPerkAbilityUseEffects(actor, abilityId, ctx) — twin of applyPerkKillEffects,
// fired post-2xx on a successful ability use. 3 tags: sg_on_mutation_burst (use),
// phenotype_baseline_heal (use), mutation_chain_on_kill (kill-hook reuse).

// --- sg_on_mutation_burst ---

test('sg_on_mutation_burst: earns sg on mutation_burst use', () => {
  const actor = {
    id: 'ab',
    sg: 0,
    _perk_passives: [
      {
        tag: 'sg_on_mutation_burst',
        payload: { sg: 1, cap_per_round: 1 },
        source_perk_id: 'ab_r5',
      },
    ],
  };
  applyPerkAbilityUseEffects(actor, 'mutation_burst', { round: 1 });
  assert.strictEqual(actor.sg, 1);
});

test('sg_on_mutation_burst: capped at cap_per_round within the same round', () => {
  const actor = {
    id: 'ab',
    sg: 0,
    _perk_passives: [
      {
        tag: 'sg_on_mutation_burst',
        payload: { sg: 1, cap_per_round: 1 },
        source_perk_id: 'ab_r5',
      },
    ],
  };
  applyPerkAbilityUseEffects(actor, 'mutation_burst', { round: 1 });
  applyPerkAbilityUseEffects(actor, 'mutation_burst', { round: 1 });
  assert.strictEqual(actor.sg, 1, 'second use same round does not re-earn');
});

test('sg_on_mutation_burst: earns again in a new round', () => {
  const actor = {
    id: 'ab',
    sg: 0,
    _perk_passives: [
      {
        tag: 'sg_on_mutation_burst',
        payload: { sg: 1, cap_per_round: 1 },
        source_perk_id: 'ab_r5',
      },
    ],
  };
  applyPerkAbilityUseEffects(actor, 'mutation_burst', { round: 1 });
  applyPerkAbilityUseEffects(actor, 'mutation_burst', { round: 2 });
  assert.strictEqual(actor.sg, 2);
});

test('sg_on_mutation_burst: no earn on a different ability', () => {
  const actor = {
    id: 'ab',
    sg: 0,
    _perk_passives: [
      {
        tag: 'sg_on_mutation_burst',
        payload: { sg: 1, cap_per_round: 1 },
        source_perk_id: 'ab_r5',
      },
    ],
  };
  applyPerkAbilityUseEffects(actor, 'phenotype_shift', { round: 1 });
  assert.strictEqual(actor.sg, 0);
});

// --- phenotype_baseline_heal ---

test('phenotype_baseline_heal: heals on phenotype_shift use', () => {
  const actor = {
    id: 'ab',
    hp: 5,
    max_hp: 10,
    _perk_passives: [
      { tag: 'phenotype_baseline_heal', payload: { heal: 2 }, source_perk_id: 'ab_r3' },
    ],
  };
  applyPerkAbilityUseEffects(actor, 'phenotype_shift', {});
  assert.strictEqual(actor.hp, 7);
});

test('phenotype_baseline_heal: heal capped at max_hp', () => {
  const actor = {
    id: 'ab',
    hp: 9,
    max_hp: 10,
    _perk_passives: [
      { tag: 'phenotype_baseline_heal', payload: { heal: 2 }, source_perk_id: 'ab_r3' },
    ],
  };
  applyPerkAbilityUseEffects(actor, 'phenotype_shift', {});
  assert.strictEqual(actor.hp, 10);
});

test('phenotype_baseline_heal: no heal on a different ability', () => {
  const actor = {
    id: 'ab',
    hp: 5,
    max_hp: 10,
    _perk_passives: [
      { tag: 'phenotype_baseline_heal', payload: { heal: 2 }, source_perk_id: 'ab_r3' },
    ],
  };
  applyPerkAbilityUseEffects(actor, 'mutation_burst', {});
  assert.strictEqual(actor.hp, 5);
});

test('applyPerkAbilityUseEffects: no perks = no-op', () => {
  const actor = { id: 'plain', sg: 3, hp: 5, max_hp: 10, _perk_passives: [] };
  const res = applyPerkAbilityUseEffects(actor, 'mutation_burst', { round: 1 });
  assert.strictEqual(actor.sg, 3);
  assert.strictEqual(actor.hp, 5);
  assert.deepStrictEqual(res.applied, []);
});

// --- mutation_chain_on_kill (kill-hook, reuses slice-2 _last_ability_id) ---

test('mutation_chain_on_kill: refunds AP after a mutation_burst kill, once/encounter', () => {
  const actor = {
    id: 'ab',
    ap: 3,
    ap_remaining: 1,
    _last_ability_id: 'mutation_burst',
    _perk_passives: [
      { tag: 'mutation_chain_on_kill', payload: { cap_per_encounter: 1 }, source_perk_id: 'ab_r4' },
    ],
  };
  applyPerkKillEffects(actor);
  assert.strictEqual(actor.ap_remaining, 3, 'AP refunded (+2 mutation_burst cost, capped at ap)');
  applyPerkKillEffects(actor);
  assert.strictEqual(actor.ap_remaining, 3, 'no second refund this encounter');
});

// --- wire: executeAbility fires the use-hook only post-2xx ---

test('executeAbility wires the use-hook: phenotype_shift heals via phenotype_baseline_heal', async () => {
  const ex = createAbilityExecutor({ appendEvent: async () => {} });
  const actor = {
    id: 'ab',
    ap_remaining: 5,
    hp: 5,
    max_hp: 10,
    position: { x: 0, y: 0 },
    _perk_passives: [
      { tag: 'phenotype_baseline_heal', payload: { heal: 2 }, source_perk_id: 'ab_r3' },
    ],
  };
  const res = await ex.executeAbility({
    session: { units: [actor], turn: 1 },
    actor,
    body: { ability_id: 'phenotype_shift' },
  });
  assert.strictEqual(
    res.status,
    200,
    `expected 200, got ${res.status}: ${JSON.stringify(res.body)}`,
  );
  assert.strictEqual(actor.hp, 7, 'use-hook applied phenotype_baseline_heal post-2xx');
});

test('mutation_chain_on_kill: no refund when the kill was not via mutation_burst', () => {
  const actor = {
    id: 'ab',
    ap: 3,
    ap_remaining: 1,
    _last_ability_id: 'alpha_strike',
    _perk_passives: [
      { tag: 'mutation_chain_on_kill', payload: { cap_per_encounter: 1 }, source_perk_id: 'ab_r4' },
    ],
  };
  applyPerkKillEffects(actor);
  assert.strictEqual(actor.ap_remaining, 1);
});
