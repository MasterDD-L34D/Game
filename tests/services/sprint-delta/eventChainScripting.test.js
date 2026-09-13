// Sprint δ Meta Systemic — Pattern 2 tests (Stellaris event chain).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  loadChain,
  validateChain,
  evalCondition,
  triggerEvent,
  _resetCache,
} = require('../../../apps/backend/services/meta/eventChainScripting');

const SEED_DIR = path.resolve(__dirname, '../../../data/core/narrative/event_chains');

test('loadChain: loads valid YAML chain from seed dir', () => {
  _resetCache();
  const chain = loadChain('savana_intro_chain', { chainsDir: SEED_DIR });
  assert.ok(chain);
  assert.equal(chain.chain_id, 'savana_intro_chain');
  assert.ok(Array.isArray(chain.events));
  assert.ok(chain.events.length >= 3);
});

test('triggerEvent: condition true → walks chain to completion', () => {
  _resetCache();
  const session = { vcSnapshot: { axes: { T_F: 0.8 } } };
  const result = triggerEvent('savana_intro_chain', session, { chainsDir: SEED_DIR });
  assert.equal(result.ok, true);
  assert.equal(result.halted_at, null);
  assert.equal(result.reason, 'chain_complete');
  // arrive → scout → feeling_check (T_F>0.5 true) → confront_emotional
  assert.equal(result.walked_events.length, 4);
});

test('triggerEvent: condition false → halts at gating event', () => {
  _resetCache();
  const session = { vcSnapshot: { axes: { T_F: 0.2 } } };
  const result = triggerEvent('savana_intro_chain', session, { chainsDir: SEED_DIR });
  assert.equal(result.ok, true);
  assert.equal(result.halted_at, 'feeling_check');
  assert.equal(result.reason, 'condition_false');
  // arrive + scout walked, feeling_check halted (not appended)
  assert.equal(result.walked_events.length, 2);
});

test('triggerEvent: missing chain_id → returns chain_not_found', () => {
  _resetCache();
  const result = triggerEvent('nonexistent_chain', {}, { chainsDir: SEED_DIR });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'chain_not_found');
});

test('validateChain: detects duplicate ids and unsupported ops', () => {
  const bad = {
    chain_id: 'bad',
    events: [
      { id: 'a', text_it: 'A' },
      { id: 'a', text_it: 'A2' },
      { id: 'b', text_it: 'B', condition: { vc_axis: 'T_F', threshold: 0, op: '~~' } },
    ],
  };
  const result = validateChain(bad);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.startsWith('duplicate_event_id')));
  assert.ok(result.errors.some((e) => e.startsWith('unsupported_op')));
});

test('evalCondition: missing axis returns false (defensive)', () => {
  const result = evalCondition({ vc_axis: 'T_F', threshold: 0.5, op: '>' }, {});
  assert.equal(result, false);
});

test('evalCondition: null condition returns true (always-pass)', () => {
  assert.equal(evalCondition(null, {}), true);
  assert.equal(evalCondition(undefined, {}), true);
});

test('triggerEvent: multi-chain isolation — different chains do not interfere', () => {
  _resetCache();
  const session = { vcSnapshot: { axes: { T_F: 0.8, J_P: 0.3 } } };
  const r1 = triggerEvent('savana_intro_chain', session, { chainsDir: SEED_DIR });
  const r2 = triggerEvent('caverna_mystery_chain', session, { chainsDir: SEED_DIR });
  assert.equal(r1.ok, true);
  assert.equal(r2.ok, true);
  assert.equal(r1.chain_id, 'savana_intro_chain');
  assert.equal(r2.chain_id, 'caverna_mystery_chain');
  assert.notDeepEqual(r1.walked_events, r2.walked_events);
});
