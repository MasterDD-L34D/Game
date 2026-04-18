// Unit test for objectiveEvaluator — ADR-2026-04-20.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateObjective,
  _internals,
} = require('../../apps/backend/services/combat/objectiveEvaluator');

function mkSession(overrides = {}) {
  return {
    turn: 1,
    units: [
      { id: 'p1', controlled_by: 'player', position: [0, 0], hp: 10 },
      { id: 's1', controlled_by: 'sistema', position: [5, 5], hp: 8 },
    ],
    ...overrides,
  };
}

// ── elimination ──

test('elimination: win when sistema_alive=0', () => {
  const session = mkSession({
    units: [
      { id: 'p1', controlled_by: 'player', hp: 5 },
      { id: 's1', controlled_by: 'sistema', hp: 0 },
    ],
  });
  const res = evaluateObjective(session, { objective: { type: 'elimination' } });
  assert.equal(res.completed, true);
  assert.equal(res.outcome, 'win');
});

test('elimination: wipe when player_alive=0', () => {
  const session = mkSession({
    units: [
      { id: 'p1', controlled_by: 'player', hp: 0 },
      { id: 's1', controlled_by: 'sistema', hp: 3 },
    ],
  });
  const res = evaluateObjective(session, { objective: { type: 'elimination' } });
  assert.equal(res.failed, true);
  assert.equal(res.outcome, 'wipe');
});

test('elimination: in_progress', () => {
  const res = evaluateObjective(mkSession(), { objective: { type: 'elimination' } });
  assert.equal(res.completed, false);
  assert.equal(res.failed, false);
  assert.equal(res.reason, 'in_progress');
});

// ── capture_point ──

test('capture_point: accumulates turns_held across ticks', () => {
  const session = mkSession({
    turn: 1,
    units: [
      { id: 'p1', controlled_by: 'player', position: [4, 4], hp: 10 },
      { id: 's1', controlled_by: 'sistema', position: [9, 9], hp: 5 },
    ],
  });
  const enc = { objective: { type: 'capture_point', target_zone: [3, 3, 5, 5], hold_turns: 3 } };
  const r1 = evaluateObjective(session, enc);
  assert.equal(r1.progress.turns_held, 1);
  assert.equal(r1.completed, false);
  session.turn = 2;
  const r2 = evaluateObjective(session, enc);
  assert.equal(r2.progress.turns_held, 2);
  session.turn = 3;
  const r3 = evaluateObjective(session, enc);
  assert.equal(r3.completed, true);
  assert.equal(r3.outcome, 'win');
});

test('capture_point: resets turns_held when PG leaves zone', () => {
  const session = mkSession({
    turn: 1,
    units: [
      { id: 'p1', controlled_by: 'player', position: [4, 4], hp: 10 },
      { id: 's1', controlled_by: 'sistema', position: [9, 9], hp: 5 },
    ],
  });
  const enc = { objective: { type: 'capture_point', target_zone: [3, 3, 5, 5], hold_turns: 3 } };
  evaluateObjective(session, enc);
  session.turn = 2;
  session.units[0].position = [0, 0];
  const r = evaluateObjective(session, enc);
  assert.equal(r.progress.turns_held, 0);
});

test('capture_point: fails on timeout', () => {
  const session = mkSession({ turn: 11 });
  const enc = {
    objective: {
      type: 'capture_point',
      target_zone: [3, 3, 5, 5],
      hold_turns: 3,
      loss_conditions: { time_limit: 10 },
    },
  };
  const r = evaluateObjective(session, enc);
  assert.equal(r.failed, true);
  assert.equal(r.outcome, 'timeout');
});

// ── escort ──

test('escort: completes when target alive + in extract_zone', () => {
  const session = mkSession({
    units: [
      { id: 'p1', controlled_by: 'player', position: [9, 9], hp: 10 },
      { id: 'vip', controlled_by: 'player', position: [9, 9], hp: 5 },
      { id: 's1', controlled_by: 'sistema', position: [0, 0], hp: 3 },
    ],
  });
  const enc = { objective: { type: 'escort', escort_target: 'vip', target_zone: [8, 8, 9, 9] } };
  const r = evaluateObjective(session, enc);
  assert.equal(r.completed, true);
  assert.equal(r.outcome, 'win');
});

test('escort: fails when target dead', () => {
  const session = mkSession({
    units: [
      { id: 'p1', controlled_by: 'player', position: [0, 0], hp: 10 },
      { id: 'vip', controlled_by: 'player', position: [0, 0], hp: 0 },
    ],
  });
  const r = evaluateObjective(session, {
    objective: { type: 'escort', escort_target: 'vip', target_zone: [8, 8, 9, 9] },
  });
  assert.equal(r.failed, true);
  assert.equal(r.outcome, 'objective_failed');
});

