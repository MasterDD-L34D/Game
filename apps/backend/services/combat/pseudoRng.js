// Sprint α (2026-04-28) — Pseudo-RNG mitigation.
//
// Pattern source: Phoenix Point — streak-bounded miss compensation.
// Strategy research §1 rank #1.
//
// Goal: cap "feels-bad" miss streaks senza killare varianza.
// Dopo N miss consecutivi un attaccante riceve +5 to_hit sul prossimo tiro.
// Reset streak su hit. Hit streak è tracciato ma non concede bonus
// (preserva downside risk; future iter potrà aggiungere malus).
//
// Pure module. Per-actor accumulators. Back-compat: zero-bonus se unit
// senza fields (helper init lazy).
//
// API:
//   initUnit(unit)                 — ensure miss_streak/hit_streak fields
//   recordRoll(unit, hit)          — incrementa streak corretto, reset opposite
//   getStreakBonus(unit)           — return +5 to_hit se miss_streak >= 3
//   resetStreaks(unit)             — encounter start
//
// Constants:
//   MISS_STREAK_THRESHOLD = 3      — quanti miss servono per attivare bonus
//   STREAK_BONUS = 5               — to_hit bonus quando threshold hit

'use strict';

const MISS_STREAK_THRESHOLD = 3;
const STREAK_BONUS = 5;

/**
 * Ensure pseudo-RNG fields present. Idempotent.
 */
function initUnit(unit) {
  if (!unit || typeof unit !== 'object') return unit;
  if (typeof unit.miss_streak !== 'number') unit.miss_streak = 0;
  if (typeof unit.hit_streak !== 'number') unit.hit_streak = 0;
  return unit;
}

/**
 * Record outcome di un attacco.
 * - hit=true:  hit_streak++, miss_streak=0
 * - hit=false: miss_streak++, hit_streak=0
 *
 * @param {object} unit — mutated in-place
 * @param {boolean} hit
 * @returns {{ miss_streak: number, hit_streak: number }}
 */
function recordRoll(unit, hit) {
  initUnit(unit);
  if (hit) {
    unit.hit_streak += 1;
    unit.miss_streak = 0;
  } else {
    unit.miss_streak += 1;
    unit.hit_streak = 0;
  }
  return { miss_streak: unit.miss_streak, hit_streak: unit.hit_streak };
}

/**
 * Return to_hit bonus se miss_streak >= MISS_STREAK_THRESHOLD.
 * Pure: legge solo lo stato corrente (caller decide quando applicare).
 *
 * @param {object} unit
 * @returns {number} — +5 se streak threshold raggiunto, 0 altrimenti
 */
function getStreakBonus(unit) {
  if (!unit || typeof unit !== 'object') return 0;
  const streak = Number(unit.miss_streak || 0);
  return streak >= MISS_STREAK_THRESHOLD ? STREAK_BONUS : 0;
}

/**
 * Reset streaks (encounter start).
 */
function resetStreaks(unit) {
  initUnit(unit);
  unit.miss_streak = 0;
  unit.hit_streak = 0;
  return unit;
}

module.exports = {
  initUnit,
  recordRoll,
  getStreakBonus,
  resetStreaks,
  MISS_STREAK_THRESHOLD,
  STREAK_BONUS,
};
