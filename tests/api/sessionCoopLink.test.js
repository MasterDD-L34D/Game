// PR-1 §22 coop-WS surface — POST /api/session/start links the new combat
// session id back into the coop orchestrator (by campaign_id == run.id) so
// the next phase_change broadcast surfaces session_id to phone clients.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

test('/session/start links session_id into coop orch matching campaign_id', async (t) => {
  const { app, coopStore, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const orch = coopStore.getOrCreate('TEST');
  const run = orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
  assert.equal(orch.sessionId, null);

  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units, campaign_id: run.id });
  assert.equal(startRes.status, 200);

  assert.equal(orch.sessionId, startRes.body.session_id);
});
