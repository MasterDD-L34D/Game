'use strict';
// combatAdapter (full-loop fase-0, Option B refined). Runs ONE AI-driven combat
// with a REAL injected roster (no co-op lobby): starts a session with
// units = [roster (player) + enemies (sistema)] (kill-wire mode), then drives the
// round loop reusing the shared player policy. Returns a genuine outcome + the
// roster identity so the full-loop invariants can assert the campaign roster
// actually fought (NOT a hardcoded party). `http` is injected (supertest in tests,
// fetch in production) so this stays unit-testable.

const { selectPlayerAction } = require('./combat-policy');

async function runEncounter(http, { roster, enemies, scenarioId, seed, maxRounds = 40 } = {}) {
  const rosterIds = (roster || []).map((u) => u.id);
  const startBody = {
    units: [...(roster || []), ...(enemies || [])],
    scenario_id: scenarioId,
    // /api/session/start seeds the per-session deterministic RNG from `seed`
    // (session.js:1637), NOT `run_seed` (that is the co-op WS world_confirm field).
    // Codex #2561 P2 — sending `seed` makes full-loop encounters replayable.
    ...(seed !== undefined && seed !== null && seed !== '' ? { seed } : {}),
  };
  const start = await http.post('/api/session/start', startBody);
  if (start.status !== 200 && start.status !== 201) {
    return { outcome: 'error', rounds: 0, rosterIds, survivorIds: [], error: start.body };
  }
  const sessionId = start.body.session_id || start.body.id;

  let rounds = 0;
  let outcome = 'timeout';
  let lastUnits = [];
  while (rounds < maxRounds) {
    rounds += 1;
    const st = await http.get('/api/session/state', { session_id: sessionId });
    const units = (st.body && st.body.units) || [];
    lastUnits = units;
    const players = units.filter((u) => u.controlled_by === 'player' && (u.hp ?? 0) > 0);
    const foes = units.filter((u) => u.controlled_by === 'sistema' && (u.hp ?? 0) > 0);
    if (foes.length === 0) {
      outcome = 'victory';
      break;
    }
    if (players.length === 0) {
      outcome = 'defeat';
      break;
    }

    const activeId = st.body.active_unit;
    const active = units.find((u) => u.id === activeId);
    if (!active) break;
    if (active.controlled_by === 'sistema') {
      await http.post('/api/session/turn/end', { session_id: sessionId });
      continue;
    }
    const action = selectPlayerAction(active, units);
    if (!action) {
      await http.post('/api/session/turn/end', { session_id: sessionId });
      continue;
    }
    // Codex #2561 P2 — map the policy action to the /api/session/action wire
    // protocol: a move's destination field is `position` (session.js:2310-2319),
    // while the shared policy emits it as `target_position`. attack stays as-is.
    const wire =
      action.action_type === 'move'
        ? { action_type: 'move', position: action.target_position }
        : action;
    const act = await http.post('/api/session/action', {
      session_id: sessionId,
      actor_id: active.id,
      ...wire,
    });
    // Codex #2561 P2 — if the action did not resolve (out of AP / blocked / 400),
    // end the unit's turn so the loop advances instead of polling the same state
    // forever (a move that can't complete would otherwise stick until maxRounds).
    if (!act || act.status < 200 || act.status >= 300) {
      await http.post('/api/session/turn/end', { session_id: sessionId });
    }
  }

  const survivorIds = lastUnits
    .filter((u) => u.controlled_by === 'player' && (u.hp ?? 0) > 0)
    .map((u) => u.id);
  return { outcome, rounds, rosterIds, survivorIds };
}

module.exports = { runEncounter };
