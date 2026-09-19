// =============================================================================
// Overcharge Action — TKT-P6-AP3 (Pillar 6 fairness / FFT "charge a big move").
//
// Five abilities cost cost_ap: 3 (frozen_stasis / meteoric_shield / power_strike
// / sonic_blast / armatura guard) but the per-turn budget is 2 AP, so they were
// unplayable. Rather than flatten them to 2 AP, Overcharge lets the player spend
// a FULL SG gauge to gain +1 AP this turn — a telegraphed, once-per-turn
// "all-in" that turns the 3-AP ability into a deliberate moment, not spam.
//
// Symmetric twin of defyEngine:
//   defy:       spend 2 SG  -> pressure relief, -1 AP NEXT turn   (give up tempo)
//   overcharge: spend 3 SG  -> +1 AP THIS turn                    (borrow tempo)
//
// Cost = 3 SG. sgTracker POOL_MAX = 3, so an overcharge empties the gauge — by
// design it is rare and cannot chain. Effect: actor.ap_remaining += 1, gated to
// once per turn via actor.status.overcharged (the end-of-round decrement loop
// clears it like any other status counter).
//
// Pure: validate + apply mutations on `actor`. The route wraps with side-effects
// (append event, public view). Mirrors defyEngine / thoughtCabinet pattern.
// =============================================================================

'use strict';

const OVERCHARGE_SG_COST = 3;
const OVERCHARGE_AP_GAIN = 1;

const ERR_NOT_FOUND = 'actor_not_found';
const ERR_NOT_PLAYER = 'not_player_controlled';
const ERR_KO = 'actor_ko';
const ERR_INSUFFICIENT_SG = 'insufficient_sg';
const ERR_ALREADY_OVERCHARGED = 'already_overcharged';

/**
 * Validate that an actor can Overcharge. Pure — no mutation.
 * @returns {{ ok: true } | { ok: false, error: string, detail?: object }}
 */
function canOvercharge(actor) {
  if (!actor) return { ok: false, error: ERR_NOT_FOUND };
  if (actor.controlled_by !== 'player') return { ok: false, error: ERR_NOT_PLAYER };
  if (Number(actor.hp || 0) <= 0) return { ok: false, error: ERR_KO };
  if (actor.status && Number(actor.status.overcharged) > 0) {
    return { ok: false, error: ERR_ALREADY_OVERCHARGED };
  }
  const sg = Number(actor.sg || 0);
  if (sg < OVERCHARGE_SG_COST) {
    return { ok: false, error: ERR_INSUFFICIENT_SG, detail: { sg, required: OVERCHARGE_SG_COST } };
  }
  return { ok: true };
}

/**
 * Apply Overcharge: deduct SG, grant +1 ap_remaining this turn, mark the
 * once-per-turn guard. Mutates `actor` in place.
 * Returns { ok, before, after, cost } for telemetry/event log.
 */
function applyOvercharge(actor) {
  const guard = canOvercharge(actor);
  if (!guard.ok) return { ok: false, error: guard.error, detail: guard.detail || null };
  const sgBefore = Number(actor.sg || 0);
  const apBefore = Number(actor.ap_remaining ?? actor.ap ?? 0);
  actor.sg = Math.max(0, sgBefore - OVERCHARGE_SG_COST);
  actor.ap_remaining = apBefore + OVERCHARGE_AP_GAIN;
  if (!actor.status || typeof actor.status !== 'object') actor.status = {};
  // Once-per-turn guard; cleared by the end-of-round status decrement loop.
  actor.status.overcharged = 1;
  return {
    ok: true,
    before: { sg: sgBefore, ap_remaining: apBefore },
    after: { sg: actor.sg, ap_remaining: actor.ap_remaining, overcharged: 1 },
    cost: { sg: OVERCHARGE_SG_COST },
  };
}

module.exports = {
  OVERCHARGE_SG_COST,
  OVERCHARGE_AP_GAIN,
  ERR_NOT_FOUND,
  ERR_NOT_PLAYER,
  ERR_KO,
  ERR_INSUFFICIENT_SG,
  ERR_ALREADY_OVERCHARGED,
  canOvercharge,
  applyOvercharge,
};
