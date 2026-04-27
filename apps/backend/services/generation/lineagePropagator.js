// Sprint B Spore S5 (ADR-2026-04-26-spore-part-pack-slots) — generational
// lineage propagation.
//
// When a unit enters `legacy` lifecycle phase, its `applied_mutations[]` are
// written to a persistent (in-memory) pool keyed by `(species_id, biome_id)`.
// New units born of the same species in the same biome can inherit 1-2
// mutations from that pool **without paying MP cost** (free grant).
//
// This is the "plumbing" of S5. The lifecycle hook (who calls
// propagateLineage when a unit dies / retires) is deferred to a follow-up
// sprint — see PR description.
//
// Pool storage: in-memory Map. Persistence (Prisma write-through) deferred.
// Cross-lineage isolation deferred: two different `lineage_id` in same
// (species, biome) currently SHARE the pool.
//
// Cross-ref:
// - data/core/species/dune_stalker_lifecycle.yaml `legacy.inheritable_traits`
// - apps/backend/services/mutations/mutationEngine.js (Spore Moderate runtime)
// - docs/research/2026-04-26-spore-deep-extraction.md §1.5 + §S5
// - card museum mating_nido-engine-orphan.md (V3 mating engine 469 LOC live)

'use strict';

// Pool: Map<species_id, Map<biome_id, Set<mutation_id>>>
// Set garantisce dedup naturale dei trait/mutation propagati.
const _pool = new Map();

// Inherit cap defaults — newborn riceve random N in [MIN, MAX].
const DEFAULT_INHERIT_MIN = 1;
const DEFAULT_INHERIT_MAX = 2;

function _getOrCreateBiomeMap(speciesId) {
  let biomeMap = _pool.get(speciesId);
  if (!biomeMap) {
    biomeMap = new Map();
    _pool.set(speciesId, biomeMap);
  }
  return biomeMap;
}

function _getOrCreateMutationSet(speciesId, biomeId) {
  const biomeMap = _getOrCreateBiomeMap(speciesId);
  let mutSet = biomeMap.get(biomeId);
  if (!mutSet) {
    mutSet = new Set();
    biomeMap.set(biomeId, mutSet);
  }
  return mutSet;
}

/**
 * Propagate a legacy unit's applied_mutations to the lineage pool.
 *
 * @param {object} legacyUnit — unit object with `applied_mutations: string[]`
 * @param {string} speciesId
 * @param {string} biomeId
 * @returns {{ written_traits: string[], pool_size: number, species_id: string, biome_id: string }}
 */
function propagateLineage(legacyUnit, speciesId, biomeId) {
  if (!legacyUnit || typeof legacyUnit !== 'object') {
    throw new TypeError('propagateLineage: legacyUnit must be an object');
  }
  if (typeof speciesId !== 'string' || !speciesId) {
    throw new TypeError('propagateLineage: speciesId required');
  }
  if (typeof biomeId !== 'string' || !biomeId) {
    throw new TypeError('propagateLineage: biomeId required');
  }

  const applied = Array.isArray(legacyUnit.applied_mutations) ? legacyUnit.applied_mutations : [];
  const mutSet = _getOrCreateMutationSet(speciesId, biomeId);
  const written = [];
  for (const mid of applied) {
    if (typeof mid === 'string' && mid && !mutSet.has(mid)) {
      mutSet.add(mid);
      written.push(mid);
    }
  }
  return {
    written_traits: written,
    pool_size: mutSet.size,
    species_id: speciesId,
    biome_id: biomeId,
  };
}

