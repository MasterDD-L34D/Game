// Q-001 T2.3 PR-3 · Difficulty integration smoke test.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

test('GET /api/session/difficulty/profiles lists 4 profiles', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/session/difficulty/profiles');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.profiles));
  const ids = res.body.profiles.map((p) => p.id);
  assert.ok(ids.includes('easy'));
  assert.ok(ids.includes('normal'));
  assert.ok(ids.includes('hard'));
  assert.ok(ids.includes('nightmare'));
  assert.equal(res.body.default, 'normal');
});

test('POST /api/session/start with difficulty_profile=normal keeps HP unchanged', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const res = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units, difficulty_profile: 'normal' });
  assert.equal(res.status, 200);

  const replay = await request(app).get(`/api/session/${res.body.session_id}/replay`);
  // Normal = multiplier 1.0 → HP uguale a scenario
  for (const u of replay.body.units_snapshot_initial) {
    const orig = scenario.body.units.find((o) => o.id === u.id);
    if (orig) assert.equal(u.hp, orig.hp, `unit ${u.id} hp unchanged`);
  }
});

test('POST /api/session/start with difficulty_profile=hard increases enemy HP', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const res = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units, difficulty_profile: 'hard' });
  assert.equal(res.status, 200);

  const units = res.body.state.units;
  for (const u of units) {
    const orig = scenario.body.units.find((o) => o.id === u.id);
    if (!orig) continue;
    if (u.controlled_by === 'sistema') {
      // hard = 1.15× HP
      const expected = Math.round(Number(orig.hp || orig.max_hp || 10) * 1.15);
      assert.equal(u.hp, expected, `sis ${u.id} hp scaled by 1.15×`);
    } else {
      // player unchanged on hard
      assert.equal(u.hp, orig.hp, `player ${u.id} hp unchanged on hard`);
    }
  }
});

test('POST /api/session/start with difficulty_profile=easy scales player HP up', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const res = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units, difficulty_profile: 'easy' });
  assert.equal(res.status, 200);

  const units = res.body.state.units;
  for (const u of units) {
    const orig = scenario.body.units.find((o) => o.id === u.id);
    if (!orig) continue;
    if (u.controlled_by === 'player') {
      // easy = player 1.15× HP
      const expected = Math.round(Number(orig.hp || orig.max_hp || 10) * 1.15);
      assert.equal(u.hp, expected, `player ${u.id} hp scaled by 1.15×`);
    }
  }
});

test('POST /api/session/start with invalid difficulty_profile falls back (no scaling)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const res = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units, difficulty_profile: 'invalid_xyz' });
  assert.equal(res.status, 200);

  const units = res.body.state.units;
  // No scaling applied — match original
  for (const u of units) {
    const orig = scenario.body.units.find((o) => o.id === u.id);
    if (orig) assert.equal(u.hp, orig.hp, `${u.id} hp unchanged (invalid profile)`);
  }
});
