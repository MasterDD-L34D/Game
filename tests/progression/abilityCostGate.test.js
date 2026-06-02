'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  createAbilityExecutor,
  _setAbilityForTest,
  _resetAbilityIndex,
} = require('../../apps/backend/services/abilityExecutor');

// H2 economy combat cost-gate (master-dd verdict 2026-06-02 = option C hybrid).
// SG is the only MODELED combat pool (sgTracker POOL_MAX=3, seeded by normaliseUnit
// + earned on damage). Gate semantics:
//   cost_sg <= POOL_MAX -> numeric gate (require >= cost, deduct cost on 2xx).
//   cost_sg >  POOL_MAX -> consume-all (require FULL pool, drain to 0 on 2xx).
// PP/PT pools are NOT modeled -> their cost_* stay decorative (follow-up spec).
// Deduct only on a 2xx dispatch (no charge on a 400/501 handler result).

function mkExecutor() {
  return createAbilityExecutor({
    performAttack: () => ({ damageDealt: 0, result: { hit: false } }),
    buildAttackEvent: () => ({}),
    appendEvent: async () => {},
    manhattanDistance: (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
  });
}

function mkActor(sg) {
  return {
    id: 'ab',
    job: 'aberrant',
    ap_remaining: 5,
    sg,
    position: { x: 0, y: 0 },
    attack_range: 5,
  };
}

function call(ex, actor, body, extraUnits = []) {
  return ex.executeAbility({
    session: { units: [actor, ...extraUnits], turn: 1, damage_taken: {} },
    actor,
    body,
  });
}

test.before(() => {
  // controlled buff abilities (effect_type 'buff' resolves 2xx with stub deps)
  _setAbilityForTest('test_sg_numeric', {
    ability_id: 'test_sg_numeric',
    effect_type: 'buff',
    cost_ap: 0,
    cost_sg: 2,
    buff_stat: 'defense_mod',
    buff_amount: 1,
    duration: 1,
  });
  _setAbilityForTest('test_sg_consume', {
    ability_id: 'test_sg_consume',
    effect_type: 'buff',
    cost_ap: 0,
    cost_sg: 80,
    buff_stat: 'defense_mod',
    buff_amount: 1,
    duration: 1,
  });
  _setAbilityForTest('test_no_sg', {
    ability_id: 'test_no_sg',
    effect_type: 'buff',
    cost_ap: 0,
    buff_stat: 'defense_mod',
    buff_amount: 1,
    duration: 1,
  });
});

test.after(() => {
  _resetAbilityIndex();
});

test('SG numeric gate: cost_sg=2 with sg=1 -> 400 blocked, sg unchanged', async () => {
  const actor = mkActor(1);
  const res = await call(mkExecutor(), actor, { ability_id: 'test_sg_numeric' });
  assert.strictEqual(res.status, 400, JSON.stringify(res.body));
  assert.strictEqual(res.body.pool, 'sg');
  assert.strictEqual(actor.sg, 1, 'sg unchanged on block');
});

test('SG numeric gate: cost_sg=2 with sg=2 -> 200, sg deducted to 0', async () => {
  const actor = mkActor(2);
  const res = await call(mkExecutor(), actor, { ability_id: 'test_sg_numeric' });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(actor.sg, 0, 'sg deducted by cost 2');
});

test('SG numeric gate: cost_sg=2 with sg=3 -> 200, sg deducted to 1', async () => {
  const actor = mkActor(3);
  const res = await call(mkExecutor(), actor, { ability_id: 'test_sg_numeric' });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(actor.sg, 1, 'sg 3 - cost 2 = 1');
});

test('SG consume-all: cost_sg=80 (>POOL_MAX) with sg=2 -> 400 (needs full pool)', async () => {
  const actor = mkActor(2);
  const res = await call(mkExecutor(), actor, { ability_id: 'test_sg_consume' });
  assert.strictEqual(res.status, 400, JSON.stringify(res.body));
  assert.strictEqual(res.body.consume_all, true);
  assert.strictEqual(actor.sg, 2, 'sg unchanged on block');
});

test('SG consume-all: cost_sg=80 with sg=3 (full) -> 200, sg drained to 0', async () => {
  const actor = mkActor(3);
  const res = await call(mkExecutor(), actor, { ability_id: 'test_sg_consume' });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(actor.sg, 0, 'consume-all drains the pool');
});

test('no cost_sg: ability unaffected by the SG gate (sg untouched)', async () => {
  const actor = mkActor(1);
  const res = await call(mkExecutor(), actor, { ability_id: 'test_no_sg' });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(actor.sg, 1, 'sg untouched when ability has no cost_sg');
});

test('real aberrant_overdrive (cost_sg=3): sg=3 -> 200 + drained; sg=2 -> 400', async () => {
  const target = { id: 'foe', hp: 10, max_hp: 10, position: { x: 1, y: 0 } };
  const ok = mkActor(3);
  const okRes = await call(
    mkExecutor(),
    ok,
    { ability_id: 'aberrant_overdrive', target_id: 'foe' },
    [target],
  );
  assert.strictEqual(okRes.status, 200, JSON.stringify(okRes.body));
  assert.strictEqual(ok.sg, 0, 'cost_sg 3 (=POOL_MAX) numeric deducts to 0');

  const low = mkActor(2);
  const lowRes = await call(
    mkExecutor(),
    low,
    { ability_id: 'aberrant_overdrive', target_id: 'foe' },
    [target],
  );
  assert.strictEqual(lowRes.status, 400, JSON.stringify(lowRes.body));
  assert.strictEqual(low.sg, 2, 'sg unchanged on block');
});

test('SG NOT charged when the dispatch fails (no charge on non-2xx)', async () => {
  // execution_attack at a missing target -> handler returns non-2xx; SG must not charge.
  _setAbilityForTest('test_sg_attack', {
    ability_id: 'test_sg_attack',
    effect_type: 'execution_attack',
    cost_ap: 0,
    cost_sg: 2,
    damage_dice: '1d6',
  });
  const actor = mkActor(2);
  const res = await call(mkExecutor(), actor, {
    ability_id: 'test_sg_attack',
    target_id: 'does_not_exist',
  });
  assert.ok(res.status >= 400, `expected a failure status, got ${res.status}`);
  assert.strictEqual(actor.sg, 2, 'sg NOT charged on a failed dispatch');
});
