// tests/ai/pressureTierFloor.test.js -- A2 (TKT-PRESSURE-TIER-ENCOUNTER).
//
// Mirror Godot-v2 PR #221: encounter.pressure_tier_floor raises the effective
// Sistema pressure per-encounter. Flag-gated (PRESSURE_TIER_FLOOR_ENABLED,
// default OFF) -> back-compat byte-identical when OFF / unset / out-of-range.
//
// IMPORTANT: every test sets/restores process.env.PRESSURE_TIER_FLOOR_ENABLED
// in a finally block. effectivePressure reads the flag at call-time (not module
// load) so toggling per-test is safe without re-require.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  effectivePressure,
  isPressureTierFloorEnabled,
  computeSistemaTier,
  publicSessionView,
  FLOOR_MIN,
} = require('../../apps/backend/routes/sessionHelpers');
const { tick } = require('../../apps/backend/services/combat/reinforcementSpawner');
const { getProgressMeterState } = require('../../apps/backend/services/ai/aiProgressMeter');
const { intentsCapForPressure } = require('../../apps/backend/services/ai/declareSistemaIntents');

const FLAG = 'PRESSURE_TIER_FLOOR_ENABLED';

function withFlag(value, fn) {
  const prev = process.env[FLAG];
  if (value === undefined) delete process.env[FLAG];
  else process.env[FLAG] = value;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env[FLAG];
    else process.env[FLAG] = prev;
  }
}

// -- flag helper --

test('isPressureTierFloorEnabled: true only when env === "true"', () => {
  withFlag('true', () => assert.equal(isPressureTierFloorEnabled(), true));
  withFlag('false', () => assert.equal(isPressureTierFloorEnabled(), false));
  withFlag('1', () => assert.equal(isPressureTierFloorEnabled(), false));
  withFlag(undefined, () => assert.equal(isPressureTierFloorEnabled(), false));
});

// -- effectivePressure: flag OFF (back-compat) --

test('effectivePressure: flag OFF -> input clamped, floor ignored', () => {
  withFlag('false', () => {
    assert.equal(effectivePressure(0, 5), 0);
    assert.equal(effectivePressure(30, 4), 30);
    assert.equal(effectivePressure(150, 5), 100, 'clamps high like computeSistemaTier');
    assert.equal(effectivePressure(-5, 3), 0, 'clamps low');
    assert.equal(effectivePressure(NaN, 5), 0, 'NaN -> 0');
    assert.equal(effectivePressure(undefined, 5), 0);
    assert.equal(effectivePressure(null, 5), 0);
  });
});

test('effectivePressure: flag UNSET behaves like OFF', () => {
  withFlag(undefined, () => {
    assert.equal(effectivePressure(10, 5), 10);
  });
});

// -- effectivePressure: flag ON --

test('effectivePressure: flag ON, floor raises pressure to FLOOR_MIN', () => {
  withFlag('true', () => {
    assert.equal(effectivePressure(0, 2), 25, 'floor 2 -> min 25');
    assert.equal(effectivePressure(0, 3), 50, 'floor 3 -> min 50');
    assert.equal(effectivePressure(0, 4), 75, 'floor 4 -> min 75');
    assert.equal(effectivePressure(0, 5), 95, 'floor 5 -> min 95');
  });
});

test('effectivePressure: flag ON, pressure above floor wins (max)', () => {
  withFlag('true', () => {
    assert.equal(effectivePressure(80, 3), 80, 'p 80 > floor-min 50 -> 80');
    assert.equal(effectivePressure(40, 3), 50, 'p 40 < floor-min 50 -> 50');
  });
});

test('effectivePressure: flag ON, floor 0 / 1 -> no raise', () => {
  withFlag('true', () => {
    assert.equal(effectivePressure(10, 0), 10, 'floor 0 -> no floor');
    assert.equal(effectivePressure(10, 1), 10, 'floor 1 -> min 0 -> no raise');
    assert.equal(effectivePressure(0, 1), 0);
  });
});

