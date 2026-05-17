// Inner Voices — Disco Elysium diegetic pattern (Skiv ticket #3).
//
// Pure evaluator: no I/O, no mutation. 24 voices (4 MBTI axes × 2 directions ×
// 3 tiers). Mirrors thoughtCabinet.js structure so callers can compose both.
//
// Trigger: axis value crosses threshold in the declared direction.
// Cumulative: once heard, persists across rounds (managed by caller).
//
// YAML source: data/core/thoughts/inner_voices.yaml

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

let _cache = null;

const DEFAULT_YAML_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'data',
  'core',
  'thoughts',
  'inner_voices.yaml',
);

function loadVoices({ filepath = DEFAULT_YAML_PATH, force = false } = {}) {
  if (_cache && !force) return _cache;
  const raw = fs.readFileSync(filepath, 'utf8');
  const parsed = yaml.load(raw) || {};
  _cache = {
    version: parsed.version || '0.0.0',
    voices: parsed.voices || {},
  };
  return _cache;
}

function resetVoiceCache() {
  _cache = null;
}

function matchesVoiceThreshold(value, direction, threshold) {
  if (value === null || value === undefined || Number.isNaN(value)) return false;
  if (direction === 'low') return value <= threshold;
  if (direction === 'high') return value >= threshold;
  return false;
}

// Pure evaluator. `alreadyHeard` can be Array or Set of voice ids.
// Returns { heard: string[], newly_heard: string[] }.
function evaluateVoiceTriggers(axes, alreadyHeard = [], opts = {}) {
  const catalog = opts.catalog || loadVoices();
  const set = new Set(
    alreadyHeard instanceof Set ? alreadyHeard : Array.isArray(alreadyHeard) ? alreadyHeard : [],
  );
  const newly_heard = [];
  if (!axes || typeof axes !== 'object') {
    return { heard: Array.from(set), newly_heard };
  }
  for (const [id, entry] of Object.entries(catalog.voices || {})) {
    if (set.has(id)) continue;
    const axis = axes[entry.axis];
    const value = axis && typeof axis === 'object' ? axis.value : null;
    if (!matchesVoiceThreshold(value, entry.direction, entry.threshold)) continue;
    set.add(id);
    newly_heard.push(id);
  }
  return { heard: Array.from(set), newly_heard };
}

// Returns the full entry for a voice id, or null.
function describeVoice(id, catalog = loadVoices()) {
  const entry = catalog.voices?.[id];
  if (!entry) return null;
  return { id, ...entry };
}

module.exports = {
  loadVoices,
  resetVoiceCache,
  matchesVoiceThreshold,
  evaluateVoiceTriggers,
  describeVoice,
  DEFAULT_YAML_PATH,
};
