// AI Personality Loader — Sprint γ Tech Baseline (2026-04-28).
//
// Pattern: Total War (research §6 strategy-games-tech-extraction).
// Load extended AI personalities da data/core/ai/ai_profiles_extended.yaml.
//
// Memoized singleton (mirror sgTracker init pattern + aiProfilesLoader pattern).
// Soft-fail su ENOENT (returns empty registry).
//
// API:
//   loadPersonalities(yamlPath?, logger?) — full registry
//   getPersonality(id, registry?) — single personality lookup with fallback
//   listPersonalities(registry?) — array di {id, label}
//   _resetCache() — test helper

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_PERSONALITIES_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'data',
  'core',
  'ai',
  'ai_profiles_extended.yaml',
);

const DEFAULT_PERSONALITY = {
  personality_id: 'default',
  label: 'Default',
  description: 'Fallback personality (no overrides).',
  trigger_thresholds: {
    retreat_hp_pct: 0.3,
    aggression_min_pressure: 30,
    risk_tolerance: 0.5,
    flank_priority: 0.5,
  },
  intent_weights: {},
  signature_actions: [],
};

let _cache = null;

function _resetCache() {
  _cache = null;
}

/**
 * Load extended AI personalities. Memoized singleton.
 *
 * @param {string} [yamlPath] — override default path (test helper)
 * @param {object} [logger=console]
 * @returns {{ version: string, personalities: object }}
 */
function loadPersonalities(yamlPath = DEFAULT_PERSONALITIES_PATH, logger = console) {
  if (_cache && yamlPath === DEFAULT_PERSONALITIES_PATH) return _cache;

  let registry = { version: '0.0.0', personalities: {} };
  try {
    const text = fs.readFileSync(yamlPath, 'utf8');
    const parsed = yaml.load(text) || {};
    registry = {
      version: parsed.version || '0.0.0',
      personalities: parsed.personalities || {},
    };
    const count = Object.keys(registry.personalities).length;
    logger.log(`[ai-personality-loader] ${count} personalities loaded da ${yamlPath}`);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      logger.warn(`[ai-personality-loader] ${yamlPath} not found, registry empty`);
    } else {
      logger.warn(`[ai-personality-loader] errore caricamento ${yamlPath}:`, err.message || err);
    }
  }

  if (yamlPath === DEFAULT_PERSONALITIES_PATH) _cache = registry;
  return registry;
}

/**
 * Get single personality by id. Returns DEFAULT_PERSONALITY se missing.
 *
 * @param {string} id
 * @param {object} [registry] — optional pre-loaded registry
 * @returns {object} personality definition (mai null)
 */
function getPersonality(id, registry = null) {
  const reg = registry || loadPersonalities();
  const personality = reg.personalities && reg.personalities[id];
  if (!personality) {
    return { ...DEFAULT_PERSONALITY, personality_id: id || 'default' };
  }
  return { personality_id: id, ...personality };
}

/**
 * List all personalities (array di {id, label, description}).
 */
function listPersonalities(registry = null) {
  const reg = registry || loadPersonalities();
  const entries = Object.entries(reg.personalities || {});
  return entries.map(([id, p]) => ({
    id,
    label: p.label || id,
    description: p.description || '',
  }));
}

module.exports = {
  loadPersonalities,
  getPersonality,
  listPersonalities,
  DEFAULT_PERSONALITIES_PATH,
  DEFAULT_PERSONALITY,
  _resetCache,
};
