// M13 P6 — missionTimer unit tests.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { tick, peek } = require('../../apps/backend/services/combat/missionTimer');

function makeSession(turn = 0) {
  return { session_id: 's1', turn, sistema_pressure: 50 };
}

function enc(overrides = {}) {
  return {
    mission_timer: {
      enabled: true,
      turn_limit: 10,
      soft_warning_at: 3,
      on_expire: 'defeat',
      ...overrides,
    },
  };
}

test('tick: disabled policy returns skipped', () => {
  const s = makeSession();
  const r = tick(s, { mission_timer: { enabled: false } });
  assert.equal(r.enabled, false);
  assert.equal(r.skipped, true);
  assert.equal(r.reason, 'policy_disabled');
});

test('tick: no mission_timer on encounter returns skipped', () => {
  const s = makeSession();
  const r = tick(s, {});
  assert.equal(r.enabled, false);
  assert.equal(r.reason, 'policy_disabled');
});

test('tick: invalid turn_limit returns skipped', () => {
  const s = makeSession();
  const r = tick(s, { mission_timer: { enabled: true, turn_limit: 0 } });
  assert.equal(r.skipped, true);
  assert.equal(r.reason, 'invalid_turn_limit');
});

test('tick: initialization sets started_at_turn', () => {
  const s = makeSession(4);
  tick(s, enc());
  assert.equal(s.mission_timer_state.started_at_turn, 4);
});

test('tick: remaining_turns decreases with session.turn', () => {
  const s = makeSession(0);
  const r1 = tick(s, enc());
  assert.equal(r1.remaining_turns, 10);
  s.turn = 5;
  const r2 = tick(s, enc());
  assert.equal(r2.remaining_turns, 5);
  assert.equal(r2.expired, false);
});

test('tick: warning fires exactly once per remaining value', () => {
  const s = makeSession(0);
  tick(s, enc()); // start, remaining 10
  s.turn = 8;
  const r1 = tick(s, enc()); // remaining 2 ≤ soft 3 → warn
  assert.equal(r1.warning, true);
  const r1b = tick(s, enc()); // same remaining, no repeat warning
  assert.equal(r1b.warning, false);
  s.turn = 9;
  const r2 = tick(s, enc()); // remaining 1, new warning
  assert.equal(r2.warning, true);
});

test('tick: expire at turn_limit exceeded', () => {
  const s = makeSession(0);
  tick(s, enc());
  s.turn = 10;
  const r = tick(s, enc());
  assert.equal(r.expired, true);
  assert.equal(r.action, 'defeat');
  assert.equal(s.mission_timer_state.expired, true);
});

test('tick: expire twice returns already_expired skip', () => {
  const s = makeSession(0);
  tick(s, enc());
  s.turn = 15;
  const r1 = tick(s, enc());
  assert.equal(r1.expired, true);
  assert.equal(r1.reason, 'expired');
  const r2 = tick(s, enc());
  assert.equal(r2.skipped, true);
  assert.equal(r2.reason, 'already_expired');
});

test('tick: on_expire escalate_pressure emits side_effect delta', () => {
  const s = makeSession(0);
  tick(
    s,
    enc({
      turn_limit: 5,
      on_expire: 'escalate_pressure',
      on_expire_payload: { pressure_delta: 30 },
    }),
  );
  s.turn = 5;
  const r = tick(
    s,
    enc({
      turn_limit: 5,
      on_expire: 'escalate_pressure',
      on_expire_payload: { pressure_delta: 30 },
    }),
  );
  assert.equal(r.expired, true);
  assert.equal(r.action, 'escalate_pressure');
  assert.equal(r.side_effects.pressure_delta, 30);
});

test('tick: on_expire spawn_wave emits side_effect extra_spawns', () => {
  const s = makeSession(0);
  tick(
    s,
    enc({
      turn_limit: 3,
      on_expire: 'spawn_wave',
      on_expire_payload: { extra_spawns: 4 },
    }),
  );
  s.turn = 4;
  const r = tick(
    s,
    enc({
      turn_limit: 3,
      on_expire: 'spawn_wave',
      on_expire_payload: { extra_spawns: 4 },
    }),
  );
  assert.equal(r.action, 'spawn_wave');
  assert.equal(r.side_effects.extra_spawns, 4);
});

test('peek: reports remaining without mutating state', () => {
  const s = makeSession(0);
  const p1 = peek(s, enc());
  assert.equal(p1.turn_limit, 10);
  assert.equal(p1.remaining_turns, 10);
  assert.equal(s.mission_timer_state, undefined);
  tick(s, enc()); // initialize
  s.turn = 7;
  const p2 = peek(s, enc());
  assert.equal(p2.remaining_turns, 3);
  assert.equal(p2.expired, false);
});

test('peek: returns null when disabled', () => {
  const s = makeSession();
  assert.equal(peek(s, {}), null);
  assert.equal(peek(s, { mission_timer: { enabled: false } }), null);
});
