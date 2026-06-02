'use strict';
// Pure player-side AI policy, extracted verbatim from tests/smoke/ai-driven-sim.js
// (minimal closest-enemy attack; never spends cap_pt to keep fairness intact).
// Reused by the full-loop combatAdapter so the meta-loop combat runs the SAME
// player policy as the combat-sim, with no co-op lobby coupling.

function dist(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function selectPlayerAction(actor, units) {
  const enemies = units.filter((u) => u.controlled_by === 'sistema' && (u.hp ?? 0) > 0);
  if (enemies.length === 0) return null;
  const target = enemies.sort(
    (a, b) => dist(actor.position, a.position) - dist(actor.position, b.position),
  )[0];
  const range = actor.attack_range || 1;
  if (dist(actor.position, target.position) <= range && (actor.ap_remaining ?? 0) >= 1) {
    return { action_type: 'attack', target_id: target.id };
  }
  const dx = Math.sign(target.position.x - actor.position.x);
  const dy = Math.sign(target.position.y - actor.position.y);
  const stepX =
    Math.abs(target.position.x - actor.position.x) >=
    Math.abs(target.position.y - actor.position.y);
  const target_position = stepX
    ? { x: actor.position.x + dx, y: actor.position.y }
    : { x: actor.position.x, y: actor.position.y + dy };
  return { action_type: 'move', target_position };
}

module.exports = { dist, selectPlayerAction };
