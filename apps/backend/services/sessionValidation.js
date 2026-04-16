// B2 pattern: centralized session action validation + stateID.
//
// Estrae la validazione scattered da session.js in un singolo guard.
// Ogni azione passa per validateAction() prima della mutazione.
// stateID fornisce optimistic concurrency — rifiuta azioni stale.
//
// Vedi docs/planning/tactical-architecture-patterns.md §B2

'use strict';

const { PHASE_PLANNING, PHASE_COMMITTED, PHASE_RESOLVING } = require('./roundOrchestrator');

/**
 * Tipi azione permessi per fase round.
 * null = permesso in qualunque fase (o senza round model).
 */
const PHASE_ALLOWED_ACTIONS = {
  [PHASE_PLANNING]: new Set(['declare_intent', 'clear_intent', 'declare_reaction']),
  [PHASE_COMMITTED]: new Set([]),
  [PHASE_RESOLVING]: new Set(['resolve_next']),
};

/**
 * Valida un'azione prima di mutare lo stato sessione.
 *
 * @param {object} session — stato sessione corrente
 * @param {object} action — azione proposta { type, actor_id, stateId?, ... }
 * @returns {{ valid: boolean, error?: string }}
 */
function validateAction(session, action) {
  if (!session) {
    return { valid: false, error: 'session_not_found' };
  }
  if (session.ended) {
    return { valid: false, error: 'session_ended' };
  }
  if (!action || !action.type) {
    return { valid: false, error: 'missing_action_type' };
  }

  // stateID optimistic lock: se il client invia un stateId, deve matchare
  if (
    action.stateId !== undefined &&
    session._stateId !== undefined &&
    action.stateId !== session._stateId
  ) {
    return {
      valid: false,
      error: 'stale_state',
      detail: `client stateId=${action.stateId}, server stateId=${session._stateId}`,
    };
  }

  // Phase-based action filtering (round model)
  const phase = session.roundState && session.roundState.round_phase;
  if (phase && PHASE_ALLOWED_ACTIONS[phase]) {
    const allowed = PHASE_ALLOWED_ACTIONS[phase];
    if (allowed.size > 0 && !allowed.has(action.type)) {
      return {
        valid: false,
        error: 'action_not_allowed_in_phase',
        detail: `action '${action.type}' not allowed in phase '${phase}'`,
      };
    }
  }

  // Actor alive check
  if (action.actor_id) {
    const actor = (session.units || []).find((u) => u.id === action.actor_id);
    if (!actor) {
      return { valid: false, error: 'actor_not_found' };
    }
    if (actor.hp <= 0) {
      return { valid: false, error: 'actor_dead' };
    }
  }

  return { valid: true };
}

/**
 * Incrementa stateId della sessione dopo una mutazione riuscita.
 * Chiamare dopo ogni appendEvent o state change.
 */
function bumpStateId(session) {
  session._stateId = (session._stateId || 0) + 1;
  return session._stateId;
}

module.exports = {
  validateAction,
  bumpStateId,
  PHASE_ALLOWED_ACTIONS,
};
