// Wesnoth time-of-day modifier — Tier S #5 quick win.
//
// Source: docs/research/2026-04-26-tier-s-extraction-matrix.md #5 Wesnoth.
// Decision: Sprint 1 §I autonomous plan 2026-04-27.
//
// Pattern: 4-stage time-of-day (dawn/day/dusk/night) modifies creature
// attack/damage based on alignment field (lawful/chaotic/neutral).
//
// Wire: encounter.time_of_day → resolveAttack via getTimeModifier(actor, encounter).
// YAML config: packs/evo_tactics_pack/data/balance/terrain_defense.yaml#time_of_day
//
// API:
//   loadConfig() → time_of_day section da YAML
//   getTimeModifier(actor, timeOfDay) → { attack_mod, damage_mod }
//   isValidTimeOfDay(state) → boolean

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const CONFIG_PATH = path.resolve(
  __dirname,
  '../../../../packs/evo_tactics_pack/data/balance/terrain_defense.yaml',
);

let _config = null;

function loadConfig() {
  if (_config) return _config;
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = yaml.load(raw);
    _config = parsed.time_of_day || {};
    return _config;
  } catch (err) {
    console.warn('[timeOfDay] config not loaded:', err.message);
    _config = {};
    return _config;
  }
}

function isValidTimeOfDay(state) {
  const cfg = loadConfig();
  const states = cfg.states || ['dawn', 'day', 'dusk', 'night'];
  return typeof state === 'string' && states.includes(state);
}

/**
 * Compute time-of-day modifier per actor.
 *
 * @param {object} actor - { alignment: 'lawful'|'chaotic'|'neutral' }
 * @param {string} timeOfDay - 'dawn'|'day'|'dusk'|'night'
 * @returns {{ attack_mod: number, damage_mod: number, log: string }}
 */
function getTimeModifier(actor, timeOfDay) {
  const cfg = loadConfig();
  const t = isValidTimeOfDay(timeOfDay) ? timeOfDay : cfg.default || 'day';
  const align = (actor && actor.alignment) || 'neutral';
  const stateMods = (cfg.modifiers || {})[t] || {};
  const mods = stateMods[align] || { attack_mod: 0, damage_mod: 0 };
  const attackMod = Number(mods.attack_mod || 0);
  const damageMod = Number(mods.damage_mod || 0);
  let log = '';
  if (attackMod !== 0 || damageMod !== 0) {
    log = `time_of_day=${t}, alignment=${align}: atk${attackMod >= 0 ? '+' : ''}${attackMod} dmg${damageMod >= 0 ? '+' : ''}${damageMod}`;
  }
  return { attack_mod: attackMod, damage_mod: damageMod, log };
}

function _resetCache() {
  _config = null;
}

module.exports = { loadConfig, isValidTimeOfDay, getTimeModifier, _resetCache, CONFIG_PATH };
