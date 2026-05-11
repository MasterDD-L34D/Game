// TKT-P6 — Rewind safety valve unit tests.
//
// Scope: rewindBuffer.js — buffer ring + budget + state pick/apply.

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createRewindBuffer,
  ensureRewindState,
  snapshotSession,
  rewindSession,
  resetRewind,
  rewindStateSummary,
  pickSnapshotState,
  applySnapshot,
} = require('../../apps/backend/services/combat/rewindBuffer');

function buildSession(overrides = {}) {
  return {
    session_id: 'sess-rewind-test',
    turn: 1,
    active_unit: 'pg1',
    turn_index: 0,
    turn_order: ['pg1', 'enemy1'],
    units: [
      { id: 'pg1', controlled_by: 'player', hp: 10, ap_remaining: 2, position: { x: 0, y: 0 } },
      { id: 'enemy1', controlled_by: 'sistema', hp: 8, ap_remaining: 2, position: { x: 3, y: 0 } },
    ],
    sistema_pressure: 5,
    sistema_counter: 0,
    tile_state_map: {},
    last_round_combos: [],
    last_round_synergies: [],
    events: [{ action_type: 'session_start', turn: 0 }],
    ...overrides,
  };
}

test('createRewindBuffer initializes defaults', () => {
  const buf = createRewindBuffer();
  assert.equal(buf.size, 3);
  assert.equal(buf.budget_max, 3);
  assert.equal(buf.budget_remaining, 3);
  assert.deepEqual(buf.snapshots, []);
});

test('snapshotSession pushes deep clone state', () => {
  const session = buildSession();
  const ok = snapshotSession(session);
  assert.equal(ok, true);
  const state = ensureRewindState(session);
  assert.equal(state.snapshots.length, 1);
  // Mutate session post-snapshot, snapshot must remain pristine.
  session.units[0].hp = 1;
  assert.equal(state.snapshots[0].units[0].hp, 10);
});

test('ring buffer drops oldest beyond size', () => {
  const session = buildSession();
  snapshotSession(session);
  session.turn = 2;
  snapshotSession(session);
  session.turn = 3;
  snapshotSession(session);
  session.turn = 4;
  snapshotSession(session);
  const state = ensureRewindState(session);
  assert.equal(state.snapshots.length, 3);
  // Oldest (turn=1) was dropped; first remaining is turn=2.
  assert.equal(state.snapshots[0].turn, 2);
  assert.equal(state.snapshots[2].turn, 4);
});

test('rewindSession pops snapshot + decrements budget + restores state', () => {
  const session = buildSession();
  snapshotSession(session);
  // Mutate state to simulate action.
  session.turn = 5;
  session.units[0].hp = 1;
  session.units[1].hp = 0;
  session.events.push({ action_type: 'attack', turn: 5 });

  const result = rewindSession(session);
  assert.equal(result.ok, true);
  assert.equal(result.budget_remaining, 2);
  assert.equal(result.snapshots_remaining, 0);
  // State restored.
  assert.equal(session.turn, 1);
  assert.equal(session.units[0].hp, 10);
  assert.equal(session.units[1].hp, 8);
  // Event tail truncated (events_count snapshotted was 1).
  assert.equal(session.events.length, 1);
});

test('rewindSession returns 409-equivalent when buffer empty', () => {
  const session = buildSession();
  const result = rewindSession(session);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'buffer_empty');
  assert.equal(result.budget_remaining, 3);
});

test('rewindSession rejects when budget exhausted', () => {
  const session = buildSession();
  // Force budget=0
  ensureRewindState(session).budget_remaining = 0;
  snapshotSession(session);
  const result = rewindSession(session);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'budget_exhausted');
});

test('budget decrements once per rewind, not per snapshot', () => {
  const session = buildSession();
  snapshotSession(session);
  snapshotSession(session);
  const state = ensureRewindState(session);
  assert.equal(state.budget_remaining, 3);
  rewindSession(session);
  assert.equal(state.budget_remaining, 2);
  rewindSession(session);
  assert.equal(state.budget_remaining, 1);
});

test('resetRewind clears buffer + restores default budget', () => {
  const session = buildSession();
  snapshotSession(session);
  rewindSession(session);
  resetRewind(session);
  const summary = rewindStateSummary(session);
  assert.equal(summary.budget_remaining, 3);
  assert.equal(summary.snapshots_count, 0);
});

test('pickSnapshotState + applySnapshot round trip integrity', () => {
  const session = buildSession({ turn: 7, sistema_pressure: 12 });
  const snap = pickSnapshotState(session);
  // Mutate then re-apply.
  session.turn = 99;
  session.sistema_pressure = 0;
  session.units = [];
  const applied = applySnapshot(session, snap);
  assert.equal(applied, true);
  assert.equal(session.turn, 7);
  assert.equal(session.sistema_pressure, 12);
  assert.equal(session.units.length, 2);
});

test('rewindStateSummary returns defaults when no state attached', () => {
  const session = { session_id: 's2' };
  const summary = rewindStateSummary(session);
  assert.equal(summary.budget_remaining, 3);
  assert.equal(summary.budget_max, 3);
  assert.equal(summary.snapshots_count, 0);
  assert.equal(summary.buffer_size, 3);
});
