'use strict';
// Player-side AI policy (pure in behavior -- no I/O or session mutation; but see
// the Task 6 note below for the one backend LOS-rule import it now reuses),
// extracted from tests/smoke/ai-driven-sim.js
// (minimal closest-enemy attack; never spends cap_pt to keep fairness intact).
// Reused by the full-loop combatAdapter so the meta-loop combat runs the SAME
// player policy as the combat-sim, with no co-op lobby coupling.
//
// OA2 (SPEC-O): objective-aware. For zone-based objectives (capture_point /
// sabotage / escape / escort) the policy DRIVES units toward the target zone so
// non-elimination encounters can complete in the sim (making completion_rate a
// meaningful calibration metric). In-zone -- or elimination / survival -- falls
// back to closest-enemy. `objective` is optional: omitted => legacy behavior.
//
// Task 6 (Combat LOS slice 1): reuse the shared services/combat/losForGrid.js
// rule -- the SAME predicate the production AI seam uses (via its thin alias
// in apps/backend/services/ai/policy.js) -- so the batch-sim ratify measures
// "% shots blocked" against the real rule, not a re-implementation, and sim
// parity no longer rides on ai/policy.js.
// COMBAT_LOS_ENABLED default OFF -> losClearOnGrid always returns true -> the
// LOS filter keeps every in-range candidate (byte-identical to pre-Task-6).
const { losClearOnGrid } = require('../../apps/backend/services/combat/losForGrid');

const ZONE_PURSUIT_OBJECTIVES = new Set(['capture_point', 'sabotage', 'escape', 'escort']);

