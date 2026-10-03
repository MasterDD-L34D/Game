// TKT-P2 Brigandine seasonal — Phase B content loader.
//
// Reads YAML from data/core/campaign/seasons/*.yaml + data/core/campaign/phases/*.yaml.
// Returns parsed objects with caching + reload helper for test.
//
// Pattern parallel to apps/backend/services/dialogueLoader.js (TKT-M14-B Phase B).
// PURE module: cache lazy at first call; _resetCache() esposto per test.
//
// Engine source-of-truth alignment:
//   - Season ids match seasonalEngine.SEASONS canonical ['spring', 'summer',
//     'autumn', 'winter'].
//   - Phase ids match seasonalEngine.PHASES canonical ['organization', 'battle'].
//   - Season modifier shape (resource_yield, encounter_rate, recruit_pool_delta,
//     hazard) extends Phase A POC values con events_pool aggiuntivo per Phase B.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const SEASONS_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'data',
  'core',
  'campaign',
  'seasons',
);
const PHASES_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'data',
  'core',
  'campaign',
  'phases',
);

let seasonsCache = null;
let seasonsCacheDir = null;
let phasesCache = null;
let phasesCacheDir = null;

function _readYamlDir(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.yaml') || name.endsWith('.yml'));
  const parsed = [];
  for (const file of files) {
    const fullPath = path.join(dir, file);
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const obj = yaml.load(content);
      if (obj && obj.id) {
        parsed.push(obj);
      } else {
        // eslint-disable-next-line no-console
        console.warn(`[seasonalContentLoader] skipped malformed file ${file}`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[seasonalContentLoader] failed parse ${file}: ${err.message}`);
    }
  }
  return parsed;
}

/**
 * Load all 4 seasons (spring/summer/autumn/winter). Cached after first call.
 *
 * @param {object} [opts]
 * @param {string} [opts.dir] - override directory (test/inject)
 * @param {boolean} [opts.force] - force reload bypass cache
 * @returns {Array<object>}
 */
function loadSeasons(opts = {}) {
  const dir = opts.dir || SEASONS_DIR;
  if (!opts.force && seasonsCache && seasonsCacheDir === dir) return seasonsCache;
  seasonsCache = _readYamlDir(dir);
  seasonsCacheDir = dir;
  return seasonsCache;
}

/**
 * Get a single season by id ('spring' | 'summer' | 'autumn' | 'winter').
 * @returns {object|null}
 */
function getSeason(id, opts = {}) {
  if (!id) return null;
  const all = loadSeasons(opts);
  return all.find((s) => s.id === id) || null;
}

/**
 * Load all phases (organization_phase, battle_phase). Cached.
 *
 * @param {object} [opts]
 * @returns {Array<object>}
 */
function loadPhases(opts = {}) {
  const dir = opts.dir || PHASES_DIR;
  if (!opts.force && phasesCache && phasesCacheDir === dir) return phasesCache;
  phasesCache = _readYamlDir(dir);
  phasesCacheDir = dir;
  return phasesCache;
}

/**
 * Get a single phase by id ('organization_phase' | 'battle_phase').
 * @returns {object|null}
 */
function getPhase(id, opts = {}) {
  if (!id) return null;
  const all = loadPhases(opts);
  return all.find((p) => p.id === id) || null;
}

/**
 * Get events_pool for a season id. Returns [] if season missing or no events.
 *
 * @param {string} seasonId
 * @returns {Array<object>}
 */
function getSeasonEvents(seasonId, opts = {}) {
  const season = getSeason(seasonId, opts);
  if (!season || !Array.isArray(season.events_pool)) return [];
  return season.events_pool;
}

/**
 * Reset all caches (test helper).
 */
function _resetCache() {
  seasonsCache = null;
  seasonsCacheDir = null;
  phasesCache = null;
  phasesCacheDir = null;
}

module.exports = {
  SEASONS_DIR,
  PHASES_DIR,
  loadSeasons,
  getSeason,
  loadPhases,
  getPhase,
  getSeasonEvents,
  _resetCache,
};
