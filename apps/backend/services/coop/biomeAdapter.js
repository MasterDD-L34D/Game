// W5-bb (cross-repo Godot v2 mirror) — Biome adapter service.
//
// Maps biomeSynthesizer/biomes.yaml output → W5 canonical schema
// consumed by Godot v2 WorldSetupState (`scripts/session/world_setup_state.gd`):
//
//   {
//     biome_id: 'savana',
//     biome_label_it: 'Savana del Crepuscolo',
//     pressure: 'medium' | 'low' | 'high',
//     hazards: ['sandstorm_intermittent', 'predator_pack_cycle']
//   }
//
// Source: data/core/biomes.yaml (single source, 20+ biomes per Q.2 ETL).
//
// Pressure derivation: maps biome.diff_base (1-5) + biome.hazard.severity →
// 'low' | 'medium' | 'high' bucket. ERMES eco_pressure_score (W5.5) will
// override at runtime when available.
//
// Hazard list: extracts biome.hazard.description first, supplements with
// ecological hazards via biome.affixes (e.g., heat_resistance, pack_cycle).

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_BIOMES_PATH = path.resolve(__dirname, '../../../../data/core/biomes.yaml');

let _cachedBiomes = null;
let _cachedPath = null;

function _loadBiomes(biomesPath = DEFAULT_BIOMES_PATH) {
  if (_cachedBiomes && _cachedPath === biomesPath) return _cachedBiomes;
  if (!fs.existsSync(biomesPath)) return null;
  const raw = fs.readFileSync(biomesPath, 'utf8');
  const data = yaml.load(raw);
  if (!data || typeof data !== 'object') return null;
  _cachedBiomes = data;
  _cachedPath = biomesPath;
  return data;
}

function _resetCache() {
  _cachedBiomes = null;
  _cachedPath = null;
}

// Pressure bucketization heuristic (W5 minimal). ERMES override (W5.5)
// will derive pressure from eco_pressure_score directly.
function _derivePressure(biome) {
  const diff = Number(biome && biome.diff_base) || 1;
  const severity = biome && biome.hazard && biome.hazard.severity;
  if (diff >= 4 || severity === 'high') return 'high';
  if (diff >= 2 || severity === 'medium') return 'medium';
  return 'low';
}

// Hazard list extraction. Combines biome.hazard.description tokens +
// biome.affixes (ecological tags).
function _deriveHazards(biome) {
  const out = [];
  const hazard = biome && biome.hazard;
  if (hazard && typeof hazard === 'object') {
    if (hazard.id && typeof hazard.id === 'string') out.push(hazard.id);
    else if (hazard.description && typeof hazard.description === 'string') {
      // Slugify description if no canonical id
      const slug = hazard.description
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '_');
      if (slug) out.push(slug);
    }
  }
  const affixes = Array.isArray(biome && biome.affixes) ? biome.affixes : [];
  for (const aff of affixes) {
    if (typeof aff === 'string' && !out.includes(aff)) out.push(aff);
  }
  return out;
}

/**
 * Map biome (from data/core/biomes.yaml) to W5 schema dict.
 *
 * @param {string} biomeId — biome slug (e.g. "savana", "atollo_obsidiana")
 * @param {object} [opts]
 * @param {string} [opts.biomesPath] — override yaml path
 * @returns {object} W5 schema {biome_id, biome_label_it, pressure, hazards} or {} on miss
 */
function adaptBiome(biomeId, opts = {}) {
  if (!biomeId || typeof biomeId !== 'string') return {};
  const { biomesPath = DEFAULT_BIOMES_PATH } = opts;
  const biomes = _loadBiomes(biomesPath);
  if (!biomes) return {};
  const biome = biomes[biomeId] || biomes.biomes?.[biomeId];
  if (!biome || typeof biome !== 'object') return {};
  return {
    biome_id: biomeId,
    biome_label_it: String(biome.display_name_it || biome.label || biome.display_name || biomeId),
    pressure: _derivePressure(biome),
    hazards: _deriveHazards(biome),
  };
}

/**
 * List all known biome ids from data file.
 */
function listBiomeIds(opts = {}) {
  const { biomesPath = DEFAULT_BIOMES_PATH } = opts;
  const biomes = _loadBiomes(biomesPath);
  if (!biomes) return [];
  // biomes.yaml may be flat dict OR { biomes: {...} } nested.
  const dict = biomes.biomes && typeof biomes.biomes === 'object' ? biomes.biomes : biomes;
  return Object.keys(dict).filter(
    (k) => k !== 'version' && k !== 'schema_version' && !k.startsWith('_'),
  );
}

module.exports = {
  adaptBiome,
  listBiomeIds,
  _resetCache,
  DEFAULT_BIOMES_PATH,
};
