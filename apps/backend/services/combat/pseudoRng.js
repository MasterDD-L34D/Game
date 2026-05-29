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

// ─────────────────────────────────────────────────────────────────
// Seedable global RNG (TKT-PLAYTEST-SEED, 2026-05-29).
//
// Canonical RNG provider for combat. `defaultRng` is a drop-in for
// Math.random: when UNSEEDED it delegates to Math.random (bit-for-bit
// production behavior, zero regression). When SEEDED (via seedRng, called
// from POST /api/session/start when the body carries a `seed`) it draws
// from a deterministic mulberry32 stream so a calibration run is
// reproducible bit-identical given the same seed.
//
// Module-global by design: one backend process runs one calibration
// session at a time per shard (LOBBY_WS_ENABLED=false, L-071), and each
// /start reseeds. Production never sends a seed -> unseeded -> Math.random.
//
// API:
//   seedRng(seed)  -> bool   set the stream to a finite numeric seed
//   clearSeed()              revert to Math.random passthrough
//   isSeeded()     -> bool   true when a deterministic stream is active
//   defaultRng()   -> [0,1)  next float (seeded stream or Math.random)
// ─────────────────────────────────────────────────────────────────

// Active deterministic generator, or null when unseeded (Math.random).
let _rngState = null;

/**
 * mulberry32 — compact, well-distributed 32-bit PRNG. Returns a function
 * producing floats in [0,1). Same well-known constants as the reference
 * implementation so the stream is portable/inspectable.
 */
function _mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pin the global RNG stream to a seed. Coerces numeric strings. Non-finite
 * input is rejected (returns false) and leaves the stream unseeded.
 * @returns {boolean} true if a deterministic stream is now active.
 */
function seedRng(seed) {
  const n = Number(seed);
  if (!Number.isFinite(n)) {
    _rngState = null;
    return false;
  }
  _rngState = _mulberry32(n >>> 0);
  return true;
}

/** Revert to Math.random passthrough (no determinism). */
function clearSeed() {
  _rngState = null;
}

/** @returns {boolean} true when a deterministic seeded stream is active. */
function isSeeded() {
  return _rngState !== null;
}

/**
 * Canonical combat RNG. Float in [0,1). Seeded stream when active, else
 * Math.random. Stable reference — safe for callers to capture once.
 */
function defaultRng() {
  return _rngState !== null ? _rngState() : Math.random();
}

module.exports = {
  initUnit,
  recordRoll,
  getStreakBonus,
  resetStreaks,
  MISS_STREAK_THRESHOLD,
  STREAK_BONUS,
  // Seedable global RNG (TKT-PLAYTEST-SEED).
  seedRng,
  clearSeed,
  isSeeded,
  defaultRng,
};
