'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { foldObservations } = require('../../apps/backend/services/ai/sistemaStateAccumulator');

test('sightings +1 per roster PG, kills accumulate, threat flips at 3', () => {
  let uo = foldObservations({}, { roster: ['skiv_7', 'skiv_3'], kills: { skiv_7: 2 } });
  assert.equal(uo.skiv_7.sightings, 1);
  assert.equal(uo.skiv_7.kills_vs_sistema, 2);
  assert.equal(uo.skiv_7.threat_level, 'normal');
  assert.equal(uo.skiv_3.sightings, 1);
  assert.equal(uo.skiv_3.kills_vs_sistema, 0);
  uo = foldObservations(uo, { roster: ['skiv_7', 'skiv_3'], kills: { skiv_7: 1 } });
  assert.equal(uo.skiv_7.sightings, 2);
  assert.equal(uo.skiv_7.kills_vs_sistema, 3);
  assert.equal(uo.skiv_7.threat_level, 'high');
});

test('empty observations is a no-op clone of prior', () => {
  const prior = { skiv_7: { kills_vs_sistema: 3, sightings: 2, threat_level: 'high' } };
  const uo = foldObservations(prior, { roster: [], kills: {} });
  assert.deepEqual(uo, prior);
  assert.notEqual(uo, prior, 'returns a copy, does not mutate');
});

test('malformed input safe', () => {
  assert.deepEqual(foldObservations(null, null), {});
  assert.deepEqual(foldObservations(undefined, { roster: 'x', kills: 5 }), {});
});
