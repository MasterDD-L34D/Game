// M7-#2 Phase B — damage curves loader + apply pipeline.
//
// Runtime consumer di data/core/balance/damage_curves.yaml (ADR-2026-04-20).
// Funzioni:
//   - loadDamageCurves(path): carica YAML singleton, cache in-memory
//   - getEncounterClass(encounter): estrae class da encounter.encounter_class
//     fallback "standard"
//   - applyEnemyDamageMultiplier(unit, encounterClass): scale unit.mod
//   - shouldEnrageBoss(boss, encounterClass): boolean se boss HP < threshold
//   - getEnrageModBonus(encounterClass): bonus mod da applicare on enrage

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_PATH = path.join(process.cwd(), 'data', 'core', 'balance', 'damage_curves.yaml');

const DEFAULT_CLASS = 'standard';

let _cached = null;

/**
 * Load + cache damage_curves.yaml. Idempotente (subsequent calls ritornano cached).
 * Soft-fail se missing (ritorna null → consumer usano defaults fallback).
 */
function loadDamageCurves(filePath = DEFAULT_PATH) {
  if (_cached !== null) return _cached;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    _cached = yaml.load(raw);
    return _cached;
  } catch (err) {
    console.warn(`[damage-curves] non caricato (${err.message}). Default multiplier=1.0`);
    _cached = null;
    return null;
  }
}

/** Reset cache (per test). */
function _resetCache() {
  _cached = null;
}

/**
 * Estrae encounter class da config encounter.
 * Fallback "standard" se campo assente o class non esiste nel YAML.
 */
function getEncounterClass(encounter, curves = null) {
  if (!encounter) return DEFAULT_CLASS;
  const raw = encounter.encounter_class || encounter.encounter_class_id || DEFAULT_CLASS;
  const data = curves || loadDamageCurves();
  if (!data || !data.encounter_classes || !data.encounter_classes[raw]) {
    return DEFAULT_CLASS;
  }
  return raw;
}

/**
 * Apply enemy_damage_multiplier to unit.mod.
 * Static application: unit.mod modificato una volta durante session init.
 * Round floor (damage deve essere int).
 *
 * @returns {boolean} true se mod modificato
 */
function applyEnemyDamageMultiplier(unit, encounterClass, curves = null) {
  if (!unit) return false;
  const data = curves || loadDamageCurves();
  if (!data) return false;
  const cls = data.encounter_classes[encounterClass];
  if (!cls) return false;
  const mult = Number(cls.enemy_damage_multiplier) || 1.0;
  if (mult === 1.0) return false;
  const before = Number(unit.mod || 0);
  unit.mod = Math.round(before * mult);
  unit._mod_base = before; // track per debug / possible revert
  unit._mod_multiplier_applied = mult;
  return true;
}

/**
 * Check se boss deve enrage basato su hp corrente vs threshold class.
 * Enrage attivato quando hp_current / hp_max < threshold_hp.
 *
 * @param {object} boss unit (hp, max_hp)
 * @param {string} encounterClass
 * @param {object} curves optional (dependency injection)
 * @returns {boolean}
 */
function shouldEnrageBoss(boss, encounterClass, curves = null) {
  if (!boss || !boss.max_hp) return false;
  const data = curves || loadDamageCurves();
  if (!data) return false;
  const cls = data.encounter_classes[encounterClass];
  if (!cls || cls.boss_enrage_threshold_hp === null || cls.boss_enrage_threshold_hp === undefined) {
    return false;
  }
  const ratio = Number(boss.hp || 0) / Number(boss.max_hp);
  return ratio < Number(cls.boss_enrage_threshold_hp);
}

/**
 * Bonus mod aggiunto su attack quando boss enrage.
 * Da damage_curves.yaml enemy_tiers.boss.enrage_mod_bonus.
 */
function getEnrageModBonus(curves = null) {
  const data = curves || loadDamageCurves();
  if (!data || !data.enemy_tiers || !data.enemy_tiers.boss) return 0;
  return Number(data.enemy_tiers.boss.enrage_mod_bonus) || 0;
}

/**
 * Estrae target_bands per una class (consumed da calibration harness).
 * @returns {object|null} {win_rate, defeat_rate, timeout_rate} o null
 */
function getTargetBands(encounterClass, curves = null) {
  const data = curves || loadDamageCurves();
  if (!data || !data.encounter_classes) return null;
  const cls = data.encounter_classes[encounterClass];
  if (!cls || !cls.target_bands) return null;
  return cls.target_bands;
}

/**
 * M9 P6: turn_limit_defeat per class. Null = no forced outcome.
 * Consumed da sessionOutcomeResolver per force decision pressure.
 *
 * @returns {number|null} turn threshold, null se disabilitato
 */
function getTurnLimitDefeat(encounterClass, curves = null) {
  const data = curves || loadDamageCurves();
  if (!data || !data.encounter_classes) return null;
  const cls = data.encounter_classes[encounterClass];
  if (!cls || cls.turn_limit_defeat == null) return null;
  const n = Number(cls.turn_limit_defeat);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * M9 P6: check se session turn corrente viola turn_limit_defeat per class.
 * Ritorna true se turn >= limit (defeat va applicato).
 */
function isTurnLimitExceeded(turn, encounterClass, curves = null) {
  const limit = getTurnLimitDefeat(encounterClass, curves);
  if (limit == null) return false;
  return Number(turn || 0) >= limit;
}

module.exports = {
  loadDamageCurves,
  getEncounterClass,
  applyEnemyDamageMultiplier,
  shouldEnrageBoss,
  getEnrageModBonus,
  getTargetBands,
  getTurnLimitDefeat,
  isTurnLimitExceeded,
  DEFAULT_CLASS,
  DEFAULT_PATH,
  _resetCache,
};
