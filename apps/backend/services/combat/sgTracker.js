// V5 SG earn formula — Opzione C mixed (ADR-2026-04-26).
//
// Pure module. Tracks per-unit accumulators for damage taken/dealt,
// triggers +1 SG at threshold, enforces pool cap + per-turn earn cap.
//
// API:
//   initUnit(unit) — ensure SG fields present (idempotent)
//   accumulate(unit, { damage_taken?, damage_dealt?, turn_earned? })
//     → { earned, source, new_pool }
//   resetEncounter(unit) — reset pool + accumulators (encounter start)
//   beginTurn(unit) — reset per-turn earn counter
//
// Constants (from ADR):
//   DAMAGE_TAKEN_THRESHOLD = 5
//   DAMAGE_DEALT_THRESHOLD = 8
//   POOL_MAX = 3
//   EARN_PER_TURN_CAP = 2

'use strict';

const DAMAGE_TAKEN_THRESHOLD = 5;
const DAMAGE_DEALT_THRESHOLD = 8;
const POOL_MAX = 3;
const EARN_PER_TURN_CAP = 2;

/**
 * Ensure unit has SG fields. Idempotent (safe to call every turn).
 */
function initUnit(unit) {
  if (!unit || typeof unit !== 'object') return unit;
  if (typeof unit.sg !== 'number') unit.sg = 0;
  if (typeof unit.sg_taken_acc !== 'number') unit.sg_taken_acc = 0;
  if (typeof unit.sg_dealt_acc !== 'number') unit.sg_dealt_acc = 0;
  if (typeof unit.sg_earned_this_turn !== 'number') unit.sg_earned_this_turn = 0;
  return unit;
}

/**
 * Accumulate damage taken/dealt and resolve SG earn events.
 *
 * @param {object} unit — mutated in-place
 * @param {object} params
 * @param {number} [params.damage_taken=0]
 * @param {number} [params.damage_dealt=0]
 * @returns {{ earned: number, source: string[], new_pool: number }}
 */
function accumulate(unit, { damage_taken = 0, damage_dealt = 0 } = {}) {
  initUnit(unit);
  const takenRaw = Math.max(0, Number(damage_taken) || 0);
  const dealt = Math.max(0, Number(damage_dealt) || 0);
  // Ennea Stoico(9) stress_reduction consumer: riduce damage_taken accumulato
  // verso threshold SG. Cap 0.5 per evitare zero-stress exploit. Floor a 0.
  // Non tocca damage_dealt (il bonus è "stabilità emotiva", non difesa).
  const reduction = Math.min(0.5, Math.max(0, Number(unit.stress_reduction_bonus || 0)));
  const taken = takenRaw * (1 - reduction);
  unit.sg_taken_acc += taken;
  unit.sg_dealt_acc += dealt;

  let earned = 0;
  const source = [];
  const canEarnThisTurn = EARN_PER_TURN_CAP - unit.sg_earned_this_turn;
  if (canEarnThisTurn <= 0 || unit.sg >= POOL_MAX) {
    return { earned: 0, source, new_pool: unit.sg };
  }

  // Taken threshold loop (can trigger multiple +1 if accumulator huge)
  while (
    unit.sg_taken_acc >= DAMAGE_TAKEN_THRESHOLD &&
    earned < canEarnThisTurn &&
    unit.sg < POOL_MAX
  ) {
    unit.sg_taken_acc -= DAMAGE_TAKEN_THRESHOLD;
    unit.sg += 1;
    earned += 1;
    source.push('taken');
  }
  // Dealt threshold loop
  while (
    unit.sg_dealt_acc >= DAMAGE_DEALT_THRESHOLD &&
    earned < canEarnThisTurn &&
    unit.sg < POOL_MAX
  ) {
    unit.sg_dealt_acc -= DAMAGE_DEALT_THRESHOLD;
    unit.sg += 1;
    earned += 1;
    source.push('dealt');
  }

  unit.sg_earned_this_turn += earned;
  return { earned, source, new_pool: unit.sg };
}

/**
 * Reset SG pool + accumulators a encounter start.
 */
function resetEncounter(unit) {
  initUnit(unit);
  unit.sg = 0;
  unit.sg_taken_acc = 0;
  unit.sg_dealt_acc = 0;
  unit.sg_earned_this_turn = 0;
  return unit;
}

/**
 * Reset per-turn earn counter a turn start.
 */
function beginTurn(unit) {
  initUnit(unit);
  unit.sg_earned_this_turn = 0;
  return unit;
}

/**
 * Spend SG pool. Returns true se sufficient + decrements.
 */
function spend(unit, amount = 1) {
  initUnit(unit);
  if (unit.sg < amount) return false;
  unit.sg -= amount;
  return true;
}

module.exports = {
  initUnit,
  accumulate,
  resetEncounter,
  beginTurn,
  spend,
  DAMAGE_TAKEN_THRESHOLD,
  DAMAGE_DEALT_THRESHOLD,
  POOL_MAX,
  EARN_PER_TURN_CAP,
};
