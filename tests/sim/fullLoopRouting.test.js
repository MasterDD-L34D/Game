'use strict';
// TKT-WORLDGEN-GAPC slice A — the full-loop AI runner WALKS the meta-network graph when
// META_NETWORK_ROUTING is on: each step serves encounterForNode(currentNode) -> REAL
// combat -> on a multi-candidate branch the injected meta-POLICY picks a node_id ->
// /campaign/choose -> the run reaches the terminal node + completes. The route is
// POLICY-SENSITIVE (greedy vs an NT mbti diverge at the first branch) -> graph routing
// ties into P4. Flag OFF -> the static chapter walk (unchanged, covered by fullLoopRunner).
process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { runFullLoop } = require('../../tools/sim/full-loop-runner');
const greedyPolicy = require('../../tools/sim/greedy-policy');
const { makeMbtiPolicy } = require('../../tools/sim/mbti-policy');

function supertestHttp(app) {
  return {
    post: (path, body) =>
      request(app)
        .post(path)
        .send(body)
        .then((r) => ({ status: r.status, body: r.body })),
    get: (path, query) =>
      request(app)
        .get(path)
        .query(query || {})
        .then((r) => ({ status: r.status, body: r.body })),
  };
}

function starterRoster() {
  return [
    {
      id: 'hero_a',
      species: 'dune_stalker',
      job: 'stalker',
      hp: 30,
      max_hp: 30,
      ap: 3,
      mod: 20,
      attack_range: 2,
      initiative: 18,
      position: { x: 1, y: 1 },
      controlled_by: 'player',
      status: {},
    },
    {
      id: 'hero_b',
      species: 'velox',
      job: 'stalker',
      hp: 30,
      max_hp: 30,
      ap: 3,
      mod: 18,
      attack_range: 2,
      initiative: 16,
      position: { x: 1, y: 2 },
      controlled_by: 'player',
      status: {},
    },
  ];
}

async function runGraph(app, { playerId, seed, policy }) {
  process.env.META_NETWORK_ROUTING = 'true';
  try {
    return await runFullLoop(supertestHttp(app), {
      playerId,
      roster: starterRoster(),
      seed,
      policy,
      maxChapters: 15,
    });
  } finally {
    delete process.env.META_NETWORK_ROUTING;
  }
}

test('runFullLoop: flag ON walks the graph start->terminal, policy picks at the branch', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const greedy = await runGraph(app, {
    playerId: 'fl_route_greedy',
    seed: 'route-g',
    policy: greedyPolicy,
  });
  assert.equal(
    greedy.completed,
    true,
    `greedy graph run completes; chapters=${JSON.stringify(greedy.chapters)}`,
  );
  assert.deepEqual(
    greedy.violations,
    [],
    `no invariant violations: ${JSON.stringify(greedy.violations)}`,
  );
  // The run begins at the authored start_node and serves its real encounter.
  assert.ok(Array.isArray(greedy.route), 'graph run records the node route');
  assert.equal(greedy.route[0], 'DESERTO_CALDO', 'starts at start_node');
  assert.equal(greedy.chapters[0].encounter, 'enc_savana_01', 'serves the start node encounter');
  // greedy takes the weight-desc first candidate at the DESERTO_CALDO branch (ROVINE_PLANARI
  // w0.5 > BADLANDS w0.45) -> the terminal climax -> a short route.
  assert.equal(
    greedy.route[1],
    'ROVINE_PLANARI',
    `greedy picks the strongest open route; route=${greedy.route}`,
  );

  const intj = await runGraph(app, {
    playerId: 'fl_route_intj',
    seed: 'route-i',
    policy: makeMbtiPolicy('INTJ'),
  });
  assert.equal(
    intj.completed,
    true,
    `mbti graph run completes; chapters=${JSON.stringify(intj.chapters)}`,
  );
  assert.deepEqual(
    intj.violations,
    [],
    `no invariant violations: ${JSON.stringify(intj.violations)}`,
  );
  assert.equal(intj.route[0], 'DESERTO_CALDO', 'same start node');
  // The NT temperament prefers the corridor edge -> BADLANDS, NOT greedy's ROVINE_PLANARI.
  assert.equal(intj.route[1], 'BADLANDS', `NT prefers the corridor route; route=${intj.route}`);

  // POLICY-SENSITIVE: the two policies walk DIFFERENT routes from the same start.
  assert.notDeepEqual(greedy.route, intj.route, 'route is policy-sensitive (P4 hook)');
  assert.notEqual(
    greedy.route[1],
    intj.route[1],
    'the policies diverge at the first multi-candidate branch',
  );
});
