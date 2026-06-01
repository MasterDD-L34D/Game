'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  computeMutationBurstPerkMods,
} = require('../../apps/backend/services/progression/progressionApply');
const {
  createAbilityExecutor,
  _setAbilityForTest,
  _resetAbilityIndex,
} = require('../../apps/backend/services/abilityExecutor');

// TKT-JOB-PHASEC slice 4b (Cat F residue) — mutation_burst combat semantics.
// Base: MoS>=5 → 1 random status from {rage,panic,stunned,bleeding,fracture}.
// Perk mutation_status_extend (+turns), perfect_mutation_burst (all 5 statuses +
// flat bonus damage). computeMutationBurstPerkMods(actor) reads _perk_passives.

// --- computeMutationBurstPerkMods (unit) ---

test('computeMutationBurstPerkMods: no perks → all zero', () => {
  const mods = computeMutationBurstPerkMods({ id: 'ab', _perk_passives: [] });
  assert.strictEqual(mods.extraTurns, 0);
  assert.strictEqual(mods.forceAllStatuses, false);
  assert.strictEqual(mods.bonusDamage, 0);
});

test('computeMutationBurstPerkMods: mutation_status_extend → extraTurns', () => {
  const mods = computeMutationBurstPerkMods({
    id: 'ab',
    _perk_passives: [
      { tag: 'mutation_status_extend', payload: { turns: 1 }, source_perk_id: 'ab_r2' },
    ],
  });
  assert.strictEqual(mods.extraTurns, 1);
  assert.strictEqual(mods.forceAllStatuses, false);
  assert.strictEqual(mods.bonusDamage, 0);
});

test('computeMutationBurstPerkMods: perfect_mutation_burst → force all statuses + bonus damage', () => {
  const mods = computeMutationBurstPerkMods({
    id: 'ab',
    _perk_passives: [
      {
        tag: 'perfect_mutation_burst',
        payload: { fixed_dmg: 6, all_statuses: true, turns: 1 },
        source_perk_id: 'ab_r6',
      },
    ],
  });
  assert.strictEqual(mods.forceAllStatuses, true);
  assert.strictEqual(mods.bonusDamage, 6);
});

test('computeMutationBurstPerkMods: extend + perfect stack', () => {
  const mods = computeMutationBurstPerkMods({
    id: 'ab',
    _perk_passives: [
      { tag: 'mutation_status_extend', payload: { turns: 1 }, source_perk_id: 'ab_r2' },
      {
        tag: 'perfect_mutation_burst',
        payload: { fixed_dmg: 6, all_statuses: true, turns: 1 },
        source_perk_id: 'ab_r6',
      },
    ],
  });
  assert.strictEqual(mods.extraTurns, 1);
  assert.strictEqual(mods.forceAllStatuses, true);
  assert.strictEqual(mods.bonusDamage, 6);
});

// --- executeDrainAttack integration (via createAbilityExecutor + real catalog) ---

const MUTATION_STATUSES = ['rage', 'panic', 'stunned', 'bleeding', 'fracture'];

function makeExecutor({ mos, hit = true, rng = () => 0, dmg = 5 }) {
  return createAbilityExecutor({
    performAttack: (s, a, t) => {
      if (hit) t.hp = Math.max(0, t.hp - dmg);
      return { damageDealt: hit ? dmg : 0, result: { hit, die: 18, roll: 22, mos } };
    },
    buildAttackEvent: () => ({}),
    appendEvent: async () => {},
    manhattanDistance: (p, q) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y),
    rng,
  });
}

function makeUnits() {
  const actor = { id: 'ab', ap: 5, ap_remaining: 5, position: { x: 0, y: 0 }, _perk_passives: [] };
  const target = { id: 'foe', hp: 20, max_hp: 20, position: { x: 1, y: 0 }, status: {} };
  return { actor, target };
}

test('mutation_burst: MoS<5 applies no status', async () => {
  const ex = makeExecutor({ mos: 2 });
  const { actor, target } = makeUnits();
  const res = await ex.executeAbility({
    session: { units: [actor, target], turn: 1, damage_taken: {} },
    actor,
    body: { ability_id: 'mutation_burst', target_id: 'foe' },
  });
  assert.strictEqual(res.status, 200, `expected 200: ${JSON.stringify(res.body)}`);
  const applied = MUTATION_STATUSES.filter((s) => Number(target.status[s]) > 0);
  assert.deepStrictEqual(applied, [], 'no status below MoS 5');
});

