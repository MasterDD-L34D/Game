// M13 P3 Phase B — apply progression perks to units at session start.
// ADR-2026-04-24-p3-character-progression Phase B addendum (pending).
//
// Two-phase application:
//   1. Load-time (session /start): mutate unit base stats via effectiveStats()
//      + attach _perk_passives + _perk_ability_mods for runtime lookup.
//   2. Runtime (attack resolve): computePerkDamageBonus(actor, target, ctx)
//      checks actor._perk_passives for top-5 tags against combat context.
//
// Mutation is idempotent (guard via _progression_applied flag).
// Graceful no-op if unit has no progression state in store.

'use strict';

const { ProgressionEngine } = require('./progressionEngine');
const { createProgressionStore } = require('./progressionStore');

let _defaultEngine = null;
let _defaultStore = null;

function getDefaultEngine() {
  if (!_defaultEngine) _defaultEngine = new ProgressionEngine();
  return _defaultEngine;
}

function getDefaultStore() {
  if (!_defaultStore) _defaultStore = createProgressionStore();
  return _defaultStore;
}

// Exposed for tests to inject mocks + for session /start to pass its own engine/store.
function resetDefaults() {
  _defaultEngine = null;
  _defaultStore = null;
}

/**
 * Apply progression perks to all player units in-place. Caller owns units
 * array; this function mutates each player unit to include perk bonuses.
 *
 * @param {Array<object>} units — session units array
 * @param {object} opts
 * @param {ProgressionEngine} [opts.engine]
 * @param {object} [opts.store]
 * @param {string|null} [opts.campaignId]
 * @returns {{ applied: Array<{ unit_id, bonuses, passive_count, ability_mod_count }>, skipped: number }}
 */
function applyProgressionToUnits(units, opts = {}) {
  const engine = opts.engine || getDefaultEngine();
  const store = opts.store || getDefaultStore();
  const campaignId = opts.campaignId ?? null;
  const applied = [];
  let skipped = 0;

  if (!Array.isArray(units)) return { applied, skipped: 0 };

  for (const unit of units) {
    if (!unit || unit.controlled_by !== 'player' || !unit.id) {
      skipped += 1;
      continue;
    }
    if (unit._progression_applied) {
      skipped += 1;
      continue;
    }
    const state = store.get(campaignId, unit.id);
    if (!state) {
      skipped += 1;
      continue;
    }

    const bonuses = engine.effectiveStats(state);
    const passives = engine.listPassives(state);
    const abilityMods = engine.listAbilityMods(state);

    // Apply stat bonuses additively to unit.
    // hp_max bonuses also increase current hp so unit starts fresh.
    if (bonuses.hp_max) {
      unit.hp_max = Number(unit.hp_max || unit.hp || 0) + bonuses.hp_max;
      unit.hp = Number(unit.hp || 0) + bonuses.hp_max;
    }
    if (bonuses.ap) unit.ap = Number(unit.ap || 0) + bonuses.ap;
    if (bonuses.attack_mod) unit.mod = Number(unit.mod || 0) + bonuses.attack_mod;
    if (bonuses.defense_mod) unit.dc = Number(unit.dc || 0) + bonuses.defense_mod;
    if (bonuses.initiative) unit.initiative = Number(unit.initiative || 0) + bonuses.initiative;
    if (bonuses.attack_range) {
      unit.attack_range = Number(unit.attack_range || 1) + bonuses.attack_range;
    }

    unit._perk_passives = passives;
    unit._perk_ability_mods = abilityMods;
    unit._progression_applied = true;

    applied.push({
      unit_id: unit.id,
      bonuses,
      passive_count: passives.length,
      ability_mod_count: abilityMods.length,
    });
  }

  // Sprint Spore Moderate (ADR-2026-04-26 §S6) — hydrate _archetype_passives
  // for ALL units (player + sistema) post perk application. Bingo state is
  // pure-derived from applied_mutations[]: zero side effect when zero mutations.
  // Wrapped in try/catch: missing module / catalog error must NOT block session
  // start (back-compat con sessioni pre-Spore).
  try {
    const { applyMutationBingoToUnit } = require('../mutations/mutationEngine');
    const { loadMutationCatalog } = require('../mutations/mutationCatalogLoader');
    const catalog = loadMutationCatalog();
    for (const unit of units) {
      if (!unit || typeof unit !== 'object') continue;
      applyMutationBingoToUnit(unit, catalog);
    }
  } catch {
    // Non-blocking: skip archetype hydration on error.
  }

  return { applied, skipped };
}

