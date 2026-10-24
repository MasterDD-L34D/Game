// M1 -- computePersistentHighThreat roster gating (codex P1 #2363).
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computePersistentHighThreat,
} = require('../../apps/backend/services/ai/declareSistemaIntents');

function sess(units, unitsObserved) {
  return { units: units || [], sistema_state: { units_observed: unitsObserved || {} } };
}
const HIGH = { kills_vs_sistema: 3, sightings: 5, threat_level: 'high' };
const NORMAL = { kills_vs_sistema: 1, sightings: 2, threat_level: 'normal' };
function pg(id, hp) {
  return { id, controlled_by: 'player', hp: hp == null ? 10 : hp };
}
function sis(id) {
  return { id, controlled_by: 'sistema', hp: 10 };
}

test('present + alive high-threat PG -> true', () => {
  assert.equal(computePersistentHighThreat(sess([pg('p1'), sis('s1')], { p1: HIGH })), true);
});

test('high-threat PG in history but ABSENT from roster -> false (the bug)', () => {
  assert.equal(computePersistentHighThreat(sess([pg('p2'), sis('s1')], { p1: HIGH })), false);
});

test('high-threat PG present but DEAD (hp<=0) -> false', () => {
  assert.equal(computePersistentHighThreat(sess([pg('p1', 0), sis('s1')], { p1: HIGH })), false);
});

test('present PG with normal threat -> false', () => {
  assert.equal(computePersistentHighThreat(sess([pg('p1')], { p1: NORMAL })), false);
});

test('no sistema_state -> false (back-compat)', () => {
  assert.equal(computePersistentHighThreat({ units: [pg('p1')] }), false);
});

test('empty session -> false', () => {
  assert.equal(computePersistentHighThreat({}), false);
});
