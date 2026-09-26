// Sprint α (2026-04-28) — Pin Down suppress fire.
//
// Pattern source: XCOM 2 — "Suppression" mechanic.
// Strategy research §3 rank #3.
//
// Goal: aggiunge tactical control vector — l'attaccante spende 1 AP per
// imporre malus -2 attack al target per 2 turni (decay automatico via
// universal status[key] tick in sessionRoundBridge).
//
// Status field: unit.status.pinned (intero, 2 al apply).
// Universal decay già presente in sessionRoundBridge:708-716 decrementa di 1
// ogni turn-end. Quando arriva a 0, no penalty.
//
// Pure module. Helper expone apply / penalty / decay (decay opzionale per
// callers manuali; runtime decay è gratis via universal loop).
//
// API:
//   applyPinDown(actor, target)   — actor.ap_remaining -= 1, target.status.pinned = 2
//   getPinPenalty(unit)           — -2 attack_mod se unit.status.pinned > 0
//   decayPin(unit)                — manual decrement (callers non-bridge)
//
// Constants:
//   PIN_DURATION = 2
//   PIN_AP_COST = 1
//   PIN_ATTACK_PENALTY = -2

'use strict';

const PIN_DURATION = 2;
const PIN_AP_COST = 1;
const PIN_ATTACK_PENALTY = 2; // valore positivo, applicato come malus (sub)

/**
 * Apply pin down: spend 1 AP attacker, set target pinned 2 turni.
 *
 * @param {object} actor
 * @param {object} target
 * @returns {{ ok: boolean, ap_remaining?: number, pinned_turns?: number, reason?: string }}
 */
function applyPinDown(actor, target) {
  if (!actor || typeof actor !== 'object') return { ok: false, reason: 'no_actor' };
  if (!target || typeof target !== 'object') return { ok: false, reason: 'no_target' };
  if (Number(target.hp || 0) <= 0) return { ok: false, reason: 'target_dead' };
  const ap = Number(actor.ap_remaining || 0);
  if (ap < PIN_AP_COST) return { ok: false, reason: 'insufficient_ap' };
  actor.ap_remaining = ap - PIN_AP_COST;
  if (!target.status || typeof target.status !== 'object') target.status = {};
  // Refresh non-stack: imposta a max(current, PIN_DURATION).
  const cur = Number(target.status.pinned || 0);
  target.status.pinned = Math.max(cur, PIN_DURATION);
  return {
    ok: true,
    ap_remaining: actor.ap_remaining,
    pinned_turns: target.status.pinned,
  };
}

/**
 * Get attack penalty (positive number) applicabile a unit pinned.
 * Caller usa come `attack_mod_bonus -= getPinPenalty(actor)`.
 *
 * @param {object} unit
 * @returns {number} — 2 se pinned > 0, 0 altrimenti
 */
function getPinPenalty(unit) {
  if (!unit || typeof unit !== 'object') return 0;
  const pinned = Number(unit.status && unit.status.pinned) || 0;
  return pinned > 0 ? PIN_ATTACK_PENALTY : 0;
}

/**
 * Manual decay (callers che non passano per sessionRoundBridge universal loop).
 *
 * @param {object} unit
 * @returns {number} — nuovo valore pinned
 */
function decayPin(unit) {
  if (!unit || typeof unit !== 'object') return 0;
  if (!unit.status || typeof unit.status !== 'object') return 0;
  const cur = Number(unit.status.pinned || 0);
  if (cur <= 0) return 0;
  unit.status.pinned = cur - 1;
  return unit.status.pinned;
}

module.exports = {
  applyPinDown,
  getPinPenalty,
  decayPin,
  PIN_DURATION,
  PIN_AP_COST,
  PIN_ATTACK_PENALTY,
};
