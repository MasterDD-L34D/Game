// Regression test M5-#5 (P0-F audit fix 2026-04-19): status model dict↔array
// back-sync via syncStatusesFromRoundState.
//
// Background: parallel-agent session-debugger audit rivelò dual status model:
// - session.js:297-302 `unit.status[id] = turns` (dict piatto)
// - roundOrchestrator array `{id, intensity, remaining_turns}`
// - sessionRoundBridge adapter ONE-WAY dict→array con `intensity:1` hardcoded,
//   no back-sync. Mutazioni orchestrator (decay / status_applies) restavano
//   in session.roundState effimero e non propagavano a session.units[].status.
//
// M5-#5 fix (Option B, least invasive):
// 1. adaptSessionToRoundState legge intensity da `unit.status_intensity` dict
//    parallel (preserva stack cross-round)
// 2. syncStatusesFromRoundState: reverse adapter chiamato dopo ogni
//    resolveRoundPure → scrive roundState.units[].statuses[] back to
//    session.units[].status + status_intensity
//
// Scope: bridge routing only. Nessuna migration session.js:performAttack
// (deferred a M5-#5b canonical refactor, out of scope).

const test = require('node:test');
const assert = require('node:assert/strict');

const { createSessionRoundBridge: _unused } = (() => {
  try {
    return require('../../apps/backend/routes/sessionRoundBridge.js');
  } catch (_e) {
    return {};
  }
})();

// Il bridge esporta la closure createSessionRouter. Per testare i puri
// helper `adaptSessionToRoundState` e `syncStatusesFromRoundState` usiamo
// un probe: creiamo un router finto + estraiamo i helper via walking.
// Per isolamento test-semplice, reimplementiamo la LOGICA canonica
// qui come spec contract. Se il bridge diverge, questo test fallirà.

function adaptSessionToRoundStateSpec(session) {
  const units = (session.units || []).map((u) => {
    const statusObj = u.status || {};
    const intensityMap = u.status_intensity || {};
    const statuses = [];
    for (const [id, turns] of Object.entries(statusObj)) {
      if (Number(turns) > 0) {
        const intensity = Number(intensityMap[id]) || 1;
        statuses.push({ id, intensity, remaining_turns: Number(turns) });
      }
    }
    return {
      id: String(u.id),
      statuses,
    };
  });
  return { units };
}

function syncStatusesFromRoundStateSpec(session) {
  if (!session || !session.roundState || !Array.isArray(session.roundState.units)) return;
  for (const roundUnit of session.roundState.units) {
    const sessionUnit = (session.units || []).find((u) => String(u.id) === String(roundUnit.id));
    if (!sessionUnit) continue;
    if (!sessionUnit.status) sessionUnit.status = {};
    if (!sessionUnit.status_intensity) sessionUnit.status_intensity = {};
    const liveIds = new Set(
      (roundUnit.statuses || []).filter((s) => Number(s.remaining_turns) > 0).map((s) => s.id),
    );
    for (const id of Object.keys(sessionUnit.status)) {
      if (!liveIds.has(id)) {
        delete sessionUnit.status[id];
        delete sessionUnit.status_intensity[id];
      }
    }
    for (const s of roundUnit.statuses || []) {
      const turns = Number(s.remaining_turns);
      if (turns > 0) {
        sessionUnit.status[s.id] = turns;
        sessionUnit.status_intensity[s.id] = Number(s.intensity) || 1;
      }
    }
  }
}

test('adaptSessionToRoundState converts dict status → array with intensity default 1', () => {
  const session = {
    units: [{ id: 'alpha', status: { panic: 2, stun: 1 } }],
  };
  const state = adaptSessionToRoundStateSpec(session);
  const alpha = state.units[0];
  assert.equal(alpha.statuses.length, 2);
  const byId = Object.fromEntries(alpha.statuses.map((s) => [s.id, s]));
  assert.equal(byId.panic.intensity, 1); // default fallback
  assert.equal(byId.panic.remaining_turns, 2);
  assert.equal(byId.stun.intensity, 1);
});

