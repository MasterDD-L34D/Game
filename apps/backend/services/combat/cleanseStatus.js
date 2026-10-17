// apps/backend/services/combat/cleanseStatus.js
//
// cleanse_status core (creature-trait mechanics -- filtri_bioattivi ACTIVE mode).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//
// Removes the TRANSIENT negative combat statuses from a unit's object-map (and their
// severity companions). Used by the filtri active ability (executeCleanseStatus in
// abilityExecutor: 1 AP, 2-round cd, target an adjacent ally).
//
// Scope (design call -- flagged for master-dd): only transient debuffs are cleansed.
// Durable/structural states (wounds, wounded_perma, the nuclei weak-point states) are
// NOT cleansed -- those are healed via the Nido ritual (SPEC-J), not a 1-AP filter.
// Positive statuses (attuned/healing/coordinamento/...) are obviously untouched.

'use strict';

// Transient negative combat statuses the bio-filter clears. Severity companion keys
// (bleeding_severity / fracture_severity) are cleared alongside their status.
const NEGATIVE_STATUSES = new Set([
  'bleeding',
  'fracture',
  'panic',
  'confused',
  'sbilanciato',
  'abbagliato',
  'inibito',
  'slowed',
  'chilled',
  'disorient',
]);

const SEVERITY_KEYS = { bleeding: 'bleeding_severity', fracture: 'fracture_severity' };

/**
 * Remove every active transient negative status from the unit (mutates unit.status).
 * Returns the list of status names that were cleansed.
 *
 * @param {object} unit (mutated)
 * @returns {string[]} the cleansed status names
 */
function cleanseNegativeStatuses(unit) {
  const status = unit && unit.status;
  if (!status || typeof status !== 'object' || Array.isArray(status)) return [];
  const cleansed = [];
  for (const name of NEGATIVE_STATUSES) {
    if (Number(status[name]) > 0) {
      delete status[name];
      const sev = SEVERITY_KEYS[name];
      if (sev) delete status[sev];
      if (unit.status_intensity) delete unit.status_intensity[name];
      cleansed.push(name);
    }
  }
  return cleansed;
}

module.exports = {
  cleanseNegativeStatuses,
  NEGATIVE_STATUSES,
  SEVERITY_KEYS,
};
