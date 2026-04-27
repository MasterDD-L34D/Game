// Skiv Goal 1 (2026-04-28) — wounded_perma persistent scar.
//
// Pure module mirror sgTracker (apps/backend/services/combat/sgTracker.js).
// Cross-encounter persistence via opaque session map:
// `session.lastMissionWoundedPerma = { [unit_id]: { hp_penalty: int, applied_at: iso } }`.
//
// Lifecycle:
//   1. encounter ends with player_wipe (loss_conditions.player_wipe=true)
//      → applyWound(unit, sessionMap) on every KO'd player unit
//   2. encounter starts → restoreOnEncounterStart(unit, sessionMap) re-applies
//      HP penalty from prior session map, idempotent (skip if already applied).
//   3. session ends → clearSession(sessionMap) wipes all entries (durata sessione,
//      handoff §4 D-skiv-2 default).
//
// API:
//   initSessionMap()                           → empty map object
//   applyWound(unit, sessionMap, opts?)        → { applied: bool, hp_penalty, prior_max_hp }
//   restoreOnEncounterStart(unit, sessionMap)  → { restored: bool, hp_penalty }
//   getActorState(unit, sessionMap)            → { wounded: bool, hp_penalty }
//   clearSession(sessionMap)                   → number of entries cleared
//
// Constants:
//   DEFAULT_HP_PENALTY = 1
//   MAX_STACKS = 3 (cap cumulative hp_penalty per unit, evita death-spiral
//                   se Skiv perde più encounter solo consecutivi)

'use strict';

const DEFAULT_HP_PENALTY = 1;
const MAX_STACKS = 3;

/**
 * Initialize an empty session map. Idempotent: returns input map if already
 * an object. Caller stores this on session.lastMissionWoundedPerma.
 *
 * @returns {object} empty map { [unit_id]: { hp_penalty, applied_at } }
 */
function initSessionMap() {
  return {};
}

/**
 * Apply wounded_perma scar to unit on player_wipe KO event.
 * Cumulative across encounters via MAX_STACKS cap.
 *
 * Mutations:
 *   - unit.max_hp -= hp_penalty (floor 1)
 *   - unit.hp = Math.min(unit.hp, unit.max_hp) (clamp current)
 *   - unit.status.wounded_perma = { hp_penalty, stacks } (additive)
 *   - sessionMap[unit.id] = { hp_penalty, applied_at, stacks }
 *
 * @param {object} unit — mutated in-place; must have id + max_hp
 * @param {object} sessionMap — mutated in-place
 * @param {object} [opts]
 * @param {number} [opts.hp_penalty=1] — penalty per application
 * @returns {{ applied: boolean, hp_penalty: number, prior_max_hp: number, stacks: number }}
 */
function applyWound(unit, sessionMap, opts = {}) {
  if (!unit || typeof unit !== 'object' || !unit.id) {
    return { applied: false, hp_penalty: 0, prior_max_hp: 0, stacks: 0 };
  }
  if (!sessionMap || typeof sessionMap !== 'object') {
    return { applied: false, hp_penalty: 0, prior_max_hp: 0, stacks: 0 };
  }
  const requested = Math.max(1, Math.floor(Number(opts.hp_penalty) || DEFAULT_HP_PENALTY));
  const prior = sessionMap[unit.id] || { hp_penalty: 0, stacks: 0 };
  const priorStacks = Math.max(0, Math.floor(Number(prior.stacks) || 0));
  if (priorStacks >= MAX_STACKS) {
    // Cap reached: no further penalty applied, but keep marker.
    return {
      applied: false,
      hp_penalty: prior.hp_penalty || 0,
      prior_max_hp: Number(unit.max_hp || unit.hp || 0),
      stacks: priorStacks,
    };
  }
  const prior_max_hp = Number(unit.max_hp || unit.hp || 0);
  const newStacks = priorStacks + 1;
  const newPenalty = (Number(prior.hp_penalty) || 0) + requested;
  const newMax = Math.max(1, prior_max_hp - requested);
  unit.max_hp = newMax;
  if (typeof unit.hp === 'number' && unit.hp > newMax) unit.hp = newMax;
  if (!unit.status || typeof unit.status !== 'object') unit.status = {};
  unit.status.wounded_perma = { hp_penalty: newPenalty, stacks: newStacks };
  sessionMap[unit.id] = {
    hp_penalty: newPenalty,
    stacks: newStacks,
    applied_at: new Date().toISOString(),
  };
  return { applied: true, hp_penalty: newPenalty, prior_max_hp, stacks: newStacks };
}

