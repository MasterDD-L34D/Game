// Sprint Spore Moderate (ADR-2026-04-26 §S6) — resolver-side consumption
// di archetype passives shippati con PR #1916 (mutationEngine bingo).
//
// Pattern: applyMutationBingoToUnit hydrates `unit._archetype_passives`
// con array di passive_token strings. Questo modulo wirea i 3 token
// runtime-active nel resolver:
//
//   - archetype_tank_plus_dr1     (defender) → -1 damage (min 0)
//   - archetype_ambush_plus_init2 (actor)    → +2 initiative se crit/flank
//   - archetype_scout_plus_sight2 (actor)    → +2 attack_range / sight
//
// Deferred S6.B (biome/social-side, follow-up):
//   - archetype_adapter_plus_hazard (richiede biome hazard registry)
//   - archetype_alpha_plus_aff1     (richiede affinity passive system)
//
// Pure helpers, zero I/O. Caller passa unit + ctx.
// Back-compat: unit senza _archetype_passives = zero behavior change
// (tutti gli helper ritornano 0 / range invariato).
//
// Ref: docs/adr/ADR-2026-04-26-spore-part-pack-slots.md §S6
//      apps/backend/services/mutations/mutationEngine.js (BINGO_ARCHETYPES)

'use strict';

const TANK_PLUS_DR1 = 'archetype_tank_plus_dr1';
const AMBUSH_PLUS_INIT2 = 'archetype_ambush_plus_init2';
const SCOUT_PLUS_SIGHT2 = 'archetype_scout_plus_sight2';

/**
 * Defender-side: ritorna damage reduction da applicare al damage step.
 * Sottrae 1 al damage finale (min 0 garantito dal caller).
 *
 * @param {object} target — defender unit (può essere null/undefined)
 * @returns {number} — DR amount (0 se passive assente)
 */
function getDamageReduction(target) {
  if (!target || typeof target !== 'object') return 0;
  const passives = Array.isArray(target._archetype_passives) ? target._archetype_passives : [];
  return passives.includes(TANK_PLUS_DR1) ? 1 : 0;
}

/**
 * Actor-side: ritorna initiative bonus se actor ha ambush_plus E
 * (action.is_critical OR action.is_flank). Caller somma al sortKey/priority.
 *
 * @param {object} actor — attacker unit
 * @param {object} action — { is_critical?: boolean, is_flank?: boolean }
 * @returns {number} — init delta (0 se passive assente o trigger non match)
 */
function getInitiativeBonus(actor, action) {
  if (!actor || typeof actor !== 'object') return 0;
  const passives = Array.isArray(actor._archetype_passives) ? actor._archetype_passives : [];
  if (!passives.includes(AMBUSH_PLUS_INIT2)) return 0;
  const isCritical = !!(action && action.is_critical);
  const isFlank = !!(action && action.is_flank);
  if (!isCritical && !isFlank) return 0;
  return 2;
}

/**
 * Actor-side: ritorna sight/attack range delta se actor ha scout_plus.
 * Caller somma al `attack_range` durante targeting / range gating.
 *
 * @param {object} actor — attacker unit
 * @returns {number} — range delta (0 se passive assente, +2 altrimenti)
 */
function getSightRangeBonus(actor) {
  if (!actor || typeof actor !== 'object') return 0;
  const passives = Array.isArray(actor._archetype_passives) ? actor._archetype_passives : [];
  return passives.includes(SCOUT_PLUS_SIGHT2) ? 2 : 0;
}

/**
 * Convenience: ritorna effective attack_range = base + sight bonus.
 * @param {object} actor
 * @param {number} baseRange
 * @returns {number}
 */
function effectiveAttackRange(actor, baseRange) {
  const base = Number(baseRange);
  if (!Number.isFinite(base)) return baseRange;
  return base + getSightRangeBonus(actor);
}

/**
 * Apply DR-1 to damageDealt with min 0 floor.
 * @param {number} damageDealt
 * @param {object} target
 * @returns {{ damage: number, reduced: number }}
 */
function applyDamageReduction(damageDealt, target) {
  const dmg = Number(damageDealt) || 0;
  if (dmg <= 0) return { damage: dmg, reduced: 0 };
  const dr = getDamageReduction(target);
  if (dr <= 0) return { damage: dmg, reduced: 0 };
  const reduced = Math.min(dr, dmg);
  return { damage: Math.max(0, dmg - reduced), reduced };
}

module.exports = {
  TANK_PLUS_DR1,
  AMBUSH_PLUS_INIT2,
  SCOUT_PLUS_SIGHT2,
  getDamageReduction,
  getInitiativeBonus,
  getSightRangeBonus,
  effectiveAttackRange,
  applyDamageReduction,
};
