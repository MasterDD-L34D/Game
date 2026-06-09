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
    // OA2 (#2662 regression fix): /api/session/start loads the encounter -- and thus its
    // objective (session.encounter, read by GET /:id/objective) -- from `encounter_id`, NOT
    // `scenario_id` (that is telemetry-only). Without it session.encounter is null, the
    // objective evaluation is null, pollObjective never fires, and a NON-elimination encounter
    // (survival/capture/sabotage) can only win by elimination -> a real roster times out.
    ...(scenarioId ? { encounter_id: scenarioId } : {}),
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
  // OA2 (SPEC-O): fetch the objective ONCE -- config drives the policy. Only a
  // NON-elimination objective polls the live evaluation in-loop; elimination keeps the
  // alive-count outcome, so the common full-loop path adds ZERO per-round /objective
  // calls (no evaluator churn -> no flake / no determinism break, Codex #2561).
  let objective = null;
  let pollObjective = false;
  try {
    const ob = (await http.get(`/api/session/${sessionId}/objective`)).body;
    if (ob && ob.objective) {
      objective = ob.objective;
      pollObjective = !!(objective.type && objective.type !== 'elimination');
    }
  } catch {
    /* objective optional -> elimination fallback */
  }
  while (rounds < maxRounds) {
    rounds += 1;
    const st = await http.get('/api/session/state', { session_id: sessionId });
    const units = (st.body && st.body.units) || [];
    lastUnits = units;
    // Non-elimination objective: poll the live evaluation for the outcome.
    if (pollObjective) {
      try {
        const ev = (await http.get(`/api/session/${sessionId}/objective`)).body;
        if (ev && ev.evaluation) {
          if (ev.evaluation.completed) {
            outcome = 'victory';
            break;
          }
          if (ev.evaluation.failed) {
            outcome = 'defeat';
            break;
          }
        }
      } catch {
        /* fall back to alive-count */
      }
    }
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
    const action = selectPlayerAction(active, units, objective);
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

  // Opt 3 N=40 evidence (#2679): read the NON-destructive GET /:id/vc and lift
  // debrief_payload.per_actor[uid].personality_axes per unit (faction-tagged via
  // rosterIds). Best-effort -- a failed /vc returns [] and never blocks the
  // outcome (the session stays alive exactly as before; /vc does not finalize).
  let personalityUnits = [];
  try {
    const vc = await http.get(`/api/session/${sessionId}/vc`);
    const perActor =
      vc && vc.status === 200 && vc.body && vc.body.debrief_payload
        ? vc.body.debrief_payload.per_actor || {}
        : {};
    personalityUnits = Object.entries(perActor)
      .filter(([, entry]) => entry && typeof entry === 'object' && entry.personality_axes)
      .map(([unitId, entry]) => ({
        unit_id: unitId,
        faction: rosterIds.includes(unitId) ? 'player' : 'sistema',
        axes: entry.personality_axes,
      }));
  } catch {
    personalityUnits = [];
  }

  return { outcome, rounds, rosterIds, survivorIds, personalityUnits };
}

module.exports = { runEncounter };
