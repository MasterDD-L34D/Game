// W5-bb (cross-repo Godot v2 mirror) — Companion Picker service.
//
// Mirrors Godot v2 `scripts/data/companion_picker.gd` (PR #62):
//   https://github.com/MasterDD-L34D/Game-Godot-v2/blob/main/scripts/data/companion_picker.gd
//
// Loads skiv_archetype_pool.yaml + deterministic pick logic (B3 hybrid
// override + species + name (RNG seeded) + closing + MBTI bias).
//
// Schema source: data/core/companion/skiv_archetype_pool.yaml v0.1
//
// Surface: companionPicker.pick({ poolPath?, biomeId, formAxes?, runSeed?, trainerCanonical? })
//   → { display_name, species_id, biome_origin_id, voice_it,
//       opening_line, closing_ritual, voice_modifier }
//
// B3 hybrid: trainerCanonical=true AND biomeId="savana" → Skiv canonical.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_POOL_PATH = path.resolve(
  __dirname,
  '../../../../data/core/companion/skiv_archetype_pool.yaml',
);

const CANONICAL_SKIV = Object.freeze({
  display_name: 'Skiv',
  species_id: 'dune_stalker',
  biome_origin_id: 'savana',
  voice_it: 'Allenatore, sento il calore salire prima che il sole sia visibile.',
  opening_line: 'Allenatore, riconosco il tuo passo.',
  closing_ritual: 'Sabbia segue.',
  voice_modifier: 'canonical',
});

let _cachedPool = null;
let _cachedPoolPath = null;

function _loadPool(poolPath = DEFAULT_POOL_PATH) {
  if (_cachedPool && _cachedPoolPath === poolPath) return _cachedPool;
  if (!fs.existsSync(poolPath)) return null;
  const raw = fs.readFileSync(poolPath, 'utf8');
  const data = yaml.load(raw);
  if (!data || typeof data !== 'object') return null;
  _cachedPool = data;
  _cachedPoolPath = poolPath;
  return data;
}

// Test-only: clear cached pool so tests with custom pool paths re-load.
function _resetCache() {
  _cachedPool = null;
  _cachedPoolPath = null;
}

