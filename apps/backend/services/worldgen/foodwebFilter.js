// Foodweb spawn-pool filter — TKT-WORLDGEN-GAPA (2026-05-29).
//
// Wires the read-only `ecosystemResolver` (trophic data per biome) into a
// reinforcement spawn-pool WHITELIST filter. Closes the Engine-LIVE /
// Surface-DEAD gap: ecosystem.yaml trophic tiers existed but no runtime
// consumed them.
//
// Pattern: Caves of Qud spawn whitelist (docs/reports/2026-04-26-worldgen-pcg-
// audit.md). FILTER only -- never generates units. Excludes pool entries whose
// species is NOT part of the encounter biome's foodweb (e.g. a cryosteppe
// creature reinforcing a badlands battle).
//
// Band-safety guarantees (see TKT-WORLDGEN-GAPA + CANONICAL-AI-PLAYTEST):
//   - No biome / no ecosystem data -> passthrough (unchanged behavior).
//   - Filtering that would empty the pool -> fallback to the unfiltered pool
//     (spawning is NEVER blocked by this filter).
//   The canonical hardcore reinforcement pools are trophic-clean, so this
//   filter removes nothing there -> WR bands unchanged.
//
// API:
//   filterReinforcementPool(pool, biomeId, opts?) -> {
//     pool,        // filtered array (or original on passthrough/fallback)
//     applied,     // boolean: did the filter actually remove any entry?
//     biome_id,
//     excluded,    // [unit_id] removed (or would-be removed on fallback)
//     reason,      // 'no_biome' | 'empty_pool' | 'no_ecosystem' |
//                  // 'all_in_foodweb' | 'filtered' | 'all_excluded_fallback'
//   }
//
// opts.getEcosystem -- injectable resolver (default ecosystemResolver.getEcosystem)
//   for pure unit testing.
//
// SPEC-I ER7 -- applyPopulationToPool(pool, biomeId, biomePopulation, opts?):
//   second-stage shaping that consumes the cross-run population state (per
//   trophic role). A `depleted` role's species are excluded; an `abundant`
//   role's species get their weight bumped (ABUNDANT_WEIGHT_MULT, RATIFIED
//   2026-06-11 N=40). The depleted-exclusion is an INTENTIONAL ecological
//   difficulty consequence (A13-like), not a band regression -- see the evidence.
//   Same band-safety contract: no population / no role pressure -> passthrough,
//   and excluding everything falls back to the input pool (never empties it).
//   Pure (clones boosted entries). Flag-gated by the caller (spawner) via
//   biomePopulation.isEnabled().

'use strict';

const ecosystemResolver = require('./ecosystemResolver');
const biomePopulation = require('./biomePopulation');

// RATIFIED 2026-06-11 (N=40): peso extra alle specie di un ruolo `abundant`.
const ABUNDANT_WEIGHT_MULT = 2;

function _norm(value) {
  return String(value == null ? '' : value).trim();
}

function filterReinforcementPool(pool, biomeId, opts = {}) {
  if (!Array.isArray(pool) || pool.length === 0) {
    return { pool, applied: false, biome_id: biomeId || null, excluded: [], reason: 'empty_pool' };
  }
  if (!biomeId) {
    return { pool, applied: false, biome_id: null, excluded: [], reason: 'no_biome' };
  }

  const getEcosystem =
    typeof opts.getEcosystem === 'function' ? opts.getEcosystem : ecosystemResolver.getEcosystem;
  const eco = getEcosystem(biomeId);
  if (!eco || !Array.isArray(eco.species_all) || eco.species_all.length === 0) {
    return { pool, applied: false, biome_id: biomeId, excluded: [], reason: 'no_ecosystem' };
  }

  const whitelist = new Set(eco.species_all.map(_norm));
  const kept = [];
  const excluded = [];
  for (const entry of pool) {
    const id = _norm(entry && entry.unit_id);
    if (whitelist.has(id)) kept.push(entry);
    else excluded.push(id);
  }

  if (kept.length === 0) {
    // Band-safety: a whitelist that excludes everything would block spawning
    // entirely and silently change combat difficulty. Fall back to the
    // unfiltered pool instead (the caller surfaces this via telemetry/log).
    return { pool, applied: false, biome_id: biomeId, excluded, reason: 'all_excluded_fallback' };
  }
  if (excluded.length === 0) {
    return { pool, applied: false, biome_id: biomeId, excluded: [], reason: 'all_in_foodweb' };
  }
  return { pool: kept, applied: true, biome_id: biomeId, excluded, reason: 'filtered' };
}

// SPEC-I ER7 -- population-aware spawn-pool shaping (second stage after the
// whitelist filter). biomePop = campaign.biomePopulation[biomeId] (per-role
// discrete state). Band-safe + pure; see header.
function applyPopulationToPool(pool, biomeId, biomePop, opts = {}) {
  const base = { biome_id: biomeId || null, excluded: [], boosted: [] };
  if (!Array.isArray(pool) || pool.length === 0) {
    return { pool, applied: false, ...base, reason: 'empty_pool' };
  }
  if (!biomePop || typeof biomePop !== 'object') {
    return { pool, applied: false, ...base, reason: 'no_population' };
  }
  const depleted = new Set(biomePopulation.depletedRoles(biomePop));
  const abundant = new Set(biomePopulation.abundantRoles(biomePop));
  if (depleted.size === 0 && abundant.size === 0) {
    return { pool, applied: false, ...base, reason: 'no_pressure' };
  }
  const getSpeciesRoles =
    typeof opts.getSpeciesRoles === 'function'
      ? opts.getSpeciesRoles
      : ecosystemResolver.getSpeciesRoles;
  const roleMap = getSpeciesRoles(biomeId) || {};
  if (Object.keys(roleMap).length === 0) {
    return { pool, applied: false, ...base, reason: 'no_roles' };
  }
  const normRoles = {};
  for (const [sp, role] of Object.entries(roleMap)) normRoles[_norm(sp)] = role;

  const kept = [];
  const excluded = [];
  const boosted = [];
  for (const entry of pool) {
    const id = _norm(entry && entry.unit_id);
    const role = normRoles[id]; // undefined -> off-foodweb / synthetic -> kept
    if (role && depleted.has(role)) {
      excluded.push(id);
      continue;
    }
    if (role && abundant.has(role)) {
      const w = Number.isFinite(Number(entry && entry.weight)) ? Number(entry.weight) : 1;
      kept.push({ ...entry, weight: w * ABUNDANT_WEIGHT_MULT });
      boosted.push(id);
    } else {
      kept.push(entry);
    }
  }

  if (kept.length === 0) {
    // Band-safety: never empty the pool (spawning is never blocked here).
    return {
      pool,
      applied: false,
      biome_id: biomeId || null,
      excluded,
      boosted: [],
      reason: 'all_depleted_fallback',
    };
  }
  if (excluded.length === 0 && boosted.length === 0) {
    return { pool, applied: false, ...base, reason: 'no_pressure' };
  }
  return {
    pool: kept,
    applied: true,
    biome_id: biomeId || null,
    excluded,
    boosted,
    reason: 'shaped',
  };
}

module.exports = { filterReinforcementPool, applyPopulationToPool, ABUNDANT_WEIGHT_MULT };
