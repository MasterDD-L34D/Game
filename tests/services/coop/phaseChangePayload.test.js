// PR-0 §22 coop-WS surface — buildPhaseChangePayload helper.
// Extracts the duplicated { phase, round, scenario } payload built inline at
// coop.js:broadcastCoopState + wsSession.js (reconnect snapshot + host
// transfer). Pure builder, no behavior change vs the prior inline shape.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPhaseChangePayload,
} = require('../../../apps/backend/services/coop/phaseChangePayload');

function orchWith({ phase = 'combat', run = null } = {}) {
  return { phase, run };
}

test('buildPhaseChangePayload: active run surfaces phase/round/scenario', () => {
  const orch = orchWith({
    phase: 'combat',
    run: { currentIndex: 1, scenarioStack: ['enc_a', 'enc_b'] },
  });
  const p = buildPhaseChangePayload(orch);
  assert.deepEqual(p, { phase: 'combat', round: 1, scenario: 'enc_b' });
});

test('buildPhaseChangePayload: null run defaults round=0 scenario=null', () => {
  const orch = orchWith({ phase: 'lobby', run: null });
  const p = buildPhaseChangePayload(orch);
  assert.deepEqual(p, { phase: 'lobby', round: 0, scenario: null });
});

test('buildPhaseChangePayload: extra fields merge over base (e.g. reason)', () => {
  const orch = orchWith({
    phase: 'world_setup',
    run: { currentIndex: 0, scenarioStack: ['enc_a'] },
  });
  const p = buildPhaseChangePayload(orch, { reason: 'host_transferred' });
  assert.deepEqual(p, {
    phase: 'world_setup',
    round: 0,
    scenario: 'enc_a',
    reason: 'host_transferred',
  });
});