test('effectivePressure: flag ON, out-of-range / non-int floor -> no floor', () => {
  withFlag('true', () => {
    assert.equal(effectivePressure(10, 6), 10, 'floor 6 out of range');
    assert.equal(effectivePressure(10, -1), 10);
    assert.equal(effectivePressure(10, 2.5), 10, 'non-integer floor ignored');
    assert.equal(effectivePressure(10, null), 10, 'null floor');
    assert.equal(effectivePressure(10, undefined), 10, 'unset floor');
    assert.equal(effectivePressure(10, 'x'), 10, 'NaN floor');
  });
});

test('FLOOR_MIN: canonical mapping mirrors tier thresholds', () => {
  assert.deepEqual({ ...FLOOR_MIN }, { 1: 0, 2: 25, 3: 50, 4: 75, 5: 95 });
});

// -- computeSistemaTier(effectivePressure(...)) gate canonico --

test('computeSistemaTier floored: flag ON, low pressure + floor 4 -> Critical', () => {
  withFlag('true', () => {
    const tier = computeSistemaTier(effectivePressure(0, 4));
    assert.equal(tier.label, 'Critical');
    assert.equal(tier.intents_per_round, 3);
    assert.equal(tier.reinforcement_budget, 3);
  });
});

test('computeSistemaTier floored: flag OFF, same input -> Calm (back-compat)', () => {
  withFlag('false', () => {
    const tier = computeSistemaTier(effectivePressure(0, 4));
    assert.equal(tier.label, 'Calm');
    assert.equal(tier.reinforcement_budget, 0);
  });
});

// -- publicSessionView.sistema_tier floored --

function mockSessionForView(overrides = {}) {
  return {
    session_id: 's-floor',
    turn: 1,
    active_unit: null,
    turn_order: [],
    turn_index: 0,
    units: [],
    grid: { width: 6, height: 6 },
    events: [],
    sistema_pressure: 0,
    sistema_counter: 0,
    ...overrides,
  };
}

test('publicSessionView: flag ON + floor 4 -> sistema_tier Critical', () => {
  withFlag('true', () => {
    const view = publicSessionView(mockSessionForView({ pressure_tier_floor: 4 }));
    assert.equal(view.sistema_tier.label, 'Critical');
    // sistema_pressure surface stays the RAW value (floor only shapes the tier).
    assert.equal(view.sistema_pressure, 0);
  });
});

test('publicSessionView: flag OFF + floor 4 -> sistema_tier Calm (back-compat)', () => {
  withFlag('false', () => {
    const view = publicSessionView(mockSessionForView({ pressure_tier_floor: 4 }));
    assert.equal(view.sistema_tier.label, 'Calm');
  });
});

test('publicSessionView: flag ON, no floor -> sistema_tier from raw pressure', () => {
  withFlag('true', () => {
    const view = publicSessionView(mockSessionForView({ sistema_pressure: 30 }));
    assert.equal(view.sistema_tier.label, 'Alert');
  });
});

// -- aiProgressMeter floored --

test('getProgressMeterState: flag ON + floor 5 -> Apex tier surfaced', () => {
  withFlag('true', () => {
    const state = getProgressMeterState({ sistema_pressure: 0, pressure_tier_floor: 5 });
    assert.equal(state.tier.name, 'Apex');
    assert.equal(state.pressure, 95, 'effective pressure reflected in meter');
    assert.equal(state.next_tier, null, 'Apex has no next tier');
  });
});

test('getProgressMeterState: flag OFF + floor 5 -> Calm (back-compat)', () => {
  withFlag('false', () => {
    const state = getProgressMeterState({ sistema_pressure: 0, pressure_tier_floor: 5 });
    assert.equal(state.tier.name, 'Calm');
    assert.equal(state.pressure, 0);
  });
});

