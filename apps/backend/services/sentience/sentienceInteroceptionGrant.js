// 2026-06-21 OD-024 ai-station -- sentience interoception trait grant (producer).
//
// Gate-5 closure ("engine LIVE, producer DEAD"). The 4 RFC sentience v0.1
// interoception traits live in data/core/traits/active_effects.yaml and FIRE
// end-to-end through traitEffects.js (see tests/api/interoception-traits-
// runtime.test.js), but NOTHING assigns them to any unit -- grep data/core/
// species for the ids returns zero. So they never reached real play.
//
// This producer grants the gateway set to a character/unit whose species
// sentience_index qualifies, reusing the ALREADY-WIRED sentience tier
// (vcScoring._resolveSentienceTiers / species_catalog.json sentience_index) --
// mechanism (a) in docs/planning/2026-06-21-sentience-traits-wiring-scope.md.
//
// HARD CONSTRAINTS honored:
//   - NO effect VALUES here. This module only references trait IDS; the +1/-1
//     amounts stay in active_effects.yaml. Each id is validated against the
//     loaded registry (yaml = SoT) before granting -- drop a trait from the
//     yaml and the producer stops granting it.
//   - NO species-file writes. Reads existing sentience_index only.
//
// DEFAULT OFF (flag SENTIENCE_INTEROCEPTION_GRANT_ENABLED). Granting +1
// attack / -1 damage traits shifts win-rates, so the producer is band-neutral
// until master-dd flips it post N=40 (mirrors LETHAL_MISSIONS_ENABLED etc.).
//
// Wire: coopOrchestrator.submitCharacter, appended after the innata grant
// (mirror apps/backend/services/forms/formInnataTrait.js applyInnataTraitGrant).

'use strict';

// RFC sentience v0.1 interoception gateway trait ids (OD-024, RFC sez.5 MVP).
// GRANT POLICY (which ids), not effect values. Which species/tiers ultimately
// receive which subset is a master-dd design call -- see scope doc.
const INTEROCEPTION_TRAIT_IDS = Object.freeze([
  'propriocezione',
  'equilibrio_vestibolare',
  'nocicezione',
  'termocezione',
]);

const FLAG = 'SENTIENCE_INTEROCEPTION_GRANT_ENABLED';

// Minimum qualifying tier. T1 = RFC gateway (matches the resolver fallback
// baseline). Whether higher interoception should gate on a higher tier is a
// master-dd design call; the producer accepts opts.minTier so that policy can
// be tuned without touching this default.
const DEFAULT_MIN_TIER = 'T1';

function isGrantEnabled(env = process.env) {
  return Boolean(env) && env[FLAG] === 'true';
}

function _tierRank(tier) {
  const m = /^T(\d+)$/.exec(typeof tier === 'string' ? tier.trim() : '');
  return m ? Number(m[1]) : null;
}

function tierQualifies(tier, minTier = DEFAULT_MIN_TIER) {
  const rank = _tierRank(tier);
  const min = _tierRank(minTier);
  return rank !== null && min !== null && rank >= min;
}

let _registryCache = null;
function _defaultRegistry() {
  if (_registryCache) return _registryCache;
  // eslint-disable-next-line global-require
  const { loadActiveTraitRegistry } = require('../traitEffects');
  // Silence the per-load info log -- this runs on the character-submit path.
  _registryCache = loadActiveTraitRegistry(undefined, { log() {}, warn: console.warn });
  return _registryCache;
}

function _defaultCatalog() {
  // eslint-disable-next-line global-require
  const { _loadSpeciesCatalog } = require('../vcScoring');
  return _loadSpeciesCatalog();
}

/**
 * Append the interoception gateway traits to a character/unit spec when its
 * species sentience_index qualifies. Pure: returns a new object when it grants,
 * otherwise the input unchanged. Never throws into the caller's submit path
 * (callers also wrap in try/catch, mirroring the innata grant).
 *
 * @param {object} spec -- spec/unit with `species_id` + optional `traits[]`.
 * @param {object} [opts]
 * @param {object} [opts.env]      -- env source (default process.env).
 * @param {object} [opts.catalog]  -- {species_id: entry} map (default disk load).
 * @param {object} [opts.registry] -- {trait_id: def} map (default disk load).
 * @param {string} [opts.minTier]  -- minimum qualifying tier (default 'T1').
 * @returns {object} spec, possibly with traits[] extended.
 */
function applySentienceInteroceptionGrant(spec, opts = {}) {
  if (!spec || typeof spec !== 'object') return spec;
  const env = opts.env || process.env;
  if (!isGrantEnabled(env)) return spec; // DEFAULT OFF -> band-neutral no-op.

  const speciesId =
    typeof spec.species_id === 'string' && spec.species_id.length > 0 ? spec.species_id : null;
  if (!speciesId) return spec; // fail-closed: no species -> no tier -> no grant.

  const catalog = opts.catalog || _defaultCatalog();
  const entry = catalog && typeof catalog === 'object' ? catalog[speciesId] : null;
  const tier = entry && typeof entry.sentience_index === 'string' ? entry.sentience_index : null;
  if (!tierQualifies(tier, opts.minTier)) return spec; // below gateway / unknown.

  const registry = opts.registry || _defaultRegistry();
  // Validate ids against the registry -- yaml is SoT for which traits exist.
  const grantable = INTEROCEPTION_TRAIT_IDS.filter(
    (id) => registry && typeof registry === 'object' && registry[id],
  );
  if (grantable.length === 0) return spec;

  const existing = Array.isArray(spec.traits) ? spec.traits : [];
  const additions = grantable.filter((id) => !existing.includes(id));
  if (additions.length === 0) return spec; // already carries them -- no-dup.

  return { ...spec, traits: [...existing, ...additions] };
}

module.exports = {
  INTEROCEPTION_TRAIT_IDS,
  FLAG,
  DEFAULT_MIN_TIER,
  isGrantEnabled,
  tierQualifies,
  applySentienceInteroceptionGrant,
};
