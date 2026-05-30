// G1 — N1 Nido-hub: verify 'nido' is a valid phase in coopOrchestrator.
// Task: register 'nido' in PHASES so _setPhase('nido') does not throw.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CoopOrchestrator } = require('../../../apps/backend/services/coop/coopOrchestrator');

function freshAtDebrief() {
  const o = new CoopOrchestrator({ roomCode: 'TEST', hostId: 'h1', now: () => 1 });
  o.run = { id: 'run_test', outcome: null };
  o.phase = 'debrief';
  return o;
}

test("_setPhase('nido') is a valid phase", () => {
  const o = freshAtDebrief();
  assert.doesNotThrow(() => o._setPhase('nido'));
  assert.equal(o.phase, 'nido');
});
