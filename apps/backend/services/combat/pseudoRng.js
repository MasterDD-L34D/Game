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
// The stream is a mulberry32 cursor held as a plain integer (`_seedA`) plus an
// `_active` flag. Holding the cursor as an int (vs a closure) lets it be
// captured/restored, which is what makes PER-SESSION scoping possible
// (runWithSeed): a seeded calibration session keeps its own cursor on the
// session object, so concurrent sessions never clobber a shared stream
// (P2 review fix). Production never seeds -> _active stays false -> Math.random.
//
// API:
//   seedRng(seed)        -> bool   pin the GLOBAL stream to a finite numeric seed
//   clearSeed()                    revert global to Math.random passthrough
//   isSeeded()           -> bool   true when the global deterministic stream is active
//   defaultRng()         -> [0,1)  next float (seeded stream or Math.random)
//   captureState()       -> int|null   snapshot the cursor (null when unseeded)
//   restoreState(state)            install a cursor (null = unseeded)
//   runWithSeed(holder, fn)        run fn with holder.state installed, advance it,
//                                  save back, then restore the previous global
//                                  state. fn MUST be synchronous.
// ─────────────────────────────────────────────────────────────────

// mulberry32 cursor (int) + active flag. _active=false -> Math.random.
let _active = false;
let _seedA = 0;

/**
 * Pure mulberry32 step: advance cursor `a` once, return { a: nextCursor, v }
 * with v in [0,1). Same well-known constants (stream portable). Shared by the
 * global stream (_step) and per-holder streams (makeHolderRng) so they produce
 * one identical sequence from a given cursor.
 */
function _advance(a) {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { a, v: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
}

/** Advance the GLOBAL cursor once and return a float in [0,1). */
function _step() {
  const r = _advance(_seedA);
  _seedA = r.a;
  return r.v;
}

/**
 * Pin the global RNG stream to a seed. Coerces numeric strings. Non-finite
 * input is rejected (returns false) and leaves the stream unseeded.
 * @returns {boolean} true if a deterministic stream is now active.
 */
function seedRng(seed) {
  const n = Number(seed);
  if (!Number.isFinite(n)) {
    _active = false;
    return false;
  }
  _seedA = n >>> 0;
  _active = true;
  return true;
}

/** Revert to Math.random passthrough (no determinism). */
function clearSeed() {
  _active = false;
}

/** @returns {boolean} true when a deterministic seeded stream is active. */
function isSeeded() {
  return _active;
}

/**
 * Canonical combat RNG. Float in [0,1). Seeded stream when active, else
 * Math.random. Stable reference — safe for callers to capture once.
 */
function defaultRng() {
  return _active ? _step() : Math.random();
}

/** Snapshot the global cursor: the int when seeded, null when unseeded. */
function captureState() {
  return _active ? _seedA : null;
}

/** Install a cursor snapshot. null/undefined -> unseeded (Math.random). */
function restoreState(state) {
  if (state === null || state === undefined) {
    _active = false;
  } else {
    _seedA = state >>> 0;
    _active = true;
  }
}

/**
 * Scope a seeded stream to one synchronous block (P2 per-session fix).
 *
 * `holder` is a mutable `{ state: int|null }` carrying a session's RNG cursor.
 * Its state is installed before `fn`, advanced by `fn`'s defaultRng draws, then
 * saved back into `holder.state`; the previous global state is restored after,
 * so other sessions / nested callers are unaffected. `fn` MUST be synchronous
 * (no `await` between draws) for the isolation guarantee to hold — combat round
 * resolution (resolveRoundPure) is synchronous, which is where this is used.
 *
 * @param {{state: number|null}|null|undefined} holder
 * @param {Function} fn synchronous
 * @returns {*} fn's return value
 */
function runWithSeed(holder, fn) {
  const prevActive = _active;
  const prevA = _seedA;
  restoreState(holder ? holder.state : null);
  try {
    return fn();
  } finally {
    if (holder) holder.state = captureState();
    _active = prevActive;
    _seedA = prevA;
  }
}

/**
 * Build a session-scoped rng FUNCTION drawing directly from `holder.state`
 * (advancing + persisting it), independent of the global stream. Lets ASYNC
 * post-resolution paths (morale-on-kill, reinforcement spawn) keep drawing the
 * SAME per-session stream the synchronous runWithSeed block used -- safe across
 * `await`s and concurrent sessions because it never touches the global cursor
 * (Codex #2450 P1). holder null / holder.state null -> Math.random passthrough.
 * @param {{state: number|null}|null|undefined} holder
 * @returns {() => number}
 */
function makeHolderRng(holder) {
  return function holderRng() {
    if (!holder || holder.state === null || holder.state === undefined) {
      return Math.random();
    }
    const r = _advance(holder.state);
    holder.state = r.a;
    return r.v;
  };
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
  // Per-session scoping (TKT-PLAYTEST-SEED P2 review fix).
  captureState,
  restoreState,
  runWithSeed,
  makeHolderRng,
};
