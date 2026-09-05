'use strict';
// Expansion PR1 — Dormans completability validator. Pure pre-flight check that the meta-network
// graph can always reach a terminal node from the start under every season (a graph that can
// strand a run is a data bug). Lock-and-key: a prior_node_cleared gate opens once its prereq
// nodes are reachable (fixpoint).
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  checkCompletable,
  completabilityWarning,
} = require('../../apps/backend/services/worldgen/metaNetworkCompletability');
const resolver = require('../../apps/backend/services/worldgen/metaNetworkResolver');

// Completable: start A -> B (corridor) -> T (terminal, no outgoing).
const okGraph = {
  start_node: 'A',
  nodes: [{ id: 'A' }, { id: 'B' }, { id: 'T', terminal: true }],
  edges: [
    { from: 'A', to: 'B', type: 'corridor' },
    { from: 'B', to: 'T', type: 'corridor' },
  ],
};

// Stranded: T only reachable via a prior_node_cleared[Z] gate, but Z is never reachable.
const strandGraph = {
  start_node: 'A',
  nodes: [{ id: 'A' }, { id: 'T', terminal: true }],
  edges: [{ from: 'A', to: 'T', type: 'corridor', conditions: { prior_node_cleared: ['Z'] } }],
};

test('checkCompletable: a graph with a clear path to a terminal -> ok', () => {
  const r = checkCompletable(okGraph, { seasons: [null, 'winter'] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.stranded, []);
});

test('checkCompletable: a graph that can strand a run -> not ok, reports the state', () => {
  const r = checkCompletable(strandGraph, { seasons: [null] });
  assert.equal(r.ok, false);
  assert.equal(r.stranded.length, 1);
  assert.equal(r.stranded[0].start, 'A');
});

test('checkCompletable: no start_node -> ok (graph routing inactive)', () => {
  const r = checkCompletable({ nodes: [{ id: 'A' }], edges: [] }, {});
  assert.equal(r.ok, true);
});

test('completabilityWarning: null when ok, string when stranded', () => {
  assert.equal(completabilityWarning(okGraph, [null]), null);
  const w = completabilityWarning(strandGraph, [null]);
  assert.ok(typeof w === 'string' && /strand/i.test(w));
});

test('checkCompletable: the REAL alpha graph reaches a terminal in every season', () => {
  resolver._resetCache();
  const net = resolver.getNetwork();
  const r = checkCompletable(net, { seasons: [null, 'spring', 'summer', 'autumn', 'winter'] });
  assert.equal(r.ok, true, `alpha graph completable; stranded=${JSON.stringify(r.stranded)}`);
});

// Expansion PR2: the 6-node graph (Atollo added) stays completable AND the new node is reachable
// from the start (it sits on an ungated path CRYOSTEPPE -> ATOLLO -> ROVINE).
const { _reachable } = require('../../apps/backend/services/worldgen/metaNetworkCompletability');

test('checkCompletable: ATOLLO_OBSIDIANA is reachable + the 6-node graph stays completable', () => {
  resolver._resetCache();
  const net = resolver.getNetwork();
  const r = checkCompletable(net, { seasons: [null, 'spring', 'summer', 'autumn', 'winter'] });
  assert.equal(r.ok, true, `6-node graph completable; stranded=${JSON.stringify(r.stranded)}`);
  const reach = _reachable(net, net.start_node, null);
  // _reachable returns lowercased node keys.
  assert.ok([...reach].includes('atollo_obsidiana'), 'ATOLLO_OBSIDIANA reachable from start');
});
