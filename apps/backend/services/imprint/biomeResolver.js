// Biome Resolver — 4-tuple body parts choice → biome_id (Pattern D hybrid).
//
// Genesis: CAP-11 (audit Impronta CAP-10).
// Pattern: lookup base 16→7 biomi core + team-composition modulation
// per ridurre canalizzazione (target <20% al bioma più popolato).
//
// API:
//   resolveBiome(choices, opts) → { biome_id, base_biome_id, applied_modulations }
//
// Input choices: { locomotion, offense, defense, senses }
//   locomotion: 'VELOCE' | 'SILENZIOSA'
//   offense:    'PROFONDA' | 'RAPIDA'
//   defense:    'DURA' | 'FLESSIBILE'
//   senses:     'LONTANO' | 'ACUTO'
//
// Input opts.team_composition: array di choices, una per player (default: solo
// la choices stessa duplicata 4 volte se MVP single-creature mode).

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const VALID_LOCOMOTION = new Set(['VELOCE', 'SILENZIOSA']);
const VALID_OFFENSE = new Set(['PROFONDA', 'RAPIDA']);
const VALID_DEFENSE = new Set(['DURA', 'FLESSIBILE']);
const VALID_SENSES = new Set(['LONTANO', 'ACUTO']);

let cachedConfig = null;

function loadConfig(configPath) {
  if (cachedConfig && !configPath) return cachedConfig;
  const resolvedPath =
    configPath ||
    path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'data',
      'core',
      'imprint',
      'biome_resolution.yaml',
    );
  const raw = fs.readFileSync(resolvedPath, 'utf8');
  const config = yaml.load(raw);
  if (!configPath) cachedConfig = config;
  return config;
}

function resetCache() {
  cachedConfig = null;
}

function lookupKey(choices) {
  const l = (choices.locomotion || '').toUpperCase();
  const o = (choices.offense || '').toUpperCase();
  const d = (choices.defense || '').toUpperCase();
  const s = (choices.senses || '').toUpperCase();
  if (!VALID_LOCOMOTION.has(l)) throw new Error(`invalid locomotion: ${choices.locomotion}`);
  if (!VALID_OFFENSE.has(o)) throw new Error(`invalid offense: ${choices.offense}`);
  if (!VALID_DEFENSE.has(d)) throw new Error(`invalid defense: ${choices.defense}`);
  if (!VALID_SENSES.has(s)) throw new Error(`invalid senses: ${choices.senses}`);
  // Codifica con prima lettera ciascuno: V/S, P/R, D/F, L/A
  return `${l[0]}_${o[0]}_${d[0]}_${s[0]}`;
}

function evaluateModulation(rule, teamComposition) {
  const trait = rule.condition.trait;
  const value = rule.condition.value;
  const minCount = Number(rule.condition.min_player_count) || 1;
  const matched = teamComposition.filter((c) => (c[trait] || '').toUpperCase() === value).length;
  return matched >= minCount;
}

/**
 * Risolve biome da 4-tuple di scelte body parts + opzionale team composition.
 *
 * @param {Object} choices - { locomotion, offense, defense, senses }
 * @param {Object} [opts]
 * @param {Object[]} [opts.team_composition] - array di choices (1 per player). Se assente, modulation skipped.
 * @param {string} [opts.config_path] - override YAML path (per test)
 * @returns {{ biome_id, base_biome_id, applied_modulations: string[] }}
 */
function resolveBiome(choices, opts = {}) {
  const config = loadConfig(opts.config_path);
  const key = lookupKey(choices);
  const baseBiome = config.base_lookup[key];
  if (!baseBiome) {
    return {
      biome_id: config.fallback_biome,
      base_biome_id: config.fallback_biome,
      applied_modulations: [],
      _fallback: true,
    };
  }

  const team =
    Array.isArray(opts.team_composition) && opts.team_composition.length > 0
      ? opts.team_composition
      : [choices, choices, choices, choices]; // default MVP: 4 player con stesse scelte

  const applied = [];
  let finalBiome = baseBiome;

  if (Array.isArray(config.modulation)) {
    for (const rule of config.modulation) {
      if (evaluateModulation(rule, team)) {
        const variant = rule.biome_variants && rule.biome_variants[finalBiome];
        if (variant) {
          finalBiome = variant;
          applied.push(rule.rule_id);
        }
      }
    }
  }

  return {
    biome_id: finalBiome,
    base_biome_id: baseBiome,
    applied_modulations: applied,
  };
}

/**
 * Statistica della distribuzione lookup base. Usato per audit canalizzazione.
 * @returns {{ [biome_id]: number }}
 */
function lookupDistribution(opts = {}) {
  const config = loadConfig(opts.config_path);
  const dist = {};
  for (const biome of Object.values(config.base_lookup)) {
    dist[biome] = (dist[biome] || 0) + 1;
  }
  return dist;
}

module.exports = {
  resolveBiome,
  lookupKey,
  lookupDistribution,
  resetCache,
  VALID_LOCOMOTION,
  VALID_OFFENSE,
  VALID_DEFENSE,
  VALID_SENSES,
};
