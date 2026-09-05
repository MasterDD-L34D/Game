'use strict';

// Applies / reverts Thought Cabinet passive stat deltas to a unit object.
// Pattern mirrors progressionApply.js: additive mutation in-place, guarded
// by a per-unit snapshot (`unit._thought_passive_delta`) for clean revert.
//
// Supported stats:
//   attack_mod  → unit.mod
//   defense_dc  → unit.dc  (bonus adds, cost subtracts)
//   hp_max      → unit.hp_max + unit.hp (current HP scales with max)
//   attack_range → unit.attack_range
//   ap          → unit.ap  (floored at 1)
// mov_penalty is aggregated by passiveBonuses() but has no runtime property
// yet — skipped here (YAML comment: "aggregated but not auto-applied").

function _netDeltas(bonus, cost) {
  return {
    mod: (bonus?.attack_mod || 0) - (cost?.attack_mod || 0),
    dc: (bonus?.defense_dc || 0) - (cost?.defense_dc || 0),
    hp_max: (bonus?.hp_max || 0) - (cost?.hp_max || 0),
    attack_range: (bonus?.attack_range || 0) - (cost?.attack_range || 0),
    ap: (bonus?.ap || 0) - (cost?.ap || 0),
  };
}

function _revertDelta(unit, delta) {
  if (!delta) return;
  if (delta.mod) unit.mod = Number(unit.mod || 0) - delta.mod;
  if (delta.dc) unit.dc = Number(unit.dc || 0) - delta.dc;
  if (delta.hp_max) {
    unit.hp_max = Math.max(1, Number(unit.hp_max || 0) - delta.hp_max);
    unit.hp = Math.max(1, Number(unit.hp || 0) - delta.hp_max);
  }
  if (delta.attack_range)
    unit.attack_range = Math.max(1, Number(unit.attack_range || 1) - delta.attack_range);
  if (delta.ap) unit.ap = Math.max(1, Number(unit.ap || 0) - delta.ap);
}

/**
 * Apply (or re-apply) thought passive bonuses/costs to a unit.
 * Reverts any previously applied delta first, then applies the new one.
 * Safe to call multiple times: each call is idempotent given the same inputs.
 *
 * @param {object} unit  — live session unit (mutated in-place)
 * @param {object} bonus — passiveBonuses(state).bonus
 * @param {object} cost  — passiveBonuses(state).cost
 * @returns {{ ok: boolean, delta: object }}
 */
function updateThoughtPassives(unit, bonus, cost) {
  if (!unit || typeof unit !== 'object') return { ok: false, error: 'no_unit' };
  _revertDelta(unit, unit._thought_passive_delta);
  const delta = _netDeltas(bonus, cost);
  if (delta.mod) unit.mod = Number(unit.mod || 0) + delta.mod;
  if (delta.dc) unit.dc = Number(unit.dc || 0) + delta.dc;
  if (delta.hp_max) {
    unit.hp_max = Math.max(1, Number(unit.hp_max || 0) + delta.hp_max);
    unit.hp = Math.max(1, Number(unit.hp || 0) + delta.hp_max);
  }
  if (delta.attack_range)
    unit.attack_range = Math.max(1, Number(unit.attack_range || 1) + delta.attack_range);
  if (delta.ap) unit.ap = Math.max(1, Number(unit.ap || 0) + delta.ap);
  unit._thought_passive_delta = delta;
  return { ok: true, delta };
}

module.exports = { updateThoughtPassives };
