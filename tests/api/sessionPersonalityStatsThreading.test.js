// Verdetto #2679 Q2-bis (2026-06-10) -- unit stats threading into the
// personality_axes fold: /end + GET /:id/vc build unitStatsById from
// session.units (speed + EXPLICIT max_hp only; current hp never leaks into the
// "birth physique" axis). Tutorial units carry no stats -> behavior unchanged
// (agile neutral); stat-bearing units make agile_robust evaluable -- the gap
// the N=40 evidence flagged as F2 (sd 0.000).
'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

const STAT_UNITS = [
  {
    id: 'hero_stat',
    species: 'dune_stalker',
    // Backend species-scale stats: speed 4 in [1,6] -> 0.6; max_hp 13 in
    // [6,20] -> 0.5 -> agile_robust = 0.7*(1-0.6) + 0.3*0.5 = 0.43.
    speed: 4,
    max_hp: 13,
    hp: 13,
    ap: 3,
    mod: 20,
    attack_range: 2,
    initiative: 18,
    position: { x: 1, y: 1 },
    controlled_by: 'player',
    status: {},
  },
  {
    id: 'foe_stat',
    species: 'velox',
    hp: 6,
    ap: 1,
    mod: 0,
    attack_range: 1,
    initiative: 1,
    position: { x: 2, y: 1 },
    controlled_by: 'sistema',
    status: {},
  },
];

async function startAndAct(app) {
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: STAT_UNITS.map((u) => ({ ...u })) });
  const sid = startRes.body.session_id || startRes.body.id;
  assert.ok(sid, `session started: ${JSON.stringify(startRes.body).slice(0, 200)}`);
  // A few attacks so the actor has raw signal (hasSignal -> personality fold).
  for (let i = 0; i < 3; i += 1) {
    await request(app).post('/api/session/action').send({
      session_id: sid,
      actor_id: 'hero_stat',
      action_type: 'attack',
      target_id: 'foe_stat',
    });
    await request(app).post('/api/session/turn/end').send({ session_id: sid });
  }
  return sid;
}

test('GET /:id/vc threads unit stats -> agile_robust reflects speed/max_hp', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startAndAct(app);
  const res = await request(app).get(`/api/session/${sid}/vc`);
  assert.equal(res.status, 200);
  const entry = res.body.debrief_payload.per_actor.hero_stat;
  assert.ok(entry && entry.personality_axes, 'personality_axes present for the actor');
  assert.ok(
    Math.abs(entry.personality_axes.agile_robust - 0.43) < 1e-9,
    `agile_robust from stats expected 0.43, got ${entry.personality_axes.agile_robust}`,
  );
});

test('POST /end threads unit stats into the final debrief_payload', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startAndAct(app);
  const res = await request(app).post('/api/session/end').send({ session_id: sid });
  assert.equal(res.status, 200);
  const entry = res.body.debrief_payload.per_actor.hero_stat;
  assert.ok(entry && entry.personality_axes, 'personality_axes present for the actor');
  assert.ok(
    Math.abs(entry.personality_axes.agile_robust - 0.43) < 1e-9,
    `agile_robust from stats expected 0.43, got ${entry.personality_axes.agile_robust}`,
  );
});

test('units without explicit max_hp/speed stay neutral (current hp never leaks)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const noStats = STAT_UNITS.map((u) => {
    const { speed, max_hp, ...rest } = u;
    return { ...rest, id: u.id };
  });
  const startRes = await request(app).post('/api/session/start').send({ units: noStats });
  const sid = startRes.body.session_id || startRes.body.id;
  for (let i = 0; i < 3; i += 1) {
    await request(app).post('/api/session/action').send({
      session_id: sid,
      actor_id: 'hero_stat',
      action_type: 'attack',
      target_id: 'foe_stat',
    });
    await request(app).post('/api/session/turn/end').send({ session_id: sid });
  }
  const res = await request(app).get(`/api/session/${sid}/vc`);
  const entry = res.body.debrief_payload.per_actor.hero_stat;
  assert.ok(entry && entry.personality_axes);
  assert.equal(entry.personality_axes.agile_robust, 0.5);
});
