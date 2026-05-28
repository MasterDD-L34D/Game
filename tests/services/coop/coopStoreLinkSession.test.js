// PR-1 §22 coop-WS surface — coopStore.linkSession maps a combat session id
// to the coop orchestrator whose run.id matches the campaign_id passed to
// POST /api/session/start (run.id == campaign_id in the coop flow).
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createCoopStore } = require('../../../apps/backend/services/coop/coopStore');

test('linkSession sets sessionId on the orch whose run.id matches campaignId', () => {
  const store = createCoopStore({});
  const orch = store.getOrCreate('ABCD');
  const run = orch.startRun({ scenarioStack: ['enc_a'] });
  const linked = store.linkSession(run.id, 'sess_xyz');
  assert.equal(linked, true);
  assert.equal(orch.sessionId, 'sess_xyz');
});

test('linkSession returns false on no match or missing args', () => {
  const store = createCoopStore({});
  const orch = store.getOrCreate('ABCD');
  orch.startRun({ scenarioStack: ['enc_a'] });
  assert.equal(store.linkSession('nope_run', 'sess_1'), false);
  assert.equal(store.linkSession('', 'sess_1'), false);
  assert.equal(store.linkSession(orch.run.id, ''), false);
  assert.equal(orch.sessionId, null);
});
