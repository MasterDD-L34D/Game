'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  createAbilityExecutor,
  _setAbilityForTest,
  _resetAbilityIndex,
} = require('../../apps/backend/services/abilityExecutor');

// H2 PP cost-gate (26-ECONOMY §PP: "Ultimate = 3 PP consume all"). Every cost_pp
// in the catalog (4..12) exceeds POOL_MAX(3) -> pure consume-all: require the FULL
// pool, drain to 0 on a 2xx dispatch; spend before dispatch + rollback on non-2xx.

function mkExecutor() {
  return createAbilityExecutor({
    performAttack: () => ({ damageDealt: 0, result: { hit: false } }),
    buildAttackEvent: () => ({}),
    appendEvent: async () => {},
    manhattanDistance: (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
  });
}

function mkActor(pp) {
  return {
    id: 'du',
    job: 'duelist',
    ap_remaining: 5,
    pp,
    position: { x: 0, y: 0 },
    attack_range: 5,
  };
}

function call(ex, actor, body, extra = []) {
  return ex.executeAbility({
    session: { units: [actor, ...extra], turn: 1, damage_taken: {} },
    actor,
    body,
  });
}

test.before(() => {
  _setAbilityForTest('test_pp_ult', {
    ability_id: 'test_pp_ult',
    effect_type: 'buff',
    cost_ap: 0,
    cost_pp: 6,
    buff_stat: 'defense_mod',
    buff_amount: 1,
    duration: 1,
  });
  _setAbilityForTest('test_pp_none', {
    ability_id: 'test_pp_none',
    effect_type: 'buff',
    cost_ap: 0,
    buff_stat: 'defense_mod',
    buff_amount: 1,
    duration: 1,
  });
  _setAbilityForTest('test_pp_attack', {
    ability_id: 'test_pp_attack',
    effect_type: 'execution_attack',
    cost_ap: 0,
    cost_pp: 6,
    damage_dice: '1d6',
  });
});

test.after(() => {
  _resetAbilityIndex();
});

test('PP consume-all: cost_pp=6 with pp=2 -> 400 (needs full pool 3)', async () => {
  const actor = mkActor(2);
  const res = await call(mkExecutor(), actor, { ability_id: 'test_pp_ult' });
  assert.strictEqual(res.status, 400, JSON.stringify(res.body));
  assert.strictEqual(res.body.pool, 'pp');
  assert.strictEqual(res.body.consume_all, true);
  assert.strictEqual(actor.pp, 2, 'pp unchanged on block');
});

test('PP consume-all: cost_pp=6 with pp=3 (full) -> 200, pp drained to 0', async () => {
  const actor = mkActor(3);
  const res = await call(mkExecutor(), actor, { ability_id: 'test_pp_ult' });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(actor.pp, 0, 'consume-all drains the pool');
});

test('no cost_pp: ability unaffected (pp untouched)', async () => {
  const actor = mkActor(2);
  const res = await call(mkExecutor(), actor, { ability_id: 'test_pp_none' });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(actor.pp, 2);
});

test('PP NOT charged on a failed dispatch (non-2xx rollback)', async () => {
  const actor = mkActor(3);
  const res = await call(mkExecutor(), actor, {
    ability_id: 'test_pp_attack',
    target_id: 'does_not_exist',
  });
  assert.ok(res.status >= 400, `expected a failure status, got ${res.status}`);
  assert.strictEqual(actor.pp, 3, 'pp rolled back on a failed dispatch');
});

test('cost_pp team_buff does NOT refill the caster via its own pp_grant (Codex #2555 P2)', async () => {
  _setAbilityForTest('test_pp_teambuff', {
    ability_id: 'test_pp_teambuff',
    effect_type: 'team_buff',
    cost_ap: 0,
    cost_pp: 6,
    pp_grant: 2,
    range: 3,
  });
  const caster = mkActor(3); // full pool
  const ally = {
    id: 'ally',
    controlled_by: caster.controlled_by,
    hp: 10,
    pp: 0,
    position: { x: 1, y: 0 },
  };
  const res = await call(mkExecutor(), caster, { ability_id: 'test_pp_teambuff' }, [ally]);
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(caster.pp, 0, 'caster consume-all-spent the pool and did NOT self-refill');
  assert.strictEqual(ally.pp, 2, 'the other ally received pp_grant');
});
