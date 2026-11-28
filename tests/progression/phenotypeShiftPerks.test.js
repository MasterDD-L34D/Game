'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  computePhenotypeShiftPerkMods,
} = require('../../apps/backend/services/progression/progressionApply');
const { createAbilityExecutor } = require('../../apps/backend/services/abilityExecutor');

// TKT-JOB-PHASEC slice A1b (Cat F 7/7, OQ-F verdict V1) — phenotype_shift becomes a
// 1d6 random table (Option A): 1=attack_mod+3, 2=defense+3, 3=mobility+2, 4=ap+1,
// 5=heal 4 (cap max_hp), 6=initiative+5. Base use-cap 1/round; phenotype_double_use
// (capstone) raises it to 2/round; double_phenotype_roll rolls twice, both apply.

// --- computePhenotypeShiftPerkMods (unit) ---

test('computePhenotypeShiftPerkMods: no perks → 1 roll, cap 1', () => {
  const m = computePhenotypeShiftPerkMods({ id: 'ab', _perk_passives: [] });
  assert.strictEqual(m.extraRolls, 0);
  assert.strictEqual(m.usesCap, 1);
});

test('computePhenotypeShiftPerkMods: double_phenotype_roll → +1 roll', () => {
  const m = computePhenotypeShiftPerkMods({
    id: 'ab',
    _perk_passives: [{ tag: 'double_phenotype_roll', payload: {}, source_perk_id: 'ab_r5' }],
  });
  assert.strictEqual(m.extraRolls, 1);
  assert.strictEqual(m.usesCap, 1);
});

test('computePhenotypeShiftPerkMods: phenotype_double_use → cap 2', () => {
  const m = computePhenotypeShiftPerkMods({
    id: 'ab',
    _perk_passives: [
      { tag: 'phenotype_double_use', payload: { cap_per_round: 2 }, source_perk_id: 'ab_cap' },
    ],
  });
  assert.strictEqual(m.usesCap, 2);
  assert.strictEqual(m.extraRolls, 0);
});

// --- executePhenotypeShift integration (real catalog spec via createAbilityExecutor) ---

function makeExecutor(rng) {
  return createAbilityExecutor({
    performAttack: () => ({ damageDealt: 0, result: {} }),
    buildAttackEvent: () => ({}),
    appendEvent: async () => {},
    manhattanDistance: (p, q) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y),
    rng,
  });
}

function makeActor(extra = {}) {
  return {
    id: 'ab',
    job: 'aberrant',
    ap: 3,
    ap_remaining: 3,
    hp: 10,
    max_hp: 14,
    position: { x: 0, y: 0 },
    status: {},
    _perk_passives: [],
    ...extra,
  };
}

test('phenotype_shift: roll 1 → attack_mod +3 buff for 2 turns', async () => {
  const ex = makeExecutor(() => 0); // floor(0*6)+1 = 1
  const actor = makeActor();
  const res = await ex.executeAbility({
    session: { units: [actor], turn: 1 },
    actor,
    body: { ability_id: 'phenotype_shift' },
  });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(actor.attack_mod_bonus, 3);
  assert.strictEqual(actor.status.attack_mod_buff, 2);
  assert.strictEqual(res.body.phenotype_rolls[0].roll, 1);
  assert.strictEqual(res.body.phenotype_rolls[0].stat, 'attack_mod');
});

test('phenotype_shift: roll 5 → heal 4 capped at max_hp', async () => {
  const ex = makeExecutor(() => 4 / 6); // floor(4)+1 = 5
  const actor = makeActor({ hp: 8, max_hp: 14 });
  await ex.executeAbility({
    session: { units: [actor], turn: 1 },
    actor,
    body: { ability_id: 'phenotype_shift' },
  });
  assert.strictEqual(actor.hp, 12, '8 + 4');
});

test('phenotype_shift: roll 5 heal does not exceed max_hp', async () => {
  const ex = makeExecutor(() => 4 / 6);
  const actor = makeActor({ hp: 13, max_hp: 14 });
  await ex.executeAbility({
    session: { units: [actor], turn: 1 },
    actor,
    body: { ability_id: 'phenotype_shift' },
  });
  assert.strictEqual(actor.hp, 14, 'capped at max_hp');
});

