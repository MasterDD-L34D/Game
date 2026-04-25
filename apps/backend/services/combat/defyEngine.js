// =============================================================================
// Defy Action — Skiv ticket #5 (Sprint B [2/2]).
//
// Pillar 6 (Fairness): the Sistema escalates pressure unilaterally; player has
// no agency to push back. Defy gives the player a verb to spend SG to reduce
// pressure tier — explicit tradeoff: -1 AP next turn.
//
// Spec:
//   cost: 2 SG (deducted from actor.sg)
//   effect: pressure -25 (≈ 1 tier step), clamped at 0
//   penalty: -1 AP next turn (encoded via actor.status.defy_penalty = 2;
//            decrement loop drops it to 1 right after the action turn ends,
//            then resetAp consumes it on the subsequent refill, decrement
//            zeroes it. Net: exactly one AP-deficit turn.)
//
// Pure: validate + propose mutations. The route wraps with side-effects (write
// pressure, decrement SG, set status, append event). Mirrors the
// thoughtCabinet pattern (state machine returns { ok, error? }).
// =============================================================================

'use strict';

const DEFY_SG_COST = 2;
const DEFY_PRESSURE_RELIEF = 25;
const DEFY_AP_PENALTY_TURNS = 2; // see header note for why 2 (decrement happens once before next turn)

const ERR_NOT_FOUND = 'actor_not_found';
const ERR_NOT_PLAYER = 'not_player_controlled';
const ERR_KO = 'actor_ko';
const ERR_INSUFFICIENT_SG = 'insufficient_sg';
const ERR_NO_PRESSURE = 'no_pressure_to_relieve';

/**
 * Validate that an actor can call Defy. Pure — no mutation.
 * @returns {{ ok: true } | { ok: false, error: string, detail?: object }}
 */
function canDefy(actor, session) {
  if (!actor) return { ok: false, error: ERR_NOT_FOUND };
  if (actor.controlled_by !== 'player') return { ok: false, error: ERR_NOT_PLAYER };
  if (Number(actor.hp || 0) <= 0) return { ok: false, error: ERR_KO };
  const sg = Number(actor.sg || 0);
  if (sg < DEFY_SG_COST) {
    return { ok: false, error: ERR_INSUFFICIENT_SG, detail: { sg, required: DEFY_SG_COST } };
  }
  const pressure = Number(session && session.sistema_pressure);
  if (!Number.isFinite(pressure) || pressure <= 0) {
    return { ok: false, error: ERR_NO_PRESSURE, detail: { pressure: pressure || 0 } };
  }
  return { ok: true };
}

/**
 * Apply Defy: decrement SG, drop pressure by relief amount, mark AP penalty
 * via status counter. Mutates `actor` and `session` in place.
 * Returns { ok, before, after } describing the transition for telemetry/event log.
 */
function applyDefy(actor, session) {
  const guard = canDefy(actor, session);
  if (!guard.ok) return { ok: false, error: guard.error, detail: guard.detail || null };
  const sgBefore = Number(actor.sg || 0);
  const pressureBefore = Number(session.sistema_pressure || 0);
  // SG cost
  actor.sg = Math.max(0, sgBefore - DEFY_SG_COST);
  // Pressure relief (clamped at 0)
  const pressureAfter = Math.max(0, pressureBefore - DEFY_PRESSURE_RELIEF);
  session.sistema_pressure = pressureAfter;
  // AP penalty: bump status counter; decrement loop will drop it to
  // (DEFY_AP_PENALTY_TURNS - 1) at end of current turn, then resetAp consumes
  // -1 AP next turn, decrement again → 0.
  if (!actor.status || typeof actor.status !== 'object') actor.status = {};
  const existing = Number(actor.status.defy_penalty || 0);
  actor.status.defy_penalty = Math.max(existing, DEFY_AP_PENALTY_TURNS);
  return {
    ok: true,
    before: { sg: sgBefore, pressure: pressureBefore },
    after: { sg: actor.sg, pressure: pressureAfter, defy_penalty: actor.status.defy_penalty },
    relief: pressureBefore - pressureAfter,
    cost: { sg: DEFY_SG_COST, ap_next_turn: 1 },
  };
}

module.exports = {
  DEFY_SG_COST,
  DEFY_PRESSURE_RELIEF,
  DEFY_AP_PENALTY_TURNS,
  ERR_NOT_FOUND,
  ERR_NOT_PLAYER,
  ERR_KO,
  ERR_INSUFFICIENT_SG,
  ERR_NO_PRESSURE,
  canDefy,
  applyDefy,
};