/**
 * Inherit a random subset of mutations from the lineage pool to a newborn.
 *
 * Caller is responsible for persisting the returned `unit` (caller-side
 * decides if applied_mutations + trait_ids should be written-through).
 *
 * @param {object} newUnit — newborn unit (must be plain object; we copy)
 * @param {string} speciesId
 * @param {string} biomeId
 * @param {string|null} [lineageId] — currently informational only
 *   (cross-lineage isolation deferred)
 * @param {object} [opts]
 * @param {number} [opts.min] — minimum inherited count (default 1)
 * @param {number} [opts.max] — maximum inherited count (default 2)
 * @param {() => number} [opts.rng] — RNG (default Math.random; caller can
 *   inject seeded RNG for determinism)
 * @returns {{
 *   unit: object,
 *   inherited: string[],
 *   pool_consumed: false,
 *   pool_size: number,
 *   lineage_id: string|null,
 * }}
 */
function inheritFromLineage(newUnit, speciesId, biomeId, lineageId = null, opts = {}) {
  if (!newUnit || typeof newUnit !== 'object') {
    throw new TypeError('inheritFromLineage: newUnit must be an object');
  }
  if (typeof speciesId !== 'string' || !speciesId) {
    throw new TypeError('inheritFromLineage: speciesId required');
  }
  if (typeof biomeId !== 'string' || !biomeId) {
    throw new TypeError('inheritFromLineage: biomeId required');
  }
  const min = Number.isInteger(opts.min) ? opts.min : DEFAULT_INHERIT_MIN;
  const max = Number.isInteger(opts.max) ? opts.max : DEFAULT_INHERIT_MAX;
  const rng = typeof opts.rng === 'function' ? opts.rng : Math.random;

  const biomeMap = _pool.get(speciesId);
  const mutSet = biomeMap ? biomeMap.get(biomeId) : null;
  const poolArr = mutSet ? Array.from(mutSet) : [];

  // Empty pool → no inheritance, return shallow copy.
  if (poolArr.length === 0) {
    return {
      unit: { ...newUnit },
      inherited: [],
      pool_consumed: false,
      pool_size: 0,
      lineage_id: lineageId,
    };
  }

  // Pick random N in [min, max] capped to pool size.
  const target = Math.min(poolArr.length, Math.max(min, Math.floor(rng() * (max - min + 1)) + min));

  // Fisher-Yates shuffle (in place on copy) using injected rng.
  const shuffled = poolArr.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const inherited = shuffled.slice(0, target);

  // Free grant: append to applied_mutations + trait_ids (no MP charge).
  // Dedup against existing.
  const existingApplied = new Set(
    Array.isArray(newUnit.applied_mutations) ? newUnit.applied_mutations : [],
  );
  const existingTraits = new Set(Array.isArray(newUnit.trait_ids) ? newUnit.trait_ids : []);
  for (const mid of inherited) {
    existingApplied.add(mid);
    // S5 grants the mutation_id as a trait too (mirror Spore part-pack
    // bingo so derived_ability eligibility tracks). Caller can post-process.
    existingTraits.add(mid);
  }

  const unit = {
    ...newUnit,
    applied_mutations: Array.from(existingApplied),
    trait_ids: Array.from(existingTraits),
    lineage_id: lineageId ?? newUnit.lineage_id ?? null,
  };

  return {
    unit,
    inherited,
    pool_consumed: false, // pool is additive, not consumed by inheritance
    pool_size: poolArr.length,
    lineage_id: lineageId,
  };
}

/**
 * Read-only inspection of the pool for a (species, biome) pair.
 *
 * @param {string} speciesId
 * @param {string} biomeId
 * @returns {{ species_id: string, biome_id: string, mutations: string[], pool_size: number }}
 */
function inspectPool(speciesId, biomeId) {
  const biomeMap = _pool.get(speciesId);
  const mutSet = biomeMap ? biomeMap.get(biomeId) : null;
  const mutations = mutSet ? Array.from(mutSet) : [];
  return {
    species_id: speciesId,
    biome_id: biomeId,
    mutations,
    pool_size: mutations.length,
  };
}

/**
 * Reset the entire pool. Test-only; not exposed via REST.
 */
function reset() {
  _pool.clear();
}

module.exports = {
  propagateLineage,
  inheritFromLineage,
  inspectPool,
  reset,
};
