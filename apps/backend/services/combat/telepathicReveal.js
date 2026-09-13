// apps/backend/services/combat/telepathicReveal.js
//
// Telepatic-link real intent-reveal pipe (2026-04-25 audit follow-up to
// PR #1822 status engine extension + PR #1811 magnetic_rift_resonance).
//
// Design intent: when a player-side actor has `status.telepatic_link > 0`,
// the player gains foresight on enemy intents within `range` hex. This
// turns the trait `magnetic_rift_resonance` (and any future trait that
// applies `telepatic_link`) from a log marker (status only) into an
// actionable reveal driving planning-phase decisions.
//
// Output shape (per actor with active link):
//   {
//     actor_id: 'p_scout',
//     revealed: [
//       { enemy_id: 'e_nomad_1', intent_type: 'attack',
//         target_id: 'p_tank', distance: 2 },
//       ...
//     ],
//   }
//
// Skips:
//   • actor sin telepatic_link <= 0
//   • actor KO (hp <= 0)
//   • enemy KO
//   • enemy out of range
//   • no roundState.pending_intents (declare phase not started)
//
// Pure function. No side effects, no mutation. Lazy-safe consumers can
// try/catch around the call without breaking core flow.

'use strict';

const DEFAULT_RANGE = 3;

function manhattanDistance(a, b) {
  if (!a || !b) return Infinity;
  const dx = Number(a.x) - Number(b.x);
  const dy = Number(a.y) - Number(b.y);
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return Infinity;
  return Math.abs(dx) + Math.abs(dy);
}

function _unitById(units, id) {
  if (!Array.isArray(units) || !id) return null;
  return units.find((u) => u && u.id === id) || null;
}

function _isPositive(v) {
  return Number(v) > 0;
}

/**
 * Compute telepathic reveal payload for all actors with active
 * `telepatic_link` status.
 *
 * @param {object} session — `{ units, roundState: { pending_intents } }`
 * @param {object} [opts]
 * @param {number} [opts.range=3] — manhattan range in hex
 * @returns {Array<{actor_id, revealed: Array<{enemy_id, intent_type, target_id, distance}>}>}
 */
function computeTelepathicReveal(session, opts = {}) {
  if (!session || !Array.isArray(session.units) || session.units.length === 0) {
    return [];
  }
  const range = Number.isFinite(Number(opts.range)) ? Number(opts.range) : DEFAULT_RANGE;
  const roundState = session.roundState;
  if (!roundState) return [];
  const pending = Array.isArray(roundState.pending_intents) ? roundState.pending_intents : [];
  if (pending.length === 0) return [];

  const out = [];
  for (const actor of session.units) {
    if (!actor || !actor.id) continue;
    if (Number(actor.hp || 0) <= 0) continue;
    const status = actor.status || {};
    if (!_isPositive(status.telepatic_link)) continue;

    const revealed = [];
    for (const intent of pending) {
      if (!intent || !intent.unit_id) continue;
      const enemy = _unitById(session.units, intent.unit_id);
      if (!enemy) continue;
      if (Number(enemy.hp || 0) <= 0) continue;
      // Only reveal intents from units on opposite faction.
      if (
        enemy.controlled_by &&
        actor.controlled_by &&
        enemy.controlled_by === actor.controlled_by
      ) {
        continue;
      }
      const distance = manhattanDistance(actor.position, enemy.position);
      if (!Number.isFinite(distance) || distance > range) continue;

      const action = intent.action || {};
      revealed.push({
        enemy_id: enemy.id,
        intent_type: action.type || 'unknown',
        target_id: action.target_id || null,
        distance,
      });
    }

    if (revealed.length > 0) {
      out.push({ actor_id: actor.id, revealed });
    }
  }
  return out;
}

module.exports = {
  computeTelepathicReveal,
  DEFAULT_RANGE,
  // exported for tests
  manhattanDistance,
};
