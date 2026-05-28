// PR-1 §22 coop-WS surface — orch.setSessionId links the combat session id
// (created by POST /api/session/start) back to the coop orchestrator so the
// `phase_change` broadcast can surface it to phone clients for ALIENA
// telemetry fetch on debrief.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CoopOrchestrator } = require('../../../apps/backend/services/coop/coopOrchestrator');

test('setSessionId stores the id and returns true on change', () => {
  const orch = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'h1' });
  assert.equal(orch.sessionId, null);
  const changed = orch.setSessionId('sess_123');
  assert.equal(changed, true);
  assert.equal(orch.sessionId, 'sess_123');
});

test('setSessionId is idempotent — returns false when unchanged', () => {
  const orch = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'h1' });
  orch.setSessionId('sess_123');
  assert.equal(orch.setSessionId('sess_123'), false);
  assert.equal(orch.setSessionId(''), true); // clears to null
  assert.equal(orch.sessionId, null);
});