// -- intentsCapForPressure floored --

test('intentsCapForPressure: flag ON + floor 5 -> cap 4 (Apex)', () => {
  withFlag('true', () => {
    assert.equal(intentsCapForPressure(0, 5), 4);
    assert.equal(intentsCapForPressure(0, 3), 3, 'floor 3 -> Escalated cap');
  });
});

test('intentsCapForPressure: flag OFF + floor 5 -> cap 1 (back-compat Calm)', () => {
  withFlag('false', () => {
    assert.equal(intentsCapForPressure(0, 5), 1);
  });
});

test('intentsCapForPressure: no floor arg unchanged vs single-arg legacy', () => {
  withFlag('true', () => {
    assert.equal(intentsCapForPressure(30), 2, 'Alert cap, no floor');
    assert.equal(intentsCapForPressure(95), 4, 'Apex cap, no floor');
  });
});

// -- reinforcement budget floored --

function mockReinforceSession(overrides = {}) {
  return {
    pressure: 10, // Calm -> below min_tier Alert (no spawn baseline)
    round: 3,
    turn: 3,
    grid: { width: 10, height: 10 },
    units: [
      { id: 'p1', controlled_by: 'player', position: [0, 0], hp: 10 },
      { id: 'p2', controlled_by: 'player', position: [1, 0], hp: 10 },
    ],
    ...overrides,
  };
}

function mockReinforceEncounter(overrides = {}) {
  return {
    reinforcement_pool: [{ unit_id: 'minion_01', weight: 1.0, max_spawns: 5, hp: 6, mod: 2 }],
    reinforcement_entry_tiles: [
      [9, 9],
      [8, 9],
      [9, 8],
      [7, 9],
    ],
    reinforcement_policy: {
      enabled: true,
      min_tier: 'Alert',
      cooldown_rounds: 0,
      max_total_spawns: 10,
    },
    ...overrides,
  };
}

test('reinforcement budget: flag ON + floor 4 lifts Calm -> Critical (budget 3)', () => {
  withFlag('true', () => {
    const session = mockReinforceSession({ pressure: 10, pressure_tier_floor: 4 });
    const enc = mockReinforceEncounter();
    const res = tick(session, enc, { rng: () => 0.5 });
    assert.notEqual(res.skipped, true, 'no skip -- tier now meets min');
    assert.equal(res.budget_used, 3, 'Critical reinforcement_budget = 3');
    assert.equal(res.spawned.length, 3);
    assert.equal(res.spawned[0].tier_at_spawn, 'Critical');
  });
});

test('reinforcement budget: flag OFF + floor 4 -> Calm skip (back-compat)', () => {
  withFlag('false', () => {
    const session = mockReinforceSession({ pressure: 10, pressure_tier_floor: 4 });
    const enc = mockReinforceEncounter();
    const res = tick(session, enc, { rng: () => 0.5 });
    assert.equal(res.skipped, true, 'Calm < min_tier Alert -> skip');
    assert.match(res.reason, /tier_below_min/);
    assert.equal(res.spawned.length, 0);
  });
});

// -- regression: floor unset == pre-A2 identical (flag ON too) --

test('regression: flag ON but floor unset -> reinforcement identical to baseline', () => {
  withFlag('true', () => {
    const session = mockReinforceSession({ pressure: 30 }); // Alert, no floor
    const enc = mockReinforceEncounter();
    const res = tick(session, enc, { rng: () => 0.5 });
    assert.equal(res.budget_used, 1, 'Alert budget unchanged when floor unset');
    assert.equal(res.spawned.length, 1);
  });
});

test('regression: flag ON but floor unset -> publicSessionView tier from raw pressure', () => {
  withFlag('true', () => {
    const view = publicSessionView(mockSessionForView({ sistema_pressure: 75 }));
    assert.equal(view.sistema_tier.label, 'Critical', 'raw pressure 75 -> Critical, no floor');
  });
});
