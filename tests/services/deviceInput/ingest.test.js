const { test } = require('node:test');
const assert = require('node:assert');
const { ingest } = require('../../../apps/backend/services/deviceInput');

test('decision events are always ingested', () => {
  const log = [];
  const r = ingest(
    log,
    { kind: 'decision', type: 'route_vote', playerId: 'p1', tier: 'public' },
    { profilingConsent: false },
  );
  assert.equal(r.accepted, true);
  assert.equal(log.length, 1);
});

test('signal events dropped when consent is false (decision-only)', () => {
  const log = [];
  const r = ingest(
    log,
    { kind: 'signal', type: 'commit_latency', playerId: 'p1', value: 900 },
    { profilingConsent: false },
  );
  assert.equal(r.accepted, false);
  assert.equal(r.reason, 'profiling-opt-out');
  assert.equal(log.length, 0);
});

test('signal events ingested when consent is true', () => {
  const log = [];
  const r = ingest(
    log,
    { kind: 'signal', type: 'commit_latency', playerId: 'p1', value: 900 },
    { profilingConsent: true },
  );
  assert.equal(r.accepted, true);
  assert.equal(log.length, 1);
});

test('invalid (raw) event is rejected regardless of consent', () => {
  const log = [];
  const r = ingest(log, { kind: 'raw', type: 'tap', playerId: 'p1' }, { profilingConsent: true });
  assert.equal(r.accepted, false);
  assert.match(r.reason, /raw|invalid/i);
});
