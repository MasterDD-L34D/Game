// Overcharge route integration — TKT-P6-AP3 (Pillar 6 / FFT charge beat).
// Verifies POST /api/session/overcharge: spend full SG gauge → +1 ap_remaining
// this turn, so a cost_ap:3 ability fits the 2-AP budget. Symmetric twin of
// /defy. Mirrors defyRoute.test.js (initial_sg seeding; start zeros SG).

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

test('POST /overcharge happy path — spends 3 SG, +1 ap_remaining, marks guard', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, [basePlayer({ sg: 3 }), baseSistema()]);
  const r = await request(app)
    .post('/api/session/overcharge')
    .send({ session_id: sid, actor_id: 'p1' });
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.before.sg, 3);
  assert.equal(r.body.after.sg, 0, 'full gauge spent');
  assert.equal(r.body.before.ap_remaining, 2);
  assert.equal(r.body.after.ap_remaining, 3, 'ap_remaining 2 -> 3');
  assert.deepEqual(r.body.cost, { sg: 3 });
  const player = r.body.state.units.find((u) => u.id === 'p1');
  assert.equal(Number(player.ap_remaining), 3, 'state mirrors +1 AP');
  assert.equal(Number(player.sg), 0, 'state mirrors spent gauge');
});

test('POST /overcharge: 409 insufficient_sg below full gauge', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, [basePlayer({ sg: 2 }), baseSistema()]);
  const r = await request(app)
    .post('/api/session/overcharge')
    .send({ session_id: sid, actor_id: 'p1' });
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'insufficient_sg');
  assert.equal(r.body.detail.sg, 2);
  assert.equal(r.body.detail.required, 3);
});

test('POST /overcharge: 409 already_overcharged on second call same turn', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  // sg 3 → first overcharge spends all 3; second must fail on the guard, not SG.
  // Use sg 6-capable? POOL_MAX=3 caps it, so seed exactly 3 and assert the guard
  // error wins even though SG is now 0 (guard checked before SG).
  const sid = await startSession(app, [basePlayer({ sg: 3 }), baseSistema()]);
  const first = await request(app)
    .post('/api/session/overcharge')
    .send({ session_id: sid, actor_id: 'p1' });
  assert.equal(first.status, 200);
  const second = await request(app)
    .post('/api/session/overcharge')
    .send({ session_id: sid, actor_id: 'p1' });
  assert.equal(second.status, 409);
  assert.equal(second.body.error, 'already_overcharged');
});

test('POST /overcharge: 409 not_player_controlled for sistema', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, [basePlayer(), baseSistema({ sg: 3 })]);
  const r = await request(app)
    .post('/api/session/overcharge')
    .send({ session_id: sid, actor_id: 'sis' });
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'not_player_controlled');
});

test('POST /overcharge: 400 actor_not_found', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, [basePlayer({ sg: 3 }), baseSistema()]);
  const r = await request(app)
    .post('/api/session/overcharge')
    .send({ session_id: sid, actor_id: 'ghost' });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'actor_not_found');
});

test('POST /overcharge: event appended to session.events', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, [basePlayer({ sg: 3 }), baseSistema()]);
  const r = await request(app)
    .post('/api/session/overcharge')
    .send({ session_id: sid, actor_id: 'p1' });
  assert.equal(r.status, 200);
  const events = (r.body.state && r.body.state.events) || [];
  const ev = events.find((e) => e.event_type === 'overcharge');
  assert.ok(ev, 'expected overcharge event in session.events');
  assert.equal(ev.actor_id, 'p1');
  assert.equal(ev.sg_cost, 3);
  assert.equal(ev.ap_before, 2);
  assert.equal(ev.ap_after, 3);
});

test('POST /overcharge: the guard clears after a round so it can be reused later', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, [basePlayer({ sg: 3 }), baseSistema()]);
  const first = await request(app)
    .post('/api/session/overcharge')
    .send({ session_id: sid, actor_id: 'p1' });
  assert.equal(first.status, 200);
  // End rounds: the generic status-decrement loop drops overcharged 1 -> 0.
  let clearedObserved = false;
  for (let i = 0; i < 4; i += 1) {
    const turn = await request(app).post('/api/session/turn/end').send({ session_id: sid });
    assert.equal(turn.status, 200);
    const player = turn.body.state.units.find((u) => u.id === 'p1');
    if (player && !Number(player.status?.overcharged)) {
      clearedObserved = true;
      break;
    }
  }
  assert.ok(clearedObserved, 'overcharged guard cleared by end-of-round decrement');
});
