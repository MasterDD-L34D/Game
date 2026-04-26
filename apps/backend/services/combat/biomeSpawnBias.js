// V7 Biome-aware spawn bias (ADR-2026-04-26) + QW3 role_templates (M-013).
//
// Pure module. Augments reinforcement/director spawn pool weight based on
// biome affixes matching unit tags + ecological role_templates from
// data/core/traits/biome_pools.json. Closes vision gap in
// docs/core/28-NPC_BIOMI_SPAWN.md ("biomi guidano spawn").
//
// API:
//   applyBiomeBias(pool, biomeConfig, opts?)
//     → pool with weight boosted per affix + role_template match
//   matchAffix(unit, affix) → boolean
//   biomeMatchScore(unit, biomeConfig) → 0..1
//   matchRoleTemplate(unit, roleTemplates) → { matched, role, tier, primary }
//
// Backward compatible: if pool entry has no tags/archetype/role and biome
// has no affixes/biome_id, returns pool unchanged.

'use strict';

const DEFAULT_BOOST_PER_MATCH = 1.5;
const MAX_BOOST = 3.0;
// QW3: total cap (affix + role_template combined). Pattern V7 "no dominance".
const MAX_BOOST_TOTAL = 4.0;
// QW3: role boost factors. Primary ecological roles get bigger boost than support.
const ROLE_BOOST_PRIMARY = 2.0; // apex, keystone
const ROLE_BOOST_SUPPORT = 1.5; // bridge, threat, event
const PRIMARY_ROLES = new Set(['apex', 'keystone']);
const SUPPORT_ROLES = new Set(['bridge', 'threat', 'event']);

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
 * Estrai i role tag da un'entry di pool. Supporta sia stringa singola
 * `role: 'apex'` (tipico pool di rinforzo) sia array `role_tags: ['apex','predator']`
 * (species_expansion.yaml).
 *
 * @returns {string[]} normalized lower-case roles
 */
function extractEntryRoles(entry) {
  if (!entry) return [];
  const out = [];
  if (typeof entry.role === 'string') out.push(entry.role.toLowerCase());
  if (Array.isArray(entry.role_tags)) {
    for (const t of entry.role_tags) if (t) out.push(String(t).toLowerCase());
  }
  return out;
}

/**
 * Match unit/pool entry against role_templates from biome pool.
 * Match strategy:
 *   1. Direct role tag match (entry.role / role_tags ↔ template.role)
 *   2. Trait overlap (entry.tags / preferred_traits ↔ template.preferred_traits)
 *   3. Functional tag overlap (entry.functional_tags ↔ template.functional_tags)
 *
 * Returns the *best* match (highest tier when multiple match) for one entry.
 *
 * @param {object} entry pool entry
 * @param {Array} roleTemplates from biome_pools.json
 * @returns {{matched:boolean, role?:string, tier?:number, primary?:boolean, via?:string}}
 */
function matchRoleTemplate(entry, roleTemplates) {
  if (!entry || !Array.isArray(roleTemplates) || roleTemplates.length === 0) {
    return { matched: false };
  }
  const entryRoles = extractEntryRoles(entry);
  const entryTags = (entry.tags || entry.archetype_tags || entry.preferred_traits || []).map((t) =>
    String(t).toLowerCase(),
  );
  const entryFunctional = (entry.functional_tags || []).map((t) => String(t).toLowerCase());

  let best = null;
  for (const tmpl of roleTemplates) {
    if (!tmpl || !tmpl.role) continue;
    const role = String(tmpl.role).toLowerCase();
    const tier = Number(tmpl.tier) || 0;
    let via = null;

    if (entryRoles.includes(role)) {
      via = 'role';
    } else if (Array.isArray(tmpl.preferred_traits)) {
      const preferred = tmpl.preferred_traits.map((t) => String(t).toLowerCase());
      if (preferred.some((p) => entryTags.includes(p))) via = 'preferred_traits';
    }
    if (!via && Array.isArray(tmpl.functional_tags) && entryFunctional.length > 0) {
      const functional = tmpl.functional_tags.map((t) => String(t).toLowerCase());
      if (functional.some((f) => entryFunctional.includes(f))) via = 'functional_tags';
    }
    if (!via) continue;

    const candidate = {
      matched: true,
      role,
      tier,
      primary: PRIMARY_ROLES.has(role),
      via,
    };
    if (!best || tier > (best.tier || 0)) best = candidate;
  }
  return best || { matched: false };
}

/**
 * Compute role-template boost multiplier for an entry.
 *
 * @returns {{boost:number, match:object}} boost ∈ [1, ROLE_BOOST_PRIMARY]
 */
