'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { applyApRefill, normaliseUnit } = require('../../apps/backend/routes/sessionHelpers');

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
