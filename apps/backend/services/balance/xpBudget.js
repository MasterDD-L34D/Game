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
 * Shape 1 (Frosthaven donor): XP contribution of hazard terrain tiles, scaled by
 * the encounter_class axis. Reads encounter.grid.terrain_features (already in schema).
 * Returns 0 when no grid/hazards. PROPOSED values (SDMG) -> ratify N=40.
 */
function hazardBudgetContribution(encounter, encounterClass) {
  const geo = loadConfig().geometry || {};
  const hazardSet = new Set(geo.hazard_set || []);
  const hazardXp = geo.hazard_xp || {};
  const scalar = Number((geo.class_scalar || {})[encounterClass] ?? 1.0);
  const grid = encounter && encounter.grid;
  const features = grid && Array.isArray(grid.terrain_features) ? grid.terrain_features : [];
  let contribution = 0;
  for (const f of features) {
    if (f && hazardSet.has(f.type)) contribution += Number(hazardXp[f.type] || 0) * scalar;
  }
  return Math.round(contribution);
}

/**
 * Shape 3 (calibrazione D9 2026-07-06): action-economy scale. Il modello stat-mass
 * over-predice sui grid_sized (dorsale: ratio 2.95 critical_over vs WR 1.0 N=40)
 * perche' ignora il dial intents_per_round: il Sistema gioca dial_cap azioni/round
 * (PRESSURE_TIER_INTENT_CAP, Escalated=3) contro party_size*party_ap del party.
 * scale = min(1, dial_cap_reference / (party_size * party_ap)). Config-driven
 * (geometry.action_economy, valori PROPOSED SDMG); senza config -> 1 (neutro).
 * Applicato SOLO flag-ON (XP_BUDGET_GEOMETRY_ENABLED), flag-OFF byte-identical.
 */
function actionEconomyScale(partySize) {
  const geo = loadConfig().geometry || {};
  const ae = geo.action_economy || {};
  const dialCap = Number(ae.dial_cap_reference ?? 0);
  const partyAp = Number(ae.party_ap ?? 2);
  if (!(dialCap > 0) || !(partyAp > 0)) return 1;
  const ps = Math.max(1, Number(partySize) || 4);
  return Math.min(1, dialCap / (ps * partyAp));
}

/**
 * Shape 2 (Lancer donor): max concurrent enemy activations / party_size, worst-case
 * static (assumes nobody dies). Reads encounter.waves[]. Reported-passive: NEVER gates.
 * NOTE: waves[] are reinforcements; the initial roster comes from the payload, so this
 * is an approximation (documented in the design spec sez. 1.4).
 */
function activationPressure(encounter, partySize) {
  const waves = Array.isArray(encounter && encounter.waves) ? encounter.waves : [];
  const triggers = [...new Set(waves.map((w) => Number(w.turn_trigger || 0)))].sort(
    (a, b) => a - b,
  );
  let maxConcurrent = 0;
  for (const t of triggers) {
    let cumulative = 0;
    for (const w of waves) {
      if (Number(w.turn_trigger || 0) <= t) {
        const units = Array.isArray(w.units) ? w.units : [];
        for (const u of units) cumulative += Number(u.count || 1);
      }
    }
    if (cumulative > maxConcurrent) maxConcurrent = cumulative;
  }
  const ps = Math.max(1, Number(partySize) || 1);
  const ratio = maxConcurrent / ps;
  const band = (loadConfig().geometry || {}).activation_band || {};
  const low = Number(band.low ?? 1.0);
  const high = Number(band.high ?? 2.0);
  let status;
  if (maxConcurrent === 0) status = 'no_waves';
  else if (ratio < low) status = 'under';
  else if (ratio > high) status = 'over';
  else status = 'in_band';
  return { activation_ratio: Math.round(ratio * 100) / 100, activation_status: status };
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

  // Geometry terms (D9 gate slice): SOLO flag-ON (band-neutral OFF).
  if (process.env.XP_BUDGET_GEOMETRY_ENABLED === 'true') {
    // Shape 3: action-economy scale (calibrazione 2026-07-06, evidence
    // docs/research/2026-07-06-xpbudget-geometry-calibration.md).
    used = Math.round(used * actionEconomyScale(partySize));
    // Shape 1 hazard: conta SOLO quando il cost-substrate rende l'hazard
    // meccanicamente reale (MOVE_TERRAIN_COST_ENABLED). Misurato (abisso
    // 18 lava, N=40): a substrate OFF il pathing evita l'hazard -> contributo
    // reale 0; sommarlo predirrebbe difficolta' che non puo' esistere.
    if (process.env.MOVE_TERRAIN_COST_ENABLED === 'true') {
      used += hazardBudgetContribution(encounter, cls);
    }
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

  const activation = activationPressure(encounter, partySize);
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
    activation_ratio: activation.activation_ratio,
    activation_status: activation.activation_status,
  };
}

function _resetCache() {
  _config = null;
}

module.exports = {
  computeUnitXp,
  computeEncounterBudget,
  hazardBudgetContribution,
  actionEconomyScale,
  activationPressure,
  auditEncounter,
  _resetCache,
  CONFIG_PATH,
};