/**
 * Compute perk damage bonus at attack resolve time. Checks top-5 passive tags
 * against the combat context. Additive delta to base damage.
 *
 * @param {object} actor — attacker unit
 * @param {object} target — defender unit
 * @param {object} ctx — { units?, hpBefore?, hpAfter?, isFirstStrike?, baseDamage? }
 * @returns {{ bonus: number, applied: Array<{ tag, amount, source_perk_id }> }}
 */
function computePerkDamageBonus(actor, target, ctx = {}) {
  const out = { bonus: 0, applied: [] };
  const passives = Array.isArray(actor?._perk_passives) ? actor._perk_passives : [];
  if (passives.length === 0) return out;
  const units = Array.isArray(ctx.units) ? ctx.units : [];

  for (const p of passives) {
    let gain = 0;
    switch (p.tag) {
      case 'flank_bonus': {
        // +N damage if actor attacks a target adjacent to at least one ally of actor.
        const hasAllyAdjacent = units.some(
          (u) =>
            u &&
            u.id !== actor.id &&
            u.controlled_by === actor.controlled_by &&
            Number(u.hp) > 0 &&
            u.position &&
            target.position &&
            Math.abs(u.position.x - target.position.x) +
              Math.abs(u.position.y - target.position.y) ===
              1,
        );
        if (hasAllyAdjacent) gain = Number(p.payload?.damage) || 0;
        break;
      }
      case 'first_strike_bonus': {
        if (ctx.isFirstStrike) gain = Number(p.payload?.damage) || 0;
        break;
      }
      case 'execution_bonus': {
        const threshold = Number(p.payload?.threshold) || 0.25;
        const hpMax = Number(target.hp_max || target.hp || 1);
        const hpNow = Number(target.hp || 0);
        if (hpMax > 0 && hpNow / hpMax < threshold) {
          gain = Number(p.payload?.damage) || 0;
        }
        break;
      }
      case 'isolated_target_bonus': {
        // Target with no allies adjacent → bonus damage.
        const hasAllyAdjacentToTarget = units.some(
          (u) =>
            u &&
            u.id !== target.id &&
            u.controlled_by === target.controlled_by &&
            Number(u.hp) > 0 &&
            u.position &&
            target.position &&
            Math.abs(u.position.x - target.position.x) +
              Math.abs(u.position.y - target.position.y) ===
              1,
        );
        if (!hasAllyAdjacentToTarget) gain = Number(p.payload?.damage) || 0;
        break;
      }
      case 'long_range_bonus': {
        const minD = Number(p.payload?.min_distance) || 3;
        if (
          actor.position &&
          target.position &&
          Math.abs(actor.position.x - target.position.x) +
            Math.abs(actor.position.y - target.position.y) >=
            minD
        ) {
          gain = Number(p.payload?.damage) || 0;
        }
        break;
      }
      default:
        break;
    }
    if (gain > 0) {
      out.bonus += gain;
      out.applied.push({ tag: p.tag, amount: gain, source_perk_id: p.source_perk_id });
    }
  }
  return out;
}

/**
 * Grant XP to all player survivors. Used by campaign advance hook.
 *
 * @param {Array<object>} units
 * @param {number} amount — XP per unit
 * @param {object} opts — { engine, store, campaignId }
 * @returns {Array<{ unit_id, amount, level_before, level_after, leveled_up }>}
 */
function grantXpToSurvivors(units, amount, opts = {}) {
  const engine = opts.engine || getDefaultEngine();
  const store = opts.store || getDefaultStore();
  const campaignId = opts.campaignId ?? null;
  const out = [];

  if (!Array.isArray(units) || !Number.isFinite(Number(amount))) return out;
  const amt = Math.max(0, Number(amount));
  if (amt <= 0) return out;

  for (const unit of units) {
    if (!unit || unit.controlled_by !== 'player' || !unit.id) continue;
    if (Number(unit.hp ?? 0) <= 0) continue; // survivors only

    let state = store.get(campaignId, unit.id);
    if (!state) {
      // Auto-seed if no progression state yet (uses unit.job).
      if (!unit.job) continue;
      state = engine.seed(unit.id, unit.job);
      state = store.set(campaignId, unit.id, state);
    }
    const result = engine.applyXp(state, amt);
    store.set(campaignId, unit.id, result.unit);
    out.push({
      unit_id: unit.id,
      amount: amt,
      level_before: result.level_before,
      level_after: result.level_after,
      leveled_up: result.leveled_up,
    });
  }
  return out;
}

module.exports = {
  applyProgressionToUnits,
  computePerkDamageBonus,
  grantXpToSurvivors,
  resetDefaults,
};