test('mutation_burst: MoS>=5 applies exactly 1 random status for 1 turn', async () => {
  const ex = makeExecutor({ mos: 6, rng: () => 0 }); // rng 0 → index 0 → rage
  const { actor, target } = makeUnits();
  await ex.executeAbility({
    session: { units: [actor, target], turn: 1, damage_taken: {} },
    actor,
    body: { ability_id: 'mutation_burst', target_id: 'foe' },
  });
  const applied = MUTATION_STATUSES.filter((s) => Number(target.status[s]) > 0);
  assert.strictEqual(applied.length, 1, 'exactly one status');
  assert.strictEqual(target.status.rage, 1, 'rng=0 picks rage, 1 turn');
});

test('mutation_burst: mutation_status_extend adds +1 turn to the status', async () => {
  const ex = makeExecutor({ mos: 6, rng: () => 0 });
  const { actor, target } = makeUnits();
  actor._perk_passives = [
    { tag: 'mutation_status_extend', payload: { turns: 1 }, source_perk_id: 'ab_r2' },
  ];
  await ex.executeAbility({
    session: { units: [actor, target], turn: 1, damage_taken: {} },
    actor,
    body: { ability_id: 'mutation_burst', target_id: 'foe' },
  });
  assert.strictEqual(target.status.rage, 2, 'base 1 + extend 1 = 2 turns');
});

test('mutation_burst: perfect_mutation_burst applies all 5 statuses + flat bonus damage, ignoring MoS', async () => {
  const ex = makeExecutor({ mos: 0, dmg: 5 }); // mos 0 proves perfect ignores the MoS gate
  const { actor, target } = makeUnits(); // target.hp 20
  actor._perk_passives = [
    {
      tag: 'perfect_mutation_burst',
      payload: { fixed_dmg: 6, all_statuses: true, turns: 1 },
      source_perk_id: 'ab_r6',
    },
  ];
  const res = await ex.executeAbility({
    session: { units: [actor, target], turn: 1, damage_taken: {} },
    actor,
    body: { ability_id: 'mutation_burst', target_id: 'foe' },
  });
  const applied = MUTATION_STATUSES.filter((s) => Number(target.status[s]) === 1);
  assert.strictEqual(applied.length, 5, 'all 5 statuses applied for 1 turn');
  // performAttack stub deals 5 (20→15) then perfect drains a flat +6 (15→9).
  assert.strictEqual(target.hp, 9, 'flat +6 bonus damage drained post-attack');
  assert.strictEqual(res.body.mutation_bonus_damage, 6);
});

test('mutation_burst: a MISS applies no status', async () => {
  const ex = makeExecutor({ mos: 9, hit: false });
  const { actor, target } = makeUnits();
  await ex.executeAbility({
    session: { units: [actor, target], turn: 1, damage_taken: {} },
    actor,
    body: { ability_id: 'mutation_burst', target_id: 'foe' },
  });
  const applied = MUTATION_STATUSES.filter((s) => Number(target.status[s]) > 0);
  assert.deepStrictEqual(applied, [], 'no status on miss');
});

test('drain_attack other than mutation_burst applies no mutation status', async (t) => {
  _setAbilityForTest('essence_drain_probe', {
    ability_id: 'essence_drain_probe',
    effect_type: 'drain_attack',
    cost_ap: 1,
  });
  t.after(() => _resetAbilityIndex());
  const ex = makeExecutor({ mos: 9, rng: () => 0 });
  const { actor, target } = makeUnits();
  await ex.executeAbility({
    session: { units: [actor, target], turn: 1, damage_taken: {} },
    actor,
    body: { ability_id: 'essence_drain_probe', target_id: 'foe' },
  });
  const applied = MUTATION_STATUSES.filter((s) => Number(target.status[s]) > 0);
  assert.deepStrictEqual(applied, [], 'mutation status is mutation_burst-only');
});
