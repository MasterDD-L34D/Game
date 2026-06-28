// apps/backend/services/combat/anchorState.js
//
// radici_ancora_planare (creature-trait kit, trait 12 -- treant). The last defensive
// slice of the 12-trait kit. "Molto tanky da fermo": the carrier is anchored at
// turn/round start (status `ancorato`, DR2) and a `move` breaks the anchor, forfeiting
// the DR for that round (consumer at the move-gate). The DR is realized at the real
// mitigation seam in performAttack, exactly like computeCortecciaDR (slice 3).
//
// FRAMING (master-dd verdict 2026-06-23): radici is an ALWAYS-ON trait-slice, NOT
// gated on MOVE_TERRAIN_COST_ENABLED -- the defensive DR is decoupled from the
// terrain-cost substrate (faithful to verdict C, which never named the flag).
// Carrier authored 2026-06-28 (PR #3050: cactus-weaver ONLY -- a DORMANT sessile
// ingegnere_radicante with no live encounter appearance, so band-neutral. NOT
// ferrocolonia-magnetotattica [live enemy in the CALIBRATED badlands pilot -- DR2
// value + re-cal is a master-dd ratification, decision 2026-06-28], NOT sentinella-radice
// [apex_neutral cameo contractually balance-inert]). Band re-validated: ~0 for MOBILE
// carriers (greedy AI moves -> breakAnchor; PR #3043); a SESSILE carrier never moves ->
// permanent DR2 = the intended "tanky da fermo"; DR2 stays PROPOSED, re-validate with a
// hold-capable / human policy (greedy-AI sims cannot see the held-DR band).
//
// Pure (mutates the carrier's status object-map in place).

'use strict';

const RADICI_TRAIT = 'radici_ancora_planare';
const ANCORATO = 'ancorato';
const ANCHOR_DR = 2;

function hasTrait(unit) {
  const raw = unit && Array.isArray(unit.traits) ? unit.traits : [];
  for (const t of raw) {
    if (typeof t === 'string' && t === RADICI_TRAIT) return true;
    if (t && typeof t === 'object' && t.id === RADICI_TRAIT) return true;
  }
  return false;
}

/**
 * Producer: anchor a carrier at turn/round start. Sets `ancorato` (DR2) on the
 * carrier's status map. Idempotent. No-op for non-carriers. Not flag-gated.
 *
 * @param {object} unit (mutated)
 */
function applyAnchorAtActivation(unit) {
  if (!unit || !hasTrait(unit)) return;
  if (!unit.status || typeof unit.status !== 'object') unit.status = {};
  unit.status[ANCORATO] = ANCHOR_DR;
}

/**
 * Consumer (move-gate): a `move` breaks the anchor -> the carrier forfeits the DR
 * for the round. Safe no-op when not anchored.
 *
 * @param {object} unit (mutated)
 */
function breakAnchor(unit) {
  if (unit && unit.status && unit.status[ANCORATO]) {
    delete unit.status[ANCORATO];
    if (unit.status_intensity) delete unit.status_intensity[ANCORATO];
  }
}

/**
 * DR consumer: the anchor reduces incoming damage by ANCHOR_DR while `ancorato`
 * is up. Read at the damage-mitigation seam (next to computeCortecciaDR).
 *
 * @param {object} target
 * @returns {number} damage to subtract (0 when not anchored)
 */
function computeAnchorDR(target) {
  const st = target && target.status;
  if (st && !Array.isArray(st) && st[ANCORATO]) return ANCHOR_DR;
  return 0;
}

module.exports = {
  applyAnchorAtActivation,
  breakAnchor,
  computeAnchorDR,
  hasTrait,
  ANCORATO,
  ANCHOR_DR,
  RADICI_TRAIT,
};