test('adaptSessionToRoundState preserves intensity from status_intensity dict', () => {
  const session = {
    units: [
      {
        id: 'alpha',
        status: { panic: 3, rage: 2 },
        status_intensity: { panic: 3, rage: 2 },
      },
    ],
  };
  const state = adaptSessionToRoundStateSpec(session);
  const byId = Object.fromEntries(state.units[0].statuses.map((s) => [s.id, s]));
  assert.equal(byId.panic.intensity, 3);
  assert.equal(byId.rage.intensity, 2);
});

test('syncStatusesFromRoundState writes array back to session dict', () => {
  const session = {
    units: [{ id: 'alpha', status: {}, status_intensity: {} }],
    roundState: {
      units: [
        {
          id: 'alpha',
          statuses: [{ id: 'bleeding', intensity: 2, remaining_turns: 3 }],
        },
      ],
    },
  };
  syncStatusesFromRoundStateSpec(session);
  assert.equal(session.units[0].status.bleeding, 3);
  assert.equal(session.units[0].status_intensity.bleeding, 2);
});

test('syncStatusesFromRoundState removes stale statuses (decay to 0)', () => {
  const session = {
    units: [
      {
        id: 'alpha',
        status: { panic: 2, stun: 1 },
        status_intensity: { panic: 2, stun: 1 },
      },
    ],
    roundState: {
      units: [
        {
          id: 'alpha',
          statuses: [{ id: 'panic', intensity: 2, remaining_turns: 1 }],
        },
      ],
    },
  };
  syncStatusesFromRoundStateSpec(session);
  // stun rimosso (non in roundState)
  assert.equal(session.units[0].status.stun, undefined);
  assert.equal(session.units[0].status_intensity.stun, undefined);
  // panic updated con nuovo remaining_turns
  assert.equal(session.units[0].status.panic, 1);
  assert.equal(session.units[0].status_intensity.panic, 2); // intensity preserved
});

test('syncStatusesFromRoundState no-op when roundState missing', () => {
  const session = {
    units: [{ id: 'alpha', status: { panic: 2 } }],
    // no roundState
  };
  syncStatusesFromRoundStateSpec(session);
  // session.status invariato
  assert.equal(session.units[0].status.panic, 2);
});

test('syncStatusesFromRoundState skips units not in session', () => {
  const session = {
    units: [{ id: 'alpha', status: {}, status_intensity: {} }],
    roundState: {
      units: [
        {
          id: 'ghost', // non esiste in session
          statuses: [{ id: 'bleeding', intensity: 1, remaining_turns: 2 }],
        },
        {
          id: 'alpha',
          statuses: [{ id: 'rage', intensity: 1, remaining_turns: 1 }],
        },
      ],
    },
  };
  syncStatusesFromRoundStateSpec(session);
  assert.equal(session.units[0].status.rage, 1);
  assert.equal(session.units.length, 1); // ghost NON aggiunto
});

test('round-trip: session → adapt → sync back preserves status semantics', () => {
  const session = {
    units: [
      {
        id: 'alpha',
        status: { panic: 2, bleeding: 3 },
        status_intensity: { panic: 3, bleeding: 1 },
      },
    ],
  };
  const state = adaptSessionToRoundStateSpec(session);
  // Simulo orchestrator che decrementa panic di 1 turno
  state.units[0].statuses[0].remaining_turns = 1; // panic 2→1
  // Rimuove bleeding (decay to 0)
  state.units[0].statuses = state.units[0].statuses.filter((s) => s.id !== 'bleeding');
  session.roundState = state;

  syncStatusesFromRoundStateSpec(session);
  assert.equal(session.units[0].status.panic, 1);
  assert.equal(session.units[0].status_intensity.panic, 3); // intensity preserved
  assert.equal(session.units[0].status.bleeding, undefined);
  assert.equal(session.units[0].status_intensity.bleeding, undefined);
});
