// M13 P3 — Progression engine.
// ADR-2026-04-24-p3-character-progression (pending).
//
// Responsibility: XP → level mapping, level-up detection, perk pick validation,
// stat/passive projection. Pure functions + class wrapping cached YAML.
//
// Data model:
//   UnitProgression = {
//     unit_id: string,
//     job: string,
//     xp_total: number,
//     level: number,           // derived from xp_total via curve
//     picked_perks: [           // caller-owned append-only
//       { level: 2, perk_id: 'sk_r1_flank_specialist' },
//       ...
//     ],
//   }
//
// Engine API:
//   computeLevel(xp, curve)                     → number (1..max_level)
//   computePendingLevelUps(unit, curve)         → [{ level, perk_choice: {a,b} }, ...]
//   applyXp(unit, amount, { curve })            → { unit, leveled_up: bool, new_level }
//   pickPerk(unit, level, choice, { perks })    → { unit, picked_perk } | throws
//   effectiveStats(unit, perksData)             → { attack_mod, defense_mod, hp_max, ap, initiative, attack_range }
//   listPassives(unit, perksData)               → [{ tag, payload, source_perk_id }]
//   listAbilityMods(unit, perksData)            → [{ ability_id, field, delta, source_perk_id }]

'use strict';

const { loadXpCurve, loadPerks } = require('./progressionLoader');

function computeLevel(xpTotal, curve) {
  const thresholds = curve?.level_xp_thresholds || { 1: 0 };
  const levels = Object.keys(thresholds)
    .map(Number)
    .sort((a, b) => a - b);
  let level = 1;
  for (const l of levels) {
    if (xpTotal >= thresholds[l]) level = l;
  }
  return level;
}

function getLevelPerkChoice(perksData, jobId, level) {
  const jobPerks = perksData?.jobs?.[jobId]?.perks;
  if (!jobPerks) return null;
  const entry = jobPerks[`level_${level}`];
  if (!entry) return null;
  return {
    level,
    perk_a: entry.perk_a,
    perk_b: entry.perk_b,
  };
}

function computePendingLevelUps(unit, perksData) {
  const pickedByLevel = new Set((unit.picked_perks || []).map((p) => p.level));
  const out = [];
  for (let l = 2; l <= unit.level; l += 1) {
    if (pickedByLevel.has(l)) continue;
    const choice = getLevelPerkChoice(perksData, unit.job, l);
    if (choice) out.push({ level: l, choice });
  }
  return out;
}

function applyXp(unit, amount, { curve } = {}) {
  const xpCurve = curve || loadXpCurve();
  const grantAmount = Math.max(0, Number(amount) || 0);
  const xpBefore = Number(unit.xp_total || 0);
  const levelBefore = Number(unit.level || 1);
  const maxLevel = xpCurve.max_level || 7;

  const xpAfter = xpBefore + grantAmount;
  const rawLevel = computeLevel(xpAfter, xpCurve);
  const newLevel = Math.min(rawLevel, maxLevel);

  const updated = {
    ...unit,
    xp_total: xpAfter,
    level: newLevel,
  };
  return {
    unit: updated,
    xp_granted: grantAmount,
    xp_before: xpBefore,
    xp_after: xpAfter,
    level_before: levelBefore,
    level_after: newLevel,
    leveled_up: newLevel > levelBefore,
  };
}

/**
 * Skiv ticket #6 — resolve hybrid path config (cost_pi + partial_factor).
 * Per-level override `level.hybrid: { cost_pi, partial_factor }` wins over
 * top-level `perksData.hybrid_path.{ default_cost_pi, default_partial_factor }`.
 */
function getHybridConfig(perksData, jobId, level) {
  const top = perksData?.hybrid_path || {};
  const defaults = {
    cost_pi: Number.isFinite(Number(top.default_cost_pi)) ? Number(top.default_cost_pi) : 5,
    partial_factor: Number.isFinite(Number(top.default_partial_factor))
      ? Number(top.default_partial_factor)
      : 0.5,
  };
  const levelEntry = perksData?.jobs?.[jobId]?.perks?.[`level_${level}`]?.hybrid;
  if (!levelEntry || typeof levelEntry !== 'object') return defaults;
  return {
    cost_pi: Number.isFinite(Number(levelEntry.cost_pi))
      ? Number(levelEntry.cost_pi)
      : defaults.cost_pi,
    partial_factor: Number.isFinite(Number(levelEntry.partial_factor))
      ? Number(levelEntry.partial_factor)
      : defaults.partial_factor,
  };
}

