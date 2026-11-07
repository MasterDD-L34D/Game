'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  grantXpToSurvivors,
  resetDefaults,
} = require('../../apps/backend/services/progression/progressionApply');
const { ProgressionEngine } = require('../../apps/backend/services/progression/progressionEngine');
const {
  createProgressionStore,
} = require('../../apps/backend/services/progression/progressionStore');
const { createAbilityExecutor } = require('../../apps/backend/services/abilityExecutor');

// TKT-JOB-PHASEC slice V6 A3 (OQ campaign-XP) — the 2 PE perks are CAMPAIGN XP
// (PE = experience per 26-ECONOMY, post-#2528), granted via grantXpToSurvivors'
// new perUnitBonus. first_kill_pe_bonus: +pe to the survivor who scored the
// encounter's first kill (opts.firstKillActorId, surfaced by the debrief).
// minion_kill_pe_bonus: +the BM's accumulated minion-kill PE (unit._minion_kill_pe,
// tracked + capped per round in combat).

function freshCtx() {
  resetDefaults();
  return { engine: new ProgressionEngine(), store: createProgressionStore() };
}

test('grantXpToSurvivors: first_kill_pe_bonus grants +pe to the first-kill actor', () => {
  const { engine, store } = freshCtx();
  const units = [
    {
      id: 'u1',
      job: 'stalker',
      controlled_by: 'player',
      hp: 10,
      _perk_passives: [{ tag: 'first_kill_pe_bonus', payload: { pe: 1 }, source_perk_id: 's' }],
    },
  ];
  const grants = grantXpToSurvivors(units, 10, { engine, store, firstKillActorId: 'u1' });
  assert.equal(grants[0].bonus, 1, '+1 first-kill pe');
  assert.equal(grants[0].amount, 11, 'base 10 + 1');
});

test('grantXpToSurvivors: first_kill_pe_bonus gives nothing if the unit was NOT the first-killer', () => {
  const { engine, store } = freshCtx();
  const units = [
    {
      id: 'u1',
      job: 'stalker',
      controlled_by: 'player',
      hp: 10,
      _perk_passives: [{ tag: 'first_kill_pe_bonus', payload: { pe: 1 }, source_perk_id: 's' }],
    },
  ];
  const grants = grantXpToSurvivors(units, 10, { engine, store, firstKillActorId: 'someone_else' });
  assert.equal(grants[0].bonus, 0);
  assert.equal(grants[0].amount, 10);
});

test('grantXpToSurvivors: minion_kill_pe_bonus grants the accumulated minion-kill pe', () => {
  const { engine, store } = freshCtx();
  const units = [
    {
      id: 'bm',
      job: 'beastmaster',
      controlled_by: 'player',
      hp: 10,
      _perk_passives: [
        { tag: 'minion_kill_pe_bonus', payload: { pe: 1 }, source_perk_id: 'bm_r5' },
      ],
      _minion_kill_pe: 2, // two capped minion kills earned during combat
    },
  ];
  const grants = grantXpToSurvivors(units, 10, { engine, store });
  assert.equal(grants[0].bonus, 2, 'accumulated minion-kill pe');
  assert.equal(grants[0].amount, 12);
});

test('grantXpToSurvivors: no perks → no bonus (base only)', () => {
  const { engine, store } = freshCtx();
  const units = [{ id: 'u1', job: 'warden', controlled_by: 'player', hp: 10 }];
  const grants = grantXpToSurvivors(units, 10, { engine, store, firstKillActorId: 'u1' });
  assert.equal(grants[0].bonus, 0);
  assert.equal(grants[0].amount, 10);
});

// --- minion_kill_pe_bonus: combat accumulator (executePackCommand kill, cap 1/round) ---

function killExecutor() {
  return createAbilityExecutor({
    performAttack: (s, attacker, target) => {
      target.hp = 0; // lethal
      return { damageDealt: 5, result: { hit: true, mos: 9 } };
    },
    buildAttackEvent: () => ({}),
    appendEvent: async () => {},
    manhattanDistance: (p, q) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y),
    rng: () => 0,
  });
}
function bmPackScene(turn) {
  const bm = {
    id: 'bm',
    job: 'beastmaster',
    controlled_by: 'player',
    ap: 6,
    ap_remaining: 6,
    position: { x: 0, y: 0 },
    _perk_passives: [{ tag: 'minion_kill_pe_bonus', payload: { pe: 1 }, source_perk_id: 'bm_r5' }],
  };
  const minion = {
    id: 'm1',
    controlled_by: 'player',
    owner_id: 'bm',
    is_minion: true,
    hp: 5,
    max_hp: 5,
    mod: 1,
    dc: 10,
    mobility: 3,
    position: { x: 1, y: 0 },
    status: {},
  };
  const foe = {
    id: 'foe',
    controlled_by: 'sistema',
    hp: 3,
    max_hp: 10,
    dc: 10,
    position: { x: 2, y: 0 },
    status: {},
  };
  return {
    bm,
    session: { units: [bm, minion, foe], turn, grid: { width: 10, height: 10 }, damage_taken: {} },
  };
}

test('minion_kill_pe_bonus: a minion kill accrues +pe on the BM, capped 1/round', async () => {
  const ex = killExecutor();
  const { bm, session } = bmPackScene(1);
  await ex.executeAbility({
    session,
    actor: bm,
    body: {
      ability_id: 'pack_command',
      minion_id: 'm1',
      order: { type: 'attack', target_id: 'foe' },
    },
  });
  assert.strictEqual(bm._minion_kill_pe, 1, '+1 pe from the minion kill');
  // a 2nd minion kill the SAME round does not stack (cap 1/round)
  session.units.push({
    id: 'foe2',
    controlled_by: 'sistema',
    hp: 3,
    max_hp: 10,
    dc: 10,
    position: { x: 2, y: 1 },
    status: {},
  });
  // move the minion adjacent to foe2 then command an attack (same turn)
  const minion = session.units.find((u) => u.is_minion);
  minion.position = { x: 1, y: 1 };
  await ex.executeAbility({
    session,
    actor: bm,
    body: {
      ability_id: 'pack_command',
      minion_id: 'm1',
      order: { type: 'attack', target_id: 'foe2' },
    },
  });
  assert.strictEqual(bm._minion_kill_pe, 1, 'still 1 — capped this round');
});