test('phenotype_shift: roll 4 → +1 ap offsets the 1 ap cost (net unchanged)', async () => {
  const ex = makeExecutor(() => 3 / 6); // floor(3)+1 = 4
  const actor = makeActor({ ap: 3, ap_remaining: 3 });
  await ex.executeAbility({
    session: { units: [actor], turn: 1 },
    actor,
    body: { ability_id: 'phenotype_shift' },
  });
  assert.strictEqual(actor.ap_remaining, 3, '+1 ap (capped at ap) then -1 cost = 3');
});

test('phenotype_shift: roll 6 → initiative +5 buff', async () => {
  const ex = makeExecutor(() => 5 / 6); // floor(5)+1 = 6
  const actor = makeActor();
  await ex.executeAbility({
    session: { units: [actor], turn: 1 },
    actor,
    body: { ability_id: 'phenotype_shift' },
  });
  assert.strictEqual(actor.initiative, 5, 'bumps base initiative (the consumed field)');
});

test('phenotype_shift: base cap 1/round — 2nd cast same round → 400', async () => {
  const ex = makeExecutor(() => 0);
  const actor = makeActor();
  const session = { units: [actor], turn: 1 };
  const r1 = await ex.executeAbility({ session, actor, body: { ability_id: 'phenotype_shift' } });
  assert.strictEqual(r1.status, 200);
  const r2 = await ex.executeAbility({ session, actor, body: { ability_id: 'phenotype_shift' } });
  assert.strictEqual(r2.status, 400, 'cap 1/round blocks the 2nd cast');
});

test('phenotype_shift: cap resets the next round', async () => {
  const ex = makeExecutor(() => 0);
  const actor = makeActor();
  await ex.executeAbility({
    session: { units: [actor], turn: 1 },
    actor,
    body: { ability_id: 'phenotype_shift' },
  });
  const r2 = await ex.executeAbility({
    session: { units: [actor], turn: 2 },
    actor,
    body: { ability_id: 'phenotype_shift' },
  });
  assert.strictEqual(r2.status, 200, 'new round resets the per-round use counter');
});

test('phenotype_double_use: cap 2/round allows the 2nd cast, blocks the 3rd', async () => {
  const ex = makeExecutor(() => 0);
  const actor = makeActor({
    ap: 5,
    ap_remaining: 5,
    _perk_passives: [
      { tag: 'phenotype_double_use', payload: { cap_per_round: 2 }, source_perk_id: 'ab_cap' },
    ],
  });
  const session = { units: [actor], turn: 1 };
  const r1 = await ex.executeAbility({ session, actor, body: { ability_id: 'phenotype_shift' } });
  const r2 = await ex.executeAbility({ session, actor, body: { ability_id: 'phenotype_shift' } });
  const r3 = await ex.executeAbility({ session, actor, body: { ability_id: 'phenotype_shift' } });
  assert.strictEqual(r1.status, 200);
  assert.strictEqual(r2.status, 200, 'phenotype_double_use raises cap to 2');
  assert.strictEqual(r3.status, 400, '3rd still blocked');
});

test('double_phenotype_roll: rolls twice, both outcomes apply', async () => {
  let i = 0;
  const seq = [0, 1 / 6]; // roll 1 (attack_mod) then roll 2 (defense)
  const ex = makeExecutor(() => seq[i++]);
  const actor = makeActor({
    _perk_passives: [{ tag: 'double_phenotype_roll', payload: {}, source_perk_id: 'ab_r5' }],
  });
  const res = await ex.executeAbility({
    session: { units: [actor], turn: 1 },
    actor,
    body: { ability_id: 'phenotype_shift' },
  });
  assert.strictEqual(res.body.phenotype_rolls.length, 2, 'two rolls applied');
  assert.strictEqual(actor.attack_mod_bonus, 3, 'roll 1 applied');
  assert.strictEqual(actor.defense_mod_bonus, 3, 'roll 2 applied');
});
