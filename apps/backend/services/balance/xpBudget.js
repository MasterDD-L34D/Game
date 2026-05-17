// 2026-04-26 — Pathfinder XP budget runtime engine (P1 Tier-E adoption).
//
// Source: docs/research/2026-04-26-tier-e-extraction-matrix.md (Pathfinder XP budget).
// Donor pattern: Pathfinder TTRPG Encounter Building XP budget approach.
//
// Funzione:
//   - computeUnitXp(unit) — XP value singolo unit basato su stats
//   - computeEncounterBudget(encounterClass, partySize) — budget atteso
//   - auditEncounter(encounter, partySize) — confronto budget vs used
//
// Wire opzionale in:
//   - apps/backend/routes/session.js /start (audit warning log)
//   - tools/py/batch_calibrate_*.py (pre-run sanity check)
//   - balance-illuminator agent (audit mode)

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const CONFIG_PATH = path.resolve(__dirname, '../../../../data/core/balance/xp_budget.yaml');

let _config = null;

function loadConfig() {
  if (_config) return _config;
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    _config = yaml.load(raw);
    return _config;
  } catch (err) {
    console.warn('[xpBudget] config not loaded:', err.message);
    _config = {
      encounter_classes: {},
      party_size_modifiers: {},
      unit_xp_formula: {},
      audit_defaults: {},
    };
    return _config;
  }
}

/**
 * Compute XP value of a unit basato su stats.
 * Formula: hp*w + mod*w + ap*w + range*w + tier_bonus + guardia*w
 */
function computeUnitXp(unit) {
  if (!unit || typeof unit !== 'object') return 0;
  const cfg = loadConfig().unit_xp_formula || {};
  const hp = Number(unit.hp || unit.max_hp || 0);
  const mod = Number(unit.mod || 0);
  const ap = Number(unit.ap || 0);
  // Range default = 0 (no XP) per unit incomplete; presupposto: caller fornisce stats reali.
  const range = Number(unit.range ?? unit.attack_range ?? 0);
  const guardia = Number(unit.guardia || 0);
  const tier = String(unit.tier || 'base').toLowerCase();
  const isBossId = typeof unit.id === 'string' && /_boss\b/.test(unit.id);

  let xp = 0;
  xp += hp * (cfg.hp_weight || 2.0);
  xp += mod * (cfg.mod_weight || 8.0);
  xp += ap * (cfg.ap_weight || 6.0);
  xp += range * (cfg.range_weight || 4.0);
  xp += guardia * (cfg.guardia_weight || 5.0);

  // Tier bonus: usa SOLO tier_bonus[tier]. Boss-by-id check aggiunge bonus
  // SE tier non è già 'boss' (dedup).
  const tierBonuses = cfg.tier_bonus || {};
  xp += Number(tierBonuses[tier] ?? tierBonuses.base ?? 0);
  if (isBossId && tier !== 'boss') {
    xp += Number(tierBonuses.boss ?? 200);
  }

  return Math.round(xp);
}

/**
 * Compute encounter XP budget per (class, partySize).
 * Returns 0 se class non in catalog.
 */
function computeEncounterBudget(encounterClass, partySize = 4) {
  const cfg = loadConfig();
  const classCfg = (cfg.encounter_classes || {})[encounterClass];
  if (!classCfg) return 0;
  const base = Number(classCfg.budget_base || 0);
  const modifiers = cfg.party_size_modifiers || {};
  const sizeKey = String(Math.max(1, Math.min(8, Number(partySize) || 4)));
  const mod = Number(modifiers[sizeKey] ?? 1.0);
  return Math.round(base * mod);
}

/**
 * Audit encounter: confronta total enemy XP vs budget atteso.
 * Returns { budget, used, ratio, status: 'under'|'in_band'|'over'|'critical_over', ... }
 */
function auditEncounter(encounter, partySize = 4) {
  if (!encounter || typeof encounter !== 'object') {
    return { budget: 0, used: 0, ratio: 0, status: 'no_encounter' };
  }
  const cls = encounter.encounter_class || 'standard';
  const budget = computeEncounterBudget(cls, partySize);

  // Sum XP of all enemy units in waves.
  const waves = Array.isArray(encounter.waves) ? encounter.waves : [];
  let used = 0;
  let unitCount = 0;
  for (const wave of waves) {
    const units = Array.isArray(wave.units) ? wave.units : [];
    for (const uSpec of units) {
      const count = Number(uSpec.count || 1);
      // Approximate unit stats da species + tier (hp/mod/ap defaults).
      const tier = String(uSpec.tier || 'base').toLowerCase();
      const baseStats = {
        hp: tier === 'boss' ? 30 : tier === 'elite' || tier === 'apex' ? 12 : 6,
        mod: tier === 'boss' ? 4 : tier === 'elite' ? 3 : 2,
        ap: 2,
        range: 1,
        guardia: tier === 'boss' ? 3 : tier === 'elite' ? 1 : 0,
        tier,
      };
      const xpPer = computeUnitXp(baseStats);
      used += xpPer * count;
      unitCount += count;
    }
  }

  // Reinforcement_pool: contribuisce average XP * max_total_spawns (worst-case).
  const reinfPool = Array.isArray(encounter.reinforcement_pool) ? encounter.reinforcement_pool : [];
  const reinfPolicy = encounter.reinforcement_policy || {};
  const maxReinforcement = Number(reinfPolicy.max_total_spawns || 0);
  if (reinfPool.length > 0 && maxReinforcement > 0) {
    let avgPoolXp = 0;
    for (const entry of reinfPool) {
      const tier = String(entry.tier || 'base').toLowerCase();
      const baseStats = {
        hp: tier === 'boss' ? 30 : tier === 'elite' || tier === 'apex' ? 12 : 6,
        mod: tier === 'boss' ? 4 : tier === 'elite' ? 3 : 2,
        ap: 2,
        range: 1,
        guardia: 0,
        tier,
      };
      avgPoolXp += computeUnitXp(baseStats);
    }
    avgPoolXp = avgPoolXp / reinfPool.length;
    used += Math.round(avgPoolXp * maxReinforcement);
  }

  const ratio = budget > 0 ? used / budget : 0;
  const cfg = loadConfig();
  const cls_cfg = (cfg.encounter_classes || {})[cls] || {};
  const oobPct = Number(cls_cfg.out_of_band_pct ?? 0.2);
  const audit = cfg.audit_defaults || {};
  const criticalOver = 1 + Number(audit.critical_over_pct ?? 0.5);

  let status;
  if (budget === 0) status = 'no_budget_config';
  else if (ratio < 1 - oobPct) status = 'under';
  else if (ratio > criticalOver) status = 'critical_over';
  else if (ratio > 1 + oobPct) status = 'over';
  else status = 'in_band';

  return {
    budget,
    used,
    ratio: Math.round(ratio * 100) / 100,
    status,
    encounter_class: cls,
    party_size: partySize,
    enemy_unit_count: unitCount,
    reinforcement_max: maxReinforcement,
    out_of_band_pct: oobPct,
  };
}

function _resetCache() {
  _config = null;
}

module.exports = {
  computeUnitXp,
  computeEncounterBudget,
  auditEncounter,
  _resetCache,
  CONFIG_PATH,
};
