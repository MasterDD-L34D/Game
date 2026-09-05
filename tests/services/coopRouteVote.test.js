// GAP-C fase-3 -- co-op meta-network route vote (per-node, mirror voteWorld/
// voteMating). The route choice is offered at the debrief->next-encounter
// transition when POST /api/campaign/advance returns >1 candidate. Phones vote
// per node_id; routeTally counts per node and breaks a tie by candidate.weight
// (master-dd Q2; the Godot RouteChoiceFlow.resolve_tie_break mirrors this).
//
// Storage is phase-agnostic (mirror formPulses/revealAcks): voteRoute is gated
// on an OPEN route choice (openRouteChoice), not a strict PHASES enum value.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { CoopOrchestrator } = require('../../apps/backend/services/coop/coopOrchestrator');

function setupOrch() {
  const co = new CoopOrchestrator({ roomCode: 'ROUTE', hostId: 'p_h' });
  co.startRun({ scenarioStack: ['enc_demo_01'] });
  return co;
}

// node names + weights mirror the real graph candidate shape (node_id + weight).
const CANDS = [
  { node_id: 'BADLANDS', biome_id: 'badlands', weight: 0.7, encounter_id: 'enc_a' },
  { node_id: 'CRYOSTEPPE', biome_id: 'cryosteppe', weight: 0.9, encounter_id: 'enc_b' },
  { node_id: 'ATOLLO', biome_id: 'atollo', weight: 0.5, encounter_id: 'enc_c' },
];

test('openRouteChoice: stores candidates, clears prior votes, emits event', () => {
  const co = setupOrch();
  const events = [];
  co.on((evt) => events.push(evt));
  const stored = co.openRouteChoice(CANDS);
  assert.equal(stored.length, 3);
  assert.deepEqual(
    stored.map((c) => c.node_id),
    ['BADLANDS', 'CRYOSTEPPE', 'ATOLLO'],
  );
  assert.equal(co.routeVotes.size, 0);
  assert.ok(events.some((e) => e.kind === 'route_choice_open'));
});

test('openRouteChoice: filters candidates without a node_id', () => {
  const co = setupOrch();
  const stored = co.openRouteChoice([...CANDS, { biome_id: 'no_node', weight: 1 }, null]);
  assert.equal(stored.length, 3);
});

test('voteRoute: throws when no route choice is open', () => {
  const co = setupOrch();
  assert.throws(() => co.voteRoute('p1', 'BADLANDS'), /route_choice_not_open/);
});

test('voteRoute: throws on missing player_id / node_id', () => {
  const co = setupOrch();
  co.openRouteChoice(CANDS);
  assert.throws(() => co.voteRoute(null, 'BADLANDS'), /player_id_required/);
  assert.throws(() => co.voteRoute('p1', null), /node_id_required/);
});

test('voteRoute: throws when node_id is not an open candidate', () => {
  const co = setupOrch();
  co.openRouteChoice(CANDS);
  assert.throws(() => co.voteRoute('p1', 'NOT_A_NODE'), /invalid_route_node/);
});

test('voteRoute: records vote + returns tally; leading is the most-voted node', () => {
  const co = setupOrch();
  co.openRouteChoice(CANDS);
  co.voteRoute('p1', 'BADLANDS', { allPlayerIds: ['p1', 'p2'] });
  const tally = co.voteRoute('p2', 'BADLANDS', { allPlayerIds: ['p1', 'p2'] });
  assert.equal(tally.leading_node_id, 'BADLANDS');
  assert.equal(tally.pending, 0);
  assert.equal(tally.total, 2);
  const badlands = tally.tallies.find((t) => t.node_id === 'BADLANDS');
  assert.equal(badlands.votes, 2);
});

test('voteRoute: idempotent re-vote replaces the player previous node', () => {
  const co = setupOrch();
  co.openRouteChoice(CANDS);
  co.voteRoute('p1', 'BADLANDS');
  const tally = co.voteRoute('p1', 'ATOLLO');
  assert.equal(co.routeVotes.size, 1);
  assert.equal(tally.per_player.p1.node_id, 'ATOLLO');
  assert.equal(tally.leading_node_id, 'ATOLLO');
});

test('routeTally tie-break (master-dd Q2): equal votes -> highest candidate.weight wins', () => {
  const co = setupOrch();
  co.openRouteChoice(CANDS);
  // 1 vote each for BADLANDS (w=0.7) and CRYOSTEPPE (w=0.9): a genuine 1-1 tie.
  co.voteRoute('p1', 'BADLANDS', { allPlayerIds: ['p1', 'p2'] });
  const tally = co.voteRoute('p2', 'CRYOSTEPPE', { allPlayerIds: ['p1', 'p2'] });
  assert.equal(tally.tallies[0].votes, tally.tallies[1].votes, 'a real tie on votes');
  assert.equal(tally.leading_node_id, 'CRYOSTEPPE', 'highest weight breaks the tie');
});

test('routeTally tie-break fallback: equal votes + equal weight -> node_id asc (deterministic)', () => {
  const co = setupOrch();
  co.openRouteChoice([
    { node_id: 'ZED', weight: 0.5 },
    { node_id: 'ABE', weight: 0.5 },
  ]);
  co.voteRoute('p1', 'ZED', { allPlayerIds: ['p1', 'p2'] });
  const tally = co.voteRoute('p2', 'ABE', { allPlayerIds: ['p1', 'p2'] });
  assert.equal(tally.leading_node_id, 'ABE', 'lexicographic node_id asc is the stable fallback');
});

test('routeTally: connected-only quorum fields (mirror worldTally / matingTally)', () => {
  const co = setupOrch();
  co.openRouteChoice(CANDS);
  co.voteRoute('p1', 'BADLANDS', { allPlayerIds: ['p1', 'p2'], connectedPlayerIds: ['p1'] });
  const tally = co.routeTally(['p1', 'p2'], ['p1']);
  assert.equal(tally.connected_total, 1);
  assert.equal(tally.connected_voted, 1);
  assert.equal(tally.connected_pending, 0);
  assert.equal(tally.all_connected_voted, true);
});

test('startRun resets routeVotes + routeCandidates (mirror worldVotes/matingVotes)', () => {
  // Fresh orch (phase=lobby): seed stale route state from a hypothetical prior
  // run, then startRun must clear it via the reset block.
  const co = new CoopOrchestrator({ roomCode: 'ROUTE', hostId: 'p_h' });
  co.routeCandidates = [{ node_id: 'BADLANDS', weight: 0.7 }];
  co.routeVotes.set('p1', { node_id: 'BADLANDS', ts: 1 });
  co.startRun({ scenarioStack: ['enc_demo_01'] });
  assert.equal(co.routeVotes.size, 0);
  assert.equal(co.routeCandidates, null);
});
