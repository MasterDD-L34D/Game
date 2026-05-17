// =============================================================================
// Biome Modifiers — QW1 (M-018 worldgen card).
//
// Reads `data/core/biomes.yaml` `diff_base` + `hazard.stress_modifiers` and
// projects them into runtime knobs the combat engine already consumes:
//   - pressure_initial_bonus → added to session.sistema_pressure on /start
//   - enemy_hp_multiplier    → scales SIS unit max_hp on /start
//   - pressure_per_round     → optional positive tick on round end (additive)
//
// Design intent (M-018, score 5/5): biome must be player-felt at first
// encounter. Same encounter on `savana` (diff_base 2) vs `abisso_vulcanico`
// (diff_base 5) should produce different numbers — not just texture.
//
// Calibration baseline (savana = 2 = neutral):
//   pressure_initial_bonus = (diff_base - 2) * 5   → savana 0, abisso +15
//   enemy_hp_multiplier    = 1 + (diff_base - 2) * 0.05 → savana 1.0, abisso 1.15
//   pressure_per_round     = max(0, diff_base - 2)  → savana 0, abisso +3
//
// `hazard.stress_modifiers.enemy_hp_multiplier` / `pressure_initial` /
// `pressure_per_round` (if explicitly set in YAML) override the formula.
//
// Back-compat: missing biomes.yaml or missing biome → safe defaults
// (diff_base=1.0, hp_mult=1.0, pressure_mult=0, pressure_initial_bonus=0).
// Cache singleton to avoid hot-path I/O.
// =============================================================================

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_BIOMES_YAML = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'data',
  'core',
  'biomes.yaml',
);

// Calibration constants — see header comment.
const SAVANA_BASELINE = 2;
const PRESSURE_INITIAL_FACTOR = 5;
const HP_MULT_FACTOR = 0.05;

// Safe defaults when biome unknown / file missing / malformed.
const SAFE_DEFAULTS = Object.freeze({
  diff_base: 1.0,
  hp_mult: 1.0,
  pressure_mult: 0,
  pressure_initial_bonus: 0,
});

let _cache = null;

/**
 * Load biomes.yaml once. Soft-fail on ENOENT/parse error → empty registry.
 * UTF-8 explicit (CLAUDE.md encoding discipline).
 *
 * @param {string} [yamlPath]
 * @param {{ warn: Function }} [logger]
 * @returns {object} parsed biomes block (key = biome_id) or {}
 */
function loadBiomesConfig(yamlPath = DEFAULT_BIOMES_YAML, logger = console) {
  if (_cache !== null) return _cache;
  try {
    const text = fs.readFileSync(yamlPath, { encoding: 'utf8' });
    const parsed = yaml.load(text);
    const biomes =
      parsed && typeof parsed === 'object' && parsed.biomes && typeof parsed.biomes === 'object'
        ? parsed.biomes
        : {};
    _cache = biomes;
    return _cache;
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      logger.warn(`[biome-modifiers] ${yamlPath} non trovato, biome tuning no-op`);
    } else {
      logger.warn(`[biome-modifiers] errore ${yamlPath}:`, err.message || err);
    }
    _cache = {};
    return _cache;
  }
}

function _resetCache() {
  _cache = null;
}

/**
 * Compute runtime modifiers for a biome.
 *
 * @param {string} biomeId — e.g. 'savana', 'abisso_vulcanico'
 * @param {object} [registry] — optional pre-loaded biomes block (DI per test)
 * @returns {{ diff_base: number, hp_mult: number, pressure_mult: number,
 *             pressure_initial_bonus: number }}
 */
function getBiomeModifiers(biomeId, registry) {
  if (!biomeId || typeof biomeId !== 'string') return { ...SAFE_DEFAULTS };
  const biomes = registry || loadBiomesConfig();
  const cfg = biomes[biomeId];
  if (!cfg || typeof cfg !== 'object') return { ...SAFE_DEFAULTS };

  const rawDiff = Number(cfg.diff_base);
  const diffBase = Number.isFinite(rawDiff) && rawDiff > 0 ? rawDiff : SAFE_DEFAULTS.diff_base;
  const stress =
    cfg.hazard && typeof cfg.hazard === 'object' && typeof cfg.hazard.stress_modifiers === 'object'
      ? cfg.hazard.stress_modifiers
      : {};

  // Explicit YAML overrides win; otherwise derive from diff_base.
  const explicitHpMult = Number(stress.enemy_hp_multiplier);
  const hpMult =
    Number.isFinite(explicitHpMult) && explicitHpMult > 0
      ? explicitHpMult
      : 1 + (diffBase - SAVANA_BASELINE) * HP_MULT_FACTOR;

  const explicitPressureInit = Number(stress.pressure_initial);
  const pressureInitialBonus = Number.isFinite(explicitPressureInit)
    ? explicitPressureInit
    : (diffBase - SAVANA_BASELINE) * PRESSURE_INITIAL_FACTOR;

  const explicitPressureTick = Number(stress.pressure_per_round);
  const pressureMult = Number.isFinite(explicitPressureTick)
    ? explicitPressureTick
    : Math.max(0, diffBase - SAVANA_BASELINE);

  return {
    diff_base: diffBase,
    hp_mult: hpMult,
    pressure_mult: pressureMult,
    pressure_initial_bonus: pressureInitialBonus,
  };
}

/**
 * Mutates `units` array in place: enemy max_hp/hp scaled by `hp_mult`.
 * Player units untouched (player HP scaling owned by difficulty profile).
 * Idempotent via `_biome_hp_applied` marker.
 *
 * @param {Array} units
 * @param {number} hpMult
 * @returns {Array} same reference (mutated)
 */
function applyEnemyHpMultiplier(units, hpMult) {
  if (!Array.isArray(units) || !Number.isFinite(Number(hpMult))) return units;
  const mult = Number(hpMult);
  if (mult === 1.0) return units;
  for (const u of units) {
    if (!u || u.controlled_by !== 'sistema') continue;
    if (u._biome_hp_applied) continue;
    const baseMax = Number(u.max_hp || u.hp || 10);
    const newMax = Math.max(1, Math.round(baseMax * mult));
    u.max_hp = newMax;
    u.hp = newMax;
    u._biome_hp_applied = true;
  }
  return units;
}

module.exports = {
  loadBiomesConfig,
  getBiomeModifiers,
  applyEnemyHpMultiplier,
  _resetCache,
  DEFAULT_BIOMES_YAML,
  SAFE_DEFAULTS,
};
