// apps/backend/services/combat/losReposition.js
'use strict';

// Budget-aware LOS-repositioning (COMBAT_LOS_ENABLED, default OFF).
// When a unit wants to attack but has no line of sight to any in-range enemy,
// stepToRegainLos returns a tile within `opts.budget` Manhattan steps (default
// 1 = the original greedy 4-neighbor behavior) that reopens a clear firing
// line to an enemy that would be in attack_range from that tile -- or null if
// no legal tile within budget reopens LOS (caller then falls back to its
// normal approach: never worse than today). Movement is a single AP-charged
// action (AP cost = Manhattan distance, session.js SPRINT_008), so a budget-N
// tile is reachable in ONE move; the metric prefers the CHEAPEST tile first
// (preserve AP for attacks), then the nearest LOS-clear enemy, then x-then-y.
// Pure + deterministic. Shared by the sim player-proxy and the prod Sistema
// AI so the ratify measures one AI.
//
// COMBAT_LOS_REPOSITION_MODE (probe-only knob, read per-call, default unset):
//   'off'  -> repositioning disabled (null) on both seams, LOS gate untouched
//             (the repos-OFF control arm: LOS ON, no repositioning).
//   'step' -> budget clamped to 1 (the shipped greedy arm, for step-vs-budget
//             A/B probes).
// Neither value is set in production; unset -> opts.budget honored.
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
  const mode = process.env.COMBAT_LOS_REPOSITION_MODE;
  if (mode === 'off') return null;
  if (!actor || !actor.position || !Array.isArray(enemies) || enemies.length === 0) return null;

  const width = (grid && grid.width) || 6;
  const height = (grid && grid.height) || 6;
  const occupied = (opts && opts.occupied) || new Set();
  const range = actor.attack_range ?? 1;
  const rawBudget = Number.isFinite(opts && opts.budget) ? opts.budget : 1;
  const budget = mode === 'step' ? Math.min(1, rawBudget) : rawBudget;
  if (budget < 1) return null;
  const live = enemies.filter((e) => e && e.position && (e.hp ?? 0) > 0);
  if (live.length === 0) return null;

  // Candidates: every in-bounds, non-occupied tile within `budget` Manhattan
  // steps of the actor (the engine charges AP = distance in one move action;
  // only the DESTINATION is occupancy-checked -- session.js move handler).
  // Deterministic scan order: x asc then y asc; strict `<` comparisons keep
  // the first tile on ties, so the metric is (cost, nearest-clear-enemy, x, y)
  // lexicographic. With budget=1 this reduces to the original 4-neighbor
  // greedy step (same candidates, same winner).
  const { x, y } = actor.position;
  let best = null;
  let bestCost = Infinity;
  let bestDist = Infinity;
  for (let cx = Math.max(0, x - budget); cx <= Math.min(width - 1, x + budget); cx += 1) {
    for (let cy = Math.max(0, y - budget); cy <= Math.min(height - 1, y + budget); cy += 1) {
      const cost = Math.abs(cx - x) + Math.abs(cy - y);
      if (cost < 1 || cost > budget) continue;
      if (cost > bestCost) continue;
      if (occupied.has(`${cx},${cy}`)) continue;
      const c = { x: cx, y: cy };
      let nearest = Infinity;
      for (const e of live) {
        const d = _manhattan(c, e.position);
        if (d <= range && d < nearest && losClearOnGrid(grid, c, e.position)) nearest = d;
      }
      if (nearest === Infinity) continue;
      if (cost < bestCost || nearest < bestDist) {
        best = c;
        bestCost = cost;
        bestDist = nearest;
      }
    }
  }
  return best;
}

module.exports = { stepToRegainLos };
