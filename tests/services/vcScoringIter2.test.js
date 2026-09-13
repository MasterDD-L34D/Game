// P4 iter2 (2026-04-26) — axes refinement tests (Opzione A handoff).
//
// Coverage:
//   - raw metrics nuove (enemy_target_ratio, concrete_action_ratio,
//     action_switch_rate) derivabili dagli events
//   - computeMbtiAxesIter2 formule corrette con direzione letters
//   - buildVcSnapshot opt-in via config.use_axes_iter2 / env VC_AXES_ITER
//   - backward compat: iter1 default invariato

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  computeRawMetrics,
  computeMbtiAxes,
  computeMbtiAxesIter2,
  buildVcSnapshot,
  loadTelemetryConfig,
} = require('../../apps/backend/services/vcScoring');

// Minimal units fixture: 1 player + 1 sistema.
const UNITS = [
  { id: 'u1', controlled_by: 'player', attack_range: 1, max_hp: 10, hp: 10 },
  { id: 'u2', controlled_by: 'sistema', attack_range: 1, max_hp: 10, hp: 10 },
];

function ev(actor_id, action_type, extra = {}) {
  return {
    actor_id,
    action_type,
    turn: extra.turn || 1,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Raw metrics
// ---------------------------------------------------------------------------
test('iter2 raw: enemy_target_ratio = 1.0 when all attacks target enemy', () => {
  const events = [
    ev('u1', 'attack', { target_id: 'u2', result: 'miss' }),
    ev('u1', 'attack', { target_id: 'u2', result: 'miss' }),
  ];
  const raw = computeRawMetrics(events, UNITS, 6);
  assert.equal(raw.u1.enemy_target_ratio, 1.0);
});

test('iter2 raw: enemy_target_ratio = 0.5 when half target ally', () => {
  const units = [
    ...UNITS,
    { id: 'u3', controlled_by: 'player', attack_range: 1, max_hp: 10, hp: 10 },
  ];
  // u1 ability on u3 (ally) + attack u2 (enemy)
  const events = [
    ev('u1', 'ability', { target_id: 'u3' }),
    ev('u1', 'attack', { target_id: 'u2', result: 'miss' }),
  ];
  const raw = computeRawMetrics(events, units, 6);
  assert.equal(raw.u1.enemy_target_ratio, 0.5);
});

test('iter2 raw: enemy_target_ratio = null when no events with target', () => {
  const events = [ev('u1', 'move', { position_from: { x: 0, y: 0 }, position_to: { x: 1, y: 0 } })];
  const raw = computeRawMetrics(events, UNITS, 6);
  assert.equal(raw.u1.enemy_target_ratio, null);
});

test('iter2 raw: concrete_action_ratio = 1.0 attacks+moves only', () => {
  const events = [
    ev('u1', 'attack', { target_id: 'u2', result: 'miss' }),
    ev('u1', 'move', { position_from: { x: 0, y: 0 }, position_to: { x: 1, y: 0 } }),
  ];
  const raw = computeRawMetrics(events, UNITS, 6);
  assert.equal(raw.u1.concrete_action_ratio, 1.0);
});

test('iter2 raw: concrete_action_ratio = 0.5 half abilities', () => {
  const events = [
    ev('u1', 'attack', { target_id: 'u2', result: 'miss' }),
    ev('u1', 'ability', { target_id: 'u2' }),
    ev('u1', 'ability', { target_id: 'u2' }),
    ev('u1', 'move', { position_from: { x: 0, y: 0 }, position_to: { x: 1, y: 0 } }),
  ];
  const raw = computeRawMetrics(events, UNITS, 6);
  assert.equal(raw.u1.concrete_action_ratio, 0.5);
});

test('iter2 raw: action_switch_rate = 1.0 alternating types', () => {
  // attack → move → attack → move = 3 switches over 3 transitions = 1.0
  const events = [
    ev('u1', 'attack', { target_id: 'u2', result: 'miss' }),
    ev('u1', 'move', { position_from: { x: 0, y: 0 }, position_to: { x: 1, y: 0 } }),
    ev('u1', 'attack', { target_id: 'u2', result: 'miss' }),
    ev('u1', 'move', { position_from: { x: 1, y: 0 }, position_to: { x: 2, y: 0 } }),
  ];
  const raw = computeRawMetrics(events, UNITS, 6);
  assert.equal(raw.u1.action_switch_rate, 1.0);
});

test('iter2 raw: action_switch_rate = 0 same type streak', () => {
  const events = [
    ev('u1', 'attack', { target_id: 'u2', result: 'miss' }),
    ev('u1', 'attack', { target_id: 'u2', result: 'miss' }),
    ev('u1', 'attack', { target_id: 'u2', result: 'miss' }),
  ];
  const raw = computeRawMetrics(events, UNITS, 6);
  assert.equal(raw.u1.action_switch_rate, 0);
});

test('iter2 raw: action_switch_rate = null with single event', () => {
  const events = [ev('u1', 'attack', { target_id: 'u2', result: 'miss' })];
  const raw = computeRawMetrics(events, UNITS, 6);
  assert.equal(raw.u1.action_switch_rate, null);
});

// ---------------------------------------------------------------------------
// computeMbtiAxesIter2 direction sanity
// ---------------------------------------------------------------------------
test('iter2 axes: high enemy_target_ratio → low E_I value (E pole)', () => {
  const axes = computeMbtiAxesIter2({
    enemy_target_ratio: 0.9,
    concrete_action_ratio: 0.5,
    action_switch_rate: 0.5,
    utility_actions: 0.5,
    support_bias: 0.5,
  });
  // Extravert: low value → E (letterOrUncertain 'E'|'I' w/ low=E).
  assert.ok(axes.E_I.value < 0.45, `E_I ${axes.E_I.value} should fall in E zone`);
  assert.equal(axes.E_I.coverage, 'full');
});

test('iter2 axes: low enemy_target_ratio → high E_I value (I pole)', () => {
  const axes = computeMbtiAxesIter2({
    enemy_target_ratio: 0.1,
    concrete_action_ratio: 0.5,
    action_switch_rate: 0.5,
    utility_actions: 0.5,
    support_bias: 0.5,
  });
  assert.ok(axes.E_I.value > 0.55);
});

test('iter2 axes: high concrete_action_ratio → S_N high (S pole)', () => {
  const axes = computeMbtiAxesIter2({
    enemy_target_ratio: 0.5,
    concrete_action_ratio: 0.9,
    action_switch_rate: 0.5,
    utility_actions: 0.5,
    support_bias: 0.5,
  });
  // letterOrUncertain 'N'|'S' with high=S → value 0.9 = S
  assert.ok(axes.S_N.value > 0.55);
});

test('iter2 axes: high switch_rate → low J_P (P pole)', () => {
  const axes = computeMbtiAxesIter2({
    enemy_target_ratio: 0.5,
    concrete_action_ratio: 0.5,
    action_switch_rate: 0.9,
    utility_actions: 0.5,
    support_bias: 0.5,
  });
  // letterOrUncertain 'P'|'J' with low=P → value 1-0.9=0.1 → P
  assert.ok(axes.J_P.value < 0.45);
});

test('iter2 axes: null raw metric → axis null', () => {
  const axes = computeMbtiAxesIter2({
    enemy_target_ratio: null,
    concrete_action_ratio: null,
    action_switch_rate: null,
    utility_actions: 0.5,
    support_bias: 0.5,
  });
  assert.equal(axes.E_I, null);
  assert.equal(axes.S_N, null);
  assert.equal(axes.J_P, null);
  // T_F invariato — derivable from utility + support
  assert.ok(axes.T_F !== null);
});

// ---------------------------------------------------------------------------
// buildVcSnapshot gating
// ---------------------------------------------------------------------------
test('buildVcSnapshot: default (no flag) uses iter2 axes (sprint 2026-04-26)', () => {
  delete process.env.VC_AXES_ITER;
  const session = {
    session_id: 's1',
    units: UNITS,
    events: [
      ev('u1', 'attack', { target_id: 'u2', result: 'miss' }),
      ev('u1', 'ability', { target_id: 'u2' }),
    ],
    grid: { width: 6 },
  };
  const config = loadTelemetryConfig();
  delete config.use_axes_iter2; // assicura defaults entrambi unset
  const snap = buildVcSnapshot(session, config);
  // iter2 default ON: E_I deriva da enemy_target_ratio (1.0 → value 0 → E pole).
  const axes = snap.per_actor.u1.mbti_axes;
  assert.ok(axes.E_I !== null, 'iter2 default → E_I derivabile da single attack');
  assert.equal(axes.E_I.coverage, 'full');
});

test('buildVcSnapshot: env VC_AXES_ITER=1 forces iter1 (rollback knob)', () => {
  process.env.VC_AXES_ITER = '1';
  try {
    const session = {
      session_id: 's1',
      units: UNITS,
      events: [ev('u1', 'attack', { target_id: 'u2', result: 'miss' })],
      grid: { width: 6 },
    };
    const config = loadTelemetryConfig();
    delete config.use_axes_iter2;
    const snap = buildVcSnapshot(session, config);
    // iter1 vs iter2 differ on E_I per single-attack:
    //   iter1 formula: 1 - 0.5*close_engage(0) - 0.25*support_bias(0)
    //                  - 0.25*(1-time_to_commit(0)) = 0.75
    //   iter2 formula: 1 - enemy_target_ratio(1.0) = 0 → E pole
    // VC_AXES_ITER=1 force should produce iter1 value (~0.75), NOT iter2 (~0).
    const ei = snap.per_actor.u1.mbti_axes.E_I;
    assert.ok(ei !== null, 'iter1 E_I should be derivable');
    assert.ok(ei.value > 0.45, `iter1 forced via env: E_I=${ei.value} should be ~0.75 not ~0`);
  } finally {
    delete process.env.VC_AXES_ITER;
  }
});

test('buildVcSnapshot: config.use_axes_iter2=true enables iter2', () => {
  const session = {
    session_id: 's1',
    units: UNITS,
    events: [
      ev('u1', 'attack', { target_id: 'u2', result: 'miss' }),
      ev('u1', 'ability', { target_id: 'u2' }),
    ],
    grid: { width: 6 },
  };
  const config = { ...loadTelemetryConfig(), use_axes_iter2: true };
  const snap = buildVcSnapshot(session, config);
  const axes = snap.per_actor.u1.mbti_axes;
  // iter2 E_I uses enemy_target_ratio = 1.0 → value = 0 → E
  assert.ok(axes.E_I !== null, 'iter2 E_I derivable');
  assert.ok(axes.E_I.value < 0.45);
  // iter2 S_N uses concrete_ratio = 0.5 → 0.5 dead-band
  assert.ok(axes.S_N !== null);
});

test('buildVcSnapshot: env VC_AXES_ITER=2 confirms iter2 (config unset)', () => {
  process.env.VC_AXES_ITER = '2';
  try {
    const session = {
      session_id: 's1',
      units: UNITS,
      events: [ev('u1', 'attack', { target_id: 'u2', result: 'miss' })],
      grid: { width: 6 },
    };
    // Pass a config WITHOUT use_axes_iter2 to exercise env path.
    const config = loadTelemetryConfig();
    delete config.use_axes_iter2;
    const snap = buildVcSnapshot(session, config);
    assert.ok(snap.per_actor.u1.mbti_axes.E_I !== null);
  } finally {
    delete process.env.VC_AXES_ITER;
  }
});

test('buildVcSnapshot: config.use_axes_iter2=false overrides default iter2', () => {
  delete process.env.VC_AXES_ITER;
  const session = {
    session_id: 's1',
    units: UNITS,
    events: [ev('u1', 'attack', { target_id: 'u2', result: 'miss' })],
    grid: { width: 6 },
  };
  // Explicit false: caller can pin iter1 even if default is iter2.
  const config = { ...loadTelemetryConfig(), use_axes_iter2: false };
  const snap = buildVcSnapshot(session, config);
  // iter1 single-attack → E_I ~0.75 (vedi test iter1 forced sopra).
  const ei = snap.per_actor.u1.mbti_axes.E_I;
  assert.ok(ei !== null && ei.value > 0.45, 'iter1 forced via config: E_I value > 0.45');
});

test('buildVcSnapshot: config.use_axes_iter2=false overrides env VC_AXES_ITER=2', () => {
  process.env.VC_AXES_ITER = '2';
  try {
    const session = {
      session_id: 's1',
      units: UNITS,
      events: [ev('u1', 'attack', { target_id: 'u2', result: 'miss' })],
      grid: { width: 6 },
    };
    const config = { ...loadTelemetryConfig(), use_axes_iter2: false };
    const snap = buildVcSnapshot(session, config);
    const ei = snap.per_actor.u1.mbti_axes.E_I;
    // config esplicita ha priorità su env ON → iter1 path → E_I value ~0.75.
    assert.ok(ei !== null && ei.value > 0.45, 'config false beats env=2: iter1 path');
  } finally {
    delete process.env.VC_AXES_ITER;
  }
});

// ---------------------------------------------------------------------------
// Backward compat guard: iter1 computeMbtiAxes signature unchanged.
// ---------------------------------------------------------------------------
test('backward compat: iter1 computeMbtiAxes still works with new raw keys', () => {
  const axes = computeMbtiAxes({
    close_engage: 0.3,
    support_bias: 0.2,
    time_to_commit: 0.4,
    new_tiles: 0.5,
    setup_ratio: 0.4,
    evasion_ratio: 0.3,
    utility_actions: 0.5,
    // iter2 keys present but iter1 ignores them
    enemy_target_ratio: 0.9,
    concrete_action_ratio: 0.1,
    action_switch_rate: 0.9,
  });
  // iter1 E_I fully derivable with these inputs
  assert.ok(axes.E_I !== null);
  assert.equal(axes.E_I.coverage, 'full');
});
