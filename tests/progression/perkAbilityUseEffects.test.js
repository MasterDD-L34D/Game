'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  applyPerkAbilityUseEffects,
  applyMutationChainRefund,
} = require('../../apps/backend/services/progression/progressionApply');
const { createAbilityExecutor } = require('../../apps/backend/services/abilityExecutor');

// TKT-JOB-PHASEC slice 4 (Cat F, OQ-F verdict A: event-pure subset).
// applyPerkAbilityUseEffects(actor, abilityId, ctx) — twin of applyPerkKillEffects,
// fired post-2xx on a successful ability use. tags: sg_on_mutation_burst (use),
// phenotype_baseline_heal (use), defense_after_silent (arms the camo window on
// silent_step use). mutation_chain_on_kill = applyMutationChainRefund, called from
// executeDrainAttack AFTER the AP spend on a mutation_burst KO (correct rebuild,
// Codex #2524).

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

test('sg_on_mutation_burst: clamps at the sgTracker pool max (3), never over-grants', () => {
  const actor = {
    id: 'ab',
    sg: 3, // already at POOL_MAX
    _perk_passives: [
      {
        tag: 'sg_on_mutation_burst',
        payload: { sg: 1, cap_per_round: 1 },
        source_perk_id: 'ab_r5',
      },
    ],
  };
  applyPerkAbilityUseEffects(actor, 'mutation_burst', { round: 1 });
  assert.strictEqual(actor.sg, 3, 'SG never exceeds POOL_MAX');
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

// --- defense_after_silent: silent_step use arms the camo window ---

test('silent_step use arms the camo window for defense_after_silent', () => {
  const actor = {
    id: 'st',
    _perk_passives: [
      {
        tag: 'defense_after_silent',
        payload: { defense_mod: 2, duration: 1 },
        source_perk_id: 'st_r2',
      },
    ],
  };
  applyPerkAbilityUseEffects(actor, 'silent_step', { round: 3 });
  assert.strictEqual(actor._camo_silent_from, 4, 'window starts the turn AFTER (round+1)');
  assert.strictEqual(actor._camo_silent_to, 4, 'window ends at round+duration');
});

test('silent_step use does not arm the window without the perk', () => {
  const actor = { id: 'st', _perk_passives: [] };
  applyPerkAbilityUseEffects(actor, 'silent_step', { round: 3 });
  assert.strictEqual(actor._camo_silent_from, undefined);
});

// --- mutation_chain_on_kill: applyMutationChainRefund (post-spend, once/encounter) ---

test('applyMutationChainRefund: refunds the spent AP once per encounter', () => {
  const actor = {
    id: 'ab',
    ap: 4,
    ap_remaining: 2,
    _perk_passives: [
      { tag: 'mutation_chain_on_kill', payload: { cap_per_encounter: 1 }, source_perk_id: 'ab_r4' },
    ],
  };
  applyMutationChainRefund(actor, 2);
  assert.strictEqual(actor.ap_remaining, 4, 'spent 2 AP refunded');
  applyMutationChainRefund(actor, 2);
  assert.strictEqual(actor.ap_remaining, 4, 'no second refund this encounter');
});

test('applyMutationChainRefund: caps the refund at max ap', () => {
  const actor = {
    id: 'ab',
    ap: 3,
    ap_remaining: 2,
    _perk_passives: [{ tag: 'mutation_chain_on_kill', payload: {}, source_perk_id: 'ab_r4' }],
  };
  applyMutationChainRefund(actor, 2);
  assert.strictEqual(actor.ap_remaining, 3, 'refund capped at actor.ap');
});

test('applyMutationChainRefund: no refund without the perk', () => {
  const actor = { id: 'ab', ap: 4, ap_remaining: 2, _perk_passives: [] };
  applyMutationChainRefund(actor, 2);
  assert.strictEqual(actor.ap_remaining, 2);
});

test('executeDrainAttack refunds AP when mutation_burst scores a KO (free re-cast)', async () => {
  const ex = createAbilityExecutor({
    performAttack: (s, a, t) => {
      t.hp = 0; // mutation_burst kills the target
      return { damageDealt: 5, result: { hit: true, die: 18, roll: 22, mos: 6 } };
    },
    buildAttackEvent: () => ({}),
    appendEvent: async () => {},
    manhattanDistance: (p, q) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y),
  });
  const actor = {
    id: 'ab',
    ap: 5,
    ap_remaining: 5,
    position: { x: 0, y: 0 },
    attack_range: 5,
    _perk_passives: [
      { tag: 'mutation_chain_on_kill', payload: { cap_per_encounter: 1 }, source_perk_id: 'ab_r4' },
    ],
  };
  const target = { id: 'foe', hp: 3, max_hp: 3, position: { x: 1, y: 0 } };
  const res = await ex.executeAbility({
    session: { units: [actor, target], turn: 1, damage_taken: {} },
    actor,
    body: { ability_id: 'mutation_burst', target_id: 'foe' },
  });
  assert.strictEqual(
    res.status,
    200,
    `expected 200, got ${res.status}: ${JSON.stringify(res.body)}`,
  );
  // mutation_burst cost_ap=2 spent then refunded on the KO → net 0, free re-cast enabled.
  assert.strictEqual(actor.ap_remaining, 5, 'AP refunded after the killing mutation_burst');
});
