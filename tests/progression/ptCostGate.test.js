'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  createAbilityExecutor,
  _setAbilityForTest,
  _resetAbilityIndex,
} = require('../../apps/backend/services/abilityExecutor');

// H2 PT cost-gate (26-ECONOMY §PT: pool 0..12, per-round). Every cost_pt in the
// catalog (3..10) is <= POOL_MAX(12) -> NUMERIC gate: require >= cost_pt, deduct
// EXACTLY cost_pt on a 2xx dispatch (NOT consume-all, unlike PP/SG ultimates).
// Spend before dispatch + rollback on non-2xx. A dormant consume-all branch
// guards cost_pt > 12 (no such ability exists; PT is canonically numeric).

function mkExecutor() {
  return createAbilityExecutor({
    performAttack: () => ({ damageDealt: 0, result: { hit: false } }),
    buildAttackEvent: () => ({}),
    appendEvent: async () => {},
    manhattanDistance: (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
  });
}

function mkActor(pt) {
  return {
    id: 'gd',
    job: 'guardian',
    ap_remaining: 5,
    pt,
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
  _setAbilityForTest('test_pt_buff', {
    ability_id: 'test_pt_buff',
    effect_type: 'buff',
    cost_ap: 0,
    cost_pt: 5,
    buff_stat: 'defense_mod',
    buff_amount: 1,
    duration: 1,
  });
  _setAbilityForTest('test_pt_none', {
    ability_id: 'test_pt_none',
    effect_type: 'buff',
    cost_ap: 0,
    buff_stat: 'defense_mod',
    buff_amount: 1,
    duration: 1,
  });
  _setAbilityForTest('test_pt_attack', {
    ability_id: 'test_pt_attack',
    effect_type: 'execution_attack',
    cost_ap: 0,
    cost_pt: 5,
    damage_dice: '1d6',
  });
  _setAbilityForTest('test_pt_ult', {
    ability_id: 'test_pt_ult',
    effect_type: 'buff',
    cost_ap: 0,
    cost_pt: 99, // > POOL_MAX -> dormant consume-all branch
    buff_stat: 'defense_mod',
    buff_amount: 1,
    duration: 1,
  });
});

test.after(() => {
  _resetAbilityIndex();
});

test('PT numeric: cost_pt=5 with pt=3 -> 400 (insufficient), pt unchanged', async () => {
  const actor = mkActor(3);
  const res = await call(mkExecutor(), actor, { ability_id: 'test_pt_buff' });
  assert.strictEqual(res.status, 400, JSON.stringify(res.body));
  assert.strictEqual(res.body.pool, 'pt');
  assert.strictEqual(actor.pt, 3, 'pt unchanged on block');
});

test('PT numeric: cost_pt=5 with pt=5 -> 200, pt deducted to 0', async () => {
  const actor = mkActor(5);
  const res = await call(mkExecutor(), actor, { ability_id: 'test_pt_buff' });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(actor.pt, 0, 'exact cost deducted');
});

test('PT numeric: cost_pt=5 with pt=8 -> 200, deducts EXACT cost (pt=3, not consume-all)', async () => {
  const actor = mkActor(8);
  const res = await call(mkExecutor(), actor, { ability_id: 'test_pt_buff' });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(actor.pt, 3, 'numeric deduct leaves the remainder (NOT drained)');
});

test('no cost_pt: ability unaffected (pt untouched)', async () => {
  const actor = mkActor(4);
  const res = await call(mkExecutor(), actor, { ability_id: 'test_pt_none' });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(actor.pt, 4);
});

test('PT NOT charged on a failed dispatch (non-2xx rollback)', async () => {
  const actor = mkActor(5);
  const res = await call(mkExecutor(), actor, {
    ability_id: 'test_pt_attack',
    target_id: 'does_not_exist',
  });
  assert.ok(res.status >= 400, `expected a failure status, got ${res.status}`);
  assert.strictEqual(actor.pt, 5, 'pt rolled back on a failed dispatch');
});

test('PT dormant consume-all: cost_pt=99 needs the FULL pool (12) -> drained; pt<12 -> 400', async () => {
  const full = mkActor(12);
  const okRes = await call(mkExecutor(), full, { ability_id: 'test_pt_ult' });
  assert.strictEqual(okRes.status, 200, JSON.stringify(okRes.body));
  assert.strictEqual(full.pt, 0, 'consume-all drains the full pool');

  const partial = mkActor(11);
  const blockRes = await call(mkExecutor(), partial, { ability_id: 'test_pt_ult' });
  assert.strictEqual(blockRes.status, 400);
  assert.strictEqual(blockRes.body.consume_all, true);
  assert.strictEqual(partial.pt, 11, 'unchanged on block');
});
