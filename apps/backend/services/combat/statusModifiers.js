// apps/backend/services/combat/statusModifiers.js
//
// M-future Status Engine Extension (2026-04-25 audit balance-auditor).
// Wires 7 NEW status names runtime-active that previously were silently
// no-op (apply_status writes unit.status[stato], but downstream consumers
// did not read these names). Closes audit P0 status orphan finding —
// unlocks 68/267 ancestor traits runtime value.
//
// Statuses supportati:
//   • linked           +1 attack_mod actor (only if ally adjacent)
//   • fed              +1 HP regen at turn end (cap max_hp)
//   • healing          +1 HP regen at turn end (HoT, decay 1/turn handled
//                      by universal status decay loop in
//                      sessionRoundBridge.applyEndOfRoundSideEffects)
//   • attuned          +1 defense_mod target side
//   • sensed           +1 attack_mod actor (accuracy proxy)
//   • telepatic_link   reveal — log marker only (no stat effect)
//   • frenzy           +1 attack_mod actor, -1 defense_mod actor when
//                      attacked (rage variant, 2 turns canonical)
//
// Decay: integer keys decremented 1/round by the existing universal loop
// in sessionRoundBridge.js. No new decay code path required.
//
// Pattern reference: piggyback on the enrage pattern in session.js:
//   1. compute deltas (pre-attack)
//   2. apply to actor.attack_mod_bonus + target.defense_mod_bonus
//   3. resolveAttack runs
//   4. revert deltas post-attack
// This avoids persistent mutation of canonical bonuses written by the
// ability executor.

'use strict';

function manhattanDistance(a, b) {
  if (!a || !b) return Infinity;
  return Math.abs(Number(a.x) - Number(b.x)) + Math.abs(Number(a.y) - Number(b.y));
}

function isPositive(value) {
  return Number(value) > 0;
}

/**
 * Computes status-driven attack/defense modifiers for a single attack.
 *
 * @param {object} actor       Attacking unit (has actor.status, actor.position).
 * @param {object} target      Defending unit (has target.status, target.position).
 * @param {Array}  units       Full unit roster (for adjacency scans).
 * @returns {{
 *   attackDelta: number,      // delta to add to actor.attack_mod_bonus
 *   defenseDelta: number,     // delta to add to target.defense_mod_bonus
 *   log: Array<{status, side, effect}>
 * }}
 */
function computeStatusModifiers(actor, target, units = []) {
  const log = [];
  let attackDelta = 0;
  let defenseDelta = 0;

  const actorStatus = (actor && actor.status) || {};
  const targetStatus = (target && target.status) || {};

  // ─── Actor-side actor-attack buffs ──────────────────────────────
  if (isPositive(actorStatus.linked)) {
    // Requires same-faction ally adjacent (manhattan <= 1, hp > 0,
    // not the actor itself). If alone, no bonus — design intent.
    const hasAllyAdjacent = (units || []).some(
      (u) =>
        u &&
        u.id !== actor.id &&
        Number(u.hp || 0) > 0 &&
        u.controlled_by === actor.controlled_by &&
        manhattanDistance(u.position, actor.position) === 1,
    );
    if (hasAllyAdjacent) {
      attackDelta += 1;
      log.push({ status: 'linked', side: 'actor', effect: '+1 attack_mod (ally adjacent)' });
    }
  }
  if (isPositive(actorStatus.sensed)) {
    attackDelta += 1;
    log.push({ status: 'sensed', side: 'actor', effect: '+1 attack_mod (accuracy)' });
  }
  if (isPositive(actorStatus.frenzy)) {
    attackDelta += 1;
    log.push({ status: 'frenzy', side: 'actor', effect: '+1 attack_mod (rage variant)' });
  }
  if (isPositive(actorStatus.telepatic_link)) {
    // No stat effect — narrative reveal marker only.
    log.push({ status: 'telepatic_link', side: 'actor', effect: 'reveal (no stat delta)' });
  }

  // ─── Target-side target-defense buffs/debuffs ───────────────────
  if (isPositive(targetStatus.attuned)) {
    defenseDelta += 1;
    log.push({ status: 'attuned', side: 'target', effect: '+1 defense_mod' });
  }
  if (isPositive(targetStatus.frenzy)) {
    // Frenzy on the defender: lowered guard. -1 defense_mod (attacker
    // gets an easier hit). This is the "rage variant" downside.
    defenseDelta -= 1;
    log.push({ status: 'frenzy', side: 'target', effect: '-1 defense_mod (rage exposure)' });
  }

  return { attackDelta, defenseDelta, log };
}

/**
 * Apply per-turn HP regen from `fed` / `healing` status. Run at turn end
 * before universal status decay (so the decremented value still triggers
 * regen on its last live turn). Caps regen to max_hp; KO units excluded.
 *
 * Returns log array with one entry per regen tick.
 *
 * @param {object} unit Unit with status, hp, max_hp.
 * @returns {Array<{unit_id, status, amount, hp_before, hp_after}>}
 */
function applyTurnRegen(unit) {
  if (!unit || !unit.status || Number(unit.hp || 0) <= 0) return [];
  const max = Number(unit.max_hp || unit.hp);
  const events = [];

  for (const statusName of ['fed', 'healing']) {
    if (!isPositive(unit.status[statusName])) continue;
    if (unit.hp >= max) continue;
    const hpBefore = unit.hp;
    unit.hp = Math.min(max, unit.hp + 1);
    events.push({
      unit_id: unit.id,
      status: statusName,
      amount: unit.hp - hpBefore,
      hp_before: hpBefore,
      hp_after: unit.hp,
    });
  }
  return events;
}

module.exports = {
  computeStatusModifiers,
  applyTurnRegen,
  // Exported for tests
  manhattanDistance,
};
