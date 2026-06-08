'use strict';
// Pure player-side AI policy, extracted from tests/smoke/ai-driven-sim.js
// (minimal closest-enemy attack; never spends cap_pt to keep fairness intact).
// Reused by the full-loop combatAdapter so the meta-loop combat runs the SAME
// player policy as the combat-sim, with no co-op lobby coupling.
//
// OA2 (SPEC-O): objective-aware. For zone-based objectives (capture_point /
// sabotage / escape / escort) the policy DRIVES units toward the target zone so
// non-elimination encounters can complete in the sim (making completion_rate a
// meaningful calibration metric). In-zone -- or elimination / survival -- falls
// back to closest-enemy. `objective` is optional: omitted => legacy behavior.

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

function selectPlayerAction(actor, units, objective) {
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
    // IN zone: HOLD. Attack only an already-in-range enemy; NEVER leave the zone to
    // chase a far foe (that would break the hold and the objective would never tick).
    const foes = units.filter((u) => u.controlled_by === 'sistema' && (u.hp ?? 0) > 0);
    const tgt = foes.length
      ? foes.sort((a, b) => dist(actor.position, a.position) - dist(actor.position, b.position))[0]
      : null;
    if (
      tgt &&
      dist(actor.position, tgt.position) <= (actor.attack_range || 1) &&
      (actor.ap_remaining ?? 0) >= 1
    ) {
      return { action_type: 'attack', target_id: tgt.id };
    }
    return null; // hold position -> the zone objective ticks
  }

  // Default / in-zone / elimination / survival: closest-enemy attack-or-approach.
  const enemies = units.filter((u) => u.controlled_by === 'sistema' && (u.hp ?? 0) > 0);
  if (enemies.length === 0) return null;
  const target = enemies.sort(
    (a, b) => dist(actor.position, a.position) - dist(actor.position, b.position),
  )[0];
  const range = actor.attack_range || 1;
  if (dist(actor.position, target.position) <= range && (actor.ap_remaining ?? 0) >= 1) {
    return { action_type: 'attack', target_id: target.id };
  }
  return stepToward(actor, target.position);
}

module.exports = { dist, inZone, selectPlayerAction, ZONE_PURSUIT_OBJECTIVES };
