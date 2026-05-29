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
  seedRng,
  clearSeed,
  isSeeded,
  defaultRng,
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

// ─────────────────────────────────────────────────────────────────
// TKT-PLAYTEST-SEED — seedable global RNG (bit-identical calibration).
// defaultRng() is the canonical combat RNG provider: Math.random when
// unseeded (zero prod change), deterministic mulberry32 stream when seeded.
// ─────────────────────────────────────────────────────────────────

test('pseudoRng: defaultRng unseeded yields floats in [0,1)', () => {
  clearSeed();
  assert.equal(isSeeded(), false, 'starts unseeded');
  for (let i = 0; i < 50; i += 1) {
    const v = defaultRng();
    assert.ok(v >= 0 && v < 1, `value ${v} in [0,1)`);
  }
  assert.equal(isSeeded(), false, 'unseeded after draws (Math.random passthrough)');
});

test('pseudoRng: same seed → bit-identical sequence', () => {
  seedRng(12345);
  assert.equal(isSeeded(), true);
  const a = Array.from({ length: 20 }, () => defaultRng());
  seedRng(12345);
  const b = Array.from({ length: 20 }, () => defaultRng());
  assert.deepEqual(a, b, 'identical seed reproduces identical stream');
  // values are real floats in range, not constant
  assert.ok(new Set(a).size > 1, 'stream is not a constant');
  clearSeed();
});

test('pseudoRng: different seeds → different sequences', () => {
  seedRng(1);
  const a = Array.from({ length: 10 }, () => defaultRng());
  seedRng(2);
  const b = Array.from({ length: 10 }, () => defaultRng());
  assert.notDeepEqual(a, b, 'distinct seeds diverge');
  clearSeed();
});

test('pseudoRng: clearSeed reverts to Math.random passthrough', () => {
  seedRng(7);
  assert.equal(isSeeded(), true);
  clearSeed();
  assert.equal(isSeeded(), false);
  const v = defaultRng();
  assert.ok(v >= 0 && v < 1);
});

test('pseudoRng: seedRng rejects non-finite, stays unseeded', () => {
  clearSeed();
  assert.equal(seedRng('not-a-number'), false);
  assert.equal(isSeeded(), false);
  assert.equal(seedRng(undefined), false);
  assert.equal(isSeeded(), false);
  // numeric string is coerced and accepted
  assert.equal(seedRng('42'), true);
  assert.equal(isSeeded(), true);
  clearSeed();
});
