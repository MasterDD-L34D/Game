// Biome pool loader — QW3 (M-013 worldgen).
//
// Memoized loader per `data/core/traits/biome_pools.json`. Evita re-parse
// del JSON (489 righe) per ogni spawn. Caricamento lazy on first call.
//
// API:
//   getPoolById(biomeId, opts?)            → pool entry or null
//   getRoleTemplates(biomeId, opts?)       → role_templates array or []
//   loadAllPools(opts?)                    → cached pools array
//   resetCache()                           → clear memoization (test only)
//
// Encoding: UTF-8 esplicito (CLAUDE.md encoding discipline).

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_POOLS_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'data',
  'core',
  'traits',
  'biome_pools.json',
);

let _cache = null;
let _cachePath = null;

/**
 * Load + cache biome pools JSON. Subsequent calls return memoized data.
 *
 * @param {object} [opts]
 * @param {string} [opts.poolsPath] override (test only)
 * @returns {Array} pools array (empty on failure)
 */
function loadAllPools(opts = {}) {
  const poolsPath = opts.poolsPath || DEFAULT_POOLS_PATH;
  if (_cache && _cachePath === poolsPath) return _cache;
  try {
    const raw = fs.readFileSync(poolsPath, { encoding: 'utf8' });
    const data = JSON.parse(raw);
    _cache = Array.isArray(data?.pools) ? data.pools : [];
    _cachePath = poolsPath;
  } catch {
    _cache = [];
    _cachePath = poolsPath;
  }
  return _cache;
}

/**
 * Get full pool entry by id. Returns null if not found.
 */
function getPoolById(biomeId, opts = {}) {
  if (!biomeId) return null;
  const pools = loadAllPools(opts);
  return pools.find((p) => p && p.id === biomeId) || null;
}

/**
 * Get role_templates array for a biome. Returns [] if pool/templates missing.
 */
function getRoleTemplates(biomeId, opts = {}) {
  const pool = getPoolById(biomeId, opts);
  if (!pool || !Array.isArray(pool.role_templates)) return [];
  return pool.role_templates;
}

/**
 * Reset memoization. Test-only.
 */
function resetCache() {
  _cache = null;
  _cachePath = null;
}

module.exports = {
  loadAllPools,
  getPoolById,
  getRoleTemplates,
  resetCache,
  DEFAULT_POOLS_PATH,
};
