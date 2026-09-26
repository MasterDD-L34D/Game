// Q-001 T2.4 PR-3 · Replay Engine test suite (MVP viewer mode).

const test = require('node:test');
const assert = require('node:assert/strict');

const { createReplayEngine } = require('../../services/replay/replayEngine');

function mockPayload() {
  return {
    session_id: 'test-session',
    events: [
      { action_type: 'move', turn: 1, actor_id: 'p1', position_to: [1, 0] },
      { action_type: 'attack', turn: 1, actor_id: 'p1', target_id: 'e1', damage_dealt: 3 },
      { action_type: 'move', turn: 2, actor_id: 'e1', position_to: [4, 4] },
      { action_type: 'attack', turn: 2, actor_id: 'e1', target_id: 'p1', damage_dealt: 2 },
      { action_type: 'heal', turn: 3, actor_id: 'p1', target_id: 'p1', damage_dealt: -4 },
    ],
    units_snapshot_initial: [
      { id: 'p1', hp: 10, max_hp: 10, position: { x: 0, y: 0 }, controlled_by: 'player' },
      { id: 'e1', hp: 10, max_hp: 10, position: { x: 5, y: 5 }, controlled_by: 'sistema' },
    ],
    meta: { turns_played: 3, events_count: 5, export_version: 1 },
  };
}

// ─────────────────────────────────────────────────────────────────
// Constructor + basic state
// ─────────────────────────────────────────────────────────────────

test('createReplayEngine throws on invalid payload', () => {
  assert.throws(() => createReplayEngine(null));
  assert.throws(() => createReplayEngine({}));
  assert.throws(() => createReplayEngine({ events: 'not array' }));
});

test('engine starts at step 0 with initial snapshot', () => {
  const engine = createReplayEngine(mockPayload());
  assert.equal(engine.currentStep, 0);
  assert.equal(engine.totalSteps, 5);
  const state = engine.getCurrentState();
  assert.equal(state.events_seen, 0);
  assert.equal(state.units.find((u) => u.id === 'p1').hp, 10);
  assert.equal(state.current_event, null);
  assert.ok(state.next_event);
});

// ─────────────────────────────────────────────────────────────────
// step / stepBack
// ─────────────────────────────────────────────────────────────────

test('step applies move event', () => {
  const engine = createReplayEngine(mockPayload());
  engine.step();
  const state = engine.getCurrentState();
  const p1 = state.units.find((u) => u.id === 'p1');
  assert.deepEqual(p1.position, { x: 1, y: 0 });
});

test('step applies attack event with damage', () => {
  const engine = createReplayEngine(mockPayload());
  engine.step(); // move
  engine.step(); // attack p1→e1, damage 3
  const state = engine.getCurrentState();
  const e1 = state.units.find((u) => u.id === 'e1');
  assert.equal(e1.hp, 7);
});

test('step applies heal event (negative damage = positive heal)', () => {
  const engine = createReplayEngine(mockPayload());
  engine.seekTo(4); // after attack p1 takes 2 damage
  const before = engine.getCurrentState().units.find((u) => u.id === 'p1').hp;
  engine.step(); // heal event damage=-4
  const after = engine.getCurrentState().units.find((u) => u.id === 'p1').hp;
  assert.ok(after > before, `heal increased hp (${before} → ${after})`);
  assert.ok(after <= 10, 'heal capped at max_hp');
});

test('step beyond last event is no-op', () => {
  const engine = createReplayEngine(mockPayload());
  engine.seekTo(5);
  const before = engine.currentStep;
  engine.step();
  assert.equal(engine.currentStep, before);
});

test('stepBack rewinds by one', () => {
  const engine = createReplayEngine(mockPayload());
  engine.step();
  engine.step();
  const p1Before = engine.getCurrentState().units.find((u) => u.id === 'p1').position;
  engine.stepBack();
  assert.equal(engine.currentStep, 1);
  // After rewind, only 1 event applied (move)
  const p1After = engine.getCurrentState().units.find((u) => u.id === 'p1');
  assert.deepEqual(p1After.position, { x: 1, y: 0 });
});

test('stepBack at 0 is no-op', () => {
  const engine = createReplayEngine(mockPayload());
  engine.stepBack();
  assert.equal(engine.currentStep, 0);
});

// ─────────────────────────────────────────────────────────────────
// seekTo / seekToTurn / seekToEvent
// ─────────────────────────────────────────────────────────────────

test('seekTo jumps to specific step', () => {
  const engine = createReplayEngine(mockPayload());
  engine.seekTo(3);
  const state = engine.getCurrentState();
  // p1 moved + attacked (events 0,1), e1 moved (event 2)
  const p1 = state.units.find((u) => u.id === 'p1');
  const e1 = state.units.find((u) => u.id === 'e1');
  assert.deepEqual(p1.position, { x: 1, y: 0 });
  assert.equal(e1.hp, 7);
  assert.deepEqual(e1.position, { x: 4, y: 4 });
});

test('seekTo clamps to valid range', () => {
  const engine = createReplayEngine(mockPayload());
  engine.seekTo(999);
  assert.equal(engine.currentStep, 5);
  engine.seekTo(-5);
  assert.equal(engine.currentStep, 0);
});

test('seekToTurn finds first event of given turn', () => {
  const engine = createReplayEngine(mockPayload());
  const idx = engine.seekToTurn(2);
  assert.equal(idx, 2); // event index 2 is first turn=2 event
});

test('seekToEvent with custom predicate', () => {
  const engine = createReplayEngine(mockPayload());
  const idx = engine.seekToEvent((e) => e.action_type === 'heal');
  assert.equal(idx, 4);
});

test('seekToTurn beyond all events returns null', () => {
  const engine = createReplayEngine(mockPayload());
  const idx = engine.seekToTurn(99);
  assert.equal(idx, null);
});

// ─────────────────────────────────────────────────────────────────
// reset + determinism
// ─────────────────────────────────────────────────────────────────

test('reset returns to initial state', () => {
  const engine = createReplayEngine(mockPayload());
  engine.seekTo(5);
  engine.reset();
  assert.equal(engine.currentStep, 0);
  const state = engine.getCurrentState();
  assert.equal(state.units.find((u) => u.id === 'p1').hp, 10);
  assert.equal(state.units.find((u) => u.id === 'e1').hp, 10);
});

test('same step count produces deterministic state', () => {
  const e1 = createReplayEngine(mockPayload());
  const e2 = createReplayEngine(mockPayload());
  e1.seekTo(3);
  e2.step();
  e2.step();
  e2.step();
  assert.deepEqual(e1.getCurrentState().units, e2.getCurrentState().units);
});

test('engine without units_snapshot_initial still processes events', () => {
  const engine = createReplayEngine({
    session_id: 'x',
    events: [{ action_type: 'attack', turn: 1, target_id: 'nonexistent', damage_dealt: 5 }],
    meta: { export_version: 1, events_count: 1, turns_played: 1 },
  });
  engine.step(); // no-op on nonexistent target, should not throw
  const state = engine.getCurrentState();
  assert.equal(state.events_seen, 1);
});
