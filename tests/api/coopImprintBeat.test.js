'use strict';

// C2-imprint STEP 1 -- coopOrchestrator imprint beat (non-gating, device-authority).
// Plan: docs/planning/2026-06-22-aa01-c2-imprint-build-spec.md
// Mirrors the missionReadyTally / formPulses device-authority pattern.

const test = require('node:test');
const assert = require('node:assert/strict');
const { CoopOrchestrator } = require('../../apps/backend/services/coop/coopOrchestrator');

function mk(hostId = 'p_h') {
  return new CoopOrchestrator({ roomCode: 'IMPR', hostId, now: () => 1000 });
}

// Mark all 4 axes to the canonical savana tuple (V_P_D_L), respecting assignment.
function markSavana(co, assignment) {
  const VALUES = { locomotion: 'VELOCE', offense: 'PROFONDA', defense: 'DURA', senses: 'LONTANO' };
  for (const [pid, axes] of Object.entries(assignment)) {
    for (const axis of axes) co.submitImprintMark(pid, { axis, value: VALUES[axis] });
  }
}

test('assignImprintAxes: round-robin scales to N players (4/3/2/0)', () => {
  const co = mk();
  assert.deepEqual(co.assignImprintAxes(['a', 'b', 'c', 'd']), {
    a: ['locomotion'],
    b: ['offense'],
    c: ['defense'],
    d: ['senses'],
  });
  assert.deepEqual(co.assignImprintAxes(['a', 'b', 'c']), {
    a: ['locomotion', 'senses'],
    b: ['offense'],
    c: ['defense'],
  });
  assert.deepEqual(co.assignImprintAxes(['a', 'b']), {
    a: ['locomotion', 'defense'],
    b: ['offense', 'senses'],
  });
  assert.deepEqual(co.assignImprintAxes([]), {});
});

test('openImprint: opens beat + assigns, tally has 4 pending axes + no hint', () => {
  const co = mk();
  const tally = co.openImprint({ connectedPlayerIds: ['a', 'b', 'c', 'd'] });
  assert.equal(tally.open, true);
  assert.equal(tally.axes_total, 4);
  assert.equal(tally.axes_marked, 0);
  assert.equal(tally.axes_pending.length, 4);
  assert.equal(tally.all_axes_marked, false);
  assert.equal(tally.branco_biome_hint, null);
});

test('submitImprintMark on a closed beat throws imprint_not_open', () => {
  const co = mk();
  assert.throws(
    () => co.submitImprintMark('a', { axis: 'locomotion', value: 'VELOCE' }),
    /imprint_not_open/,
  );
});

test('device-authority: only the assigned owner may mark an axis', () => {
  const co = mk();
  co.openImprint({ connectedPlayerIds: ['a', 'b', 'c', 'd'] }); // a=locomotion
  // a owns locomotion -> ok
  const t = co.submitImprintMark('a', { axis: 'locomotion', value: 'VELOCE' });
  assert.equal(t.per_axis.locomotion.value, 'VELOCE');
  assert.equal(t.per_axis.locomotion.by, 'a');
  // a does NOT own offense -> axis_not_assigned
  assert.throws(
    () => co.submitImprintMark('a', { axis: 'offense', value: 'PROFONDA' }),
    /axis_not_assigned/,
  );
  // ghost player not in assignment -> player_not_assigned
  assert.throws(
    () => co.submitImprintMark('zz', { axis: 'defense', value: 'DURA' }),
    /player_not_assigned/,
  );
});

test('mark validates axis + value (no silent accept)', () => {
  const co = mk();
  co.openImprint({ connectedPlayerIds: ['a', 'b', 'c', 'd'] });
  assert.throws(
    () => co.submitImprintMark('a', { axis: 'bogus', value: 'VELOCE' }),
    /invalid_axis/,
  );
  assert.throws(
    () => co.submitImprintMark('a', { axis: 'locomotion', value: 'BOGUS' }),
    /invalid_value/,
  );
  assert.throws(
    () => co.submitImprintMark('', { axis: 'locomotion', value: 'VELOCE' }),
    /player_id_required/,
  );
});

test('all 4 axes marked (4 players) -> cosmetic hint stamped, beat closes', () => {
  const co = mk();
  const assignment = co.openImprint({ connectedPlayerIds: ['a', 'b', 'c', 'd'] }).assignment;
  markSavana(co, assignment);
  const t = co.imprintTally();
  assert.equal(t.all_axes_marked, true);
  assert.equal(t.open, false, 'beat auto-closes on completion');
  assert.deepEqual(t.branco_biome_hint, {
    leans_toward: 'savana',
    weights: { savana: 1 },
    // D7: additive diegetic tendency descriptor (structure only; prose = client HITL).
    tendency: {
      leans_toward: 'savana',
      i18n_key: 'imprint.branco_tendency',
      vars: { biome: 'savana' },
      placeholder: 'TODO_IMPRINT_TENDENCY_PROSE',
    },
  });
});

test('N=2 scaling: each player owns 2 axes, all 4 -> hint', () => {
  const co = mk();
  const assignment = co.openImprint({ connectedPlayerIds: ['a', 'b'] }).assignment;
  // a: locomotion+defense, b: offense+senses
  assert.deepEqual(assignment, { a: ['locomotion', 'defense'], b: ['offense', 'senses'] });
  markSavana(co, assignment);
  const t = co.imprintTally();
  assert.equal(t.all_axes_marked, true);
  assert.equal(t.branco_biome_hint.leans_toward, 'savana');
});

