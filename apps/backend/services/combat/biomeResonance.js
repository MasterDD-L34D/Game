// =============================================================================
// Biome Resonance — Skiv ticket #4 (Sprint A).
//
// Pillar 4 (Identità) bonus: when a unit's species `biome_affinity` matches
// the current scenario `biome_id`, the actor "feels" the environment.
// Concrete effect (Phase 1): -1 research_cost_encounters when starting
// research on a Thought (clamped at min 1). Future phases can stack other
// effects (passive +1 res to biome-themed channel, etc.).
//
// Pure: no I/O at runtime once cached. Caller looks up resonance and passes
// the boolean into engines that care (currently thoughtCabinet.startResearch).
// =============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DEFAULT_SPECIES_YAML = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'data',
  'core',
  'species.yaml',
);

let _cache = null;

function loadSpeciesAffinityMap({ filepath = DEFAULT_SPECIES_YAML, force = false } = {}) {
  if (_cache && !force) return _cache;
  const raw = fs.readFileSync(filepath, 'utf8');
  const parsed = yaml.load(raw) || {};
  const map = {};
  for (const sp of parsed.species || []) {
    if (!sp || !sp.id) continue;
    if (typeof sp.biome_affinity === 'string' && sp.biome_affinity) {
      map[sp.id] = sp.biome_affinity;
    }
  }
  _cache = map;
  return _cache;
}

function resetCache() {
  _cache = null;
}

/**
 * Returns the species' declared biome_affinity, or null.
 */
function getSpeciesBiomeAffinity(speciesId, opts = {}) {
  if (!speciesId || typeof speciesId !== 'string') return null;
  const map = opts.map || loadSpeciesAffinityMap();
  return map[speciesId] || null;
}

/**
 * True iff the species declares a biome_affinity matching biomeId (case-sensitive,
 * exact string compare). Both inputs must be non-empty strings.
 */
function hasResonance(speciesId, biomeId, opts = {}) {
  if (!speciesId || !biomeId) return false;
  if (typeof speciesId !== 'string' || typeof biomeId !== 'string') return false;
  const affinity = getSpeciesBiomeAffinity(speciesId, opts);
  if (!affinity) return false;
  return affinity === biomeId;
}

module.exports = {
  loadSpeciesAffinityMap,
  resetCache,
  getSpeciesBiomeAffinity,
  hasResonance,
};
