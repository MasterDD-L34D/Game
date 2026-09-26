// Integration tests: primo scenario giocabile enc_tutorial_01.
//
// Copre:
//   - GET /api/tutorial/enc_tutorial_01 ritorna scenario + 4 unità
//   - Round-trip: scenario → POST /start → 4 unità su griglia 6×6
//   - Combat smoke: declare-intent → commit → resolve funziona
//   - Enemy units are sistema-controlled

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

test('GET /api/tutorial/enc_tutorial_01 returns valid scenario', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/tutorial/enc_tutorial_01');
  assert.equal(res.status, 200);
  assert.equal(res.body.id, 'enc_tutorial_01');
  assert.equal(res.body.name, 'Primi Passi nella Savana');
  // PR #1871 (2026-04-25) — objective JS string promoted to schema object {type, ...}.
  assert.equal(res.body.objective?.type ?? res.body.objective, 'elimination');
  assert.equal(res.body.grid_size, 6);
  assert.ok(Array.isArray(res.body.units));
  assert.equal(res.body.units.length, 4);

  const players = res.body.units.filter((u) => u.controlled_by === 'player');
  const enemies = res.body.units.filter((u) => u.controlled_by === 'sistema');
  assert.equal(players.length, 2, '2 player units');
  assert.equal(enemies.length, 2, '2 enemy units');
});

test('GET /api/tutorial/ lists available scenarios', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/tutorial/');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.scenarios));
  assert.ok(res.body.scenarios.length >= 1);
  assert.equal(res.body.scenarios[0].id, 'enc_tutorial_01');
});

test('tutorial units → session start → valid session', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  // 1. Get tutorial scenario
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  assert.equal(scenario.status, 200);

  // 2. Start session with tutorial units
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  assert.equal(startRes.status, 200, `start failed: ${JSON.stringify(startRes.body)}`);
  assert.ok(startRes.body.session_id);

  const sid = startRes.body.session_id;
  const state = startRes.body.state;

  // 3. Verify 4 units on grid
  assert.equal(state.units.length, 4);

  // 4. Verify positions are within 6×6 grid
  for (const u of state.units) {
    assert.ok(u.position.x >= 0 && u.position.x < 6, `x out of bounds: ${u.id}`);
    assert.ok(u.position.y >= 0 && u.position.y < 6, `y out of bounds: ${u.id}`);
  }

  // 5. Verify enemy species
  const enemies = state.units.filter((u) => u.controlled_by === 'sistema');
  assert.equal(enemies.length, 2);
  for (const e of enemies) {
    assert.equal(e.species, 'predoni_nomadi');
  }
});

test('tutorial session: declare → commit → resolve round', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  // Setup session
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  const sid = startRes.body.session_id;

  // Declare intent: p_scout attacks e_nomad_1
  const declareRes = await request(app)
    .post('/api/session/declare-intent')
    .send({
      session_id: sid,
      actor_id: 'p_scout',
      action: { type: 'attack', target_id: 'e_nomad_1' },
    });
  assert.equal(declareRes.status, 200, `declare failed: ${JSON.stringify(declareRes.body)}`);

  // Commit round
  const commitRes = await request(app).post('/api/session/commit-round').send({ session_id: sid });
  assert.equal(commitRes.status, 200, `commit failed: ${JSON.stringify(commitRes.body)}`);

  // Resolve round
  const resolveRes = await request(app)
    .post('/api/session/resolve-round')
    .send({ session_id: sid });
  assert.equal(resolveRes.status, 200, `resolve failed: ${JSON.stringify(resolveRes.body)}`);
  assert.ok(
    resolveRes.body.turn_log_entries || resolveRes.body.turnLogEntries,
    'resolution should produce log entries',
  );
});
