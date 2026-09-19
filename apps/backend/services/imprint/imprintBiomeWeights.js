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

// The 4 imprint body-part axes (fixed; players are round-robin assigned to them).
const IMPRINT_AXES = ['locomotion', 'offense', 'defense', 'senses'];

// Anti-deadlock defaults (onboarding_v2 deliberation default_choices p1..p4). A pending
// axis at the open beat's timeout falls back to these so the team 4-tuple is always
// complete. NOT a balance value -- cosmetic only.
const IMPRINT_AXIS_DEFAULTS = Object.freeze({
  locomotion: 'VELOCE',
  offense: 'PROFONDA',
  defense: 'DURA',
  senses: 'LONTANO',
});

const IMPRINT_BEAT_FLAG = 'IMPRINT_BEAT_ENABLED';

// Flag gate (mirror staminaFatigue.isFatigueEnabled): OFF by default so the beat never
// opens and nothing is stamped -> band-neutral. Used by the WS/REST open path.
function isImprintEnabled(env = process.env) {
  return Boolean(env) && env[IMPRINT_BEAT_FLAG] === 'true';
}

// True iff `value` is a legal choice for `axis`. Case-insensitive; never throws.
function isValidAxisValue(axis, value) {
  const set = VALID[axis];
  return Boolean(set) && set.has(String(value == null ? '' : value).toUpperCase());
}

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
 * D7 (aa01 L'Impronta, 2026-06-30): the diegetic "il tuo branco tende verso X"
 * tendency descriptor. The structure (a PER-BIOME i18n key) lives here; the
 * player-facing PROSE is master-dd HITL (codex-lore boundary), authored in the client
 * i18n table under `imprint.branco_tendency.<biome>` (form-B per-biome flavor, ratified
 * master-dd 2026-06-30 close-out Tier-2). The backend ships NO Italian sentence --
 * `placeholder` stays a neutral never-empty fallback marker; the client localizes the
 * per-biome `i18n_key`. Additive to the existing cosmetic hint (rides the
 * IMPRINT_BEAT_ENABLED gate; band-neutral, no own flag). null for an empty lean.
 *
 * @param {string} leansToward the top biome from the cosmetic affinity hint
 * @returns {{ leans_toward, i18n_key, vars: { biome }, placeholder } | null}
 */
function brancoTendencyHint(leansToward) {
  if (!leansToward || typeof leansToward !== 'string') return null;
  return {
    leans_toward: leansToward,
    i18n_key: `imprint.branco_tendency.${leansToward}`, // per-biome diegetic prose key (HITL master-dd, form-B)
    vars: { biome: leansToward }, // retained for fallback/telemetry; the per-biome key carries the prose
    placeholder: 'TODO_IMPRINT_TENDENCY_PROSE',
  };
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
  brancoTendencyHint,
  tupleKey,
  resetCache,
  IMPRINT_AXES,
  IMPRINT_AXIS_DEFAULTS,
  isImprintEnabled,
  isValidAxisValue,
};