function pickPerk(unit, level, choice, { perks, available_pi } = {}) {
  const perksData = perks || loadPerks();
  if (!['a', 'b', 'hybrid'].includes(choice)) {
    throw new Error(`invalid choice "${choice}": must be 'a', 'b', or 'hybrid'`);
  }
  if (unit.level < level) {
    throw new Error(`unit level ${unit.level} < required level ${level}`);
  }
  const existing = (unit.picked_perks || []).find((p) => p.level === level);
  if (existing) {
    const id = existing.perk_id || (existing.perk_ids ? existing.perk_ids.join('+') : 'unknown');
    throw new Error(`perk at level ${level} already picked: ${id}`);
  }
  const pair = getLevelPerkChoice(perksData, unit.job, level);
  if (!pair) {
    throw new Error(`no perk pair defined for job ${unit.job} level ${level}`);
  }

  // Skiv #6 hybrid path branch
  if (choice === 'hybrid') {
    const hybrid = getHybridConfig(perksData, unit.job, level);
    const availablePi = Number.isFinite(Number(available_pi)) ? Number(available_pi) : 0;
    if (availablePi < hybrid.cost_pi) {
      throw new Error(
        `insufficient_pi: hybrid path requires ${hybrid.cost_pi} PI (available ${availablePi})`,
      );
    }
    const pickRecord = {
      level,
      choice: 'hybrid',
      perk_ids: [pair.perk_a.id, pair.perk_b.id],
      partial_factor: hybrid.partial_factor,
      pi_cost: hybrid.cost_pi,
    };
    const updated = {
      ...unit,
      picked_perks: [...(unit.picked_perks || []), pickRecord],
    };
    return {
      unit: updated,
      picked_perk: { perk_a: pair.perk_a, perk_b: pair.perk_b },
      pick: pickRecord,
      pi_cost: hybrid.cost_pi,
    };
  }

  const perk = choice === 'a' ? pair.perk_a : pair.perk_b;
  const pickRecord = { level, perk_id: perk.id, choice };
  const updated = {
    ...unit,
    picked_perks: [...(unit.picked_perks || []), pickRecord],
  };
  return { unit: updated, picked_perk: perk, pick: pickRecord };
}

/**
 * Skiv #6: scale numeric fields of an effect by partial_factor for hybrid picks.
 * Touches stat_bonus / stat_bonus_2 / ability_mod (delta only) / passive (no
 * scaling for tag-based effects since they're booleans/payloads — caller
 * resolver decides). Returns a fresh effect object; original untouched.
 */
function scaleEffect(effect, factor) {
  if (!effect || typeof effect !== 'object' || !Number.isFinite(factor) || factor === 1) {
    return effect;
  }
  const out = {};
  for (const [key, val] of Object.entries(effect)) {
    if (key.startsWith('stat_bonus') && val && typeof val === 'object') {
      out[key] = { ...val, amount: Math.round(Number(val.amount || 0) * factor) };
    } else if (key === 'ability_mod' && val && typeof val === 'object') {
      out[key] = { ...val, delta: Number(val.delta || 0) * factor };
    } else {
      out[key] = val; // passive tags + payloads: pass through
    }
  }
  return out;
}

