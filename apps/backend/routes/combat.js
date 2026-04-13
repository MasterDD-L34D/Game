const express = require('express');
const crypto = require('node:crypto');

// ---------------------------------------------------------------------------
// In-memory session store (stub — will be replaced by Python worker bridge)
// ---------------------------------------------------------------------------
// The real implementation will follow the Node↔Python bridge protocol used by
// services/generation/worker.py: JSON-line messages over stdin/stdout with
// actions like "start-combat", "resolve-action", "end-combat".  The pool is
// configured in config/orchestrator.json (poolSize, requestTimeoutMs, etc.).
// For now, every response is synthesised from realistic mock data so the
// frontend team can build against the API shape immediately.
// ---------------------------------------------------------------------------

const sessions = new Map();

// -- helpers ----------------------------------------------------------------

function generateSessionId() {
  return `combat-${crypto.randomBytes(6).toString('hex')}`;
}

function buildMinimalUnit(overrides = {}) {
  return {
    id: 'party-alpha',
    species_id: 'anguis_magnetica',
    side: 'party',
    tier: 3,
    hp: { current: 18, max: 18 },
    ap: { current: 2, max: 2 },
    armor: 4,
    initiative: 12,
    stress: 0,
    statuses: [],
    resistances: [],
    trait_ids: ['integumento_bipolare'],
    pt: 0,
    reactions: { current: 1, max: 1 },
    ...overrides,
  };
}

function buildInitialState(sessionId, body) {
  const seed = body.seed || 'default';
  const partyUnit = buildMinimalUnit();
  const hostileUnit = buildMinimalUnit({
    id: 'hostile-01',
    species_id: 'aetherloom_stalker',
    side: 'hostile',
    initiative: 9,
  });
  return {
    session_id: sessionId,
    seed: String(seed),
    encounter_id: body.encounter_path || null,
    turn: 1,
    initiative_order: [partyUnit.id, hostileUnit.id],
    active_unit_id: partyUnit.id,
    units: [partyUnit, hostileUnit],
    vc: null,
    log: [],
  };
}

function buildTurnLogEntry(action, turn) {
  return {
    turn,
    action: {
      id: `act-${String(turn).padStart(3, '0')}`,
      type: action.type || 'attack',
      actor_id: action.actor_id || 'party-alpha',
      target_id: action.target_id || 'hostile-01',
      ability_id: action.ability_id || null,
      ap_cost: action.ap_cost != null ? action.ap_cost : 1,
      channel: action.channel || null,
    },
    roll: {
      natural: 14,
      modifier: 3,
      total: 17,
      dc: 12,
      success: true,
      mos: 5,
      damage_step: 1,
      pt_gained: 1,
      is_crit: false,
      is_fumble: false,
    },
    damage_applied: 4,
    statuses_applied: [],
    statuses_expired: [],
  };
}

// -- route handlers ---------------------------------------------------------

function handleStartSession(req, res) {
  const body = req.body || {};
  const sessionId = generateSessionId();
  const initialState = buildInitialState(sessionId, body);

  sessions.set(sessionId, {
    state: initialState,
    maxRounds: body.max_rounds || 20,
    createdAt: Date.now(),
  });

  res.json({ session_id: sessionId, initial_state: initialState });
}

function handleAction(req, res) {
  const body = req.body || {};
  const { session_id, action } = body;

  if (!session_id || !sessions.has(session_id)) {
    res.status(404).json({ error: 'Sessione di combattimento non trovata' });
    return;
  }
  if (!action || typeof action !== 'object') {
    res.status(400).json({ error: "Campo 'action' richiesto" });
    return;
  }

  const session = sessions.get(session_id);
  const state = session.state;

  // Advance turn (stub: simply increment)
  state.turn += 1;

  const logEntry = buildTurnLogEntry(action, state.turn);
  state.log.push(logEntry);

  // Stub: apply mock damage to hostile unit
  const hostile = state.units.find((u) => u.side === 'hostile');
  if (hostile && logEntry.damage_applied) {
    hostile.hp.current = Math.max(0, hostile.hp.current - logEntry.damage_applied);
  }

  // Cycle active unit
  const currentIdx = state.initiative_order.indexOf(state.active_unit_id);
  const nextIdx = (currentIdx + 1) % state.initiative_order.length;
  state.active_unit_id = state.initiative_order[nextIdx];

  res.json({ next_state: state, turn_log_entry: logEntry });
}

function handleEndSession(req, res) {
  const sessionId = req.params.id;

  if (!sessionId || !sessions.has(sessionId)) {
    res.status(404).json({ error: 'Sessione di combattimento non trovata' });
    return;
  }

  const session = sessions.get(sessionId);
  const state = session.state;

  // Determine winner (stub logic: whichever side has surviving hp)
  const partyHp = state.units
    .filter((u) => u.side === 'party')
    .reduce((sum, u) => sum + u.hp.current, 0);
  const hostileHp = state.units
    .filter((u) => u.side === 'hostile')
    .reduce((sum, u) => sum + u.hp.current, 0);
  const winner = partyHp >= hostileHp ? 'party' : 'hostile';

  const result = {
    final_state: state,
    winner,
    rounds_played: state.turn,
  };

  sessions.delete(sessionId);
  res.json(result);
}

// -- router factory ---------------------------------------------------------

function createCombatRouter() {
  const router = express.Router();

  router.post('/session', handleStartSession);
  router.post('/action', handleAction);
  router.post('/session/:id/end', handleEndSession);

  return router;
}

module.exports = {
  createCombatRouter,
  // Exported for testing
  sessions,
};
