'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CoopOrchestrator } = require('../../../apps/backend/services/coop/coopOrchestrator');

function debriefOrch() {
  const o = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'h1' });
  o.startRun({ scenarioStack: ['enc_a'] });
  o.phase = 'debrief';
  return o;
}

test('voteMating records a vote and matingTally reports leading pair', () => {
  const o = debriefOrch();
  o.voteMating('p1', 'a__b', { allPlayerIds: ['p1', 'p2'] });
  o.voteMating('p2', 'a__b', { allPlayerIds: ['p1', 'p2'] });
  const tally = o.matingTally(['p1', 'p2']);
  assert.equal(tally.leading_pair_id, 'a__b');
  assert.equal(tally.tallies.find((t) => t.pair_id === 'a__b').votes, 2);
  assert.equal(tally.total, 2);
  assert.equal(tally.pending, 0);
});

test('voteMating re-vote replaces, not stacks; debrief gate enforced', () => {
  const o = debriefOrch();
  o.voteMating('p1', 'a__b', { allPlayerIds: ['p1'] });
  o.voteMating('p1', 'c__d', { allPlayerIds: ['p1'] });
  const tally = o.matingTally(['p1']);
  assert.equal(tally.leading_pair_id, 'c__d');
  assert.equal(tally.tallies.length, 1);
  const lobby = new CoopOrchestrator({ roomCode: 'ZZ', hostId: 'h' });
  assert.throws(() => lobby.voteMating('p1', 'a__b'), /not_in_debrief/);
});

test('matingVotes cleared on scenario advance (new debrief round)', () => {
  const o = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'h1' });
  o.startRun({ scenarioStack: ['e1', 'e2'] });
  o.phase = 'debrief';
  o.voteMating('p1', 'a__b', { allPlayerIds: ['p1'] });
  assert.equal(o.matingVotes.size, 1);
  o.advanceScenarioOrEnd();
  assert.equal(o.matingVotes.size, 0);
});