test('forceCompleteImprint: fills pending axes with defaults + stamps hint', () => {
  const co = mk();
  co.openImprint({ connectedPlayerIds: ['a', 'b', 'c', 'd'] });
  co.submitImprintMark('a', { axis: 'locomotion', value: 'VELOCE' });
  const t = co.forceCompleteImprint();
  assert.equal(t.all_axes_marked, true);
  assert.equal(t.open, false);
  // defaults: offense PROFONDA, defense DURA, senses LONTANO + locomotion VELOCE -> savana
  assert.equal(t.branco_biome_hint.leans_toward, 'savana');
  assert.equal(t.per_axis.offense.by, null, 'defaulted axis has no submitter');
});

test('cancelImprint: abandons the beat, no hint, marks cleared', () => {
  const co = mk();
  const assignment = co.openImprint({ connectedPlayerIds: ['a', 'b', 'c', 'd'] }).assignment;
  co.submitImprintMark('a', { axis: 'locomotion', value: 'VELOCE' });
  const t = co.cancelImprint();
  assert.equal(t.open, false);
  assert.equal(t.axes_marked, 0);
  assert.equal(t.branco_biome_hint, null);
  assert.equal(t.assignment, null);
});

test('run (re)start resets the imprint beat (hint is run-scoped)', () => {
  const co = mk();
  const assignment = co.openImprint({ connectedPlayerIds: ['a', 'b', 'c', 'd'] }).assignment;
  markSavana(co, assignment);
  assert.ok(co.imprintTally().branco_biome_hint, 'hint set pre-reset');
  co.startRun({ scenarioStack: ['enc_tutorial_01'] }); // phase lobby -> character_creation
  const t = co.imprintTally();
  assert.equal(t.open, false);
  assert.equal(t.branco_biome_hint, null);
  assert.equal(t.axes_marked, 0);
});

test('hint is NEVER a biome assignment: weights only, no biome_id field', () => {
  const co = mk();
  const assignment = co.openImprint({ connectedPlayerIds: ['a', 'b', 'c', 'd'] }).assignment;
  markSavana(co, assignment);
  const hint = co.imprintTally().branco_biome_hint;
  assert.ok(!('biome_id' in hint), 'must not bind a biome');
  assert.ok(hint.weights && typeof hint.weights === 'object');
  const sum = Object.values(hint.weights).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
});

// --- warning-only deadline timer (master-dd 2026-06-23: warn, never auto-default) ---

// Orchestrator with an injected fake scheduler: captures the armed callback so the test can
// fire the deadline deterministically (mirror the lethal-consent timer tests).
function mkTimed(hostId = 'p_h') {
  let captured = null;
  const co = new CoopOrchestrator({
    roomCode: 'IMPR',
    hostId,
    now: () => 1000,
    setTimeoutFn: (cb) => {
      captured = cb;
      return { unref() {} };
    },
    clearTimeoutFn: () => {},
  });
  return { co, fire: () => (captured ? captured() : undefined), armed: () => captured !== null };
}

test('imprint warning timer: fires -> flag + onTimeout, beat STAYS open, no auto-default', () => {
  const { co, fire } = mkTimed();
  let broadcasts = 0;
  co.openImprint({
    connectedPlayerIds: ['a', 'b', 'c', 'd'],
    timeoutMs: 45000,
    onTimeout: () => (broadcasts += 1),
  });
  assert.equal(co.imprintTally().timeout_warning, false, 'no warning before the deadline');
  fire();
  const t = co.imprintTally();
  assert.equal(t.timeout_warning, true, 'flag set on fire');
  assert.equal(t.open, true, 'beat stays OPEN (warning-only)');
  assert.equal(t.axes_marked, 0, 'NO auto-default');
  assert.equal(broadcasts, 1, 'onTimeout invoked so the transport re-broadcasts');
});

test('imprint warning cleared on complete / force / cancel', () => {
  let h = mkTimed();
  const asg = h.co.openImprint({
    connectedPlayerIds: ['a', 'b', 'c', 'd'],
    timeoutMs: 45000,
    onTimeout() {},
  }).assignment;
  h.fire();
  assert.equal(h.co.imprintTally().timeout_warning, true);
  markSavana(h.co, asg);
  assert.equal(h.co.imprintTally().timeout_warning, false, 'cleared when the quorum completes');

  h = mkTimed();
  h.co.openImprint({ connectedPlayerIds: ['a', 'b', 'c', 'd'], timeoutMs: 45000, onTimeout() {} });
  h.fire();
  h.co.forceCompleteImprint();
  assert.equal(h.co.imprintTally().timeout_warning, false, 'cleared on host force');

  h = mkTimed();
  h.co.openImprint({ connectedPlayerIds: ['a', 'b'], timeoutMs: 45000, onTimeout() {} });
  h.fire();
  h.co.cancelImprint();
  assert.equal(h.co.imprintTally().timeout_warning, false, 'cleared on host cancel');
});

test('imprint timer: not armed at timeoutMs<=0; fire after close is a guarded no-op', () => {
  const noTimer = mkTimed();
  noTimer.co.openImprint({ connectedPlayerIds: ['a', 'b', 'c', 'd'], timeoutMs: 0 });
  assert.equal(noTimer.armed(), false, 'no timer armed at timeoutMs=0');

  const h = mkTimed();
  const asg = h.co.openImprint({
    connectedPlayerIds: ['a', 'b', 'c', 'd'],
    timeoutMs: 45000,
    onTimeout() {},
  }).assignment;
  markSavana(h.co, asg); // closes the beat (+ clears the timer)
  h.fire(); // late fire
  assert.equal(
    h.co.imprintTally().timeout_warning,
    false,
    'late fire does not re-flag a closed beat',
  );
});
