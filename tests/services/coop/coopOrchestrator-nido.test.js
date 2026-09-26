// G1 — N1 Nido-hub: verify 'nido' is a valid phase in coopOrchestrator.
// G2 — N1 Nido-hub: gate debrief-advance into nido + startMissionFromNido.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CoopOrchestrator } = require('../../../apps/backend/services/coop/coopOrchestrator');

// freshAtDebrief: minimal orchestrator at debrief phase with a 2-scenario run
// (so advanceScenarioOrEnd goes to world_setup, not ended).
function freshAtDebrief({ nidoUnlocked = false } = {}) {
  const o = new CoopOrchestrator({ roomCode: 'TEST', hostId: 'h1', now: () => 1, nidoUnlocked });
  o.run = {
    id: 'run_test',
    outcome: null,
    matingResolved: false,
    survivors: [],
    partyXp: 0,
    partyPi: 0,
    scenarioStack: ['enc_tutorial_01', 'enc_tutorial_02'],
    currentIndex: 0,
    lastMacro: null,
  };
  o.phase = 'debrief';
  return o;
}

// --- G1 test (unchanged) ---

test("_setPhase('nido') is a valid phase", () => {
  const o = freshAtDebrief();
  assert.doesNotThrow(() => o._setPhase('nido'));
  assert.equal(o.phase, 'nido');
});

// --- G2 tests ---

// (a) debrief + advance enters 'nido' when unlocked (constructor flag)
test('submitNextMacro advance from debrief enters nido when nidoUnlocked=true', () => {
  const o = freshAtDebrief({ nidoUnlocked: true });
  const result = o.submitNextMacro('h1', { choice: 'advance' }, { hostId: 'h1' });
  assert.equal(o.phase, 'nido');
  assert.equal(result.phase, 'nido');
  assert.deepEqual(result.advance, { action: 'nido' });
});

// (a2) env override also unlocks
test('submitNextMacro advance from debrief enters nido when NIDO_UNLOCKED env=true', () => {
  const o = freshAtDebrief({ nidoUnlocked: false });
  process.env.NIDO_UNLOCKED = 'true';
  try {
    const result = o.submitNextMacro('h1', { choice: 'advance' }, { hostId: 'h1' });
    assert.equal(o.phase, 'nido');
    assert.equal(result.phase, 'nido');
    assert.deepEqual(result.advance, { action: 'nido' });
  } finally {
    delete process.env.NIDO_UNLOCKED;
  }
});

// (b) debrief + advance does NOT enter nido when locked (goes to world_setup)
test('submitNextMacro advance from debrief goes to world_setup when nido locked', () => {
  const o = freshAtDebrief({ nidoUnlocked: false });
  delete process.env.NIDO_UNLOCKED; // ensure env is clean
  const result = o.submitNextMacro('h1', { choice: 'advance' }, { hostId: 'h1' });
  assert.notEqual(o.phase, 'nido');
  assert.notEqual(result.phase, 'nido');
  // advanceScenarioOrEnd with 2 scenarios -> world_setup
  assert.equal(o.phase, 'world_setup');
});

// (c) startMissionFromNido from nido advances to world_setup
test('startMissionFromNido from nido phase returns world_setup', () => {
  const o = freshAtDebrief({ nidoUnlocked: true });
  o._setPhase('nido'); // manually enter nido
  const result = o.startMissionFromNido('h1', { hostId: 'h1' });
  assert.equal(o.phase, 'world_setup');
  assert.equal(result.phase, 'world_setup');
  assert.equal(result.advance.action, 'next_scenario');
  assert.ok(result.run_state, 'run_state present');
});

// (d) startMissionFromNido is host-only
test('startMissionFromNido throws host_only for non-host', () => {
  const o = freshAtDebrief({ nidoUnlocked: true });
  o._setPhase('nido');
  assert.throws(() => o.startMissionFromNido('player2', { hostId: 'h1' }), {
    message: 'host_only',
  });
});

// (d2) startMissionFromNido throws not_in_nido when phase != nido
test('startMissionFromNido throws not_in_nido when not in nido phase', () => {
  const o = freshAtDebrief();
  // phase is 'debrief', not 'nido'
  assert.throws(() => o.startMissionFromNido('h1', { hostId: 'h1' }), { message: 'not_in_nido' });
});
