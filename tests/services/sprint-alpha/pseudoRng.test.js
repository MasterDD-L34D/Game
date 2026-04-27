// Sprint α — Pseudo-RNG mitigation tests (Phoenix Point pattern).
//
// 4 cases: streak threshold +5, reset on hit, scope per-actor isolato,
// back-compat zero-bonus per unit senza fields.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  initUnit,
  recordRoll,
  getStreakBonus,
  resetStreaks,
  MISS_STREAK_THRESHOLD,
  STREAK_BONUS,
} = require('../../../apps/backend/services/combat/pseudoRng');

test('pseudoRng: 3 miss consecutivi → +5 to_hit bonus', () => {
  const unit = {};
  initUnit(unit);
  recordRoll(unit, false);
  recordRoll(unit, false);
  assert.equal(getStreakBonus(unit), 0, 'sotto threshold no bonus');
  recordRoll(unit, false);
  assert.equal(unit.miss_streak, 3);
  assert.equal(getStreakBonus(unit), STREAK_BONUS, '3 miss = +5 bonus');
});

test('pseudoRng: hit resetta miss_streak', () => {
  const unit = { miss_streak: 5, hit_streak: 0 };
  initUnit(unit);
  assert.equal(getStreakBonus(unit), STREAK_BONUS);
  recordRoll(unit, true);
  assert.equal(unit.miss_streak, 0);
  assert.equal(unit.hit_streak, 1);
  assert.equal(getStreakBonus(unit), 0);
});

test('pseudoRng: per-actor scope isolato (2 unit indipendenti)', () => {
  const a = {};
  const b = {};
  recordRoll(a, false);
  recordRoll(a, false);
  recordRoll(a, false);
  recordRoll(b, true);
  assert.equal(getStreakBonus(a), STREAK_BONUS, 'a accumulated streak');
  assert.equal(getStreakBonus(b), 0, 'b unaffected');
  assert.equal(b.miss_streak, 0);
});

test('pseudoRng: back-compat zero-bonus su unit senza fields + null safety', () => {
  assert.equal(getStreakBonus({}), 0);
  assert.equal(getStreakBonus(null), 0);
  assert.equal(getStreakBonus(undefined), 0);
  assert.equal(MISS_STREAK_THRESHOLD, 3);
  // resetStreaks idempotent
  const unit = { miss_streak: 4 };
  resetStreaks(unit);
  assert.equal(unit.miss_streak, 0);
  assert.equal(unit.hit_streak, 0);
});