function roleTemplateBoost(entry, roleTemplates) {
  const match = matchRoleTemplate(entry, roleTemplates);
  if (!match.matched) return { boost: 1.0, match };
  if (PRIMARY_ROLES.has(match.role)) return { boost: ROLE_BOOST_PRIMARY, match };
  if (SUPPORT_ROLES.has(match.role)) return { boost: ROLE_BOOST_SUPPORT, match };
  return { boost: 1.0, match };
}

/**
 * Apply biome bias to spawn pool. Pure (returns new array).
 *
 * Layers (multiplicative, capped at MAX_BOOST_TOTAL):
 *   1. Archetype match (primary → MAX_BOOST, support → ~mid)
 *   2. Affix tag match (multiplicative per affix, capped at MAX_BOOST)
 *   3. QW3 Role template match (apex/keystone → ×2, bridge/threat/event → ×1.5)
 *
 * @param {Array<{unit_id, weight?, tags?, role?, role_tags?}>} pool
 * @param {{ affixes?, npc_archetypes?, biome_id?, role_templates? }} biomeConfig
 * @param {object} [opts]
 * @param {number} [opts.boostPerMatch=1.5]
 * @param {number} [opts.maxBoost=3.0]
 * @param {number} [opts.maxBoostTotal=4.0]
 * @param {Array}  [opts.roleTemplates] explicit override (skip loader)
 * @param {object} [opts.poolLoader] override (test only) — must expose getRoleTemplates
 * @returns {Array} new pool with adjusted weights + _biome_bias debug
 */
function applyBiomeBias(pool, biomeConfig, opts = {}) {
  if (!Array.isArray(pool) || pool.length === 0) return pool;
  if (!biomeConfig) return pool;
  const hasAffixes = Array.isArray(biomeConfig.affixes);
  const boostPerMatch = opts.boostPerMatch ?? DEFAULT_BOOST_PER_MATCH;
  const maxBoost = opts.maxBoost ?? MAX_BOOST;
  const maxBoostTotal = opts.maxBoostTotal ?? MAX_BOOST_TOTAL;

  // Primary archetype preferences: full max boost
  const primaryArchetypes = new Set(biomeConfig.npc_archetypes?.primary || []);
  const supportArchetypes = new Set(biomeConfig.npc_archetypes?.support || []);

  // QW3: resolve role_templates. Priority:
  //   1. opts.roleTemplates (explicit override, test)
  //   2. biomeConfig.role_templates (inline)
  //   3. loader by biomeConfig.biome_id (memoized JSON load)
  let roleTemplates = [];
  if (Array.isArray(opts.roleTemplates)) {
    roleTemplates = opts.roleTemplates;
  } else if (Array.isArray(biomeConfig.role_templates)) {
    roleTemplates = biomeConfig.role_templates;
  } else if (biomeConfig.biome_id) {
    try {
      const loader = opts.poolLoader || require('./biomePoolLoader');
      roleTemplates = loader.getRoleTemplates(biomeConfig.biome_id) || [];
    } catch {
      roleTemplates = [];
    }
  }
  const hasRoleTemplates = roleTemplates.length > 0;

  // If no signal at all → fully unchanged (backward compat with V7 baseline).
  if (!hasAffixes && !hasRoleTemplates) return pool;

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
    if (hasAffixes) {
      for (const affix of biomeConfig.affixes) {
        if (matchAffix(entry, affix)) affixMatches += 1;
      }
      if (affixMatches > 0) {
        boost *= Math.min(maxBoost, 1 + boostPerMatch * affixMatches);
      }
    }

    // QW3: role_template match — additive layer above affix+archetype
    let roleMatch = { matched: false };
    if (hasRoleTemplates) {
      const result = roleTemplateBoost(entry, roleTemplates);
      roleMatch = result.match;
      if (result.boost > 1) boost *= result.boost;
    }

    // Final cap (no dominance absoluta).
    if (boost > maxBoostTotal) boost = maxBoostTotal;

    return {
      ...entry,
      weight: baseWeight * boost,
      _biome_bias: {
        boost,
        affix_matches: affixMatches,
        role_template_match: roleMatch,
        base_weight: baseWeight,
      },
    };
  });
}

module.exports = {
  applyBiomeBias,
  matchAffix,
  biomeMatchScore,
  matchRoleTemplate,
  roleTemplateBoost,
  extractEntryRoles,
  AFFIX_TAG_AFFINITIES,
  DEFAULT_BOOST_PER_MATCH,
  MAX_BOOST,
  MAX_BOOST_TOTAL,
  ROLE_BOOST_PRIMARY,
  ROLE_BOOST_SUPPORT,
  PRIMARY_ROLES,
  SUPPORT_ROLES,
};
