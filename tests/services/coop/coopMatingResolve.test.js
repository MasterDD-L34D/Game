'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CoopOrchestrator } = require('../../../apps/backend/services/coop/coopOrchestrator');

function debriefWithSurvivors() {
  const o = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'h1' });
  o.startRun({ scenarioStack: ['enc_a'] });
  o.phase = 'combat';
  o.endCombat({ outcome: 'victory', survivors: [{ id: 'u_a' }, { id: 'u_b' }] });
  return o;
}

test('endCombat persists survivors on run', () => {
  const o = debriefWithSurvivors();
  assert.deepEqual(
    o.run.survivors.map((u) => u.id),
    ['u_a', 'u_b'],
  );
});

test('resolveMatingWinner returns winner once quorum met, then null (idempotent)', () => {
  const o = debriefWithSurvivors();
  o.voteMating('p1', 'u_a__u_b', { allPlayerIds: ['p1'] });
  const w = o.resolveMatingWinner(['p1'], ['p1']);
  assert.equal(w.pair_id, 'u_a__u_b');
  assert.equal(w.parent_a_id, 'u_a');
  assert.equal(w.parent_b_id, 'u_b');
  assert.equal(w.campaign_id, o.run.id);
  assert.equal(o.resolveMatingWinner(['p1'], ['p1']), null);
});

test('resolveMatingWinner null before quorum', () => {
  const o = debriefWithSurvivors();
  assert.equal(o.resolveMatingWinner(['p1', 'p2'], ['p1', 'p2']), null);
});
