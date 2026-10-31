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
// terrain-heal (the spec's second mode): heal 1 at end-of-round when the carrier is
// adjacent (4-neighbour) to a water/bog terrain tile. UNBLOCKED by the move terrain-cost
// substrate (phase 1, #3012), which carries the encounter-authored grid.terrain_features
// onto the runtime session.grid -- so a per-tile terrain lookup now exists. Realized at
// end-of-round (mirrors filtriBioattivi's once-per-round "turn-start" cleanse).
//   NB (design-surface, flagged like prior slices): the canonical terrain tile vocabulary
//   (packs/.../balance/movement_profiles.yaml) ships `acqua_profonda` as the only water
//   type and NO 'bog'/'palude' tile. WATER_BOG_TERRAIN below is a small forward-compatible
//   superset; master-dd ratifies the final set when a bog tile is authored.
//
// Pure (applyTerrainHeal mutates unit.hp). Band-neutral: no sim unit carries
// membrane_osmotiche AND no encounter grid currently places a water/bog tile, so both
// absorbStatusDuration and applyTerrainHeal are no-ops for every existing unit/grid.

'use strict';

const MEMBRANE_TRAIT = 'membrane_osmotiche';
const ABSORB = 1;
const TERRAIN_HEAL = 1;
// Water/bog terrain tile types that feed the osmotic membrane. `acqua_profonda` is the
// canonical movement-profile water type; the rest are forward-compatible synonyms.
const WATER_BOG_TERRAIN = new Set(['acqua_profonda', 'acqua', 'palude', 'fango']);
// 4-neighbour offsets (same topology as combat/moveCost).
const ADJ = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

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

/**
 * End-of-round osmotic terrain-heal. For a living membrane carrier with a water/bog
 * tile on any 4-adjacent cell, heals TERRAIN_HEAL (capped at max_hp). Returns
 * {healed} only when a heal actually lands; null for a non-carrier, downed unit,
 * missing position/terrain lookup, no adjacent water, or a carrier already at full HP.
 *
 * @param {object} unit (mutated: unit.hp)
 * @param {object} opts
 * @param {(x:number,y:number)=>string|null} opts.terrainAt per-tile terrain lookup
 * @returns {{healed:number} | null}
 */
function applyTerrainHeal(unit, { terrainAt } = {}) {
  if (!unit || typeof unit !== 'object') return null;
  if (!hasTrait(unit, MEMBRANE_TRAIT)) return null;
  if (typeof terrainAt !== 'function') return null;
  const pos = unit.position;
  if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return null;
  const before = Number(unit.hp);
  if (!(before > 0)) return null; // a downed carrier does not regenerate

  let adjacentWater = false;
  for (const [dx, dy] of ADJ) {
    const type = terrainAt(pos.x + dx, pos.y + dy);
    if (type && WATER_BOG_TERRAIN.has(String(type))) {
      adjacentWater = true;
      break;
    }
  }
  if (!adjacentWater) return null;

  const max = Number(unit.max_hp || unit.hp || 0);
  if (!(max > before)) return null; // already at (or above) max -> no over-heal
  unit.hp = Math.min(max, before + TERRAIN_HEAL);
  const healed = Number(unit.hp) - before;
  return healed > 0 ? { healed } : null;
}

module.exports = {
  absorbStatusDuration,
  applyTerrainHeal,
  hasTrait,
  MEMBRANE_TRAIT,
  ABSORB,
  TERRAIN_HEAL,
  WATER_BOG_TERRAIN,
};
