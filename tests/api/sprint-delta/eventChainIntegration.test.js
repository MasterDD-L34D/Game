// Sprint δ Meta Systemic — Pattern 2 integration smoke test.
//
// Verifies eventChainScripting integrates via narrativeEngine bridge.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { triggerEventChain } = require('../../../services/narrative/narrativeEngine');
const { _resetCache } = require('../../../apps/backend/services/meta/eventChainScripting');

test('triggerEventChain via narrative bridge: completes savana chain', () => {
  _resetCache();
  const session = { vcSnapshot: { axes: { T_F: 0.7 } } };
  const result = triggerEventChain('savana_intro_chain', session);
  assert.equal(result.ok, true);
  assert.ok(result.walked_events.length > 0);
  assert.equal(result.walked_events[0].id, 'arrive');
});

test('triggerEventChain via narrative bridge: chain not found graceful', () => {
  _resetCache();
  const result = triggerEventChain('not_a_real_chain', {});
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'chain_not_found');
});
