'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  computeMinionPerkMods,
} = require('../../apps/backend/services/progression/progressionApply');
const { createAbilityExecutor } = require('../../apps/backend/services/abilityExecutor');

// TKT-JOB-PHASEC slice B5 minion summon-buffs (OQ-MINION V4) — the 4 minion tags
// that apply AT SUMMON from the beastmaster owner's perks, no AI/pack_command
// runtime required: max_minions (raise the cap), minion_attack_buff (+atk base),
// alpha_pack_buff (capstone +atk/+def base), encounter_start_buff_minions
// (temporary +atk on the freshly-summoned minion). Read by executeSummonCompanion
// via computeMinionPerkMods(owner).

// --- computeMinionPerkMods (unit) ---

test('computeMinionPerkMods: no perks → cap 2, no buffs', () => {
  const m = computeMinionPerkMods({ id: 'bm', _perk_passives: [] });
  assert.strictEqual(m.cap, 2);
  assert.strictEqual(m.attackMod, 0);
  assert.strictEqual(m.defenseMod, 0);
  assert.strictEqual(m.startBuff, null);
});

test('computeMinionPerkMods: max_minions raises the cap', () => {
  const m = computeMinionPerkMods({
    _perk_passives: [{ tag: 'max_minions', payload: { cap: 3 }, source_perk_id: 'bm_r4' }],
  });
  assert.strictEqual(m.cap, 3);
});

test('computeMinionPerkMods: minion_attack_buff → +attackMod', () => {
  const m = computeMinionPerkMods({
    _perk_passives: [
      { tag: 'minion_attack_buff', payload: { attack_mod: 1 }, source_perk_id: 'bm_r2' },
    ],
  });
  assert.strictEqual(m.attackMod, 1);
});

test('computeMinionPerkMods: alpha_pack_buff → +atk +def', () => {
  const m = computeMinionPerkMods({
    _perk_passives: [
      {
        tag: 'alpha_pack_buff',
        payload: { attack_mod: 1, defense_mod: 1 },
        source_perk_id: 'bm_r6',
      },
    ],
  });
  assert.strictEqual(m.attackMod, 1);
  assert.strictEqual(m.defenseMod, 1);
});

test('computeMinionPerkMods: minion_attack_buff + alpha_pack_buff stack', () => {
  const m = computeMinionPerkMods({
    _perk_passives: [
      { tag: 'minion_attack_buff', payload: { attack_mod: 1 }, source_perk_id: 'bm_r2' },
      {
        tag: 'alpha_pack_buff',
        payload: { attack_mod: 1, defense_mod: 1 },
        source_perk_id: 'bm_r6',
      },
    ],
  });
  assert.strictEqual(m.attackMod, 2);
  assert.strictEqual(m.defenseMod, 1);
});

test('computeMinionPerkMods: encounter_start_buff_minions → startBuff', () => {
  const m = computeMinionPerkMods({
    _perk_passives: [
      {
        tag: 'encounter_start_buff_minions',
        payload: { attack_mod: 1, duration: 2 },
        source_perk_id: 'bm_r3',
      },
    ],
  });
  assert.deepStrictEqual(m.startBuff, { attack_mod: 1, duration: 2 });
});

// --- summon integration (executeSummonCompanion applies the mods) ---

function makeExecutor() {
  return createAbilityExecutor({
    performAttack: () => ({ damageDealt: 0, result: {} }),
    buildAttackEvent: () => ({}),
    appendEvent: async () => {},
    manhattanDistance: (p, q) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y),
    rng: () => 0,
  });
}

function bm(perks) {
  return {
    id: 'bm',
    job: 'beastmaster',
    controlled_by: 'player',
    ap: 9,
    ap_remaining: 9,
    position: { x: 5, y: 5 },
    _perk_passives: perks || [],
  };
}

test('summon: minion_attack_buff makes the minion atk 2 (base 1 + perk 1)', async () => {
  const ex = makeExecutor();
  const caster = bm([
    { tag: 'minion_attack_buff', payload: { attack_mod: 1 }, source_perk_id: 'bm_r2' },
  ]);
  const session = { units: [caster], turn: 1, grid: { width: 10, height: 10 } };
  await ex.executeAbility({ session, actor: caster, body: { ability_id: 'summon_companion' } });
  const minion = session.units.find((u) => u.is_minion);
  assert.strictEqual(minion.attack_mod, 2);
});

test('summon: alpha_pack_buff gives the minion +atk +def', async () => {
  const ex = makeExecutor();
  const caster = bm([
    { tag: 'alpha_pack_buff', payload: { attack_mod: 1, defense_mod: 1 }, source_perk_id: 'bm_r6' },
  ]);
  const session = { units: [caster], turn: 1, grid: { width: 10, height: 10 } };
  await ex.executeAbility({ session, actor: caster, body: { ability_id: 'summon_companion' } });
  const minion = session.units.find((u) => u.is_minion);
  assert.strictEqual(minion.attack_mod, 2, 'base 1 + alpha 1');
  assert.strictEqual(minion.defense_mod, 1);
});

test('summon: encounter_start_buff_minions arms a temporary atk buff on the minion', async () => {
  const ex = makeExecutor();
  const caster = bm([
    {
      tag: 'encounter_start_buff_minions',
      payload: { attack_mod: 1, duration: 2 },
      source_perk_id: 'bm_r3',
    },
  ]);
  const session = { units: [caster], turn: 1, grid: { width: 10, height: 10 } };
  await ex.executeAbility({ session, actor: caster, body: { ability_id: 'summon_companion' } });
  const minion = session.units.find((u) => u.is_minion);
  assert.strictEqual(minion.attack_mod_bonus, 1);
  assert.strictEqual(minion.status.attack_mod_buff, 2);
});

test('summon: max_minions raises the cap to 3 (3rd summon succeeds)', async () => {
  const ex = makeExecutor();
  const caster = bm([{ tag: 'max_minions', payload: { cap: 3 }, source_perk_id: 'bm_r4' }]);
  const session = { units: [caster], turn: 1, grid: { width: 10, height: 10 } };
  const r1 = await ex.executeAbility({
    session,
    actor: caster,
    body: { ability_id: 'summon_companion' },
  });
  const r2 = await ex.executeAbility({
    session,
    actor: caster,
    body: { ability_id: 'summon_companion' },
  });
  const r3 = await ex.executeAbility({
    session,
    actor: caster,
    body: { ability_id: 'summon_companion' },
  });
  assert.strictEqual(r1.status, 200);
  assert.strictEqual(r2.status, 200);
  assert.strictEqual(r3.status, 200, 'cap raised to 3');
  assert.strictEqual(session.units.filter((u) => u.is_minion).length, 3);
});
