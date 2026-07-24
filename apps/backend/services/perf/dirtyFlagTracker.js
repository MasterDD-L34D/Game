// Dirty Flag Tracker — Sprint γ Tech Baseline (2026-04-28).
//
// Pattern: Frostpunk (research §5 strategy-games-tech-extraction).
// Per-unit dirty-field marker per evitare recompute non necessario di sistemi
// derivati (trait effects, stat aggregates, AI scoring caches).
//
// Pure module. Mutates unit._dirty_fields in-place. Idempotent.
//
// API:
//   markDirty(unit, fieldName)   — set unit._dirty_fields[fieldName] = true
//   clearDirty(unit, fieldName)  — clean
//   isDirty(unit, fieldName)     — check
//   markAllDirty(unit)           — bulk invalidation (encounter start)
//   clearAll(unit)               — bulk clean (post-recompute commit)
//
// Naming convention fieldName:
//   "traits"        — trait effect cache
//   "stats"         — stat aggregate (HP/AP/mod) cache
//   "ai_score"      — AI utility brain score cache
//   "abilities"     — ability cooldown / availability cache
//   "vc"            — VC scoring snapshot cache

'use strict';

function _ensureMap(unit) {
  if (!unit || typeof unit !== 'object') return null;
  if (!unit._dirty_fields || typeof unit._dirty_fields !== 'object') {
    unit._dirty_fields = {};
  }
  return unit._dirty_fields;
}

/**
 * Mark a specific field dirty on the unit.
 *
 * @param {object} unit — mutated in-place
 * @param {string} fieldName
 * @returns {boolean} true if marked, false if invalid input
 */
function markDirty(unit, fieldName) {
  const map = _ensureMap(unit);
  if (!map || typeof fieldName !== 'string' || !fieldName) return false;
  map[fieldName] = true;
  return true;
}

/**
 * Clear a specific field dirty flag.
 */
function clearDirty(unit, fieldName) {
  const map = _ensureMap(unit);
  if (!map || typeof fieldName !== 'string' || !fieldName) return false;
  if (fieldName in map) delete map[fieldName];
  return true;
}

/**
 * Check if a field is dirty (default: true se field never tracked,
 * conservative invalidation = recompute by default).
 *
 * @param {object} unit
 * @param {string} fieldName
 * @returns {boolean}
 */
function isDirty(unit, fieldName) {
  const map = _ensureMap(unit);
  if (!map || typeof fieldName !== 'string' || !fieldName) return true;
  // Conservative default: se non tracciato → dirty (forza primo recompute)
  if (!(fieldName in map)) return true;
  return !!map[fieldName];
}

/**
 * Bulk mark dirty (encounter start, full recompute).
 */
function markAllDirty(unit) {
  const map = _ensureMap(unit);
  if (!map) return false;
  const known = ['traits', 'stats', 'ai_score', 'abilities', 'vc'];
  for (const f of known) map[f] = true;
  return true;
}

/**
 * Mark fieldName explicitly clean (post-recompute commit).
 * Different from clearDirty: explicit "false" entry, prevents conservative default.
 */
function commitClean(unit, fieldName) {
  const map = _ensureMap(unit);
  if (!map || typeof fieldName !== 'string' || !fieldName) return false;
  map[fieldName] = false;
  return true;
}

/**
 * Bulk clear all flags (rare — usually use commitClean per field).
 */
function clearAll(unit) {
  const map = _ensureMap(unit);
  if (!map) return false;
  for (const k of Object.keys(map)) delete map[k];
  return true;
}

module.exports = {
  markDirty,
  clearDirty,
  isDirty,
  markAllDirty,
  commitClean,
  clearAll,
};
