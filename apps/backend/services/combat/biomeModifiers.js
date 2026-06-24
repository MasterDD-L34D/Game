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

// Form-Pulse trait v2 enemy-HP offset (ratify path-1). When FORM_PULSE_TRAIT_V2_ENABLED
// is ON the team carries the ~1.2/creature branco+minor grant; this offset scales enemy
// HP so NET difficulty stays near baseline. CALIBRATED empirically (enc_savana_01 paired
// A/B, N=12/arm, this PR): enemy-HP->rounds is SUB-linear (last-hit overkill + fixed wave
// timing dampen it), so the naive ~+8% moved rounds ~0. Bracketed on the paired round delta
// (treat - ctrl): offset 1.0 -> ~-1.8 rounds (buff wins), 1.5 -> ~+1.4 (offset over-corrects),
// so the net-neutral point is ~1.3. Env-overridable (FORM_PULSE_V2_ENEMY_HP_OFFSET) for
// re-calibration. Flag owner: services/identity/brancoTraitEmergence. N=12 is a direction
// probe -- confirm with a full N=40 A/B before the prod flip.
const FP_V2_ENEMY_HP_OFFSET_DEFAULT = 1.3;

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

/**
 * Form-Pulse trait v2 enemy-HP offset multiplier. Returns 1.0 (no-op) unless the
 * FORM_PULSE_TRAIT_V2_ENABLED flag is ON. The caller FOLDS this into the single
 * applyEnemyHpMultiplier call (biome hp_mult * offset) -- applyEnemyHpMultiplier is
 * idempotent per unit (_biome_hp_applied marker), so it must be applied once. Env
 * override FORM_PULSE_V2_ENEMY_HP_OFFSET supports A/B calibration sweeps without a
 * code change. See the FP_V2_ENEMY_HP_OFFSET_DEFAULT header comment.
 *
 * @param {object} [env=process.env]
 * @returns {number} >0 multiplier (1.0 when the flag is OFF)
 */
function formPulseV2EnemyHpOffset(env = process.env) {
  if (!env || env.FORM_PULSE_TRAIT_V2_ENABLED !== 'true') return 1.0;
  const override = Number(env.FORM_PULSE_V2_ENEMY_HP_OFFSET);
  return Number.isFinite(override) && override > 0 ? override : FP_V2_ENEMY_HP_OFFSET_DEFAULT;
}

/**
 * 2026-05-20 — list runtime biome modifier registry (A6 pattern, gap-fill
 * Explore quick-win wave 3 #4). Used by readonly diagnostic route +
 * frontend combat UI per preload diff_base/hp_mult/pressure formula per biome.
 *
 * @param {object} [registry] — DI override (test/dev)
 * @returns {Array<{biome_id, diff_base, hp_mult, pressure_mult, pressure_initial_bonus}>}
 */
function listBiomeModifiers(registry) {
  const biomes = registry || loadBiomesConfig();
  if (!biomes || typeof biomes !== 'object') return [];
  return Object.keys(biomes)
    .sort()
    .map((biome_id) => ({
      biome_id,
      ...getBiomeModifiers(biome_id, biomes),
    }));
}

/**
 * 2026-06-01 — read the player-invisible biome stress/narrative fields for a
 * read-only diagnostic surface (catalog-mapping-audit §4). Exposes the DEAD
 * biomes.yaml fields (stresswave, hazard.severity/stress_modifiers, narrative,
 * npc_archetypes) so they are inspectable. Pure reader, ZERO combat effect
 * (band-neutral) — does NOT feed pressure/spawn; that wire (stresswave→pressure)
 * is a separate combat PR requiring band-verify.
 *
 * @param {string} biomeId
 * @param {object} [registry]
 * @returns {object|null}
 */
function getBiomeStressProfile(biomeId, registry) {
  if (!biomeId || typeof biomeId !== 'string') return null;
  const biomes = registry || loadBiomesConfig();
  const cfg = biomes && biomes[biomeId];
  if (!cfg || typeof cfg !== 'object') return null;
  const hazard = cfg.hazard && typeof cfg.hazard === 'object' ? cfg.hazard : {};
  return {
    biome_id: biomeId,
    stresswave: cfg.stresswave && typeof cfg.stresswave === 'object' ? cfg.stresswave : null,
    hazard_severity: hazard.severity != null ? hazard.severity : null,
    stress_modifiers:
      hazard.stress_modifiers && typeof hazard.stress_modifiers === 'object'
        ? hazard.stress_modifiers
        : null,
    narrative: cfg.narrative && typeof cfg.narrative === 'object' ? cfg.narrative : null,
    npc_archetypes:
      cfg.npc_archetypes && typeof cfg.npc_archetypes === 'object' ? cfg.npc_archetypes : null,
  };
}

/**
 * 2026-06-01 — list stress profiles for all biomes (readonly diagnostic).
 *
 * @param {object} [registry]
 * @returns {Array<object>}
 */
function listBiomeStressProfiles(registry) {
  const biomes = registry || loadBiomesConfig();
  if (!biomes || typeof biomes !== 'object') return [];
  return Object.keys(biomes)
    .sort()
    .map((biome_id) => getBiomeStressProfile(biome_id, biomes))
    .filter(Boolean);
}

module.exports = {
  loadBiomesConfig,
  getBiomeModifiers,
  listBiomeModifiers,
  getBiomeStressProfile,
  listBiomeStressProfiles,
  applyEnemyHpMultiplier,
  formPulseV2EnemyHpOffset,
  FP_V2_ENEMY_HP_OFFSET_DEFAULT,
  _resetCache,
  DEFAULT_BIOMES_YAML,
  SAFE_DEFAULTS,
};
