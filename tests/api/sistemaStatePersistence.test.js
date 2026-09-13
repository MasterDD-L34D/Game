// M1 ADR-2026-05-18 Option B pilot -- integration test.
// Guards wiring of campaign_id + sistema_state hydrate/accumulate in session.js.
// The store is a no-op in tests (no DATABASE_URL), so assertions target:
//   - /start stores campaign_id + default sistema_state on the session object
//   - /end completes without error when session has a campaign_id (accumulate path exercised)
// Accumulator logic is unit-tested separately; this test guards WIRING + non-crash.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

test('/start with campaign_id stores campaign_id and default sistema_state', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  assert.equal(scenario.status, 200);

  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units, campaign_id: 'camp_m1_test' });
  assert.equal(startRes.status, 200, 'start returns 200');
  assert.ok(startRes.body.session_id, 'session_id present');

  // Verify via /state that campaign_id and sistema_state are on the session object.
  const sid = startRes.body.session_id;
  const stateRes = await request(app).get('/api/session/state').query({ session_id: sid });
  assert.equal(stateRes.status, 200, 'state returns 200');
  assert.equal(stateRes.body.campaign_id, 'camp_m1_test', 'campaign_id stored on session');
  assert.ok(stateRes.body.sistema_state, 'sistema_state present on session');
  assert.deepEqual(
    stateRes.body.sistema_state.units_observed,
    {},
    'sistema_state.units_observed is empty (stub no-op)',
  );
});

test('/start without campaign_id has campaign_id null and default sistema_state', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  assert.equal(scenario.status, 200);

  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  assert.equal(startRes.status, 200);

  const sid = startRes.body.session_id;
  const stateRes = await request(app).get('/api/session/state').query({ session_id: sid });
  assert.equal(stateRes.status, 200);
  assert.equal(stateRes.body.campaign_id, null, 'campaign_id is null when not provided');
  assert.ok(stateRes.body.sistema_state, 'sistema_state present even without campaign_id');
  assert.deepEqual(
    stateRes.body.sistema_state.units_observed,
    {},
    'sistema_state.units_observed is empty',
  );
});

test('/end with campaign_id completes without error (accumulate path, stub no-op)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  assert.equal(scenario.status, 200);

  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units, campaign_id: 'camp_m1_end_test' });
  assert.equal(startRes.status, 200);
  const sid = startRes.body.session_id;

  const endRes = await request(app).post('/api/session/end').send({ session_id: sid });
  assert.equal(endRes.status, 200, '/end returns 200 with campaign_id set');
  assert.ok(endRes.body.finalized, 'finalized flag set');
});
