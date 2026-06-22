'use strict';

// Imprint biome-AFFINITY weights (C2-imprint, ratified L'Impronta affinity 6.1-A).
//
// PURE, READ-ONLY, NON-BINDING. Maps the team's 4-axis imprint choices to a
// normalized { biome: weight } cosmetic-display distribution. It NEVER assigns or
// binds a biome (biome stays route-canon via world_setup/confirmWorld) and its output
// MUST NEVER be fed into damage / score / affinity / route math -- it only drives the
// cosmetic "il tuo branco tende verso X" hint.
//
// DISTINCT from apps/backend/services/species/biomeAffinity.js (species<->biome COMBAT
// affinity, getBiomeAffinityModifier, wired at session.js). Different name + export on
// purpose -- do not merge the two.
//
// Non-throwing by contract: invalid/missing axes are skipped; empty/all-invalid input
// returns {}; a missing/broken config returns {}. Mirrors the band-neutral, never-crash
// posture of the surrounding coop helpers.
//
// Plan: docs/planning/2026-06-22-aa01-c2-imprint-build-spec.md (STEP 2).

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const VALID = {
  locomotion: new Set(['VELOCE', 'SILENZIOSA']),
  offense: new Set(['PROFONDA', 'RAPIDA']),
  defense: new Set(['DURA', 'FLESSIBILE']),
  senses: new Set(['LONTANO', 'ACUTO']),
};

let cachedConfig = null;

function defaultConfigPath() {
  return path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'data',
    'core',
    'imprint',
    'biome_resolution.yaml',
  );
}

function loadConfig(configPath) {
  if (cachedConfig && !configPath) return cachedConfig;
  const resolved = configPath || defaultConfigPath();
  const config = yaml.load(fs.readFileSync(resolved, 'utf8'));
  if (!configPath) cachedConfig = config;
  return config;
}

function resetCache() {
  cachedConfig = null;
}

// Build the "L_O_D_S" lookup key from one 4-tuple. Returns null (NOT throw) if any
// axis is missing or invalid -- the caller skips that tuple.
function tupleKey(tuple) {
  if (!tuple || typeof tuple !== 'object') return null;
  const l = String(tuple.locomotion || '').toUpperCase();
  const o = String(tuple.offense || '').toUpperCase();
  const d = String(tuple.defense || '').toUpperCase();
  const s = String(tuple.senses || '').toUpperCase();
  if (
    !VALID.locomotion.has(l) ||
    !VALID.offense.has(o) ||
    !VALID.defense.has(d) ||
    !VALID.senses.has(s)
  ) {
    return null;
  }
  return `${l[0]}_${o[0]}_${d[0]}_${s[0]}`;
}

/**
 * Compute normalized cosmetic biome-affinity weights from the team's imprint tuples.
 *
 * Shared-branco model passes a single team tuple ([{...}]) -> a one-biome distribution
 * ({ biome: 1 }); a future per-creature model can pass N tuples -> a spread distribution.
 *
 * @param {Array<{locomotion,offense,defense,senses}>|object} teamTuples
 * @param {{ config_path?: string }} [opts]
 * @returns {{ [biome: string]: number }} normalized weights (sum = 1), or {} when there
 *   is no valid tuple. NEVER throws. NEVER returns a biome_id assignment.
 */
function computeImprintBiomeWeights(teamTuples, opts = {}) {
  const tuples = Array.isArray(teamTuples) ? teamTuples : teamTuples ? [teamTuples] : [];
  let config;
  try {
    config = loadConfig(opts.config_path);
  } catch {
    return {};
  }
  const lookup = (config && config.base_lookup) || {};
  const fallback = config && config.fallback_biome;

  const counts = {};
  let total = 0;
  for (const tuple of tuples) {
    const key = tupleKey(tuple);
    if (!key) continue;
    const biome = lookup[key] || fallback;
    if (!biome) continue;
    counts[biome] = (counts[biome] || 0) + 1;
    total += 1;
  }
  if (total === 0) return {};

  const weights = {};
  for (const biome of Object.keys(counts)) {
    weights[biome] = counts[biome] / total;
  }
  return weights;
}

/**
 * The biome with the highest weight (stable on ties), or null for empty weights.
 * Drives the cosmetic hint "leans_toward".
 *
 * @param {{ [biome: string]: number }} weights
 * @returns {string|null}
 */
function topBiome(weights) {
  if (!weights || typeof weights !== 'object') return null;
  let best = null;
  let bestWeight = -Infinity;
  for (const biome of Object.keys(weights)) {
    const w = weights[biome];
    if (typeof w === 'number' && w > bestWeight) {
      best = biome;
      bestWeight = w;
    }
  }
  return best;
}

module.exports = {
  computeImprintBiomeWeights,
  topBiome,
  tupleKey,
  resetCache,
};
