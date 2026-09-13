// =============================================================================
// Squad Coordination — focus_fire combo detection
//
// Pilastro 5 (Co-op vs Sistema): quando 2+ unita' player colpiscono lo stesso
// bersaglio nello stesso round, il secondo/terzo attacco guadagna un bonus combo.
//
// Minimal MVP: focus_fire combo con +1 damage per attacco successivo al primo
// sullo stesso target entro lo stesso round (== stesso valore di session.turn).
//
// Tracking:
//   - session._round_attacks: [{ actor_id, target_id }] resettato a inizio round
//   - session.last_round_combos: [{ actor_id, target_id, chain_index, bonus_damage, turn }]
//     popolato quando un attacco matcha combo, letto da HUD/debrief.
//
// Vedi docs/core/00D-ENGINES_AS_GAME_FEATURES.md §7 SquadSync.
// =============================================================================

'use strict';

const FOCUS_FIRE_BONUS = 1;

/**
 * Rileva combo focus_fire per un attacco che sta risolvendo.
 *
 * Semantica: se un'altra unita' player (actor_id diverso) ha gia' colpito lo
 * stesso target_id nel round corrente (session._round_attacks), attiva combo.
 * chain_index = indice 0-based (0 = primo attacco solo, 1 = secondo attacco combo, etc.).
 *
 * NON muta session. Lo stato viene aggiornato da recordAttackForCombo.
 */
function detectFocusFireCombo(session, actor, target) {
  const zero = { is_combo: false, bonus_damage: 0, chain_index: 0 };
  if (!session || !actor || !target) return zero;
  if (actor.controlled_by !== 'player') return zero;
  const list = Array.isArray(session._round_attacks) ? session._round_attacks : [];
  const targetId = String(target.id);
  const actorId = String(actor.id);
  // Conta attacchi precedenti sullo stesso target da altre unita' player.
  let priorDistinctActors = 0;
  const seenActors = new Set();
  for (const entry of list) {
    if (!entry || String(entry.target_id) !== targetId) continue;
    const prevActor = String(entry.actor_id);
    if (prevActor === actorId) continue;
    if (seenActors.has(prevActor)) continue;
    seenActors.add(prevActor);
    priorDistinctActors += 1;
  }
  if (priorDistinctActors <= 0) return zero;
  return {
    is_combo: true,
    bonus_damage: FOCUS_FIRE_BONUS,
    chain_index: priorDistinctActors, // 1 = secondo attacco, 2 = terzo, ...
  };
}

/**
 * Registra un attacco nel tracker del round corrente.
 * Inizializza le liste se mancanti. Mutativa su session.
 */
function recordAttackForCombo(session, actor, target, comboInfo) {
  if (!session || !actor || !target) return;
  if (!Array.isArray(session._round_attacks)) session._round_attacks = [];
  session._round_attacks.push({
    actor_id: String(actor.id),
    target_id: String(target.id),
  });
  if (comboInfo && comboInfo.is_combo) {
    if (!Array.isArray(session.last_round_combos)) session.last_round_combos = [];
    session.last_round_combos.push({
      type: 'focus_fire',
      actor_id: String(actor.id),
      target_id: String(target.id),
      chain_index: comboInfo.chain_index,
      bonus_damage: comboInfo.bonus_damage,
      turn: Number(session.turn || 0),
    });
  }
}

/**
 * Reset del tracker attacchi di round. Chiamato a inizio round
 * (prima che i player dichiarino intenti). last_round_combos viene archiviato
 * come previous_round_combos cosi' il debrief puo' consultare l'ultimo round chiuso.
 */
function resetRoundAttackTracker(session) {
  if (!session) return;
  if (Array.isArray(session.last_round_combos) && session.last_round_combos.length > 0) {
    session.previous_round_combos = session.last_round_combos;
  }
  session._round_attacks = [];
  session.last_round_combos = [];
}

module.exports = {
  detectFocusFireCombo,
  recordAttackForCombo,
  resetRoundAttackTracker,
  FOCUS_FIRE_BONUS,
};