function dist(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function inZone(pos, zone) {
  return pos.x >= zone[0] && pos.x <= zone[2] && pos.y >= zone[1] && pos.y <= zone[3];
}

// One-tile greedy step toward a destination (Manhattan, x-axis tie-break).
function stepToward(actor, dest) {
  const dx = Math.sign(dest.x - actor.position.x);
  const dy = Math.sign(dest.y - actor.position.y);
  const stepX = Math.abs(dest.x - actor.position.x) >= Math.abs(dest.y - actor.position.y);
  const target_position = stepX
    ? { x: actor.position.x + dx, y: actor.position.y }
    : { x: actor.position.x, y: actor.position.y + dy };
  return { action_type: 'move', target_position };
}

// OA2 (item 7): tiles occupied by OTHER live units -- move targets the backend
// rejects with 400 "casella occupata" (session.js "niente overlap").
function occupiedSet(units, selfId) {
  const occ = new Set();
  for (const u of units || []) {
    if (!u || u.id === selfId || !u.position || (u.hp ?? 0) <= 0) continue;
    occ.add(`${u.position.x},${u.position.y}`);
  }
  return occ;
}

// Nearest (Manhattan) zone tile not occupied by a live unit. Deterministic
// tie-break (x then y ascending). Null only if EVERY zone tile is taken.
function nearestFreeZoneTile(pos, zone, occ) {
  let best = null;
  let bestD = Infinity;
  for (let x = zone[0]; x <= zone[2]; x += 1) {
    for (let y = zone[1]; y <= zone[3]; y += 1) {
      if (occ.has(`${x},${y}`)) continue;
      const d = Math.abs(pos.x - x) + Math.abs(pos.y - y);
      if (d < bestD) {
        bestD = d;
        best = { x, y };
      }
    }
  }
  return best;
}

// Step toward a DISTINCT free zone tile, routing around occupied tiles: primary
// axis, then secondary axis, then a perpendicular sidestep. Lets 2+ units occupy
// the zone (min_units_in_zone > 1) instead of funneling onto one entry tile where
// the 2nd unit blocks forever. Null only if fully boxed (caller holds the tick
// rather than spamming a move the backend rejects).
function stepTowardZone(actor, zone, units) {
  const occ = occupiedSet(units, actor.id);
  const dest = nearestFreeZoneTile(actor.position, zone, occ) || {
    x: Math.round((zone[0] + zone[2]) / 2),
    y: Math.round((zone[1] + zone[3]) / 2),
  };
  const { x, y } = actor.position;
  const dx = Math.sign(dest.x - x);
  const dy = Math.sign(dest.y - y);
  const primaryX = Math.abs(dest.x - x) >= Math.abs(dest.y - y);
  const ordered = primaryX
    ? [
        { x: x + dx, y },
        { x, y: y + dy },
        { x, y: y + 1 },
        { x, y: y - 1 },
      ]
    : [
        { x, y: y + dy },
        { x: x + dx, y },
        { x: x + 1, y },
        { x: x - 1, y },
      ];
  for (const c of ordered) {
    if (c.x === x && c.y === y) continue; // no-op (axis delta 0)
    if (c.x < 0 || c.y < 0) continue; // off-board lower bound
    if (occ.has(`${c.x},${c.y}`)) continue; // would be rejected by occupancy
    return { action_type: 'move', target_position: c };
  }
  return null; // boxed in -> hold this tick
}

// Pick the attack target among IN-RANGE enemies. focusFire -> the lowest-HP (finish-off),
// tie-break nearest then id (deterministic); else the nearest. Null if none in range. Shared by
// the elimination/survival branch AND the OA2 in-zone hold branch so opts.focusFire is honored in
// the non-elimination cases W5 measures (Codex P2 #3127) -- attacking never moves the actor, so
// focusing a low-HP in-range foe keeps the zone hold intact. Default (focusFire off) = nearest
// in-range, byte-identical to the prior closest-attack.
// Task 6: optional losFn(fromPos, toPos) -- when provided, an in-range enemy must ALSO be
// visible (shared production LOS rule) to be a candidate. Omitted -> unchanged (no LOS filter).
function pickInRangeTarget(actor, enemies, focusFire, losFn) {
  const range = actor.attack_range || 1;
  const inRange = enemies.filter(
    (e) =>
      dist(actor.position, e.position) <= range &&
      (typeof losFn !== 'function' || losFn(actor.position, e.position)),
  );
  if (!inRange.length) return null;
  const byNearest = (a, b) => dist(actor.position, a.position) - dist(actor.position, b.position);
  if (!focusFire) return inRange.sort(byNearest)[0];
  return inRange.sort(
    (a, b) =>
      (a.hp ?? 0) - (b.hp ?? 0) || byNearest(a, b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )[0];
}

function selectPlayerAction(actor, units, objective, opts = {}) {
  // Task 6: shared production LOS rule, built once from opts.terrainFeatures (threaded by
  // combat-adapter.js). COMBAT_LOS_ENABLED OFF -> losClearOnGrid always true -> no-op filter.
  // unit-blocking fast-follow: also threads `units` (units_block_los config, default false
  // -- dormant/no-op until an owner flips the config).
  const losFn = (from, to) =>
    losClearOnGrid({ terrain_features: (opts && opts.terrainFeatures) || [] }, from, to, units);

  // OA2 zone-pursuit: a zone objective + actor outside the zone -> move toward it.
  const objType = objective && objective.type;
  // bug C (#2662-era OA2): GET /:id/objective + the evaluator carry `target_zone` at the TOP
  // level (matching the encounter YAML), NOT under `.config`. Reading only `config.target_zone`
  // left `zone` undefined -> zone-pursuit never fired -> players never moved to the
  // capture/sabotage/escape zone -> those objectives could not complete. Prefer top-level.
  const zone =
    (objective && objective.target_zone) ||
    (objective && objective.config && objective.config.target_zone);
  if (ZONE_PURSUIT_OBJECTIVES.has(objType) && Array.isArray(zone) && zone.length >= 4) {
    if (!inZone(actor.position, zone)) {
      // OA2 fix (item 7): pursue a DISTINCT free zone tile + route around allies
      // so min_units_in_zone > 1 objectives are satisfiable (was: a shared
      // centroid funneled every unit to one tile -> 2nd unit blocked outside).
      return stepTowardZone(actor, zone, units);
    }
    // IN zone: HOLD. Attack an already-in-range enemy (focus-fire honored); NEVER leave the zone
    // to chase a far foe (that would break the hold and the objective would never tick).
    const foes = units.filter((u) => u.controlled_by === 'sistema' && (u.hp ?? 0) > 0);
    const tgt = pickInRangeTarget(actor, foes, opts && opts.focusFire, losFn);
    if (tgt && (actor.ap_remaining ?? 0) >= 1) {
      return { action_type: 'attack', target_id: tgt.id };
    }
    return null; // hold position -> the zone objective ticks
  }

  // Default / elimination / survival: closest-enemy attack-or-approach (focus-fire honored).
  const enemies = units.filter((u) => u.controlled_by === 'sistema' && (u.hp ?? 0) > 0);
  if (enemies.length === 0) return null;
  const tgt = pickInRangeTarget(actor, enemies, opts && opts.focusFire, losFn);
  if (tgt && (actor.ap_remaining ?? 0) >= 1) {
    return { action_type: 'attack', target_id: tgt.id };
  }
  // None in range (or no AP): approach the nearest.
  const nearest = enemies
    .slice()
    .sort((a, b) => dist(actor.position, a.position) - dist(actor.position, b.position))[0];
  return stepToward(actor, nearest.position);
}

module.exports = {
  dist,
  inZone,
  selectPlayerAction,
  pickInRangeTarget,
  ZONE_PURSUIT_OBJECTIVES,
};
