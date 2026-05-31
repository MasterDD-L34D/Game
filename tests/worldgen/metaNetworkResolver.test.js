'use strict';

// TKT-WORLDGEN-GAPC MVP (fase 1) — metaNetworkResolver read-only loader.
// Clone of ecosystemResolver: parses meta_network_alpha.yaml into a graph
// (nodes + directed edges) for campaign routing. No writes, no generation.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getNetwork,
  getNode,
  getOutgoingEdges,
  _resetCache,
} = require('../../apps/backend/services/worldgen/metaNetworkResolver');

test('getNetwork: loads the alpha network graph', () => {
  _resetCache();
  const net = getNetwork();
  assert.ok(net, 'network loaded');
  assert.equal(net.id, 'ET_NET_ALPHA');
  assert.ok(Array.isArray(net.nodes) && net.nodes.length === 5, '5 nodes');
  assert.ok(Array.isArray(net.edges) && net.edges.length >= 10, '>=10 edges');
});

test('getNetwork: nodes carry id + biome_id + weight', () => {
  _resetCache();
  const net = getNetwork();
  const badlands = net.nodes.find((n) => n.id === 'BADLANDS');
  assert.ok(badlands, 'BADLANDS node present');
  assert.equal(badlands.biome_id, 'canyons_risonanti');
  assert.equal(badlands.weight, 0.45);
});

test('getNode: case-insensitive lookup by node id', () => {
  _resetCache();
  assert.equal(getNode('FORESTA_TEMPERATA').biome_id, 'foresta_miceliale');
  assert.equal(getNode('foresta_temperata').id, 'FORESTA_TEMPERATA', 'lowercase id resolves');
  assert.equal(getNode('nope'), null, 'unknown id -> null');
  assert.equal(getNode(null), null, 'null -> null');
});

test('getOutgoingEdges: returns directed edges from a node with metadata', () => {
  _resetCache();
  const edges = getOutgoingEdges('BADLANDS');
  assert.ok(edges.length >= 2, 'BADLANDS has >=2 outgoing edges');
  for (const e of edges) {
    assert.equal(e.from, 'BADLANDS');
    assert.ok(typeof e.to === 'string' && e.to.length > 0);
    assert.ok(typeof e.type === 'string');
    assert.ok(Number.isFinite(e.resistance));
  }
  const targets = edges.map((e) => e.to);
  assert.ok(targets.includes('FORESTA_TEMPERATA'));
  assert.ok(targets.includes('DESERTO_CALDO'));
});

test('getOutgoingEdges: unknown / null node -> empty array (no throw)', () => {
  _resetCache();
  assert.deepEqual(getOutgoingEdges('ghost'), []);
  assert.deepEqual(getOutgoingEdges(null), []);
});

test('getOutgoingEdges: case-insensitive on source node', () => {
  _resetCache();
  const upper = getOutgoingEdges('CRYOSTEPPE');
  const lower = getOutgoingEdges('cryosteppe');
  assert.equal(lower.length, upper.length, 'same edge count regardless of case');
  assert.ok(upper.length >= 1);
});
