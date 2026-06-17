// tests/api/lethalMissionFlag.test.js -- SPEC-J slice 1 integration.
//
// Proves the lethal mission-flag passthrough chain end-to-end:
//   req.body.lethal -> session.lethal -> publicSessionView.lethal (sez.8 public).
// And the band-neutral default: a session started without the flag is non-lethal.
// The death path itself stays inert (LETHAL_MISSIONS_ENABLED unset + no consent
// producer in PR1) -- exercised at unit level in tests/services/combat/lethalDeath.

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

async function startScenario(app, extra = {}) {
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const res = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units, ...extra });
  return res;
}

test('start with lethal:true -> public state exposes lethal:true', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await startScenario(app, { lethal: true });
  assert.equal(res.status, 200);
  assert.equal(res.body.state.lethal, true, 'lethal flag surfaced public (SPEC-J sez.8)');
});

test('default start -> non-lethal (lethal:false), band-neutral soft-death run', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await startScenario(app);
  assert.equal(res.status, 200);
  assert.equal(res.body.state.lethal, false, 'no flag -> non-lethal default');
});

test('lethal flag does NOT coerce from a truthy string in the body', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await startScenario(app, { lethal: 'true' });
  assert.equal(res.status, 200);
  assert.equal(res.body.state.lethal, false, 'string "true" must not arm a lethal mission');
});
