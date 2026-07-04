// apps/backend/services/combat/losReposition.js
'use strict';

// Greedy one-tile LOS-repositioning (COMBAT_LOS_ENABLED, default OFF).
// When a unit wants to attack but has no line of sight to any in-range enemy,
// stepToRegainLos returns a 4-neighbor tile that reopens a clear firing line to
// an enemy that would be in attack_range from that tile -- or null if no single
// legal step reopens LOS (caller then falls back to its normal approach: never
// worse than today). Pure + deterministic (tie-break: x then y). Shared by the
// sim player-proxy and the prod Sistema AI so the ratify measures one AI.
//
// The caller controls WHICH enemies are considered: stepToRegainLos opens LOS to
// the NEAREST in-range enemy present in `enemies` and may favor a different enemy
// than the one the caller was engaging -- so a caller that wants to keep sight on
// a specific target should pass only that target (the Sistema AI seam), while a
// caller that will shoot whoever is visible can pass all foes (the sim player seam).
// LOS is checked TERRAIN-ONLY here (losClearOnGrid without a units list); unit-body
// occlusion (units_block_los) is a separate dormant axis, not modeled by this step.
const { losClearOnGrid } = require('./losForGrid');

function _manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function stepToRegainLos(actor, enemies, grid, opts) {
  if (process.env.COMBAT_LOS_ENABLED !== 'true') return null;
  if (!actor || !actor.position || !Array.isArray(enemies) || enemies.length === 0) return null;

  const width = (grid && grid.width) || 6;
  const height = (grid && grid.height) || 6;
  const occupied = (opts && opts.occupied) || new Set();
  const range = actor.attack_range ?? 1;
  const live = enemies.filter((e) => e && e.position && (e.hp ?? 0) > 0);
  if (live.length === 0) return null;

  const { x, y } = actor.position;
  const candidates = [
    { x: x - 1, y },
    { x: x + 1, y },
    { x, y: y - 1 },
    { x, y: y + 1 },
  ]
    .filter(
      (c) => c.x >= 0 && c.y >= 0 && c.x < width && c.y < height && !occupied.has(`${c.x},${c.y}`),
    )
    .sort((a, b) => a.x - b.x || a.y - b.y);

  let best = null;
  let bestMetric = Infinity;
  for (const c of candidates) {
    let nearest = Infinity;
    for (const e of live) {
      if (_manhattan(c, e.position) <= range && losClearOnGrid(grid, c, e.position)) {
        const d = _manhattan(c, e.position);
        if (d < nearest) nearest = d;
      }
    }
    if (nearest < bestMetric) {
      bestMetric = nearest;
      best = c;
    }
  }
  return best;
}

module.exports = { stepToRegainLos };
