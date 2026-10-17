// Sprint δ Meta Systemic — Pattern 3 (MYZ mutation tree swap).
//
// Free re-pick alternative path on mutation tree (Mutant Year Zero pattern).
// Allows player to swap one applied mutation for another without MP penalty
// extra (only standard apply cost).
//
// Pattern source: docs/research/2026-04-27-strategy-games-mechanics-extraction.md §5
// (MYZ mutation tree). MYZ allows opt-in re-spec on mutations: one slot can
// be swapped per encounter cycle, costing standard mutation activation cost
// (no extra penalty for switching).
//
// Validation:
//  - newMutation must NOT cause slot conflict with remaining mutations
//  - newMutation must fit MP budget (standard mp_cost rule)
//  - oldMutation must be reversible (catalog flag `irreversible: false` default)
//
// Wire: routes/mutations.js POST /api/v1/mutations/swap (separate from /apply).

'use strict';

const {
  checkSlotConflict,
  checkMpBudget,
  applyMutationPure,
} = require('../mutations/mutationEngine');

/**
 * Swap an applied mutation for a new mutation on a unit.
 *
 * @param {object} unit
 * @param {string} oldMutationId — currently applied
 * @param {string} newMutationId — to apply
 * @param {object} catalog — output of loadMutationCatalog()
 * @param {object} [options]
 * @param {boolean} [options.deductMp=true] — deduct MP for new mutation
 * @returns {{
 *   ok: boolean,
 *   reason?: string,
 *   unit?: object,
 *   swap_event?: object
 * }}
 */
function swapAppliedMutation(unit, oldMutationId, newMutationId, catalog, options = {}) {
  if (!unit || typeof unit !== 'object') {
    return { ok: false, reason: 'unit_required' };
  }
  if (!oldMutationId || !newMutationId) {
    return { ok: false, reason: 'mutation_ids_required' };
  }
  if (oldMutationId === newMutationId) {
    return { ok: false, reason: 'noop_same_id' };
  }
  const byId = catalog?.byId || {};
  const oldEntry = byId[oldMutationId];
  const newEntry = byId[newMutationId];
  if (!oldEntry) return { ok: false, reason: 'old_mutation_not_found' };
  if (!newEntry) return { ok: false, reason: 'new_mutation_not_found' };

  const applied = Array.isArray(unit.applied_mutations) ? unit.applied_mutations : [];
  if (!applied.includes(oldMutationId)) {
    return { ok: false, reason: 'old_mutation_not_applied' };
  }

  // Reversibility check: catalog entry can flag `irreversible: true` to lock
  if (oldEntry.irreversible === true) {
    return { ok: false, reason: 'old_mutation_irreversible' };
  }

  // Step 1: detach oldMutation (reverse trait_swap, remove from applied list)
  const oldSwap = oldEntry.trait_swap || { add: [], remove: [] };
  const restoredTraits = Array.isArray(unit.trait_ids) ? [...unit.trait_ids] : [];
  // Remove what oldMutation added
  const detachedTraits = restoredTraits.filter((t) => !(oldSwap.add || []).includes(t));
  // Restore what oldMutation removed (best-effort: re-add removed traits)
  for (const t of oldSwap.remove || []) {
    if (!detachedTraits.includes(t)) detachedTraits.push(t);
  }
  // Refund MP if oldMutation had a cost
  const oldMpCost = Number(oldEntry.mp_cost ?? 0);
  const intermediateUnit = {
    ...unit,
    trait_ids: detachedTraits,
    applied_mutations: applied.filter((id) => id !== oldMutationId),
    mp: Number(unit.mp ?? 0) + oldMpCost,
  };
  // Drop derived ability if any
  if (oldEntry.derived_ability_id) {
    intermediateUnit.abilities = (
      Array.isArray(intermediateUnit.abilities) ? intermediateUnit.abilities : []
    ).filter((a) => a !== oldEntry.derived_ability_id);
  }

  // Step 2: validate newMutation eligibility against intermediate unit state
  const slotCheck = checkSlotConflict(intermediateUnit, newMutationId, catalog);
  if (slotCheck.conflict) {
    return {
      ok: false,
      reason: 'slot_conflict',
      conflicting_mutation_id: slotCheck.conflicting_mutation_id,
      slot: slotCheck.slot,
    };
  }
  const mpCheck = checkMpBudget(intermediateUnit, newEntry);
  if (!mpCheck.ok) {
    return {
      ok: false,
      reason: 'mp_insufficient',
      required: mpCheck.required,
      available: mpCheck.available,
    };
  }

  // Step 3: apply new mutation (standard apply rules)
  const applyResult = applyMutationPure(intermediateUnit, newMutationId, catalog, {
    deductMp: options.deductMp !== false,
  });

  return {
    ok: true,
    unit: applyResult.unit,
    swap_event: {
      type: 'mutation_swapped',
      old_mutation_id: oldMutationId,
      new_mutation_id: newMutationId,
      mp_refunded: oldMpCost,
      mp_spent: applyResult.mp_spent,
      derived_ability_id: applyResult.derived_ability_id,
      timestamp: new Date().toISOString(),
    },
  };
}

module.exports = {
  swapAppliedMutation,
};
