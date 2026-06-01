'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createAbilityExecutor } = require('../../apps/backend/services/abilityExecutor');

// TKT-JOB-PHASEC slice B5 pack_command runtime (OQ-MINION V4) — the beastmaster
// spends its own AP to issue ONE order (move | attack) to one of its minions, in
// the BM's turn (no separate minion turn → no round-flow change). Minion attacks
// via the executor's performAttack dep (the minion is the attacker). Wires
// pack_command_extended_range (command from Manhattan 5 instead of 1).
//
// NOTE: minion_proximity_dmg is intentionally NOT wired here — its data spec
// ("minion adjacent to the BM AND target adjacent to the BM") is geometrically
// unsatisfiable with a melee minion under Manhattan adjacency (two BM-neighbours
// are always dist 2 apart, so the minion cannot reach the target). Held for a
// master-dd interpretation (L-069). See the PR body.

function makeExecutor({ dmg = 4, hit = true } = {}) {
  return createAbilityExecutor({
    performAttack: (s, attacker, target) => {
      if (hit) target.hp = Math.max(0, target.hp - dmg);
      return { damageDealt: hit ? dmg : 0, result: { hit, die: 18, roll: 22, mos: 6 } };
    },
    buildAttackEvent: () => ({}),
    appendEvent: async () => {},
    manhattanDistance: (p, q) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y),
    rng: () => 0,
  });
}

function setup({ bmPerks = [], minionPos = { x: 1, y: 0 }, foePos = { x: 2, y: 0 } } = {}) {
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

test('pack_command move: minion relocates within mobility to a free tile', async () => {
  const ex = makeExecutor();
  const { bm, minion, session } = setup();
  const apBefore = bm.ap_remaining;
  const res = await ex.executeAbility({
    session,
    actor: bm,
    body: {
      ability_id: 'pack_command',
      minion_id: 'm1',
      order: { type: 'move', position: { x: 1, y: 2 } },
    },
  });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.deepStrictEqual(minion.position, { x: 1, y: 2 });
  assert.strictEqual(bm.ap_remaining, apBefore - 1, 'BM spent 1 ap');
});

test('pack_command move: rejects a destination beyond the minion mobility', async () => {
  const ex = makeExecutor();
  const { bm, session } = setup();
  const res = await ex.executeAbility({
    session,
    actor: bm,
    body: {
      ability_id: 'pack_command',
      minion_id: 'm1',
      order: { type: 'move', position: { x: 9, y: 9 } },
    },
  });
  assert.strictEqual(res.status, 400, 'beyond mobility');
});

test('pack_command move: rejects an occupied destination', async () => {
  const ex = makeExecutor();
  const { bm, foe, session } = setup({ foePos: { x: 1, y: 1 } });
  const res = await ex.executeAbility({
    session,
    actor: bm,
    body: {
      ability_id: 'pack_command',
      minion_id: 'm1',
      order: { type: 'move', position: { x: 1, y: 1 } }, // foe is here
    },
  });
  assert.strictEqual(res.status, 400, 'cell occupied');
});

test('pack_command attack: minion strikes an adjacent enemy', async () => {
  const ex = makeExecutor({ dmg: 4 });
  const { bm, foe, session } = setup({ minionPos: { x: 1, y: 0 }, foePos: { x: 2, y: 0 } });
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
  assert.strictEqual(foe.hp, 16, 'minion dealt 4');
  assert.strictEqual(res.body.hit, true);
});

test('pack_command attack: rejects a non-adjacent target (melee minion)', async () => {
  const ex = makeExecutor();
  const { bm, session } = setup({ minionPos: { x: 1, y: 0 }, foePos: { x: 5, y: 5 } });
  const res = await ex.executeAbility({
    session,
    actor: bm,
    body: {
      ability_id: 'pack_command',
      minion_id: 'm1',
      order: { type: 'attack', target_id: 'foe' },
    },
  });
  assert.strictEqual(res.status, 400, 'target out of melee range');
});

test('pack_command attack: rejects a friendly target', async () => {
  const ex = makeExecutor();
  const { bm, session } = setup();
  // command the minion to attack the BM (same faction) — refused
  const res = await ex.executeAbility({
    session,
    actor: bm,
    body: {
      ability_id: 'pack_command',
      minion_id: 'm1',
      order: { type: 'attack', target_id: 'bm' },
    },
  });
  assert.strictEqual(res.status, 400, 'no friendly fire');
});

test('pack_command: out-of-range minion is not commandable without the range perk', async () => {
  const ex = makeExecutor();
  const { bm, session } = setup({ minionPos: { x: 4, y: 0 } }); // dist 4 from BM
  const res = await ex.executeAbility({
    session,
    actor: bm,
    body: {
      ability_id: 'pack_command',
      minion_id: 'm1',
      order: { type: 'move', position: { x: 4, y: 1 } },
    },
  });
  assert.strictEqual(res.status, 400, 'minion too far to command (default range 1)');
});

test('pack_command_extended_range: lets the BM command a minion at Manhattan 5', async () => {
  const ex = makeExecutor();
  const { bm, minion, session } = setup({
    bmPerks: [
      { tag: 'pack_command_extended_range', payload: { range: 5 }, source_perk_id: 'bm_r5' },
    ],
    minionPos: { x: 4, y: 0 },
  });
  const res = await ex.executeAbility({
    session,
    actor: bm,
    body: {
      ability_id: 'pack_command',
      minion_id: 'm1',
      order: { type: 'move', position: { x: 4, y: 1 } },
    },
  });
  assert.strictEqual(res.status, 200, 'extended range allows the command');
  assert.deepStrictEqual(minion.position, { x: 4, y: 1 });
});

test('pack_command: rejects a unit that is not your minion', async () => {
  const ex = makeExecutor();
  const { bm, session } = setup();
  const res = await ex.executeAbility({
    session,
    actor: bm,
    body: {
      ability_id: 'pack_command',
      minion_id: 'foe',
      order: { type: 'move', position: { x: 2, y: 1 } },
    },
  });
  assert.strictEqual(res.status, 400, 'cannot command an enemy');
});
