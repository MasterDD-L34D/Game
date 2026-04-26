// 2026-04-26 — mbtiInsights tests (P0 Tier S Disco quick-win).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generateActorInsights,
  buildMbtiInsights,
  AXIS_INSIGHTS,
  ENNEA_INSIGHTS,
} = require('../../apps/backend/services/narrative/mbtiInsights');

test('generateActorInsights: INTP yields 2 insights (1 axis + 1 ennea)', () => {
  const vc = {
    mbti_type: 'INTP',
    ennea_archetypes: [{ type: 5 }],
    aggregate_indices: { aggro: 0.4, explore: 0.7 },
  };
  const out = generateActorInsights(vc);
  assert.equal(out.length, 2);
  assert.ok(out[0].length > 10, 'axis insight non-empty');
  assert.ok(out[1].includes('Tipo 5'), 'ennea insight Type 5');
});

test('generateActorInsights: empty mbti returns ennea only if present', () => {
  const vc = {
    mbti_type: null,
    ennea_archetypes: [{ type: 7 }],
  };
  const out = generateActorInsights(vc);
  assert.equal(out.length, 1);
  assert.ok(out[0].includes('Tipo 7'));
});

test('generateActorInsights: invalid mbti format returns empty axes', () => {
  const vc = {
    mbti_type: 'XYZ', // invalid (3 chars)
    ennea_archetypes: [],
  };
  const out = generateActorInsights(vc);
  assert.equal(out.length, 0);
});

test('generateActorInsights: ENFJ axes high/high/low/high', () => {
  const vc = {
    mbti_type: 'ENFJ',
    ennea_archetypes: [],
  };
  const out = generateActorInsights(vc);
  assert.equal(out.length, 1);
  // ENFJ: E (high E_I), N (high S_N), F (low T_F), J (high J_P)
  // Pick axisCount=1 default → 1 axis insight
});

test('generateActorInsights: deterministic stable pick (no rng)', () => {
  const vc = {
    mbti_type: 'INTP',
    ennea_archetypes: [{ type: 5 }],
  };
  const out1 = generateActorInsights(vc);
  const out2 = generateActorInsights(vc);
  assert.deepEqual(out1, out2, 'same input → same output');
});

test('buildMbtiInsights: empty vcSnapshot returns {}', () => {
  assert.deepEqual(buildMbtiInsights(null), {});
  assert.deepEqual(buildMbtiInsights({}), {});
  assert.deepEqual(buildMbtiInsights({ per_actor: {} }), {});
});

test('buildMbtiInsights: 2 actors map by id', () => {
  const snap = {
    per_actor: {
      p1: { mbti_type: 'INTP', ennea_archetypes: [{ type: 5 }] },
      p2: { mbti_type: 'ESFP', ennea_archetypes: [{ type: 7 }] },
    },
  };
  const out = buildMbtiInsights(snap);
  assert.ok(out.p1, 'p1 has insights');
  assert.ok(out.p2, 'p2 has insights');
  assert.notEqual(out.p1[1], out.p2[1], 'different ennea types');
});

test('AXIS_INSIGHTS: all 4 axes present con high+low palette', () => {
  const expected = ['E_I', 'S_N', 'T_F', 'J_P'];
  for (const axis of expected) {
    assert.ok(AXIS_INSIGHTS[axis], `${axis} present`);
    assert.ok(Array.isArray(AXIS_INSIGHTS[axis].high), `${axis}.high array`);
    assert.ok(Array.isArray(AXIS_INSIGHTS[axis].low), `${axis}.low array`);
    assert.ok(AXIS_INSIGHTS[axis].high.length > 0, `${axis}.high non-empty`);
    assert.ok(AXIS_INSIGHTS[axis].low.length > 0, `${axis}.low non-empty`);
  }
});

test('ENNEA_INSIGHTS: all 9 types covered', () => {
  for (let i = 1; i <= 9; i++) {
    assert.ok(ENNEA_INSIGHTS[i], `Type ${i} present`);
    assert.ok(ENNEA_INSIGHTS[i].includes(`Tipo ${i}`), `string contains 'Tipo ${i}'`);
  }
});
