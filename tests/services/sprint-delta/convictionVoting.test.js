// Sprint δ Meta Systemic — Pattern 4 tests (Triangle Strategy conviction voting).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  initBallot,
  castVote,
  tally,
  tallyConviction,
  closeBallot,
  computeVoteWeight,
  _resetBallots,
} = require('../../../apps/backend/services/meta/convictionVoting');

function setupBallot(session_id) {
  return initBallot(session_id, [
    { choice_id: 'attack', vc_axis: 'T_F', vc_target: -0.8 },
    { choice_id: 'parley', vc_axis: 'T_F', vc_target: 0.8, is_status_quo: true },
  ]);
}

test('castVote: single voter — outcome reflects choice', () => {
  _resetBallots();
  const init = setupBallot('s_single');
  assert.equal(init.ok, true);
  const r = castVote('s_single', 'p1', 'attack', { axes: { T_F: -0.6 } });
  assert.equal(r.ok, true);
  const t = tally('s_single');
  assert.equal(t.winner_choice_id, 'attack');
});

test('castVote: weighted outcome — closer alignment wins', () => {
  _resetBallots();
  setupBallot('s_weighted');
  // Player1: T_F=-0.8 (perfect attack alignment, weight near 2.0)
  castVote('s_weighted', 'p1', 'attack', { axes: { T_F: -0.8 } });
  // Player2: T_F=0.5 (weak parley alignment)
  // Player3: T_F=0.4 (weak parley alignment)
  castVote('s_weighted', 'p2', 'parley', { axes: { T_F: 0.5 } });
  castVote('s_weighted', 'p3', 'parley', { axes: { T_F: 0.4 } });
  const t = tally('s_weighted');
  // p1 attack weight = 2.0 (perfect), parley weight p2 = 1+(1-0.15)=1.85, p3 = 1+(1-0.20)=1.80
  // Total: attack=2.0, parley=3.65 → parley wins
  assert.equal(t.winner_choice_id, 'parley');
});

test('castVote: tie-break prefers status_quo choice', () => {
  _resetBallots();
  setupBallot('s_tie');
  // Both votes weight 1.0 (no axis match) on different choices
  castVote('s_tie', 'p1', 'attack', { axes: {} });
  castVote('s_tie', 'p2', 'parley', { axes: {} });
  const t = tally('s_tie');
  assert.equal(t.tie, true);
  // parley flagged is_status_quo → wins tie
  assert.equal(t.winner_choice_id, 'parley');
});

test('computeVoteWeight: missing axis fallback = 1.0', () => {
  const w = computeVoteWeight({ vc_axis: 'T_F', vc_target: 0.5 }, { axes: {} });
  assert.equal(w, 1.0);
});

test('castVote: vote update — same player can change vote', () => {
  _resetBallots();
  setupBallot('s_update');
  castVote('s_update', 'p1', 'attack', { axes: { T_F: -0.8 } });
  let t = tally('s_update');
  assert.equal(t.winner_choice_id, 'attack');
  castVote('s_update', 'p1', 'parley', { axes: { T_F: 0.8 } });
  t = tally('s_update');
  assert.equal(t.winner_choice_id, 'parley');
  assert.equal(t.tally.find((x) => x.choice_id === 'attack').voter_count, 0);
});

test('tallyConviction: stateless helper produces consistent outcome', () => {
  const result = tallyConviction(
    [
      { choice_id: 'a', weight: 1.5 },
      { choice_id: 'a', weight: 1.0 },
      { choice_id: 'b', weight: 2.0 },
    ],
    [{ choice_id: 'a' }, { choice_id: 'b', is_status_quo: true }],
  );
  assert.equal(result.winner_choice_id, 'a');
  assert.equal(result.tie, false);
});

test('closeBallot: returns final result and removes ballot', () => {
  _resetBallots();
  setupBallot('s_close');
  castVote('s_close', 'p1', 'attack', { axes: { T_F: -0.8 } });
  const close = closeBallot('s_close');
  assert.equal(close.ok, true);
  assert.equal(close.result.winner_choice_id, 'attack');
  // Subsequent tally should fail
  const post = tally('s_close');
  assert.equal(post.ok, false);
});
