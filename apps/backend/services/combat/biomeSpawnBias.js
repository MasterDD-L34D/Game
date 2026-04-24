// V7 Biome-aware spawn bias (ADR-2026-04-26).
//
// Pure module. Augments reinforcement/director spawn pool weight based on
// biome affixes matching unit tags. Closes vision gap in
// docs/core/28-NPC_BIOMI_SPAWN.md ("biomi guidano spawn").
//
// API:
//   applyBiomeBias(pool, biomeConfig, opts?)
//     → pool with weight boosted per affix matching unit.tags/archetype
//   matchAffix(unit, affix) → boolean
//   biomeMatchScore(unit, biomeConfig) → 0..1
//
// Backward compatible: if pool entry has no tags/archetype or biome has
// no affixes, returns pool unchanged.

'use strict';

const DEFAULT_BOOST_PER_MATCH = 1.5;
const MAX_BOOST = 3.0;

// Affix → unit tag affinities (canonical vocabulary match).
// Keys = biome affix, Values = unit tags that biome favors.
const AFFIX_TAG_AFFINITIES = {
  termico: ['fire', 'magma', 'thermal', 'forge'],
  luminescente: ['light', 'photic', 'luminous', 'crystal'],
  spore_diluite: ['spore', 'fungal', 'toxin', 'decay'],
  sabbia: ['desert', 'sand', 'arid', 'burrow'],
  cristallino: ['crystal', 'shard', 'geometric'],
  corrosivo: ['acid', 'corrosive', 'rust'],
  fragile: ['glass', 'brittle', 'unstable'],
  resonance_tide: ['emp', 'magnetic', 'tidal', 'resonance'],
  shard_storm: ['shard', 'storm', 'flying'],
  cryo: ['ice', 'frost', 'cold', 'cryo'],
  spore_dense: ['spore', 'fungal', 'toxin'],
  plasma: ['plasma', 'energy', 'void'],
  radiant: ['holy', 'radiant', 'light'],
};

/**
 * Check if unit matches an affix via tag intersection.
 */
function matchAffix(unit, affix) {
  if (!unit || !affix) return false;
  const tags = unit.tags || unit.archetype_tags || unit.affix_preferences || [];
  if (!Array.isArray(tags) || tags.length === 0) return false;
  const affinities = AFFIX_TAG_AFFINITIES[affix] || [affix];
  const normalizedTags = tags.map((t) => String(t).toLowerCase());
  return affinities.some((a) => normalizedTags.includes(String(a).toLowerCase()));
}

/**
 * Compute 0..1 biome match score for a unit.
 */
function biomeMatchScore(unit, biomeConfig) {
  if (!biomeConfig || !Array.isArray(biomeConfig.affixes)) return 0;
  if (biomeConfig.affixes.length === 0) return 0;
  let matches = 0;
  for (const affix of biomeConfig.affixes) {
    if (matchAffix(unit, affix)) matches += 1;
  }
  return matches / biomeConfig.affixes.length;
}

/**
 * Apply biome bias to spawn pool. Pure (returns new array).
 *
 * @param {Array<{unit_id, weight?, tags?}>} pool
 * @param {{ affixes?, npc_archetypes? }} biomeConfig
 * @param {object} [opts]
 * @param {number} [opts.boostPerMatch=1.5]
 * @param {number} [opts.maxBoost=3.0]
 * @returns {Array} new pool with adjusted weights
 */
function applyBiomeBias(pool, biomeConfig, opts = {}) {
  if (!Array.isArray(pool) || pool.length === 0) return pool;
  if (!biomeConfig || !Array.isArray(biomeConfig.affixes)) return pool;
  const boostPerMatch = opts.boostPerMatch ?? DEFAULT_BOOST_PER_MATCH;
  const maxBoost = opts.maxBoost ?? MAX_BOOST;

  // Primary archetype preferences: full max boost
  const primaryArchetypes = new Set(biomeConfig.npc_archetypes?.primary || []);
  const supportArchetypes = new Set(biomeConfig.npc_archetypes?.support || []);

  return pool.map((entry) => {
    const baseWeight = Number(entry.weight) || 1;
    let boost = 1.0;

    // Archetype match: primary=max, support=~half
    if (entry.archetype) {
      if (primaryArchetypes.has(entry.archetype)) boost *= maxBoost;
      else if (supportArchetypes.has(entry.archetype)) boost *= 1 + (maxBoost - 1) / 2;
    }

    // Affix tag match: multiplicative (per match)
    let affixMatches = 0;
    for (const affix of biomeConfig.affixes) {
      if (matchAffix(entry, affix)) affixMatches += 1;
    }
    if (affixMatches > 0) {
      boost *= Math.min(maxBoost, 1 + boostPerMatch * affixMatches);
    }

    return {
      ...entry,
      weight: baseWeight * boost,
      _biome_bias: { boost, affix_matches: affixMatches, base_weight: baseWeight },
    };
  });
}

module.exports = {
  applyBiomeBias,
  matchAffix,
  biomeMatchScore,
  AFFIX_TAG_AFFINITIES,
  DEFAULT_BOOST_PER_MATCH,
  MAX_BOOST,
};
