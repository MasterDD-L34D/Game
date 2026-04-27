// Sprint α — Morale check tests (Battle Brothers pattern).
//
// 5 cases: threshold pass/fail, ally KO trigger, status integration,
// decay (via universal sessionRoundBridge tick — qui solo guard),
// rage trigger separate (rage_inversion + die === 1).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  checkMorale,
  applyMoraleStatus,
  EVENT_THRESHOLDS,
  PANIC_DURATION_DEFAULT,
  RAGE_DURATION_DEFAULT,
} = require('../../../apps/backend/services/combat/morale');

// Mock RNG factory: returns a function that yields specified d20 values.
function fixedDie(value) {
  // value 1..20; converte a rng() ∈ [0,1) tale che floor(rng*20)+1 === value
  const r = (value - 1) / 20 + 0.001;
  return () => r;
}

test('morale: threshold pass — high roll non triggera (score >= threshold)', () => {
  const unit = { status: {} };
  // ally_killed_adjacent threshold = 12. Die 18 → score 18 >= 12 → no trigger.
  const r = checkMorale(unit, 'ally_killed_adjacent', { rng: fixedDie(18) });
  assert.equal(r.triggered, false);
  assert.equal(r.threshold, 12);
  assert.equal(unit.status.panic, undefined);
});

test('morale: ally_killed_adjacent triggera panic 2 (low roll)', () => {
  const unit = { status: {} };
  // Die 5 → score 5 < 12 → trigger panic 2 (default)
  const r = checkMorale(unit, 'ally_killed_adjacent', { rng: fixedDie(5) });
  assert.equal(r.triggered, true);
  assert.equal(r.status, 'panic');
  assert.equal(r.duration, PANIC_DURATION_DEFAULT);
  assert.equal(unit.status.panic, 2);
});

test('morale: status integration — applyMoraleStatus additivo (max)', () => {
  const unit = { status: { panic: 1 } };
  applyMoraleStatus(unit, 'panic', 3);
  assert.equal(unit.status.panic, 3, 'max applied');
  applyMoraleStatus(unit, 'panic', 1);
  assert.equal(unit.status.panic, 3, 'lower duration NON sovrascrive');
  applyMoraleStatus(unit, 'rage', 1);
  assert.equal(unit.status.rage, 1);
});

test('morale: decay tick — status.panic decrementa via universal loop guard', () => {
  // Universal decay è in sessionRoundBridge.js:708-716. Qui validiamo
  // shape semantica: status field intero >0 deve essere decrementabile.
  const unit = { status: {} };
  checkMorale(unit, 'enemy_critical_hit', { rng: fixedDie(2) });
  // threshold 14, score 2 → trigger panic 2.
  assert.equal(unit.status.panic, PANIC_DURATION_DEFAULT);
  // Simulate 2 universal decay ticks.
  unit.status.panic = unit.status.panic - 1;
  assert.equal(unit.status.panic, 1);
  unit.status.panic = unit.status.panic - 1;
  assert.equal(unit.status.panic, 0);
});

test('morale: rage trigger separate (rage_inversion + die===1 fumble)', () => {
  const unit = { status: {} };
  // ally_killed_adjacent has rage_inversion=true. Die 1 → fumble → rage 1.
  const r = checkMorale(unit, 'ally_killed_adjacent', { rng: fixedDie(1) });
  assert.equal(r.triggered, true);
  assert.equal(r.status, 'rage');
  assert.equal(r.duration, RAGE_DURATION_DEFAULT);
  assert.equal(unit.status.rage, 1);
  assert.equal(unit.status.panic, undefined, 'no panic on rage path');
  // enemy_critical_hit has rage_inversion=false → die===1 still panic
  const unit2 = { status: {} };
  const r2 = checkMorale(unit2, 'enemy_critical_hit', { rng: fixedDie(1) });
  assert.equal(r2.status, 'panic');
  // Threshold sanity
  assert.equal(EVENT_THRESHOLDS.enemy_critical_hit, 14);
});
