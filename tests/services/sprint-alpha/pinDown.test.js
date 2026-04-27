// Sprint α — Pin Down suppress fire tests (XCOM 2 pattern).
//
// 4 cases: apply pinned, decay 2 turns, attack mod check, action available.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyPinDown,
  getPinPenalty,
  decayPin,
  PIN_DURATION,
  PIN_AP_COST,
  PIN_ATTACK_PENALTY,
} = require('../../../apps/backend/services/combat/pinDown');

test('pinDown: apply imposta status.pinned = 2 + spende 1 AP', () => {
  const actor = { ap_remaining: 2 };
  const target = { hp: 5, status: {} };
  const r = applyPinDown(actor, target);
  assert.equal(r.ok, true);
  assert.equal(actor.ap_remaining, 1, 'spent 1 AP');
  assert.equal(target.status.pinned, PIN_DURATION);
  assert.equal(r.pinned_turns, 2);
});

test('pinDown: decay 2 turni a 0', () => {
  const unit = { status: { pinned: 2 } };
  decayPin(unit);
  assert.equal(unit.status.pinned, 1);
  assert.equal(getPinPenalty(unit), PIN_ATTACK_PENALTY, 'still active at 1');
  decayPin(unit);
  assert.equal(unit.status.pinned, 0);
  assert.equal(getPinPenalty(unit), 0, 'decayed → no penalty');
});

test('pinDown: getPinPenalty -2 se pinned > 0, 0 altrimenti', () => {
  assert.equal(getPinPenalty({ status: { pinned: 1 } }), PIN_ATTACK_PENALTY);
  assert.equal(getPinPenalty({ status: { pinned: 0 } }), 0);
  assert.equal(getPinPenalty({ status: {} }), 0);
  assert.equal(getPinPenalty({}), 0);
  assert.equal(getPinPenalty(null), 0);
});

test('pinDown: action_available checks (insufficient AP / dead target)', () => {
  // No AP
  const r1 = applyPinDown({ ap_remaining: 0 }, { hp: 5, status: {} });
  assert.equal(r1.ok, false);
  assert.equal(r1.reason, 'insufficient_ap');
  // Dead target
  const r2 = applyPinDown({ ap_remaining: 2 }, { hp: 0, status: {} });
  assert.equal(r2.ok, false);
  assert.equal(r2.reason, 'target_dead');
  // No actor
  const r3 = applyPinDown(null, { hp: 5 });
  assert.equal(r3.ok, false);
  // AP_COST sanity
  assert.equal(PIN_AP_COST, 1);
});
