const { test } = require('node:test');
const assert = require('node:assert');
const {
  TIERS,
  validateDeviceEvent,
  DEFAULT_TIER_BY_CLASS,
} = require('../../../apps/backend/services/deviceInput/eventSchema');

test('TIERS has the 4 canonical tiers', () => {
  assert.deepEqual([...TIERS].sort(), ['aggregated', 'private', 'public', 'secret']);
});

test('valid decision event passes', () => {
  const ev = {
    kind: 'decision',
    type: 'route_vote',
    playerId: 'p1',
    tier: 'public',
    payload: { route: 'A' },
  };
  const r = validateDeviceEvent(ev);
  assert.equal(r.ok, true);
});

test('signal event gets default tier when omitted', () => {
  const ev = { kind: 'signal', type: 'commit_latency', playerId: 'p1', value: 1200 };
  const r = validateDeviceEvent(ev);
  assert.equal(r.ok, true);
  assert.equal(r.event.tier, DEFAULT_TIER_BY_CLASS.signal); // 'secret'
});

test('raw events are rejected on the wire', () => {
  const ev = { kind: 'raw', type: 'tap', playerId: 'p1' };
  const r = validateDeviceEvent(ev);
  assert.equal(r.ok, false);
  assert.match(r.error, /raw/i);
});

test('invalid tier is rejected', () => {
  const ev = { kind: 'signal', type: 'x', playerId: 'p1', tier: 'banana' };
  const r = validateDeviceEvent(ev);
  assert.equal(r.ok, false);
});
