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

function selectPlayerAction(actor, units, objective) {
  // OA2 zone-pursuit: a zone objective + actor outside the zone -> move toward it.
  const objType = objective && objective.type;
  const zone = objective && objective.config && objective.config.target_zone;
  if (ZONE_PURSUIT_OBJECTIVES.has(objType) && Array.isArray(zone) && zone.length >= 4) {
    if (!inZone(actor.position, zone)) {
      const centroid = {
        x: Math.round((zone[0] + zone[2]) / 2),
        y: Math.round((zone[1] + zone[3]) / 2),
      };
      return stepToward(actor, centroid);
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
