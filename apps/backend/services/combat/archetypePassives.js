// Sprint Spore Moderate (ADR-2026-04-26 §S6) — resolver-side consumption
// di archetype passives shippati con PR #1916 (mutationEngine bingo).
//
// Pattern: applyMutationBingoToUnit hydrates `unit._archetype_passives`
// con array di passive_token strings. Questo modulo wirea i 5 token
// runtime-active nel resolver (S6 100% closure 2026-04-27, Path A):
//
//   - archetype_tank_plus_dr1       (defender) → -1 damage (min 0)
//   - archetype_ambush_plus_init2   (actor)    → +2 initiative se crit/flank
//   - archetype_scout_plus_sight2   (actor)    → +2 attack_range / sight
//   - archetype_adapter_plus_hazard (defender) → immune (dmg=0) da hazard tile
//   - archetype_alpha_plus_aff1     (actor)    → +1 affinity grant per
//                                                alleato adiacente (manhattan=1)
//
// Pure helpers, zero I/O. Caller passa unit + ctx.
// Back-compat: unit senza _archetype_passives = zero behavior change
// (tutti gli helper ritornano 0 / range invariato / damage invariato).
//
// Ref: docs/adr/ADR-2026-04-26-spore-part-pack-slots.md §S6
//      apps/backend/services/mutations/mutationEngine.js (BINGO_ARCHETYPES)

'use strict';

const TANK_PLUS_DR1 = 'archetype_tank_plus_dr1';
const AMBUSH_PLUS_INIT2 = 'archetype_ambush_plus_init2';
const SCOUT_PLUS_SIGHT2 = 'archetype_scout_plus_sight2';
const ADAPTER_PLUS_HAZARD = 'archetype_adapter_plus_hazard';
const ALPHA_PLUS_AFF1 = 'archetype_alpha_plus_aff1';

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

// ─── adapter_plus hazard immunity ──────────────────────────────
//
// Defender-side: ritorna true se target ha adapter_plus passive.
// Caller (hazard tile damage step) verifica context tag `damage_source ===
// 'hazard_tile'` PRIMA di chiamare. Immunità SOLO per hazard tile damage,
// altri damage (attacchi, bleeding, status) NON sono affected.
//
// ADR §S6: "Immune a un hazard biome-locked (chosen at apply-time)".
// Implementazione corrente: immunità a TUTTI gli hazard tile (chosen-at-apply
// granular gating sarà follow-up M-future quando hazard registry esiste).
//
// @param {object} target — defender unit
// @returns {boolean} — true se passive attivo
function hasHazardImmunity(target) {
  if (!target || typeof target !== 'object') return false;
  const passives = Array.isArray(target._archetype_passives) ? target._archetype_passives : [];
  return passives.includes(ADAPTER_PLUS_HAZARD);
}

/**
 * Apply hazard immunity al damage step. Ritorna 0 se target ha adapter_plus,
 * altrimenti damage invariato. Caller (hazard loop) usa per gating dmg.
 *
 * @param {number} damageDealt — hazard damage proposto
 * @param {object} target — defender unit
 * @returns {{ damage: number, immune: boolean }}
 */
function applyHazardImmunity(damageDealt, target) {
  const dmg = Number(damageDealt) || 0;
  if (dmg <= 0) return { damage: dmg, immune: false };
  if (hasHazardImmunity(target)) return { damage: 0, immune: true };
  return { damage: dmg, immune: false };
}

// ─── alpha_plus affinity grant ─────────────────────────────────
//
// Actor-side: ritorna numero di alleati adiacenti (manhattan == 1, stesso
// `controlled_by`, ancora vivi). Wired a fine round: caller scrive
// `actor.alpha_aff_grant_last = N` e/o pipe a meta NPG layer.
//
// @param {object} actor — unit con alpha_plus passive
// @param {Array<object>} units — tutti gli units sessione (incluso actor)
// @returns {number} — count alleati adiacenti (0 se passive assente o no allies)
function countAdjacentAllies(actor, units) {
  if (!actor || typeof actor !== 'object') return 0;
  if (!Array.isArray(units)) return 0;
  const passives = Array.isArray(actor._archetype_passives) ? actor._archetype_passives : [];
  if (!passives.includes(ALPHA_PLUS_AFF1)) return 0;
  const ax = Number(actor.position?.x);
  const ay = Number(actor.position?.y);
  if (!Number.isFinite(ax) || !Number.isFinite(ay)) return 0;
  const team = actor.controlled_by;
  if (!team) return 0;
  let count = 0;
  for (const u of units) {
    if (!u || u === actor) continue;
    if (u.id === actor.id) continue;
    if (Number(u.hp || 0) <= 0) continue;
    if (u.controlled_by !== team) continue;
    const ux = Number(u.position?.x);
    const uy = Number(u.position?.y);
    if (!Number.isFinite(ux) || !Number.isFinite(uy)) continue;
    const dist = Math.abs(ax - ux) + Math.abs(ay - uy);
    if (dist === 1) count += 1;
  }
  return count;
}

/**
 * Compute alpha affinity grant per actor: 1 affinity per alleato adiacente.
 * @param {object} actor
 * @param {Array<object>} units
 * @returns {number} — affinity grant amount (= count adiacenti)
 */
function computeAlphaAffinityGrant(actor, units) {
  return countAdjacentAllies(actor, units);
}

module.exports = {
  TANK_PLUS_DR1,
  AMBUSH_PLUS_INIT2,
  SCOUT_PLUS_SIGHT2,
  ADAPTER_PLUS_HAZARD,
  ALPHA_PLUS_AFF1,
  getDamageReduction,
  getInitiativeBonus,
  getSightRangeBonus,
  effectiveAttackRange,
  applyDamageReduction,
  hasHazardImmunity,
  applyHazardImmunity,
  countAdjacentAllies,
  computeAlphaAffinityGrant,
};