test('escort: fails when target_id missing', () => {
  const r = evaluateObjective(mkSession(), {
    objective: { type: 'escort', escort_target: 'nonexistent', target_zone: [8, 8, 9, 9] },
  });
  assert.equal(r.failed, true);
  assert.equal(r.reason, 'escort_target_missing');
});

// ── sabotage ──

test('sabotage: completes after required ticks in zone', () => {
  const session = mkSession({
    turn: 1,
    units: [
      { id: 'p1', controlled_by: 'player', position: [4, 4], hp: 10 },
      { id: 's1', controlled_by: 'sistema', position: [9, 9], hp: 5 },
    ],
  });
  const enc = {
    objective: {
      type: 'sabotage',
      target_zone: [3, 3, 5, 5],
      sabotage_turns_required: 2,
      time_limit: 10,
    },
  };
  evaluateObjective(session, enc);
  session.turn = 2;
  const r = evaluateObjective(session, enc);
  assert.equal(r.completed, true);
});

test('sabotage: fails on timeout', () => {
  const session = mkSession({ turn: 10 });
  const enc = {
    objective: {
      type: 'sabotage',
      target_zone: [3, 3, 5, 5],
      sabotage_turns_required: 3,
      time_limit: 10,
    },
  };
  const r = evaluateObjective(session, enc);
  assert.equal(r.failed, true);
  assert.equal(r.outcome, 'timeout');
});

// ── survival ──

test('survival: completes when turn >= survive_turns AND player alive', () => {
  const session = mkSession({ turn: 5 });
  const r = evaluateObjective(session, { objective: { type: 'survival', survive_turns: 5 } });
  assert.equal(r.completed, true);
  assert.equal(r.outcome, 'win');
});

test('survival: fails on player wipe', () => {
  const session = mkSession({ turn: 3, units: [{ id: 'p1', controlled_by: 'player', hp: 0 }] });
  const r = evaluateObjective(session, { objective: { type: 'survival', survive_turns: 5 } });
  assert.equal(r.failed, true);
  assert.equal(r.outcome, 'wipe');
});

test('survival: in_progress before target turn', () => {
  const session = mkSession({ turn: 3 });
  const r = evaluateObjective(session, { objective: { type: 'survival', survive_turns: 5 } });
  assert.equal(r.completed, false);
  assert.equal(r.progress.turns_survived, 3);
});

// ── escape ──

test('escape: completes when all alive PG in zone', () => {
  const session = mkSession({
    turn: 2,
    units: [
      { id: 'p1', controlled_by: 'player', position: [9, 9], hp: 10 },
      { id: 'p2', controlled_by: 'player', position: [9, 8], hp: 10 },
      { id: 's1', controlled_by: 'sistema', position: [0, 0], hp: 3 },
    ],
  });
  const enc = { objective: { type: 'escape', target_zone: [8, 8, 9, 9], time_limit: 10 } };
  const r = evaluateObjective(session, enc);
  assert.equal(r.completed, true);
  assert.equal(r.outcome, 'win');
});

test('escape: partial — not all PG in zone', () => {
  const session = mkSession({
    turn: 2,
    units: [
      { id: 'p1', controlled_by: 'player', position: [9, 9], hp: 10 },
      { id: 'p2', controlled_by: 'player', position: [0, 0], hp: 10 },
    ],
  });
  const enc = { objective: { type: 'escape', target_zone: [8, 8, 9, 9], time_limit: 10 } };
  const r = evaluateObjective(session, enc);
  assert.equal(r.completed, false);
  assert.equal(r.progress.units_escaped, 1);
});

// ── fallback + unknown type ──

test('no objective returns no_objective reason', () => {
  const r = evaluateObjective(mkSession(), {});
  assert.equal(r.completed, false);
  assert.equal(r.reason, 'no_objective');
});

test('unknown type returns unknown_type', () => {
  const r = evaluateObjective(mkSession(), { objective: { type: 'teleport_daddy' } });
  assert.equal(r.completed, false);
  assert.match(r.reason, /unknown_type/);
});

// ── _internals ──

test('_internals: pointInBox', () => {
  assert.equal(_internals.pointInBox([3, 3], [3, 3, 5, 5]), true);
  assert.equal(_internals.pointInBox([5, 5], [3, 3, 5, 5]), true);
  assert.equal(_internals.pointInBox([6, 5], [3, 3, 5, 5]), false);
  assert.equal(_internals.pointInBox([2, 3], [3, 3, 5, 5]), false);
});

test('_internals: countFactionAlive ignores dead units', () => {
  const session = {
    units: [
      { controlled_by: 'player', hp: 5 },
      { controlled_by: 'player', hp: 0 },
      { controlled_by: 'sistema', hp: 3 },
    ],
  };
  assert.equal(_internals.countFactionAlive(session, 'player'), 1);
  assert.equal(_internals.countFactionAlive(session, 'sistema'), 1);
});
