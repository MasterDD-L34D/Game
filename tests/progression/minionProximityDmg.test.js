'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createAbilityExecutor } = require('../../apps/backend/services/abilityExecutor');

// TKT-JOB-PHASEC slice B5 minion_proximity_dmg (bm_r2_pack_focus, OQ-MINION V4).
//
// L-069 geometry: the data spec is "minion adjacent to the BM AND target adjacent
// to the BM", which is UNSATISFIABLE for a melee minion under Manhattan adjacency
// (the two BM-neighbour cells are dist 2 apart, and a default-range commanded
// minion must itself be adjacent to the BM). We adopt the minimal faithful reading
// of the INTENT ("a bodyguard minion punishes threats pressing the BM"): +N damage
// when the struck TARGET is adjacent to the BM (the minion-adjacent-to-BM clause is
// dropped — the minion is the BM's commanded pack member by construction).
// ⚠️ Claude autonomous interpretation pending a master-dd geometry ruling.

function makeExecutor({ dmg = 4 } = {}) {
  return createAbilityExecutor({
    performAttack: (s, attacker, target) => {
      target.hp = Math.max(0, target.hp - dmg);
      return { damageDealt: dmg, result: { hit: true, die: 18, roll: 22, mos: 6 } };
    },
    buildAttackEvent: () => ({}),
    appendEvent: async () => {},
    manhattanDistance: (p, q) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y),
    rng: () => 0,
  });
}

function setup({ bmPerks = [], minionPos, foePos }) {
  const bm = {
    id: 'bm',
    job: 'beastmaster',
    controlled_by: 'player',
    ap: 6,
    ap_remaining: 6,
    position: { x: 0, y: 0 },
    _perk_passives: bmPerks,
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
    position: minionPos,
    status: {},
  };
  const foe = {
    id: 'foe',
    controlled_by: 'sistema',
    hp: 20,
    max_hp: 20,
    dc: 10,
    position: foePos,
    status: {},
  };
  return {
    bm,
    minion,
    foe,
    session: {
      units: [bm, minion, foe],
      turn: 1,
      grid: { width: 10, height: 10 },
      damage_taken: {},
    },
  };
}

const PROX = { tag: 'minion_proximity_dmg', payload: { damage: 1 }, source_perk_id: 'bm_r2' };
const EXT = { tag: 'pack_command_extended_range', payload: { range: 5 }, source_perk_id: 'bm_r5' };

test('minion_proximity_dmg: +1 when the struck target is adjacent to the BM', async () => {
  const ex = makeExecutor({ dmg: 4 });
  // BM(0,0); minion(1,1) [dist 2 from BM → needs extended range to command];
  // foe(1,0) [adjacent to BM dist 1, adjacent to minion dist 1].
  const { bm, foe, session } = setup({
    bmPerks: [EXT, PROX],
    minionPos: { x: 1, y: 1 },
    foePos: { x: 1, y: 0 },
  });
  const res = await ex.executeAbility({
    session,
    actor: bm,
    body: {
      ability_id: 'pack_command',
      minion_id: 'm1',
      order: { type: 'attack', target_id: 'foe' },
    },
  });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(res.body.proximity_bonus, 1, 'target adjacent to BM → +1');
  assert.strictEqual(foe.hp, 15, 'base 4 + proximity 1');
  assert.strictEqual(res.body.damage_dealt, 5);
});

test('minion_proximity_dmg: no bonus when the target is NOT adjacent to the BM', async () => {
  const ex = makeExecutor({ dmg: 4 });
  // minion(1,0) [adj BM, default-commandable]; foe(2,0) [adj minion dist1, adj BM dist2].
  const { bm, foe, session } = setup({
    bmPerks: [PROX],
    minionPos: { x: 1, y: 0 },
    foePos: { x: 2, y: 0 },
  });
  const res = await ex.executeAbility({
    session,
    actor: bm,
    body: {
      ability_id: 'pack_command',
      minion_id: 'm1',
      order: { type: 'attack', target_id: 'foe' },
    },
  });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(res.body.proximity_bonus, 0);
  assert.strictEqual(foe.hp, 16, 'base 4 only');
});

test('minion_proximity_dmg: no bonus without the perk', async () => {
  const ex = makeExecutor({ dmg: 4 });
  const { bm, foe, session } = setup({
    bmPerks: [EXT],
    minionPos: { x: 1, y: 1 },
    foePos: { x: 1, y: 0 },
  });
  const res = await ex.executeAbility({
    session,
    actor: bm,
    body: {
      ability_id: 'pack_command',
      minion_id: 'm1',
      order: { type: 'attack', target_id: 'foe' },
    },
  });
  assert.strictEqual(res.body.proximity_bonus, 0);
  assert.strictEqual(foe.hp, 16);
});
