// Subnautica habitat lifecycle modifier — Sprint 2 §I (2026-04-27).
//
// Source: docs/research/2026-04-26-tier-a-extraction-matrix.md #9 Subnautica.
// Pattern: creature ha biome preferito per phase. In biome affine = bonus stat;
// in biome non-affine = penalty stat. Apex/legacy roam free.
//
// API:
//   loadAffinityMap(speciesId) → { phase: biome_id }
//   getBiomeAffinityModifier(unit, encounterBiome) → { attack_mod, defense_mod, log }
//
// Wire: encounter.biome → resolveAttack via getBiomeAffinityModifier(actor, biome).
// YAML config: data/core/species/<species>_lifecycle.yaml#biome_affinity_per_stage

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SPECIES_DIR = path.resolve(__dirname, '../../../../data/core/species');

const _cache = new Map(); // species_id -> { affinity_map, loaded_at }

function loadAffinityMap(speciesId) {
  if (!speciesId) return null;
  if (_cache.has(speciesId)) return _cache.get(speciesId).affinity_map;
  // Try common naming patterns: <species>_lifecycle.yaml or <species>.yaml
  const candidates = [`${speciesId}_lifecycle.yaml`, `${speciesId}.yaml`];
  for (const fname of candidates) {
    const fpath = path.join(SPECIES_DIR, fname);
    try {
      if (!fs.existsSync(fpath)) continue;
      const raw = fs.readFileSync(fpath, 'utf-8');
      const parsed = yaml.load(raw);
      const affinityMap = parsed?.biome_affinity_per_stage || null;
      _cache.set(speciesId, { affinity_map: affinityMap, loaded_at: Date.now() });
      return affinityMap;
    } catch (err) {
      console.warn('[biomeAffinity] load failed:', fpath, err.message);
    }
  }
  _cache.set(speciesId, { affinity_map: null, loaded_at: Date.now() });
  return null;
}

const APEX_FREE_PHASES = new Set(['apex', 'legacy']);

/**
 * Compute biome affinity modifier for actor on current encounter biome.
 *
 * @param {object} unit - { species_id, lifecycle_phase, stadio? }
 * @param {string} encounterBiome - biome_id current
 * @returns {{ attack_mod, defense_mod, affinity, log }}
 */
function getBiomeAffinityModifier(unit, encounterBiome) {
  if (!unit || !encounterBiome) {
    return { attack_mod: 0, defense_mod: 0, affinity: 'unknown', log: '' };
  }
  const speciesId = unit.species_id;
  const phase = unit.lifecycle_phase || unit.phase || 'mature';
  if (!speciesId) {
    return { attack_mod: 0, defense_mod: 0, affinity: 'unknown', log: '' };
  }
  const affinityMap = loadAffinityMap(speciesId);
  if (!affinityMap) {
    return { attack_mod: 0, defense_mod: 0, affinity: 'no_affinity_map', log: '' };
  }
  // Apex/legacy = roam free (any biome accepted)
  if (APEX_FREE_PHASES.has(phase)) {
    return {
      attack_mod: 0,
      defense_mod: 0,
      affinity: 'apex_free',
      log: `phase=${phase} apex_free (any biome accepted)`,
    };
  }
  const preferred = affinityMap[phase];
  if (!preferred) {
    return { attack_mod: 0, defense_mod: 0, affinity: 'no_phase_match', log: '' };
  }
  if (preferred === 'any' || preferred === encounterBiome) {
    return {
      attack_mod: 1,
      defense_mod: 1,
      affinity: 'preferred',
      log: `species=${speciesId} phase=${phase} biome=${encounterBiome} → affinità preferita (+1 atk +1 def)`,
    };
  }
  return {
    attack_mod: 0,
    defense_mod: -1,
    affinity: 'penalty',
    log: `species=${speciesId} phase=${phase} biome=${encounterBiome} (preferito ${preferred}) → penalità (-1 def)`,
  };
}

function _resetCache() {
  _cache.clear();
}

module.exports = {
  loadAffinityMap,
  getBiomeAffinityModifier,
  _resetCache,
  APEX_FREE_PHASES,
};
