// TKT-M14-B Phase A — Conviction system unit tests.
//
// Cover acceptance criteria scope ticket §2 within Phase A bound:
//   AC1: tracker aggrega 3 axis da raw event log → tests 1-4.
//   AC2: recruit gate utility>=80 vs liberty>=70 rifiuta           → test 6.
//   AC3: kill/assist/move semantic → axis delta correct            → tests 2-5.
//   AC4: debrief snapshot conviction visibile end-of-encounter     → test 7
//        (vcSnapshot per_actor[uid].conviction_axis presente).
//   AC5: test suite 8+ coverage                                    → 9 tests.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  AXIS_KEYS,
  BASELINE,
  initialAxis,
  applyDelta,
  classifyEvent,
  evaluateConviction,
  checkRecruitGate,
  buildConvictionSnapshot,
} = require('../../apps/backend/services/convictionEngine');

const { buildVcSnapshot } = require('../../apps/backend/services/vcScoring');

test('convictionEngine: initialAxis returns 50/50/50 baseline', () => {
  const axis = initialAxis();
  assert.equal(axis.utility, 50);
  assert.equal(axis.liberty, 50);
  assert.equal(axis.morality, 50);
});

test('convictionEngine: applyDelta clamps within 0..100 bounds', () => {
  const lowFloor = applyDelta({ utility: 2, liberty: 50, morality: 50 }, { utility: -10 });
  assert.equal(lowFloor.utility, 0);
  const highCeil = applyDelta({ utility: 98, liberty: 50, morality: 50 }, { utility: +20 });
  assert.equal(highCeil.utility, 100);
  const noChange = applyDelta({ utility: 50, liberty: 50, morality: 50 }, {});
  assert.equal(noChange.utility, 50);
});

test('convictionEngine: classifyEvent kill with mercy flag → morality+, utility-', () => {
  const delta = classifyEvent({
    action_type: 'kill',
    actor_id: 'unit_1',
    flags: { mercy: true },
  });
  assert.ok(delta);
  assert.equal(delta.morality, 5);
  assert.equal(delta.utility, -2);
});

test('convictionEngine: classifyEvent kill low_hp no mercy → utility+, morality-', () => {
  const delta = classifyEvent({
    action_type: 'kill',
    actor_id: 'unit_1',
    target_hp_before: 2,
    flags: {},
  });
  assert.ok(delta);
  assert.equal(delta.utility, 3);
  assert.equal(delta.morality, -1);
});

test('convictionEngine: classifyEvent assist (heal) → morality+, utility+', () => {
  const delta = classifyEvent({ action_type: 'assist', actor_id: 'unit_1' });
  assert.ok(delta);
  assert.equal(delta.morality, 2);
  assert.equal(delta.utility, 1);
});

test('convictionEngine: evaluateConviction aggregates events across multiple actors', () => {
  const events = [
    { action_type: 'kill', actor_id: 'unit_1', flags: { mercy: true } },
    { action_type: 'assist', actor_id: 'unit_1' },
    { action_type: 'kill', actor_id: 'unit_2', target_hp_before: 1, flags: {} },
  ];
  const units = [{ id: 'unit_1' }, { id: 'unit_2' }];
  const result = evaluateConviction(events, units);
  // unit_1 = mercy (mor+5, util-2) + assist (mor+2, util+1) → mor=57, util=49
  assert.equal(result.unit_1.morality, 57);
  assert.equal(result.unit_1.utility, 49);
  assert.equal(result.unit_1.events_classified, 2);
  // unit_2 = low_hp kill (util+3, mor-1) → util=53, mor=49
  assert.equal(result.unit_2.utility, 53);
  assert.equal(result.unit_2.morality, 49);
});

test('convictionEngine: checkRecruitGate utility-high NPC refuses liberty-high player (AC2)', () => {
  const gate = checkRecruitGate(
    { utility: 85, liberty: 30, morality: 50 },
    { utility: 40, liberty: 75, morality: 50 },
  );
  assert.equal(gate.eligible, false);
  assert.equal(gate.reason, 'utility_high_vs_liberty_high');

  const okGate = checkRecruitGate(
    { utility: 50, liberty: 50, morality: 50 },
    { utility: 50, liberty: 50, morality: 50 },
  );
  assert.equal(okGate.eligible, true);
});

test('convictionEngine: buildConvictionSnapshot seeds all roster units even without events', () => {
  const session = { events: [], units: [{ id: 'a' }, { id: 'b' }] };
  const snap = buildConvictionSnapshot(session);
  assert.equal(snap.a.utility, 50);
  assert.equal(snap.b.morality, 50);
  assert.equal(snap.a.events_classified, 0);
});

test('vcScoring: buildVcSnapshot per_actor includes conviction_axis (debrief surface)', () => {
  const session = {
    session_id: 'test_session',
    grid: { width: 6 },
    units: [
      { id: 'unit_1', controlled_by: 'player', max_hp: 10 },
      { id: 'unit_2', controlled_by: 'sistema', max_hp: 10 },
    ],
    events: [
      { action_type: 'attack', actor_id: 'unit_1', target_id: 'unit_2', result: 'hit', turn: 1 },
      { action_type: 'assist', actor_id: 'unit_1', turn: 2 },
    ],
    cap_pt_used: 0,
  };
  const snap = buildVcSnapshot(session, {});
  assert.ok(snap.per_actor.unit_1);
  assert.ok(snap.per_actor.unit_1.conviction_axis);
  for (const key of AXIS_KEYS) {
    const v = snap.per_actor.unit_1.conviction_axis[key];
    assert.ok(Number.isFinite(v), `${key} must be finite, got ${v}`);
    assert.ok(v >= 0 && v <= 100, `${key} must be 0..100, got ${v}`);
  }
  // assist should have nudged morality up
  assert.ok(
    snap.per_actor.unit_1.conviction_axis.morality >= BASELINE,
    `morality after assist >= baseline, got ${snap.per_actor.unit_1.conviction_axis.morality}`,
  );
});
