// Defy route integration — Skiv ticket #5 (Sprint B 2/2).
// Verifies POST /api/session/defy + AP penalty wired via applyApRefill.

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

function basePlayer(overrides = {}) {
  return {
    id: 'p1',
    species: 'velox',
    job: 'skirmisher',
    hp: 12,
    max_hp: 12,
    ap: 2,
    sg: 3,
    attack_range: 3,
    initiative: 14,
    position: { x: 1, y: 1 },
    controlled_by: 'player',
    status: {},
    ...overrides,
  };
}

function baseSistema(overrides = {}) {
  return {
    id: 'sis',
    species: 'carapax',
    job: 'vanguard',
    hp: 30,
    max_hp: 30,
    ap: 2,
    attack_range: 1,
    initiative: 5,
    position: { x: 5, y: 5 },
    controlled_by: 'sistema',
    status: {},
    ...overrides,
  };
}

async function startSession(app, units, sistema_pressure = 60) {
  // Initial SG seeding: build a map from unit.sg in the test fixture, since
  // session start zeros SG via sgTracker.resetEncounter (encounter lifecycle).
  const initial_sg = {};
  for (const u of units) {
    if (Number.isFinite(Number(u.sg)) && Number(u.sg) > 0) initial_sg[u.id] = u.sg;
  }
  const res = await request(app)
    .post('/api/session/start')
    .send({ units, sistema_pressure_start: sistema_pressure, initial_sg })
    .expect(200);
  return res.body.session_id;
}

test('POST /defy happy path — drops pressure, spends SG, sets defy_penalty', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, [basePlayer({ sg: 3 }), baseSistema()], 75);
  const r = await request(app).post('/api/session/defy').send({ session_id: sid, actor_id: 'p1' });
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.before.sg, 3);
  assert.equal(r.body.after.sg, 1);
  assert.equal(r.body.before.pressure, 75);
  assert.equal(r.body.after.pressure, 50);
  assert.equal(r.body.relief, 25);
  assert.deepEqual(r.body.cost, { sg: 2, ap_next_turn: 1 });
  // state pressure mirrors after
  assert.equal(r.body.state.sistema_pressure, 50);
  assert.equal(r.body.state.sistema_tier.label, 'Escalated');
});

test('POST /defy: 409 insufficient_sg', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, [basePlayer({ sg: 1 }), baseSistema()]);
  const r = await request(app).post('/api/session/defy').send({ session_id: sid, actor_id: 'p1' });
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'insufficient_sg');
  assert.equal(r.body.detail.sg, 1);
  assert.equal(r.body.detail.required, 2);
});

test('POST /defy: 409 no_pressure_to_relieve when pressure 0', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, [basePlayer({ sg: 3 }), baseSistema()], 0);
  const r = await request(app).post('/api/session/defy').send({ session_id: sid, actor_id: 'p1' });
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'no_pressure_to_relieve');
});

test('POST /defy: 409 not_player_controlled when actor is sistema', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, [basePlayer(), baseSistema()]);
  const r = await request(app).post('/api/session/defy').send({ session_id: sid, actor_id: 'sis' });
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'not_player_controlled');
});

test('POST /defy: 400 actor_not_found', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, [basePlayer(), baseSistema()]);
  const r = await request(app)
    .post('/api/session/defy')
    .send({ session_id: sid, actor_id: 'ghost' });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'actor_not_found');
});

test('POST /defy: pressure clamps at 0 on overshoot', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, [basePlayer({ sg: 3 }), baseSistema()], 10);
  const r = await request(app).post('/api/session/defy').send({ session_id: sid, actor_id: 'p1' });
  assert.equal(r.status, 200);
  assert.equal(r.body.after.pressure, 0);
  assert.equal(r.body.relief, 10);
});

test('POST /defy: AP penalty applied on next turn refill (status decay cycle)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, [basePlayer({ sg: 3 }), baseSistema()], 60);
  // Defy on current turn
  const defyRes = await request(app)
    .post('/api/session/defy')
    .send({ session_id: sid, actor_id: 'p1' });
  assert.equal(defyRes.status, 200);
  // End turn → next round refills AP. defy_penalty=2 → after decrement is 1
  // before refill of NEXT actor turn happens, then refill applies -1 AP, then
  // decrement to 0. The exact site of refill depends on the turn loop.
  // Acceptance criterion: at least one full round must observe ap_remaining=1
  // for the player after refill (default ap=2, defy −1 = 1).
  let observedReducedAp = false;
  for (let i = 0; i < 4; i += 1) {
    const turn = await request(app).post('/api/session/turn/end').send({ session_id: sid });
    assert.equal(turn.status, 200);
    const player = turn.body.state.units.find((u) => u.id === 'p1');
    if (player && Number(player.ap_remaining) === 1 && Number(player.ap) === 2) {
      observedReducedAp = true;
      break;
    }
  }
  assert.ok(
    observedReducedAp,
    'expected ap_remaining=1 (defy penalty) on at least one turn refill',
  );
});

test('POST /defy: event appended to session.events', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, [basePlayer({ sg: 3 }), baseSistema()], 60);
  const r = await request(app).post('/api/session/defy').send({ session_id: sid, actor_id: 'p1' });
  assert.equal(r.status, 200);
  const events = (r.body.state && r.body.state.events) || [];
  const defy = events.find((e) => e.event_type === 'defy');
  assert.ok(defy, 'expected defy event in session.events');
  assert.equal(defy.actor_id, 'p1');
  assert.equal(defy.relief, 25);
  assert.equal(defy.sg_cost, 2);
  assert.equal(defy.ap_penalty_next_turn, 1);
});