function collectPerkEffects(unit, perksData) {
  const effects = [];
  for (const pick of unit.picked_perks || []) {
    const pair = getLevelPerkChoice(perksData, unit.job, pick.level);
    if (!pair) continue;
    if (pick.choice === 'hybrid' && Array.isArray(pick.perk_ids)) {
      const factor = Number.isFinite(Number(pick.partial_factor))
        ? Number(pick.partial_factor)
        : 0.5;
      for (const perkId of pick.perk_ids) {
        const perk = pair.perk_a?.id === perkId ? pair.perk_a : pair.perk_b;
        if (!perk) continue;
        effects.push({
          perk_id: perk.id,
          effect: scaleEffect(perk.effect || {}, factor),
          level: pick.level,
          hybrid: true,
          partial_factor: factor,
        });
      }
      continue;
    }
    const perk =
      pair[`perk_${pick.choice}`] || (pair.perk_a?.id === pick.perk_id ? pair.perk_a : pair.perk_b);
    if (!perk) continue;
    effects.push({ perk_id: perk.id, effect: perk.effect || {}, level: pick.level });
  }
  return effects;
}

const STAT_KEYS = ['hp_max', 'ap', 'attack_mod', 'defense_mod', 'initiative', 'attack_range'];

function effectiveStats(unit, perksData) {
  const data = perksData || loadPerks();
  const bonuses = Object.fromEntries(STAT_KEYS.map((k) => [k, 0]));
  for (const { effect } of collectPerkEffects(unit, data)) {
    for (const [key, val] of Object.entries(effect)) {
      if (!key.startsWith('stat_bonus')) continue;
      if (!val || typeof val !== 'object') continue;
      if (STAT_KEYS.includes(val.stat)) {
        bonuses[val.stat] += Number(val.amount) || 0;
      }
    }
  }
  return bonuses;
}

function listPassives(unit, perksData) {
  const data = perksData || loadPerks();
  const out = [];
  for (const { perk_id: perkId, effect } of collectPerkEffects(unit, data)) {
    if (effect.passive && effect.passive.tag) {
      out.push({
        tag: effect.passive.tag,
        payload: effect.passive.payload || {},
        source_perk_id: perkId,
      });
    }
  }
  return out;
}

function listAbilityMods(unit, perksData) {
  const data = perksData || loadPerks();
  const out = [];
  for (const { perk_id: perkId, effect } of collectPerkEffects(unit, data)) {
    if (effect.ability_mod) {
      out.push({
        ability_id: effect.ability_mod.ability_id,
        field: effect.ability_mod.field,
        delta: Number(effect.ability_mod.delta) || 0,
        source_perk_id: perkId,
      });
    }
  }
  return out;
}

class ProgressionEngine {
  constructor({ xpCurve = null, perks = null } = {}) {
    this.xpCurve = xpCurve || loadXpCurve();
    this.perks = perks || loadPerks();
  }
  seed(unitId, job, { xpTotal = 0 } = {}) {
    const level = Math.min(computeLevel(xpTotal, this.xpCurve), this.xpCurve.max_level || 7);
    return {
      unit_id: unitId,
      job,
      xp_total: xpTotal,
      level,
      picked_perks: [],
    };
  }
  applyXp(unit, amount) {
    return applyXp(unit, amount, { curve: this.xpCurve });
  }
  pendingLevelUps(unit) {
    return computePendingLevelUps(unit, this.perks);
  }
  pickPerk(unit, level, choice, opts = {}) {
    return pickPerk(unit, level, choice, { perks: this.perks, ...opts });
  }
  hybridConfig(jobId, level) {
    return getHybridConfig(this.perks, jobId, level);
  }
  effectiveStats(unit) {
    return effectiveStats(unit, this.perks);
  }
  listPassives(unit) {
    return listPassives(unit, this.perks);
  }
  listAbilityMods(unit) {
    return listAbilityMods(unit, this.perks);
  }
  getPerkPair(jobId, level) {
    return getLevelPerkChoice(this.perks, jobId, level);
  }
  snapshot() {
    const jobs = Object.keys(this.perks?.jobs || {});
    return {
      version: this.perks?.version || null,
      xp_max_level: this.xpCurve?.max_level || 7,
      xp_thresholds: this.xpCurve?.level_xp_thresholds || {},
      jobs,
    };
  }
}

module.exports = {
  ProgressionEngine,
  computeLevel,
  computePendingLevelUps,
  applyXp,
  pickPerk,
  effectiveStats,
  listPassives,
  listAbilityMods,
  getLevelPerkChoice,
  getHybridConfig,
  scaleEffect,
};
