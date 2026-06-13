// tests/ai/utilityBrain.test.js — Utility AI brain unit tests
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  linear,
  linearInverse,
  quadratic,
  logarithmic,
  binary,
  scoreAction,
  selectAction,
  enumerateLegalActions,
  selectAiPolicyUtility,
} = require('../../apps/backend/services/ai/utilityBrain');

// ── Curves ──

test('linear clamps [0,1]', () => {
  assert.equal(linear(0), 0);
  assert.equal(linear(0.5), 0.5);
  assert.equal(linear(1), 1);
  assert.equal(linear(-1), 0);
  assert.equal(linear(2), 1);
});

test('linearInverse is 1-x', () => {
  assert.equal(linearInverse(0), 1);
  assert.equal(linearInverse(1), 0);
});

test('quadratic squares input', () => {
  assert.equal(quadratic(0.5), 0.25);
  assert.equal(quadratic(1), 1);
});

test('logarithmic maps [0,1]->[0,1]', () => {
  assert.ok(logarithmic(0) < 0.01);
  assert.ok(Math.abs(logarithmic(1) - 1) < 0.01);
});

test('binary returns 0 or 1', () => {
  assert.equal(binary(true), 1);
  assert.equal(binary(false), 0);
});

// ── enumerateLegalActions ──

test('enumerate: attack for in-range enemy', () => {
  const actor = {
    id: 'sis_1',
    team: 'sistema',
    hp: 10,
    max_hp: 10,
    position: { x: 0, y: 0 },
    attack_range: 2,
  };
  const state = {
    units: {
      sis_1: actor,
      p1: { team: 'player', hp: 8, max_hp: 10, position: { x: 1, y: 0 } },
    },
  };
  const actions = enumerateLegalActions(actor, state);
  assert.ok(actions.some((a) => a.type === 'attack' && a.target === 'p1'));
});

test('enumerate: stunned = skip only', () => {
  const actor = {
    id: 'sis_1',
    team: 'sistema',
    hp: 10,
    position: { x: 0, y: 0 },
    status: { stunned: 2 },
  };
  const state = {
    units: { sis_1: actor, p1: { team: 'player', hp: 8, position: { x: 1, y: 0 } } },
  };
  const actions = enumerateLegalActions(actor, state);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].type, 'skip');
});

test('enumerate: always includes retreat', () => {
  const actor = {
    id: 'sis_1',
    team: 'sistema',
    hp: 10,
    max_hp: 10,
    position: { x: 0, y: 0 },
    attack_range: 2,
  };
  const state = {
    units: { sis_1: actor, p1: { team: 'player', hp: 8, position: { x: 1, y: 0 } } },
  };
  assert.ok(enumerateLegalActions(actor, state).some((a) => a.type === 'retreat'));
});

// ── scoreAction ──

test('scoreAction: returns score > 0 with breakdown', () => {
  const action = { type: 'attack', target: 'p1' };
  const actor = { hp: 10, max_hp: 10, position: { x: 0, y: 0 }, id: 'sis', team: 'sistema' };
  const state = {
    units: { sis: actor, p1: { hp: 3, max_hp: 10, position: { x: 1, y: 0 }, team: 'player' } },
  };
  const r = scoreAction(action, actor, state);
  assert.ok(r.score > 0);
  assert.ok(r.breakdown.length > 0);
});

test('scoreAction: low-HP target scores higher', () => {
  const actor = { hp: 10, max_hp: 10, position: { x: 0, y: 0 }, id: 'sis', team: 'sistema' };
  const action = { type: 'attack', target: 't' };
  const weak = scoreAction(action, actor, {
    units: { sis: actor, t: { hp: 1, max_hp: 10, position: { x: 1, y: 0 }, team: 'player' } },
  });
  const strong = scoreAction(action, actor, {
    units: { sis: actor, t: { hp: 9, max_hp: 10, position: { x: 1, y: 0 }, team: 'player' } },
  });
  assert.ok(weak.score > strong.score, 'Low HP target should score higher');
});

// ── selectAction ──

test('selectAction: argmax picks highest', () => {
  const actor = { hp: 10, max_hp: 10, position: { x: 0, y: 0 }, id: 'sis', team: 'sistema' };
  const state = {
    units: { sis: actor, t1: { hp: 2, max_hp: 10, position: { x: 1, y: 0 }, team: 'player' } },
  };
  const actions = [{ type: 'attack', target: 't1' }, { type: 'retreat' }];
  const r = selectAction(actions, actor, state, { selection: 'argmax', noise: 0 });
  assert.ok(r);
  assert.equal(r.action.type, 'attack');
});

test('selectAction: empty = null', () => {
  assert.equal(selectAction([], {}, {}), null);
});

test('selectAction: random returns valid', () => {
  const actor = { hp: 10, max_hp: 10, position: { x: 0, y: 0 }, id: 'sis', team: 'sistema' };
  const state = {
    units: { sis: actor, t: { hp: 5, max_hp: 10, position: { x: 1, y: 0 }, team: 'player' } },
  };
  const r = selectAction([{ type: 'attack', target: 't' }, { type: 'retreat' }], actor, state, {
    selection: 'random',
  });
  assert.ok(r);
  assert.ok(['attack', 'retreat'].includes(r.action.type));
});

// ── selectAiPolicyUtility bridge ──

test('bridge: returns rule + intent', () => {
  const actor = {
    id: 'sis_1',
    team: 'sistema',
    hp: 10,
    max_hp: 10,
    position: { x: 0, y: 0 },
    attack_range: 2,
  };
  const target = { id: 'p1', team: 'player', hp: 5, max_hp: 10, position: { x: 1, y: 0 } };
  const r = selectAiPolicyUtility(actor, target);
  assert.ok(r.rule);
  assert.ok(r.intent);
  assert.ok(['attack', 'approach', 'retreat', 'skip'].includes(r.intent));
});
