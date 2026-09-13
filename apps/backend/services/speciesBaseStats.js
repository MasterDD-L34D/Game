// =============================================================================
// Species base-stats loader (#2691) -- data-derived STAT_BOUNDS source for the
// personality `agile_robust` axis (personalityAxes.js).
//
// Loads data/core/species/base_stats.yaml (15 canonical species, speed + hp_max,
// prose-derived per issue #2691) and computes the [min,max] normalization bounds
// the axis needs. Falls back to the pre-#2691 hardcoded RATIFIED-PROVISIONAL
// defaults (speed 1-6 / hp 6-20) when the dataset is missing/empty/malformed, so
// the axis degrades safely and this loader NEVER throws on a bad/absent file.
//
// Caching: the canonical-path load is memoized (parsed once per process). Custom
// filePath calls bypass the cache (test fixtures / fallback probes).
// =============================================================================
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

// services -> backend -> apps -> repo root -> data/core/species/base_stats.yaml
const DATASET_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'data',
  'core',
  'species',
  'base_stats.yaml',
);

// The hardcoded fallback == personalityAxes.js pre-#2691 STAT_BOUNDS literal.
const FALLBACK_BOUNDS = Object.freeze({
  speed: Object.freeze({ min: 1, max: 6 }),
  hp: Object.freeze({ min: 6, max: 20 }),
});

let _statsCache; // undefined = unloaded, null = load-failed/empty, object = map
let _boundsCache;

function num(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Load + cache the canonical species -> {speed, hp_max} map. Returns null on any
 * failure (missing file, parse error, no `species` block, zero usable entries).
 * @param {string} [filePath] override (uncached) -- defaults to the dataset.
 */
function loadBaseStats(filePath = DATASET_PATH) {
  const canonical = filePath === DATASET_PATH;
  if (canonical && _statsCache !== undefined) return _statsCache;

  let parsed = null;
  try {
    parsed = yaml.load(fs.readFileSync(filePath, 'utf8'));
  } catch {
    parsed = null;
  }
  const species = parsed && typeof parsed === 'object' ? parsed.species : null;

  let out = null;
  if (species && typeof species === 'object') {
    out = {};
    for (const [id, entry] of Object.entries(species)) {
      if (!entry || typeof entry !== 'object') continue;
      const speed = num(entry.speed);
      const hpMax = num(entry.hp_max);
      if (speed === null && hpMax === null) continue; // no usable stat
      out[id] = { speed, hp_max: hpMax };
    }
    if (Object.keys(out).length === 0) out = null;
  }

  if (canonical) _statsCache = out;
  return out;
}

/**
 * Derive { speed:{min,max}, hp:{min,max} } from the dataset's real min/max.
 * Falls back to FALLBACK_BOUNDS when the dataset is unusable (loadBaseStats null)
 * or carries no finite speed/hp values. NB the bounds key is `hp` (matching
 * personalityAxes STAT_BOUNDS), derived from the dataset's `hp_max` field.
 * @param {string} [filePath] override (uncached) -- defaults to the dataset.
 */
function deriveStatBounds(filePath = DATASET_PATH) {
  const canonical = filePath === DATASET_PATH;
  if (canonical && _boundsCache !== undefined) return _boundsCache;

  const stats = loadBaseStats(filePath);
  let bounds = FALLBACK_BOUNDS;
  if (stats) {
    const speeds = Object.values(stats)
      .map((s) => s.speed)
      .filter((v) => v !== null);
    const hps = Object.values(stats)
      .map((s) => s.hp_max)
      .filter((v) => v !== null);
    if (speeds.length && hps.length) {
      bounds = {
        speed: { min: Math.min(...speeds), max: Math.max(...speeds) },
        hp: { min: Math.min(...hps), max: Math.max(...hps) },
      };
    }
  }

  if (canonical) _boundsCache = bounds;
  return bounds;
}

/** Reset the memoized dataset + bounds (per test / reload). */
function _resetCache() {
  _statsCache = undefined;
  _boundsCache = undefined;
}

module.exports = {
  loadBaseStats,
  deriveStatBounds,
  FALLBACK_BOUNDS,
  DATASET_PATH,
  _resetCache,
};
