// Sprint α (2026-04-28) — Morale check post-event.
//
// Pattern source: Battle Brothers — morale check su eventi traumatici.
// Strategy research §4 rank #11.
//
// Goal: aggiunge feedback emotivo simulato — eventi traumatici (alleato KO
// adiacente, colpo critico subito, panic count alto) triggerano morale check.
// Score < threshold → status panic (più probabile) o rage (less common
// "fight or flight" inverse).
//
// Pure module. Scoring MoS-style: roll d20 + morale_mod vs threshold.
// Caller passa event type + context (allies/enemies positions). Morale module
// non legge session direttamente.
//
// API:
//   checkMorale(unit, event, ctx)  — return { triggered, status?, duration?, score, threshold }
//   applyMoraleStatus(unit, status_type, duration) — additive a unit.status
//
// Event types:
//   'ally_killed_adjacent'  — threshold 12, panic 2 / rage 1 (raro)
//   'enemy_critical_hit'    — threshold 14, panic 2
//   'status_panic_high'     — threshold 10 (cumulative), panic 1
//
// Constants:
//   PANIC_DURATION_DEFAULT = 2
//   RAGE_DURATION_DEFAULT = 1

'use strict';

const PANIC_DURATION_DEFAULT = 2;
const RAGE_DURATION_DEFAULT = 1;

const EVENT_THRESHOLDS = {
  ally_killed_adjacent: 12,
  enemy_critical_hit: 14,
  status_panic_high: 10,
};

const EVENT_OUTCOME_PROFILE = {
  ally_killed_adjacent: { primary: 'panic', rage_inversion: true },
  enemy_critical_hit: { primary: 'panic', rage_inversion: false },
  status_panic_high: { primary: 'panic', rage_inversion: false },
};

/**
 * Apply status to unit (additive max with existing duration).
 *
 * @param {object} unit
 * @param {string} statusType — 'panic' | 'rage' | etc
 * @param {number} duration
 * @returns {number} — nuovo valore (max(existing, duration))
 */
function applyMoraleStatus(unit, statusType, duration) {
  if (!unit || typeof unit !== 'object') return 0;
  if (!statusType) return 0;
  if (!unit.status || typeof unit.status !== 'object') unit.status = {};
  const cur = Number(unit.status[statusType] || 0);
  const dur = Math.max(0, Number(duration || 0));
  unit.status[statusType] = Math.max(cur, dur);
  return unit.status[statusType];
}

/**
 * Roll morale check. d20 + morale_mod vs event threshold.
 * Score < threshold → trigger.
 *
 * Trigger logic:
 *  - rage_inversion=true + roll === 1 (fumble) → rage (fight response)
 *  - else primary status (default panic)
 *
 * @param {object} unit — deve avere `status` + opzionale `morale_mod` numero
 * @param {string} eventType — uno degli EVENT_THRESHOLDS keys
 * @param {object} [ctx={}] — { rng?: () => number 0..1, status_panic_count?: number }
 * @returns {{ triggered: boolean, status?: string, duration?: number, score: number, threshold: number, event: string }}
 */
function checkMorale(unit, eventType, ctx = {}) {
  if (!unit || typeof unit !== 'object') {
    return { triggered: false, score: 0, threshold: 0, event: eventType || '' };
  }
  if (!eventType || !(eventType in EVENT_THRESHOLDS)) {
    return { triggered: false, score: 0, threshold: 0, event: String(eventType || '') };
  }
  const threshold = EVENT_THRESHOLDS[eventType];
  const profile = EVENT_OUTCOME_PROFILE[eventType] || { primary: 'panic', rage_inversion: false };

  // Roll d20.
  const rng = typeof ctx.rng === 'function' ? ctx.rng : Math.random;
  const die = Math.floor(rng() * 20) + 1; // 1..20
  const moraleMod = Number(unit.morale_mod || 0);
  const score = die + moraleMod;
  const triggered = score < threshold;

  if (!triggered) {
    return { triggered: false, score, threshold, event: eventType };
  }

  // Status decision: rage_inversion + die === 1 → rage (fight response)
  let statusType = profile.primary;
  let duration = PANIC_DURATION_DEFAULT;
  if (profile.rage_inversion && die === 1) {
    statusType = 'rage';
    duration = RAGE_DURATION_DEFAULT;
  }

  applyMoraleStatus(unit, statusType, duration);

  return {
    triggered: true,
    status: statusType,
    duration,
    score,
    threshold,
    event: eventType,
  };
}

module.exports = {
  checkMorale,
  applyMoraleStatus,
  EVENT_THRESHOLDS,
  EVENT_OUTCOME_PROFILE,
  PANIC_DURATION_DEFAULT,
  RAGE_DURATION_DEFAULT,
};
