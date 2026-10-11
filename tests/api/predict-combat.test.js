// Integration tests: decision surfacing (Halfway lesson).
//
// Copre:
//   - predictCombat pure function (hit%, crit%, fumble%, MoS, PT)
//   - POST /api/session/predict endpoint
//   - PT spend schema con spinta

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { predictCombat } = require('../../apps/backend/routes/sessionHelpers');

// ─────────────────────────────────────────────────────────────────
// predictCombat pure function
// ─────────────────────────────────────────────────────────────────

test('predictCombat: returns expected shape', () => {
  const actor = { mod: 3 };
  const target = { dc: 12 };
  const result = predictCombat(actor, target);

  assert.equal(typeof result.hit_pct, 'number');
  assert.equal(typeof result.crit_pct, 'number');
  assert.equal(typeof result.fumble_pct, 'number');
  assert.equal(typeof result.avg_mos, 'number');
  assert.equal(typeof result.avg_pt, 'number');
  assert.equal(result.dc, 12);
  assert.equal(result.attack_mod, 3);
  assert.equal(result.simulations, 20);
});

test('predictCombat: hit% is correct for mod 3 vs DC 12', () => {
  // d20+3 vs DC 12: need roll >= 9. Rolls 9-20 hit = 12/20 = 60%
  const result = predictCombat({ mod: 3 }, { dc: 12 });
  assert.equal(result.hit_pct, 60);
});

test('predictCombat: crit always 5% (nat 20)', () => {
  const result = predictCombat({ mod: 0 }, { dc: 15 });
  assert.equal(result.crit_pct, 5);
});

test('predictCombat: fumble always 5% (nat 1)', () => {
  const result = predictCombat({ mod: 5 }, { dc: 10 });
  assert.equal(result.fumble_pct, 5);
});

test('predictCombat: mod 0 vs DC 10 → 55% hit (rolls 10-20)', () => {
  const result = predictCombat({ mod: 0 }, { dc: 10 });
  assert.equal(result.hit_pct, 55);
});

test('predictCombat: avg_pt > 0 when hits occur', () => {
  const result = predictCombat({ mod: 5 }, { dc: 10 });
  assert.ok(result.avg_pt > 0, 'should gain PT on hits');
});

test('predictCombat: DC fallback when target has no dc', () => {
  // dc = 10 + target.mod (0) = 10
  const result = predictCombat({ mod: 0 }, { mod: 0 });
  assert.equal(result.dc, 10);
});

// ─────────────────────────────────────────────────────────────────
// POST /api/session/predict endpoint
// ─────────────────────────────────────────────────────────────────

test('POST /api/session/predict returns prediction for valid session', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  // Start session
  const startRes = await request(app).post('/api/session/start').send({});
  assert.equal(startRes.status, 200);
  const sid = startRes.body.session_id;
  const units = startRes.body.state.units;
  const actor = units.find((u) => u.controlled_by === 'player');
  const target = units.find((u) => u.controlled_by !== actor.controlled_by);

  // Predict
  const res = await request(app).post('/api/session/predict').send({
    session_id: sid,
    actor_id: actor.id,
    target_id: target.id,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.actor_id, actor.id);
  assert.equal(res.body.target_id, target.id);
  assert.ok(typeof res.body.hit_pct === 'number');
  assert.ok(typeof res.body.dc === 'number');
  assert.ok(typeof res.body.attack_mod === 'number');
});

test('POST /api/session/predict returns 400 for missing actor', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const startRes = await request(app).post('/api/session/start').send({});
  const sid = startRes.body.session_id;

  const res = await request(app).post('/api/session/predict').send({
    session_id: sid,
    actor_id: 'nonexistent',
    target_id: 'also-nonexistent',
  });
  assert.equal(res.status, 400);
});

// ─────────────────────────────────────────────────────────────────
// PT spend schema: spinta now valid
// ─────────────────────────────────────────────────────────────────

test('combat schema accepts pt_spend with type spinta', () => {
  const { combatSchema } = require('../../packages/contracts');
  const { createSchemaValidator } = require('../../apps/backend/middleware/schemaValidator');

  const validator = createSchemaValidator();
  const ACTION_ID = 'test://action';
  const actionSubschema = {
    $schema: combatSchema.$schema,
    $id: 'https://contracts.game.local/combat.action.schema.json',
    ...combatSchema.$defs.action,
    $defs: combatSchema.$defs,
  };
  validator.registerSchema(ACTION_ID, actionSubschema);

  const action = {
    id: 'act-spinta-01',
    type: 'attack',
    actor_id: 'party-alpha',
    target_id: 'hostile-01',
    ap_cost: 1,
    pt_spend: { type: 'spinta', amount: 1 },
  };
  assert.doesNotThrow(() => validator.validate(ACTION_ID, action));
});
