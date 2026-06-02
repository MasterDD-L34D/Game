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
    ...(seed ? { run_seed: seed } : {}),
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
    await http.post('/api/session/action', {
      session_id: sessionId,
      actor_id: active.id,
      ...action,
    });
  }

  const survivorIds = lastUnits
    .filter((u) => u.controlled_by === 'player' && (u.hp ?? 0) > 0)
    .map((u) => u.id);
  return { outcome, rounds, rosterIds, survivorIds };
}

module.exports = { runEncounter };
