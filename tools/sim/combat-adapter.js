'use strict';
// combatAdapter (full-loop fase-0, Option B refined). Runs ONE AI-driven combat
// with a REAL injected roster (no co-op lobby): starts a session with
// units = [roster (player) + enemies (sistema)] (kill-wire mode), then drives the
// round loop reusing the shared player policy. Returns a genuine outcome + the
// roster identity so the full-loop invariants can assert the campaign roster
// actually fought (NOT a hardcoded party). `http` is injected (supertest in tests,
// fetch in production) so this stays unit-testable.

const { selectPlayerAction } = require('./combat-policy');

async function runEncounter(
  http,
  {
    roster,
    enemies,
    scenarioId,
    seed,
    maxRounds = 40,
    campaignId,
    biomeId,
    endSession,
    // OD-058 D1 N=40 (issue #2531): opt-in overcharge exercise. 'greedy' = the active
    // player unit spends a full SG gauge (sg >= 3, once per turn) via POST /overcharge
    // before its action, so the probe actually exercises the verb (anti-pattern #14).
    // Absent -> byte-identical adapter behavior.
    overcharge = null,
    // OD-058 D1: optional SG seed map { unit_id: pool } threaded into /start
    // (session.js initial_sg, clamp 0..3) for the worst-case first-turn arm.
    initialSg = null,
    // SPEC-I N=40 gates: opt-in raw-event collector (action_type allowlist). The
    // state response only carries a tail-30 events window, so the adapter
    // accumulates it at every poll (+ one final sweep) and dedupes across
    // overlapping windows. Absent -> byte-identical adapter behavior.
    collectEvents = null,
    // SPEC-I ER1 proof: opt-in snapshot of the FIRST state poll's units (pre-any-
    // action = /start output only, before AI abilities pollute shared bonus
    // fields). Absent -> byte-identical adapter behavior.
    captureFirstState = false,
    // SPEC-I ER6: opt-in pressure floor. The reinforcement spawner gates its tier
    // on session.pressure (set ONLY by /start pressure_start, never updated
    // in-fight), so without it the pool never spawns and the overrun budget bonus
    // is structurally a no-op. Threads BOTH start knobs (pressure_start for the
    // spawner tier + sistema_pressure_start for the AI dial) so the scenario is
    // coherent. Absent -> byte-identical start body.
    pressureStart = null,
    // SPEC-I ER6: opt-in party modulation preset (data/core/party.yaml). The grid
    // auto-scales from the DEPLOYED count (1-4 -> 6x6), which strands authored
    // 10x10 reinforcement entry tiles off-grid; a preset (e.g. 'duo_hardcore',
    // deployed 8 -> 10x10) restores the authored board. Absent -> byte-identical.
    modulation = null,
    // Move terrain-cost substrate N=40: opt-in inline encounter terrain (see startBody).
    // The canonical pilot encounter lives in data/encounters/, NOT the encounterLoader
    // dir, so encounter_id cannot load its terrain -- the probe inlines it here. Absent
    // -> byte-identical start body.
    terrainFeatures = null,
    gridSize = null,
  } = {},
) {
  if (Array.isArray(terrainFeatures) && terrainFeatures.length && scenarioId) {
    throw new Error('combat-adapter: terrainFeatures and scenarioId are mutually exclusive');
  }
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
    // A13 N=40 evidence (SPEC-I gate): campaign_id links the session to the campaign
    // (read-side woundedStep lookup at /start, session.js:1761) and biome_id selects
    // the eco profile the wound amplifies. Absent -> byte-identical start body.
    ...(campaignId ? { campaign_id: campaignId } : {}),
    ...(biomeId ? { biome_id: biomeId } : {}),
    ...(initialSg && typeof initialSg === 'object' ? { initial_sg: initialSg } : {}),
    ...(Number.isFinite(Number(pressureStart)) && pressureStart !== null
      ? { pressure_start: Number(pressureStart), sistema_pressure_start: Number(pressureStart) }
      : {}),
    ...(modulation ? { modulation } : {}),
    // Move terrain-cost substrate N=40: inline terrain so the move-gate prices typed
    // tiles. /api/session/start carries req.body.encounter.grid.terrain_features into
    // session.grid (session.js ~2414). Absent -> byte-identical start body.
    ...(Array.isArray(terrainFeatures) && terrainFeatures.length
      ? {
          encounter: {
            grid: {
              width: Number(gridSize) || 6,
              height: Number(gridSize) || 6,
              terrain_features: terrainFeatures,
            },
          },
        }
      : {}),
  };
  const start = await http.post('/api/session/start', startBody);
  if (start.status !== 200 && start.status !== 201) {
    return { outcome: 'error', rounds: 0, rosterIds, survivorIds: [], error: start.body };
  }
  const sessionId = start.body.session_id || start.body.id;

  let rounds = 0;
  let outcome = 'timeout';
  let lastUnits = [];
  // OD-058 D1 action-economy counters (always returned, 0 when the opt is off).
  let overchargeUses = 0;
  let playerAttacks = 0;
  // A13 PA3 telegraph: /session/state exposes biome_wounded (session-static, set at
  // /start from the campaign's woundedBiomes). Captured for the wound-exposure metric.
  let biomeWounded = false;
  // SPEC-I event collector state (only when opted): dedupe key spans the raw-event
  // identity fields (reinforcement_spawn carries a unique spawned actor_id; the
  // stresswave one-shots are unique per result+turn).
  const collectSet =
    Array.isArray(collectEvents) && collectEvents.length ? new Set(collectEvents) : null;
  const collectedEvents = [];
  const seenEventKeys = new Set();
  let firstStateUnits = null;
  const sweepEvents = (body) => {
    if (!collectSet || !body || !Array.isArray(body.events)) return;
    for (const ev of body.events) {
      if (!ev || !collectSet.has(ev.action_type)) continue;
      const key = `${ev.action_type}|${ev.turn}|${ev.actor_id ?? ''}|${ev.result ?? ''}`;
      if (seenEventKeys.has(key)) continue;
      seenEventKeys.add(key);
      collectedEvents.push(ev);
    }
  };
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
    if (st.body && st.body.biome_wounded) biomeWounded = true;
    sweepEvents(st.body);
    if (captureFirstState && firstStateUnits === null) firstStateUnits = units;
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
    // OD-058 D1: greedy overcharge -- spend the full gauge before acting whenever
    // available (sg >= 3 = POOL_MAX, not already overcharged this turn). 409s are
    // not counted (the guard makes them unreachable; belt-and-braces only).
    if (
      overcharge === 'greedy' &&
      Number(active.sg || 0) >= 3 &&
      !(active.status && Number(active.status.overcharged) > 0)
    ) {
      const oc = await http.post('/api/session/overcharge', {
        session_id: sessionId,
        actor_id: active.id,
      });
      if (oc && oc.status >= 200 && oc.status < 300) overchargeUses += 1;
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
    } else if (wire.action_type === 'attack') {
      playerAttacks += 1;
    }
  }

  const survivorIds = lastUnits
    .filter((u) => u.controlled_by === 'player' && (u.hp ?? 0) > 0)
    .map((u) => u.id);

  // SPEC-I event collector: one post-loop sweep so events emitted by the final
  // commit (after the last in-loop poll) still land in the tail window.
  if (collectSet) {
    try {
      const fin = await http.get('/api/session/state', { session_id: sessionId });
      sweepEvents(fin && fin.body);
    } catch {
      /* best-effort -- the in-loop sweeps already carry the early one-shots */
    }
  }

  // Opt 3 N=40 evidence (#2679): read the NON-destructive GET /:id/vc and lift
  // debrief_payload.per_actor[uid].personality_axes per unit (faction-tagged via
  // rosterIds). Best-effort -- a failed /vc returns [] and never blocks the
  // outcome (the session stays alive exactly as before; /vc does not finalize).
  let personalityUnits = [];
  try {
    const vc = await http.get(`/api/session/${sessionId}/vc`);
    const ok = vc && vc.status === 200 && vc.body;
    const perActor = ok && vc.body.debrief_payload ? vc.body.debrief_payload.per_actor || {} : {};
    // fp-delta probe input (MA3 N=40): mbti_axes live on the RAW snapshot
    // per_actor (GET /:id/vc returns full buildVcSnapshot); the pinned
    // debrief_payload schema (#276) deliberately omits them.
    const rawActor = ok ? vc.body.per_actor || {} : {};
    personalityUnits = Object.entries(perActor)
      .filter(([, entry]) => entry && typeof entry === 'object' && entry.personality_axes)
      .map(([unitId, entry]) => ({
        unit_id: unitId,
        faction: rosterIds.includes(unitId) ? 'player' : 'sistema',
        axes: entry.personality_axes,
        mbti_axes: (rawActor[unitId] && rawActor[unitId].mbti_axes) || null,
      }));
  } catch {
    personalityUnits = [];
  }

  // A13 write-side trigger (opt-in): POST /api/session/end runs the session-end
  // pipeline (wound/heal persist on campaign.woundedBiomes + chronicle + epilogue,
  // session.js:3511). On a run-level failure the adapter DECLARES the outcome
  // (fix-A #2703, downgrade-only server-side): the board alone cannot see a
  // mission-clock timeout (both factions alive -> 'abandon' -> no wound).
  // Best-effort -- a failed /end never blocks the outcome.
  let ended = false;
  if (endSession) {
    try {
      const declared = outcome === 'timeout' || outcome === 'defeat' ? { outcome } : {};
      const end = await http.post('/api/session/end', { session_id: sessionId, ...declared });
      ended = !!(end && end.status >= 200 && end.status < 300);
    } catch {
      ended = false;
    }
  }

  return {
    outcome,
    rounds,
    sessionId,
    rosterIds,
    survivorIds,
    personalityUnits,
    biomeWounded,
    ended,
    overchargeUses,
    playerAttacks,
    collectedEvents,
    firstStateUnits,
  };
}

module.exports = { runEncounter };
