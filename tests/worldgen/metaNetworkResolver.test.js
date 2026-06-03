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

// --- TKT-WORLDGEN-GAPC fase 2 (arc-conditions, Stage 1) — ADR-2026-05-31 ACCEPTED.
// The resolver must PASS THROUGH the new edge `conditions:` block (schema 2.1).
// The mapper previously dropped unknown fields -> conditions would be a silent
// no-op for routing. Resolver stays "dumb": it carries conditions verbatim,
// routing interprets them.
test('getOutgoingEdges: every edge exposes a conditions field (null when absent)', () => {
  _resetCache();
  const edges = getOutgoingEdges('BADLANDS');
  for (const e of edges) assert.ok('conditions' in e, 'edge exposes conditions key');
  const toForesta = edges.find((e) => e.to === 'FORESTA_TEMPERATA');
  assert.equal(toForesta.conditions, null, 'corridor edge with no gate -> conditions null');
});

test('arc-conditions data: winter seasonal_bridge edges gate on season [winter]', () => {
  _resetCache();
  const edges = getOutgoingEdges('FORESTA_TEMPERATA');
  const toCryo = edges.find((e) => e.to === 'CRYOSTEPPE');
  assert.ok(toCryo, 'FORESTA_TEMPERATA -> CRYOSTEPPE present');
  assert.ok(toCryo.conditions && Array.isArray(toCryo.conditions.season), 'season list present');
  assert.deepEqual(toCryo.conditions.season, ['winter']);
});

// --- TKT-WORLDGEN-GAPC slice A (live routing) — the node->encounter map. Each node
// may serve encounter(s) (MVP N=1) + flag a terminal climax; the network may name a
// start_node. The mapper must DEFAULT these additively (encounters -> [], terminal ->
// false, start_node -> null) so the graph stays back-compatible when the data is
// absent — mirrors the conditions strip fix (#2509).
test('getNetwork: nodes always carry encounters (array) + terminal (boolean), defaulted', () => {
  _resetCache();
  const net = getNetwork();
  for (const node of net.nodes) {
    assert.ok(Array.isArray(node.encounters), `node ${node.id} encounters is an array`);
    assert.equal(typeof node.terminal, 'boolean', `node ${node.id} terminal is boolean`);
  }
});

test('getNetwork: exposes network.start_node (string|null)', () => {
  _resetCache();
  const net = getNetwork();
  assert.ok(
    net.start_node === null || typeof net.start_node === 'string',
    'start_node is a string id or null',
  );
});

// Slice A data-gate (owner-gated, spec §4 starter assignment — master-dd ratifies at
// merge): the REAL alpha graph now names a start_node + a per-node encounter + a
// terminal climax. Asserts the authored data is wired through the mapper end-to-end.
test('getNetwork: real alpha graph carries the authored start_node + node encounters + terminal', () => {
  _resetCache();
  const net = getNetwork();
  assert.equal(net.start_node, 'DESERTO_CALDO', 'start node = savana (spec §4)');
  const byId = Object.fromEntries(net.nodes.map((n) => [n.id, n]));
  assert.deepEqual(byId.DESERTO_CALDO.encounters, ['enc_savana_01']);
  assert.deepEqual(byId.BADLANDS.encounters, ['enc_tutorial_03']);
  assert.deepEqual(byId.FORESTA_TEMPERATA.encounters, ['enc_caverna_02']);
  assert.deepEqual(byId.CRYOSTEPPE.encounters, ['enc_tutorial_04']);
  assert.deepEqual(byId.ROVINE_PLANARI.encounters, ['enc_tutorial_05', 'enc_tutorial_06_hardcore']);
  assert.equal(byId.ROVINE_PLANARI.terminal, true, 'ROVINE_PLANARI is the terminal climax');
  // Non-terminal nodes default false.
  assert.equal(byId.DESERTO_CALDO.terminal, false);
});

// Topology tuning (data-only follow-up): 1A adds a trophic edge DESERTO_CALDO -> FORESTA so
// the start branch exposes corridor + trophic; 2B gates the direct DESERTO_CALDO -> ROVINE
// (the terminal shortcut) behind prior_node_cleared [BADLANDS, FORESTA_TEMPERATA].
test('getOutgoingEdges: DESERTO_CALDO has the 1A trophic edge to FORESTA + the 2B gated ROVINE edge', () => {
  _resetCache();
  const edges = getOutgoingEdges('DESERTO_CALDO');
  const toForesta = edges.find((e) => e.to === 'FORESTA_TEMPERATA');
  assert.ok(toForesta, 'new trophic edge DESERTO_CALDO -> FORESTA_TEMPERATA present (1A)');
  assert.equal(toForesta.type, 'trophic_spillover');
  const toRovine = edges.find((e) => e.to === 'ROVINE_PLANARI');
  assert.ok(toRovine && toRovine.conditions, 'direct ROVINE edge carries a conditions gate (2B)');
  assert.deepEqual(toRovine.conditions.prior_node_cleared, ['BADLANDS', 'FORESTA_TEMPERATA']);
  // The corridor to BADLANDS stays ungated.
  const toBadlands = edges.find((e) => e.to === 'BADLANDS');
  assert.ok(toBadlands && toBadlands.type === 'corridor');
  assert.equal(toBadlands.conditions, null);
});
