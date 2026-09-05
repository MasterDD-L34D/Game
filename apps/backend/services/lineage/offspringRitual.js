// 2026-05-10 sera Sprint Q+ Q-3 — propagateLineage engine.
// ADR-2026-05-05 Phase B Path γ ACCEPTED 2026-05-10 sera (master-dd
// verdict cascade approval session sera "2+3" + "procedi").
//
// Pure function + Prisma write-through via offspringStore. Validates
// mutations against MUTATION_LIST canonical (Q-3 6-canonical enum).
// Output schema: packages/contracts/schemas/lineage_ritual.schema.json (Q-1).
//
// Consumer:
// - apps/backend/routes/lineage.js (Q-4 HTTP API)
// - apps/backend/services/campaign/ambitionService.js evaluateChoiceRitual (Q-5 bridge)

'use strict';

const crypto = require('node:crypto');
const { isCanonicalMutation } = require('./mutationsLoader');
const offspringStore = require('./offspringStore');

/**
 * Propagate lineage from parents → offspring entry. Pure function +
 * Prisma write-through via offspringStore.
 *
 * @param {object} params
 * @param {string} params.sessionId - Session origin del mating event.
 * @param {object} params.parentA - { id, lineage_id?, trait_inherited?, biome_origin? }
 * @param {object} params.parentB - { id, lineage_id?, trait_inherited?, biome_origin? }
 * @param {string[]} params.mutations - Array 1-3 mutation IDs canonical (user choice).
 * @returns {Promise<object>} Offspring entry contract `lineage_ritual.schema.json`.
 * @throws Error con message contenente 'mutations' / 'parent' per validation failure.
 */
async function propagateOffspringRitual({ sessionId, parentA, parentB, mutations }) {
  if (!sessionId || typeof sessionId !== 'string') {
    throw new Error('propagateOffspringRitual: sessionId (string) required');
  }
  if (!parentA || !parentA.id) {
    throw new Error('propagateOffspringRitual: parentA.id required');
  }
  if (!parentB || !parentB.id) {
    throw new Error('propagateOffspringRitual: parentB.id required');
  }
  if (parentA.id === parentB.id) {
    throw new Error('propagateOffspringRitual: parent_a_id !== parent_b_id required');
  }
  if (!Array.isArray(mutations)) {
    throw new Error('propagateOffspringRitual: mutations must be array');
  }
  if (mutations.length < 1 || mutations.length > 3) {
    throw new Error(
      `propagateOffspringRitual: mutations.length must be 1-3, got ${mutations.length}`,
    );
  }

  // Validate mutations against canonical list.
  for (const m of mutations) {
    if (!isCanonicalMutation(m)) {
      throw new Error(`propagateOffspringRitual: mutation '${m}' not in canonical_list.yaml`);
    }
  }

  // Lineage ID propagation: parentA priority → parentB → new UUID.
  const lineageId = parentA.lineage_id || parentB.lineage_id || crypto.randomUUID();

  // Trait inherited: union both, dedup, max 6 cap (anti-bloat).
  const inheritedSet = new Set([
    ...(parentA.trait_inherited || []),
    ...(parentB.trait_inherited || []),
  ]);
  const traitInherited = Array.from(inheritedSet).slice(0, 6);

  // Biome origin: parentA priority → parentB → null.
  const biomeOrigin = parentA.biome_origin || parentB.biome_origin || null;

  const offspring = {
    id: crypto.randomUUID(),
    session_id: sessionId,
    lineage_id: lineageId,
    parent_a_id: parentA.id,
    parent_b_id: parentB.id,
    mutations,
    trait_inherited: traitInherited,
    biome_origin: biomeOrigin,
    born_at: new Date().toISOString(),
  };

  // Persist via offspringStore (Prisma + in-memory fallback).
  await offspringStore.create(offspring);

  return offspring;
}

/**
 * Q-5 Bridge — chain evaluateChoiceRitual outcome to offspring ritual.
 *
 * Quando ambitionService.evaluateChoiceRitual returna `lineage_merge: true`
 * (path bond_proposal + bond_hearts >= threshold), questo bridge fire
 * propagateOffspringRitual con parents + mutations user-selected.
 *
 * @param {object} choiceResult - output evaluateChoiceRitual({ completed, lineage_merge, ...})
 * @param {object} ctx - { sessionId, parentA, parentB, mutations }
 * @returns {Promise<object|null>} offspring entry se fired, null se choice non
 *                                 lineage_merge (fame_path, locked, error).
 */
async function bridgeOffspringRitualOnChoice(choiceResult, ctx = {}) {
  if (!choiceResult || !choiceResult.completed) return null;
  if (!choiceResult.lineage_merge) return null;
  const { sessionId, parentA, parentB, mutations } = ctx;
  if (!sessionId || !parentA?.id || !parentB?.id || !Array.isArray(mutations)) {
    throw new Error(
      'bridgeOffspringRitualOnChoice: ctx { sessionId, parentA.id, parentB.id, mutations[] } required',
    );
  }
  return propagateOffspringRitual({ sessionId, parentA, parentB, mutations });
}

module.exports = { propagateOffspringRitual, bridgeOffspringRitualOnChoice };