// Deterministic seeded RNG (mulberry32). Matches Godot
// RandomNumberGenerator behavior closely enough for parity tests.
function _seededRng(seed) {
  let s = seed | 0 || 1;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function _resolveBiomePool(pool, biomeId) {
  const pools = pool && pool.biome_pools ? pool.biome_pools : {};
  if (pools[biomeId]) return { biomePool: pools[biomeId], biomeOriginId: biomeId };
  // Fallback per skiv_archetype_pool.yaml §generative_rules.fallback rule
  // ("primary_biome NOT in biome_species_pool → use savana pool").
  const fallback = pools.savana;
  if (fallback) return { biomePool: fallback, biomeOriginId: 'savana' };
  return { biomePool: null, biomeOriginId: biomeId };
}

function _resolveVoiceModifier(pool, formAxes = {}) {
  const threshold = 0.6;
  const t = Number.isFinite(formAxes.T) ? formAxes.T : 0.5;
  const f = Number.isFinite(formAxes.F) ? formAxes.F : 0.5;
  const n = Number.isFinite(formAxes.N) ? formAxes.N : 0.5;
  const s = Number.isFinite(formAxes.S) ? formAxes.S : 0.5;
  const mods = (pool && pool.generative_rules && pool.generative_rules.mbti_personality_bias) || {};
  if (t >= threshold && t > f) return mods.solitari_t_high?.voice_modifier || 'fredda_analitica';
  if (f >= threshold && f > t) return mods.simbionti_f_high?.voice_modifier || 'empatica_branco';
  if (n >= threshold && n > s)
    return mods.esploratori_n_high?.voice_modifier || 'visionaria_intuitiva';
  if (s >= threshold && s > n)
    return mods.sensoriali_s_high?.voice_modifier || 'sensoriale_presente';
  return '';
}

function _trimSuffixDot(s) {
  return s.endsWith('.') ? s.slice(0, -1) : s;
}

/**
 * Deterministic companion archetype pick.
 *
 * @param {object} opts
 * @param {string} [opts.poolPath]            — skiv_archetype_pool.yaml path
 * @param {string} opts.biomeId               — primary biome slug
 * @param {object} [opts.formAxes]            — party MBTI {T,F,N,S} ∈ [0,1]
 * @param {number} [opts.runSeed=0]           — deterministic name+closing seed
 * @param {boolean} [opts.trainerCanonical]   — B3 hybrid override flag
 * @returns {object} CompanionInstance or {} when pool missing
 */
function pick(opts = {}) {
  const {
    poolPath = DEFAULT_POOL_PATH,
    biomeId,
    formAxes = {},
    runSeed = 0,
    trainerCanonical = false,
  } = opts;
  if (!biomeId || typeof biomeId !== 'string') return {};
  // B3 hybrid override: canonical trainer in savana → Skiv canonical.
  if (trainerCanonical && biomeId === 'savana') {
    return { ...CANONICAL_SKIV };
  }
  const pool = _loadPool(poolPath);
  if (!pool) return {};
  const { biomePool, biomeOriginId } = _resolveBiomePool(pool, biomeId);
  if (!biomePool) return {};
  const speciesPool = Array.isArray(biomePool.species_pool) ? biomePool.species_pool : [];
  const namePool = Array.isArray(biomePool.name_pool) ? biomePool.name_pool : [];
  const metaphorSet = Array.isArray(biomePool.biome_metaphor_set)
    ? biomePool.biome_metaphor_set
    : [];
  const closingPool = Array.isArray(biomePool.closing_pool) ? biomePool.closing_pool : [];
  // Species pick: first entry deterministic. Role-gap refinement deferred
  // until ERMES eco_pressure_score available (W5.5).
  const speciesId = speciesPool[0] && typeof speciesPool[0] === 'object' ? speciesPool[0].id : '';
  const rng = _seededRng(runSeed);
  const name = namePool.length > 0 ? namePool[Math.floor(rng() * namePool.length)] : '';
  const closing = closingPool.length > 0 ? closingPool[Math.floor(rng() * closingPool.length)] : '';
  const metaphor =
    metaphorSet.length > 0 ? metaphorSet[Math.floor(rng() * metaphorSet.length)] : '';
  const voiceModifier = _resolveVoiceModifier(pool, formAxes);
  return {
    display_name: name,
    species_id: typeof speciesId === 'string' ? speciesId : '',
    biome_origin_id: biomeOriginId,
    voice_it: metaphor ? `Allenatore, ${_trimSuffixDot(metaphor)}.` : '',
    opening_line: metaphor ? `Allenatore, ${_trimSuffixDot(metaphor)}.` : '',
    closing_ritual: closing,
    voice_modifier: voiceModifier,
  };
}

/**
 * W5.5 — Enumerate species archetypes available for a biome (debug-only).
 * Used by GET /api/companion/pool endpoint.
 *
 * @param {string} biomeId
 * @param {object} [opts] {poolPath?}
 * @returns {Array} species_pool entries (or [] when biome unknown)
 */
function listArchetypesForBiome(biomeId, opts = {}) {
  if (!biomeId || typeof biomeId !== 'string') return [];
  const { poolPath = DEFAULT_POOL_PATH } = opts;
  const pool = _loadPool(poolPath);
  if (!pool) return [];
  // Codex W5.5 P2 fix: don't use _resolveBiomePool's savana fallback —
  // /api/companion/pool consumers expect [] for unknown biome (per
  // function doc), not echo of unknown id with savana archetypes.
  const pools = pool && pool.biome_pools ? pool.biome_pools : {};
  const biomePool = pools[biomeId];
  if (!biomePool) return [];
  return Array.isArray(biomePool.species_pool) ? biomePool.species_pool.slice() : [];
}

module.exports = {
  pick,
  listArchetypesForBiome,
  CANONICAL_SKIV,
  _resetCache,
  DEFAULT_POOL_PATH,
};
