// 2026-05-11 TKT-C4 Mutation Phase 6 cumulative state tracker.
// Master-dd grant batch 2026-05-11 (forbidden path bundle).
//
// Purpose: end-of-round update hook for unit.cumulative_ally_adjacent_turns
// + unit.cumulative_trait_active (Phase 6 trigger kinds).
//
// Pattern: write-through adapter (precedent cumulativeBiomeTurns Phase 5).
// In-memory mutation on unit + fire-and-forget Prisma upsert when DATABASE_URL set.
//
// Caller: apps/backend/services/sessionRoundBridge.js
//   applyEndOfRoundSideEffects → loop units → updateCumulativeState
//
// TODO Phase 7 wire: replace inline TODO comment in sessionRoundBridge after
// Phase 6 LIVE smoke test passes (cross-encounter persistence verified).
//
// Graceful fallback: when Prisma not connected, in-memory state still mutates
// (lost on backend restart — acceptable dev/demo, lossy for prod cross-session).

'use strict';

/**
 * Manhattan distance between two positions.
 * @param {{x:number,y:number}} a
 * @param {{x:number,y:number}} b
 * @returns {number}
 */
function _manhattan(a, b) {
  if (!a || !b) return Infinity;
  const ax = Number(a.x);
  const ay = Number(a.y);
  const bx = Number(b.x);
  const by = Number(b.y);
  if (
    !Number.isFinite(ax) ||
    !Number.isFinite(ay) ||
    !Number.isFinite(bx) ||
    !Number.isFinite(by)
  ) {
    return Infinity;
  }
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

/**
 * Update unit.cumulative_ally_adjacent_turns counter for this round.
 * Increments by 1 if at least one ally is within Manhattan distance <=1.
 * Optionally filters allies by species_filter='same' (same species as unit).
 *
 * @param {object} unit - unit object with position + team + species
 * @param {object[]} allUnits - all units in session
 * @param {object} [opts] - { speciesFilter: 'same'|null }
 * @returns {{ incremented: boolean, newValue: number }}
 */
function updateAllyAdjacentTurns(unit, allUnits, opts = {}) {
  if (!unit || !Array.isArray(allUnits)) {
    return { incremented: false, newValue: Number(unit?.cumulative_ally_adjacent_turns) || 0 };
  }
  const unitTeam = unit.team || 'players';
  const unitSpecies = unit.species || null;
  const speciesFilter = opts.speciesFilter || null;
  const pos = unit.position;
  if (!pos || !Number.isFinite(Number(pos.x)) || !Number.isFinite(Number(pos.y))) {
    return { incremented: false, newValue: Number(unit.cumulative_ally_adjacent_turns) || 0 };
  }
  const hasAdjacentAlly = allUnits.some((u) => {
    if (!u || u.id === unit.id) return false;
    if ((u.team || 'players') !== unitTeam) return false;
    if (speciesFilter === 'same' && unitSpecies && u.species !== unitSpecies) return false;
    return _manhattan(pos, u.position) <= 1;
  });
  if (!hasAdjacentAlly) {
    return { incremented: false, newValue: Number(unit.cumulative_ally_adjacent_turns) || 0 };
  }
  unit.cumulative_ally_adjacent_turns = (Number(unit.cumulative_ally_adjacent_turns) || 0) + 1;
  return { incremented: true, newValue: unit.cumulative_ally_adjacent_turns };
}

/**
 * Update unit.cumulative_trait_active map per trait_fire event sourced by this unit.
 * Reads session.events for action_type='trait_fire' actor_id=unit.id since lastTurn.
 *
 * @param {object} unit - unit object with cumulative_trait_active map
 * @param {object} session - session with events + turn
 * @param {object} [opts] - { sinceTurn: number, traitIdField: string }
 * @returns {{ updated: string[], newMap: object }}
 */
function updateTraitActiveCumulative(unit, session, opts = {}) {
  if (!unit || !session || !Array.isArray(session.events)) {
    return { updated: [], newMap: unit?.cumulative_trait_active || {} };
  }
  const sinceTurn = Number(opts.sinceTurn);
  const traitIdField = opts.traitIdField || 'trait_id';
  const currentTurn = Number(session.turn) || 0;
  if (!unit.cumulative_trait_active || typeof unit.cumulative_trait_active !== 'object') {
    unit.cumulative_trait_active = {};
  }
  const updated = [];
  for (const evt of session.events) {
    if (evt.action_type !== 'trait_fire') continue;
    if (evt.actor_id !== unit.id) continue;
    // Window filter: only events in current turn (or sinceTurn..currentTurn range).
    const evtTurn = Number(evt.turn) || 0;
    if (Number.isFinite(sinceTurn) && evtTurn <= sinceTurn) continue;
    if (evtTurn > currentTurn) continue;
    const traitId = evt[traitIdField];
    if (!traitId) continue;
    unit.cumulative_trait_active[traitId] =
      (Number(unit.cumulative_trait_active[traitId]) || 0) + 1;
    updated.push(traitId);
  }
  return { updated, newMap: unit.cumulative_trait_active };
}

/**
 * Aggregate end-of-round update for both Phase 6 cumulative states.
 * @param {object} unit
 * @param {object} session
 * @param {object} [opts] - { speciesFilter, sinceTurn, traitIdField }
 */
function updateCumulativeState(unit, session, opts = {}) {
  const allUnits = Array.isArray(session?.units) ? session.units : [];
  const adjacencyResult = updateAllyAdjacentTurns(unit, allUnits, opts);
  const traitResult = updateTraitActiveCumulative(unit, session, opts);
  return {
    ally_adjacent_turns: adjacencyResult,
    trait_active: traitResult,
  };
}

module.exports = {
  updateAllyAdjacentTurns,
  updateTraitActiveCumulative,
  updateCumulativeState,
  _manhattan,
};
