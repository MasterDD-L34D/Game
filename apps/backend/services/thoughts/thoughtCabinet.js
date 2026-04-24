// P4 Thought Cabinet — pattern Disco Elysium diegetic reveal.
//
// Evaluates MBTI axes (from buildVcSnapshot per_actor[uid].mbti_axes) and
// unlocks thoughts once a unit's axis value crosses a progressive threshold.
// Cumulative: once unlocked, persists across rounds (session state).
//
// YAML source: data/core/thoughts/mbti_thoughts.yaml (18 thoughts, 3 axes ×
// 2 directions × 3 tiers).
//
// Pure evaluator: no I/O, no mutation. Caller merges `newly` into session
// state (e.g. session.meta.thoughts_unlocked[unit_id]).

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
  'mbti_thoughts.yaml',
);

function loadThoughts({ filepath = DEFAULT_YAML_PATH, force = false } = {}) {
  if (_cache && !force) return _cache;
  const raw = fs.readFileSync(filepath, 'utf8');
  const parsed = yaml.load(raw) || {};
  _cache = {
    version: parsed.version || '0.0.0',
    thoughts: parsed.thoughts || {},
  };
  return _cache;
}

function resetCache() {
  _cache = null;
}

function thoughtsByAxis(catalog = loadThoughts()) {
  const out = { E_I: [], S_N: [], T_F: [], J_P: [] };
  for (const [id, entry] of Object.entries(catalog.thoughts || {})) {
    if (!out[entry.axis]) continue;
    out[entry.axis].push({ id, ...entry });
  }
  return out;
}

function matchesThreshold(value, direction, threshold) {
  if (value === null || value === undefined || Number.isNaN(value)) return false;
  if (direction === 'low') return value <= threshold;
  if (direction === 'high') return value >= threshold;
  return false;
}

// Pure evaluator. `alreadyUnlocked` can be Array or Set of thought ids.
function evaluateThoughts(axes, alreadyUnlocked = [], opts = {}) {
  const catalog = opts.catalog || loadThoughts();
  const set = new Set(
    alreadyUnlocked instanceof Set
      ? alreadyUnlocked
      : Array.isArray(alreadyUnlocked)
        ? alreadyUnlocked
        : [],
  );
  const newly = [];
  if (!axes || typeof axes !== 'object') {
    return { unlocked: Array.from(set), newly };
  }
  for (const [id, entry] of Object.entries(catalog.thoughts || {})) {
    if (set.has(id)) continue;
    const axis = axes[entry.axis];
    const value = axis && typeof axis === 'object' ? axis.value : null;
    if (!matchesThreshold(value, entry.direction, entry.threshold)) continue;
    set.add(id);
    newly.push(id);
  }
  return { unlocked: Array.from(set), newly };
}

function describeThought(id, catalog = loadThoughts()) {
  const entry = catalog.thoughts?.[id];
  if (!entry) return null;
  return { id, ...entry };
}

module.exports = {
  loadThoughts,
  resetCache,
  evaluateThoughts,
  thoughtsByAxis,
  describeThought,
  matchesThreshold,
};
