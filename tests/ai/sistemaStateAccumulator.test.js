// M1 — sistemaStateAccumulator pure-fn unit tests (no DB).
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  accumulate,
  HIGH_THREAT_KILLS,
} = require('../../apps/backend/services/ai/sistemaStateAccumulator');

function session(units, events) {
  return { units: units || [], events: events || [] };
}
function pg(id) {
  return { id, controlled_by: 'player' };
}
function sis(id) {
  return { id, controlled_by: 'sistema' };
}
function killEvent(actor_id, target_id) {
  return { action_type: 'kill', actor_id, target_id };
}

test('sightings +1 per PG present this encounter', () => {
  const out = accumulate({}, session([pg('p1'), pg('p2'), sis('s1')], []));
  assert.equal(out.p1.sightings, 1);
  assert.equal(out.p2.sightings, 1);
  assert.equal(out.s1, undefined); // sistema units not tracked
});

test('kills_vs_sistema increments when PG kills SIS', () => {
  const out = accumulate({}, session([pg('p1'), sis('s1')], [killEvent('p1', 's1')]));
  assert.equal(out.p1.kills_vs_sistema, 1);
});

test('ignores SIS-kills-PG events', () => {
  const out = accumulate({}, session([pg('p1'), sis('s1')], [killEvent('s1', 'p1')]));
  assert.equal(out.p1.kills_vs_sistema, 0);
});

test('threat_level flips to high at HIGH_THREAT_KILLS', () => {
  const prior = {
    p1: { kills_vs_sistema: HIGH_THREAT_KILLS - 1, sightings: 5, threat_level: 'normal' },
  };
  const out = accumulate(prior, session([pg('p1'), sis('s1')], [killEvent('p1', 's1')]));
  assert.equal(out.p1.kills_vs_sistema, HIGH_THREAT_KILLS);
  assert.equal(out.p1.threat_level, 'high');
});

test('prior counters carried forward (multi-session)', () => {
  const prior = { p1: { kills_vs_sistema: 1, sightings: 2, threat_level: 'normal' } };
  const out = accumulate(prior, session([pg('p1')], []));
  assert.equal(out.p1.kills_vs_sistema, 1); // no kills this session
  assert.equal(out.p1.sightings, 3); // +1 presence
});

test('empty prior + empty session -> empty object', () => {
  const out = accumulate({}, session([], []));
  assert.deepEqual(out, {});
});

test('does not mutate prior input', () => {
  const prior = { p1: { kills_vs_sistema: 1, sightings: 1, threat_level: 'normal' } };
  const snapshot = JSON.stringify(prior);
  accumulate(prior, session([pg('p1')], [killEvent('p1', 's1')]));
  assert.equal(JSON.stringify(prior), snapshot);
});
