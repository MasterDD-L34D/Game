// apps/backend/services/combat/membraneOsmotiche.js
//
// membrane_osmotiche (creature-trait mechanics slice 5, trait 7 -- otyugh).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//
// duration_absorb: the osmotic membrane absorbs the bite of incoming statuses --
// when a status is applied to the carrier, its duration is reduced by 1 (Darkest
// Dungeon bleed-resist). A 1-turn status reduced to 0 does NOT land (fully
// absorbed). Read at the status-apply seam in performAttack, BEFORE the cap merge.
//
// (The spec's second mode -- heal 1 at turn-start when adjacent to water/bog
// terrain -- is DEFERRED: the engine has no per-tile terrain substrate at runtime
// [unit.terrain_type is static/dormant, no 'bog' type, no grid terrain]. Surfaced
// for master-dd alongside the move/elevation substrate.)
//
// Pure. Band-neutral: no sim unit carries membrane_osmotiche, so absorbStatusDuration
// returns the input unchanged for every existing unit.

'use strict';

const MEMBRANE_TRAIT = 'membrane_osmotiche';
const ABSORB = 1;

function hasTrait(unit, traitId) {
  const raw = unit && Array.isArray(unit.traits) ? unit.traits : [];
  for (const t of raw) {
    if (typeof t === 'string' && t === traitId) return true;
    if (t && typeof t === 'object' && t.id === traitId) return true;
  }
  return false;
}

/**
 * Reduce an incoming status duration by ABSORB when the target carries the
 * membrane. Returns the (possibly reduced) duration; a result <= 0 means the
 * caller should NOT apply the status (fully absorbed). Non-carriers / non-numeric
 * inputs pass through unchanged.
 *
 * @param {object} opts
 * @param {object} opts.target the unit the status is being applied to
 * @param {number} opts.turns  the incoming status duration
 * @returns {number} the absorbed duration (or the original value if not absorbable)
 */
function absorbStatusDuration({ target, turns }) {
  if (!hasTrait(target, MEMBRANE_TRAIT)) return turns;
  const n = Number(turns);
  if (!Number.isFinite(n)) return turns;
  return Math.max(0, n - ABSORB);
}

module.exports = {
  absorbStatusDuration,
  hasTrait,
  MEMBRANE_TRAIT,
  ABSORB,
};
