'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyApRefill,
  normaliseUnit,
  publicSessionView,
} = require('../../apps/backend/routes/sessionHelpers');
const staminaFatigue = require('../../apps/backend/services/combat/staminaFatigue');

const FLAG = 'STAMINA_FATIGUE_ENABLED';
function withFlag(value, fn) {
  const prev = process.env[FLAG];
  if (value === undefined) delete process.env[FLAG];
  else process.env[FLAG] = value;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env[FLAG];
    else process.env[FLAG] = prev;
  }
}

test('applyApRefill: fatigued unit (flag ON) refills to max(1, cap-1)', () => {
  withFlag('true', () => {
    const unit = { ap: 2, fatica: 1, traits: [], status: {} };
    applyApRefill(unit);
    assert.equal(unit.ap_remaining, 1); // 2 - 1
  });
});

test('applyApRefill: fatigue penalty floors at 1, never 0', () => {
  withFlag('true', () => {
    const unit = { ap: 1, fatica: 5, traits: [], status: {} };
    applyApRefill(unit);
    assert.equal(unit.ap_remaining, 1); // max(1, 1-1) = 1, never a full turn loss
  });
});

test('applyApRefill: propriocezione tolerates fatica 1 (no penalty)', () => {
  withFlag('true', () => {
    const unit = { ap: 2, fatica: 1, traits: ['propriocezione'], status: {} };
    applyApRefill(unit);
    assert.equal(unit.ap_remaining, 2); // threshold 2 not reached
  });
});

test('applyApRefill: flag OFF -> no fatigue penalty (byte-identical refill)', () => {
  withFlag(undefined, () => {
    const unit = { ap: 2, fatica: 5, traits: [], status: {} };
    applyApRefill(unit);
    assert.equal(unit.ap_remaining, 2);
  });
});

test('normaliseUnit: fatica present (0) when flag ON, absent when OFF', () => {
  const onUnit = withFlag('true', () => normaliseUnit({ id: 'x', traits: [] }, 0));
  assert.equal(onUnit.fatica, 0);
  const offUnit = withFlag(undefined, () => normaliseUnit({ id: 'y', traits: [] }, 0));
  assert.equal('fatica' in offUnit, false);
});

// Task 4 — round-boundary accrue/decay -> next-round AP penalty (the production loop
// in applyEndOfRoundSideEffects calls accrueOrDecay per unit; exercised here at module
// level since the bridge is a per-session factory — see plan Task 4 Step 1).
test('accrue -> penalty: sprint round +1 fatica, next refill -1 AP', () => {
  withFlag('true', () => {
    const unit = {
      ap: 2,
      ap_remaining: 0,
      fatica: 0,
      traits: [],
      status: {},
      _tiles_voluntary_round: 2,
    };
    staminaFatigue.accrueOrDecay(unit); // round boundary
    assert.equal(unit.fatica, 1, 'sprint -> +1 fatica');
    assert.equal(unit._tiles_voluntary_round, 0, 'accumulator reset');
    applyApRefill(unit); // next round
    assert.equal(unit.ap_remaining, 1, 'fatigued -> -1 AP next round');
  });
});

test('decay -> recovery: non-sprint round clears fatica, full AP restored', () => {
  withFlag('true', () => {
    const unit = {
      ap: 2,
      ap_remaining: 2,
      fatica: 1,
      traits: [],
      status: {},
      _tiles_voluntary_round: 0,
    };
    staminaFatigue.accrueOrDecay(unit); // non-sprint -> decay
    assert.equal(unit.fatica, 0, 'decay -1 to 0');
    applyApRefill(unit);
    assert.equal(unit.ap_remaining, 2, 'recovered -> full AP');
  });
});

// Task 5 — band-neutrality: flag OFF -> neither the persisted `fatica` field nor the
// transient `_tiles_voluntary_round` accumulator leaks into the public session view.
test('band-neutral: flag OFF -> no fatigue fields in publicSessionView units', () => {
  withFlag(undefined, () => {
    const unit = normaliseUnit({ id: 'u', traits: [] }, 0);
    const session = {
      session_id: 's',
      turn: 1,
      units: [unit],
      grid: { width: 6, height: 6 },
      events: [],
    };
    const view = publicSessionView(session);
    assert.equal('fatica' in view.units[0], false, 'fatica absent when flag OFF');
    assert.equal('_tiles_voluntary_round' in view.units[0], false, 'accumulator absent when OFF');
  });
});