/**
 * Re-apply HP penalty on encounter start if unit has prior wound entry.
 * Idempotent: if unit.status.wounded_perma already matches sessionMap entry,
 * no-op (avoid double penalty).
 *
 * @param {object} unit — mutated in-place
 * @param {object} sessionMap
 * @returns {{ restored: boolean, hp_penalty: number, stacks: number }}
 */
function restoreOnEncounterStart(unit, sessionMap) {
  if (!unit || typeof unit !== 'object' || !unit.id) {
    return { restored: false, hp_penalty: 0, stacks: 0 };
  }
  if (!sessionMap || typeof sessionMap !== 'object') {
    return { restored: false, hp_penalty: 0, stacks: 0 };
  }
  const entry = sessionMap[unit.id];
  if (!entry || !Number(entry.hp_penalty)) {
    return { restored: false, hp_penalty: 0, stacks: 0 };
  }
  const penalty = Math.max(0, Math.floor(Number(entry.hp_penalty) || 0));
  const stacks = Math.max(0, Math.floor(Number(entry.stacks) || 0));
  if (!unit.status || typeof unit.status !== 'object') unit.status = {};
  const existing = unit.status.wounded_perma;
  if (
    existing &&
    typeof existing === 'object' &&
    Number(existing.hp_penalty) === penalty &&
    Number(existing.stacks) === stacks
  ) {
    // Idempotent: already restored, no double penalty.
    return { restored: false, hp_penalty: penalty, stacks };
  }
  const cur_max = Number(unit.max_hp || unit.hp || 0);
  const newMax = Math.max(1, cur_max - penalty);
  unit.max_hp = newMax;
  if (typeof unit.hp === 'number' && unit.hp > newMax) unit.hp = newMax;
  unit.status.wounded_perma = { hp_penalty: penalty, stacks };
  return { restored: true, hp_penalty: penalty, stacks };
}

/**
 * Read-only state lookup. Does not mutate.
 *
 * @param {object} unit
 * @param {object} sessionMap
 * @returns {{ wounded: boolean, hp_penalty: number, stacks: number }}
 */
function getActorState(unit, sessionMap) {
  if (!unit || typeof unit !== 'object' || !unit.id) {
    return { wounded: false, hp_penalty: 0, stacks: 0 };
  }
  if (!sessionMap || typeof sessionMap !== 'object') {
    return { wounded: false, hp_penalty: 0, stacks: 0 };
  }
  const entry = sessionMap[unit.id];
  if (!entry) return { wounded: false, hp_penalty: 0, stacks: 0 };
  const penalty = Math.max(0, Math.floor(Number(entry.hp_penalty) || 0));
  const stacks = Math.max(0, Math.floor(Number(entry.stacks) || 0));
  return { wounded: penalty > 0, hp_penalty: penalty, stacks };
}

/**
 * Clear all entries (handoff §4 D-skiv-2 default: cicatrice durata sessione).
 *
 * @param {object} sessionMap — mutated in-place
 * @returns {number} number of entries cleared
 */
function clearSession(sessionMap) {
  if (!sessionMap || typeof sessionMap !== 'object') return 0;
  const keys = Object.keys(sessionMap);
  for (const k of keys) delete sessionMap[k];
  return keys.length;
}

module.exports = {
  initSessionMap,
  applyWound,
  restoreOnEncounterStart,
  getActorState,
  clearSession,
  DEFAULT_HP_PENALTY,
  MAX_STACKS,
};
