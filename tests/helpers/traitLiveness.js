'use strict';

// Engine-liveness predicate -- the HARD-gate shared by the Form-Pulse trait v2 coverage test
// and the W3 imprint-mapping liveness test. It MIRRORS the engine's LIVE surface so a granted
// trait_id is only accepted if the engine actually CONSUMES it (not an inert no-op that would
// pass an N=40 ratify falsely as ~0 delta -- lesson #3083). If the engine wires a new consumer,
// update this mirror in the SAME change. Sources of truth:
//   - apps/backend/services/traitEffects.js passesBasicTriggers (~line 307): rejects any
//     trigger.action_type !== 'attack'; evaluateSingleTrait handles extra_damage / attack_bonus /
//     damage_reduction / heal / apply_status (deferred) / triggers_on_ally_attack (deferred).
//   - evaluateMovementTraits: action_type 'movement' + buff_stat move_bonus.
//   - combat/passiveStatusApplier.js: action_type 'passive' + apply_status, Wave-A statuses only.
//   - There is NO consumer for action_type:passive + buff_stat (the inert class) and elevation
//     (`requires: posizione_sopraelevata`) fires ~never on flat maps (near-inert).
// NB min_mos / melee_only are SITUATIONAL-live (fire on melee hits with margin-of-success >= 5),
// NOT inert -- the already-shipped picks (coda_stabilizzatrice_vortex) carry them.

const { WAVE_A_STATUSES } = require('../../apps/backend/services/combat/passiveStatusApplier');

const ATTACK_LIVE_KINDS = new Set([
  'extra_damage',
  'attack_bonus',
  'damage_reduction',
  'apply_status',
  'heal',
]);

// Returns true iff `def` has a real runtime consumer AND is not elevation-near-inert.
function isEngineLiveReliable(def) {
  if (!def || typeof def !== 'object') return false;
  // (a) reactive ally-attack reactor (beastBondReaction) -- no effect.kind, top-level data.
  if (def.triggers_on_ally_attack) return true;
  const trigger = def.trigger || {};
  const effect = def.effect || {};
  const at = trigger.action_type;
  // (b) attack pipeline (action_type undefined or 'attack'), excluding elevation near-inert.
  if (at === undefined || at === 'attack') {
    if (trigger.requires === 'posizione_sopraelevata') return false; // fires ~never on flat maps
    if (!ATTACK_LIVE_KINDS.has(effect.kind)) return false;
    // applies_to/kind side consistency: evaluateAttackTraits consumes damage_reduction ONLY on the
    // target side and extra_damage/attack_bonus/heal ONLY on the actor side, so a kind/side mismatch
    // is engine-inert. apply_status fires from either side (evaluateStatusTraits scans both).
    const appliesTo = def.applies_to || 'actor';
    if (effect.kind === 'damage_reduction') return appliesTo === 'target';
    if (
      effect.kind === 'extra_damage' ||
      effect.kind === 'attack_bonus' ||
      effect.kind === 'heal'
    ) {
      return appliesTo === 'actor';
    }
    return true; // apply_status
  }
  // (c) movement pipeline (evaluateMovementTraits) -- only buff_stat move_bonus is wired.
  if (at === 'movement') return effect.kind === 'buff_stat' && effect.stat === 'move_bonus';
  // (d) passive apply_status, Wave-A statuses only (passiveStatusApplier).
  if (at === 'passive') return effect.kind === 'apply_status' && WAVE_A_STATUSES.has(effect.stato);
  // anything else (incl. action_type:passive + buff_stat = the inert class) has NO consumer.
  return false;
}

module.exports = { isEngineLiveReliable, ATTACK_LIVE_KINDS };
