// Reaction Engine — iter4 (FRICTION #4 follow-up).
//
// Trigger system per ability con effect_type='reaction'. Reactions
// armed via abilityExecutor.executeReaction() vivono in actor.reactions[].
// Questo modulo le consuma quando il trigger fires:
//   - intercept (warden): trigger='ally_attacked_adjacent'.
//     Quando alleato adiacente subisce damage, l'interceptor reroute il
//     danno su se stesso. Consuma reaction.
//   - overwatch_shot (ranger): trigger='enemy_moves_in_range'.
//     Quando enemy si muove in attack_range dell'overwatch, fires
//     attacco automatico (-1 damage_step). Consuma reaction.
//
// Hook points:
//   - performAttack post-damage: triggerOnDamage()
//   - move handler post-position: triggerOnMove()
//
// Eventi reaction emessi separatamente con action_type='reaction_trigger'
// per traceability nel log + vcScoring.

'use strict';

function manhattan(a, b) {
  return Math.abs(Number(a.x) - Number(b.x)) + Math.abs(Number(a.y) - Number(b.y));
}

function isAlive(unit) {
  return unit && Number(unit.hp) > 0;
}

function isStunned(unit) {
  return unit && unit.status && Number(unit.status.stunned) > 0;
}

function findReaction(unit, trigger) {
  if (!unit || !Array.isArray(unit.reactions)) return null;
  for (let i = 0; i < unit.reactions.length; i += 1) {
    if (String(unit.reactions[i].trigger || '') === trigger) {
      return { reaction: unit.reactions[i], index: i };
    }
  }
  return null;
}

function consumeReaction(unit, index) {
  if (!unit || !Array.isArray(unit.reactions)) return null;
  const removed = unit.reactions.splice(index, 1);
  return removed[0] || null;
}

/**
 * Intercept trigger: dopo damage applied, scan target's allies adiacenti
 * (Manhattan=1) per intercept armed. Primo eligible reroute damageDealt.
 *
 * Side effect:
 *   - target.hp += damageDealt (restore)
 *   - interceptor.hp -= damageDealt (transfer)
 *   - session.damage_taken[target] -= damageDealt
 *   - session.damage_taken[interceptor] += damageDealt
 *   - interceptor.reactions consumed
 *
 * @returns null se nessun intercept fired, altrimenti { interceptor_id, damage_rerouted, ability_id }.
 */
function triggerOnDamage(session, attacker, target, damageDealt) {
  if (!session || !target || !damageDealt || damageDealt <= 0) return null;
  if (!isAlive(target)) return null;

  // Find allied unit adjacent to target with intercept armed.
  for (const unit of session.units || []) {
    if (!unit) continue;
    if (unit.id === target.id) continue;
    if (unit.controlled_by !== target.controlled_by) continue;
    if (!isAlive(unit) || isStunned(unit)) continue;
    if (manhattan(unit.position, target.position) !== 1) continue;
    const found = findReaction(unit, 'ally_attacked_adjacent');
    if (!found) continue;

    const reaction = found.reaction;
    consumeReaction(unit, found.index);

    // Reroute: restore target, transfer to interceptor.
    target.hp = Math.min(Number(target.max_hp || target.hp + damageDealt), target.hp + damageDealt);
    if (session.damage_taken) {
      session.damage_taken[target.id] = Math.max(
        0,
        (session.damage_taken[target.id] || 0) - damageDealt,
      );
    }
    const interceptorHpBefore = unit.hp;
    unit.hp = Math.max(0, Number(unit.hp || 0) - damageDealt);
    if (session.damage_taken) {
      session.damage_taken[unit.id] = (session.damage_taken[unit.id] || 0) + damageDealt;
    }

    return {
      interceptor_id: unit.id,
      interceptor_unit: unit, // ref per emitKillAndAssists chain
      target_id: target.id,
      attacker_id: attacker ? attacker.id : null,
      ability_id: reaction.ability_id || 'intercept',
      damage_rerouted: damageDealt,
      interceptor_hp_before: interceptorHpBefore,
      interceptor_hp_after: unit.hp,
      interceptor_killed: unit.hp === 0,
    };
  }

  return null;
}

/**
 * Overwatch trigger: dopo move, scan enemies con overwatch_shot armed.
 * iter6: fires SOLO se mover entra IN range (fromPos OUT-of-range AND
 * currentPos IN-range). Movimento dentro la stessa "range zone" non
 * triggera (evita spam su micro-movimenti che non cambiano threat).
 *
 * @param {object} session
 * @param {object} mover unità che si è mossa (.position = nuova)
 * @param {object} fromPos posizione precedente (richiesta per check INTO)
 * @param {function} performAttack callback (overwatchUnit, mover) → { result, damageDealt, evaluation, parry }
 * @returns null se nessun overwatch fired, altrimenti { overwatch_id, damage_dealt, ... }.
 */
function triggerOnMove(session, mover, fromPos, performAttack) {
  if (!session || !mover || !isAlive(mover)) return null;
  if (!fromPos) return null;

  for (const unit of session.units || []) {
    if (!unit) continue;
    if (unit.id === mover.id) continue;
    if (unit.controlled_by === mover.controlled_by) continue;
    if (!isAlive(unit) || isStunned(unit)) continue;
    const range = Number(unit.attack_range) || 2;
    const distNow = manhattan(unit.position, mover.position);
    const distBefore = manhattan(unit.position, fromPos);
    if (distNow > range) continue; // not in range now
    if (distBefore <= range) continue; // already was in range — not "INTO"
    const found = findReaction(unit, 'enemy_moves_in_range');
    if (!found) continue;

    const reaction = found.reaction;
    consumeReaction(unit, found.index);

    // Fire attack
    const moverHpBefore = mover.hp;
    const res = performAttack(unit, mover);
    let adjustedDamage = res ? Number(res.damageDealt || 0) : 0;
    const damageStepMod = Number(reaction.damage_step_mod || 0);
    // Apply damage_step_mod (es. overwatch_shot -1)
    if (res && res.result && res.result.hit && adjustedDamage > 0 && damageStepMod !== 0) {
      if (damageStepMod < 0) {
        const refund = Math.min(-damageStepMod, adjustedDamage);
        mover.hp = Math.min(Number(mover.max_hp || moverHpBefore), mover.hp + refund);
        if (session.damage_taken) {
          session.damage_taken[mover.id] = Math.max(
            0,
            (session.damage_taken[mover.id] || 0) - refund,
          );
        }
        adjustedDamage = Math.max(0, adjustedDamage - refund);
      } else {
        const extra = Math.min(damageStepMod, mover.hp);
        mover.hp = Math.max(0, mover.hp - extra);
        if (session.damage_taken) {
          session.damage_taken[mover.id] = (session.damage_taken[mover.id] || 0) + extra;
        }
        adjustedDamage += extra;
      }
    }

    return {
      overwatch_id: unit.id,
      mover_id: mover.id,
      ability_id: reaction.ability_id || 'overwatch_shot',
      from_position: fromPos ? { ...fromPos } : null,
      to_position: { ...mover.position },
      hit: res && res.result ? !!res.result.hit : false,
      die: res && res.result ? res.result.die : null,
      roll: res && res.result ? res.result.roll : null,
      mos: res && res.result ? res.result.mos : null,
      damage_dealt: adjustedDamage,
      mover_hp_before: moverHpBefore,
      mover_hp_after: mover.hp,
      mover_killed: mover.hp === 0,
      damage_step_mod: damageStepMod,
    };
  }

  return null;
}

module.exports = {
  triggerOnDamage,
  triggerOnMove,
  findReaction,
  consumeReaction,
};
