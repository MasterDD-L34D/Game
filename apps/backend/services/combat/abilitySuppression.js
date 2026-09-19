// apps/backend/services/combat/abilitySuppression.js
//
// inibito ability-suppression (creature-trait mechanics slice 1).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//       (Ability suppression prereq -- status `inibito`).
//
// Disables ONLY a unit's ACTIVE abilities (action_type=ability). Movement, basic
// attacks, reactions (reflex), and passive trait bonuses still work -> legible
// (XCOM Disruptive Field / D&D Antimagic Field, duration-gated, not total silence).
// The status rides the existing integer-countdown pipeline (apply_status writes
// unit.status.inibito, round-model sync decays it 1/round) -- no new decay code.
//
// Pure leaf module: reads both live status shapes the combat code uses
//   - object-map  unit.status = { inibito: N }
//   - array       unit.statuses = [{ id: 'inibito', remaining_turns: N }]
//   - array-of-strings  unit.status = ['inibito', ...]

'use strict';

const INIBITO_STATUS = 'inibito';

/**
 * True when the unit carries a live `inibito` status (any of the shapes above).
 * @param {object} unit
 * @returns {boolean}
 */
function isAbilityInhibited(unit) {
  if (!unit || typeof unit !== 'object') return false;
  const st = unit.status;
  // object-map shape
  if (st && !Array.isArray(st) && typeof st === 'object' && Number(st[INIBITO_STATUS]) > 0) {
    return true;
  }
  // array shapes (unit.statuses array, or legacy unit.status array)
  const arr = Array.isArray(unit.statuses) ? unit.statuses : Array.isArray(st) ? st : null;
  if (arr) {
    for (const s of arr) {
      if (!s) continue;
      if (typeof s === 'string') {
        if (s === INIBITO_STATUS) return true;
        continue;
      }
      if (s.id === INIBITO_STATUS && Number(s.remaining_turns ?? 1) > 0) return true;
    }
  }
  return false;
}

module.exports = { isAbilityInhibited, INIBITO_STATUS };
