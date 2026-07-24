'use strict';

// TKT-WORLDGEN-GAPC MVP (fase 1) — metaNetworkRouting pure selection.
// Q4 verdict = player-choice (Into the Breach): given a current node + context,
// return the ELIGIBLE next-node candidates with preview (biome, weight, edge
// type/resistance) for the player to choose from — NOT an auto-pick. MVP uses
// topology-only conditions (no new data fields): a candidate is eligible unless
// its target node is already cleared (prior_node_cleared), unless revisits are
// allowed. Deterministic ordering (weight desc, then id) so tests are stable.
//
// Pure: graph + context injected; no I/O. Mirrors the foodwebFilter "thin
// pure transform" role.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  selectNextNodes,
  encounterForNode,
  isTerminal,
} = require('../../apps/backend/services/worldgen/metaNetworkRouting');

// Minimal injected graph (mirrors meta_network_alpha shape).
function graph() {
  return {
    nodes: [
      { id: 'A', biome_id: 'biome_a', weight: 0.45 },
      { id: 'B', biome_id: 'biome_b', weight: 0.55 },
      { id: 'C', biome_id: 'biome_c', weight: 0.4 },
    ],
    edges: [
      { from: 'A', to: 'B', type: 'corridor', resistance: 0.6 },
      { from: 'A', to: 'C', type: 'seasonal_bridge', resistance: 0.5 },
      { from: 'B', to: 'A', type: 'trophic_spillover', resistance: 0.4 },
    ],
  };
}

test('selectNextNodes: returns eligible candidates with preview, sorted weight desc', () => {
  const res = selectNextNodes('A', { graph: graph(), clearedNodes: [] });
  assert.equal(res.applied, true);
  assert.equal(res.from, 'A');
  assert.equal(res.candidates.length, 2);
  // B (0.55) before C (0.4)
  assert.equal(res.candidates[0].node_id, 'B');
  assert.equal(res.candidates[0].biome_id, 'biome_b');
  assert.equal(res.candidates[0].weight, 0.55);
  assert.equal(res.candidates[0].edge_type, 'corridor');
  assert.equal(res.candidates[0].resistance, 0.6);
  assert.equal(res.candidates[1].node_id, 'C');
});

test('selectNextNodes: prior_node_cleared filters cleared targets by default', () => {
  const res = selectNextNodes('A', { graph: graph(), clearedNodes: ['B'] });
  assert.equal(res.candidates.length, 1);
  assert.equal(res.candidates[0].node_id, 'C');
  assert.deepEqual(res.excluded, ['B']);
  assert.equal(res.reason, 'filtered');
});

test('selectNextNodes: allowRevisit keeps cleared targets', () => {
  const res = selectNextNodes('A', { graph: graph(), clearedNodes: ['B'], allowRevisit: true });
  assert.equal(res.candidates.length, 2);
  assert.deepEqual(res.excluded, []);
});

test('selectNextNodes: all targets cleared -> empty candidates, reason all_cleared', () => {
  const res = selectNextNodes('A', { graph: graph(), clearedNodes: ['B', 'C'] });
  assert.equal(res.candidates.length, 0);
  assert.equal(res.reason, 'all_cleared');
});

test('selectNextNodes: terminal node (no outgoing) -> empty, reason terminal', () => {
  const res = selectNextNodes('C', { graph: graph(), clearedNodes: [] });
  assert.equal(res.candidates.length, 0);
  assert.equal(res.reason, 'terminal');
});

test('selectNextNodes: unknown current node -> passthrough no_node (back-compat)', () => {
  const res = selectNextNodes('ghost', { graph: graph(), clearedNodes: [] });
  assert.equal(res.applied, false);
  assert.equal(res.reason, 'no_node');
  assert.deepEqual(res.candidates, []);
});

test('selectNextNodes: no graph -> passthrough no_graph (back-compat)', () => {
  const res = selectNextNodes('A', { graph: null });
  assert.equal(res.applied, false);
  assert.equal(res.reason, 'no_graph');
});

test('selectNextNodes: deterministic tie-break by node_id when weights equal', () => {
  const g = {
    nodes: [
      { id: 'A', weight: 0 },
      { id: 'Z', weight: 0.5 },
      { id: 'M', weight: 0.5 },
    ],
    edges: [
      { from: 'A', to: 'Z', type: 'corridor', resistance: 0.5 },
      { from: 'A', to: 'M', type: 'corridor', resistance: 0.5 },
    ],
  };
  const res = selectNextNodes('A', { graph: g, clearedNodes: [] });
  // equal weight 0.5 -> id asc: M before Z
  assert.equal(res.candidates[0].node_id, 'M');
  assert.equal(res.candidates[1].node_id, 'Z');
});

test('selectNextNodes: edge to a missing node is skipped safely', () => {
  const g = {
    nodes: [{ id: 'A', weight: 0.4 }],
    edges: [{ from: 'A', to: 'PHANTOM', type: 'corridor', resistance: 0.5 }],
  };
  const res = selectNextNodes('A', { graph: g, clearedNodes: [] });
  // target node not in nodes[] -> candidate still surfaced with null biome (edge is real)
  assert.equal(res.candidates.length, 1);
  assert.equal(res.candidates[0].node_id, 'PHANTOM');
  assert.equal(res.candidates[0].biome_id, null);
});

// Codex P2 (#2483): the player picks a NODE, not an edge. Parallel edges to the
// same target (real graph: CRYOSTEPPE -> BADLANDS via both corridor AND
// trophic_spillover) must collapse to ONE candidate, keeping the easiest
// (lowest-resistance) edge as representative + listing all edge types.
test('selectNextNodes: parallel edges to the same node collapse to one candidate', () => {
  const g = {
    nodes: [
      { id: 'A', weight: 0.4 },
      { id: 'B', biome_id: 'biome_b', weight: 0.5 },
    ],
    edges: [
      { from: 'A', to: 'B', type: 'trophic_spillover', resistance: 0.7 },
      { from: 'A', to: 'B', type: 'corridor', resistance: 0.5 },
    ],
  };
  const res = selectNextNodes('A', { graph: g, clearedNodes: [] });
  assert.equal(res.candidates.length, 1, 'one candidate per unique node');
  const b = res.candidates[0];
  assert.equal(b.node_id, 'B');
  // representative = lowest-resistance edge (corridor 0.5, not trophic 0.7)
  assert.equal(b.resistance, 0.5);
  assert.equal(b.edge_type, 'corridor');
  // no info lost: all parallel edge types surfaced
  assert.deepEqual([...b.edge_types].sort(), ['corridor', 'trophic_spillover']);
});

test('selectNextNodes: single edge still exposes edge_types as a 1-element array', () => {
  const g = {
    nodes: [
      { id: 'A', weight: 0 },
      { id: 'B', weight: 0.5 },
    ],
    edges: [{ from: 'A', to: 'B', type: 'corridor', resistance: 0.5 }],
  };
  const res = selectNextNodes('A', { graph: g, clearedNodes: [] });
  assert.equal(res.candidates.length, 1);
  assert.equal(res.candidates[0].edge_type, 'corridor');
  assert.deepEqual(res.candidates[0].edge_types, ['corridor']);
});

// --- TKT-WORLDGEN-GAPC candidate preview enrichment: each candidate carries the encounter
// the target node serves (encounter_id, MVP N=1 = first id) + its terminal-climax flag, so the
// fase-3 Godot choice-UI can telegraph the destination (Into the Breach full-information) without
// a second lookup. Node-derived (not edge-derived) -> computed once per target, parallel-edge safe.
function previewGraph() {
  return {
    nodes: [
      { id: 'A', weight: 0 },
      { id: 'B', biome_id: 'biome_b', weight: 0.55, encounters: ['enc_b'], terminal: false },
      {
        id: 'Z',
        biome_id: 'biome_z',
        weight: 0.5,
        encounters: ['enc_boss', 'enc_b2'],
        terminal: true,
      },
      { id: 'N', biome_id: 'biome_n', weight: 0.4 }, // no encounters / no terminal flag
    ],
    edges: [
      { from: 'A', to: 'B', type: 'corridor', resistance: 0.5 },
      { from: 'A', to: 'Z', type: 'corridor', resistance: 0.5 },
      { from: 'A', to: 'N', type: 'corridor', resistance: 0.5 },
    ],
  };
}

test('candidate preview: each candidate carries encounter_id (N=1) + terminal from the target node', () => {
  const res = selectNextNodes('A', { graph: previewGraph(), clearedNodes: [] });
  const byId = Object.fromEntries(res.candidates.map((c) => [c.node_id, c]));
  assert.equal(byId.B.encounter_id, 'enc_b');
  assert.equal(byId.B.terminal, false);
  // N=1: the FIRST encounter is the node's encounter
  assert.equal(byId.Z.encounter_id, 'enc_boss');
  assert.equal(byId.Z.terminal, true, 'terminal climax flag surfaced for the UI');
});

test('candidate preview: encounter-less / flagless node -> encounter_id null + terminal false (back-compat)', () => {
  const res = selectNextNodes('A', { graph: previewGraph(), clearedNodes: [] });
  const n = res.candidates.find((c) => c.node_id === 'N');
  assert.equal(n.encounter_id, null);
  assert.equal(n.terminal, false);
});

test('candidate preview: parallel edges compute encounter_id/terminal once from the node', () => {
  const g = {
    nodes: [
      { id: 'A', weight: 0 },
      { id: 'B', weight: 0.5, encounters: ['enc_b'], terminal: true },
    ],
    edges: [
      { from: 'A', to: 'B', type: 'trophic_spillover', resistance: 0.7 },
      { from: 'A', to: 'B', type: 'corridor', resistance: 0.5 },
    ],
  };
  const res = selectNextNodes('A', { graph: g, clearedNodes: [] });
  assert.equal(res.candidates.length, 1);
  assert.equal(res.candidates[0].encounter_id, 'enc_b');
  assert.equal(res.candidates[0].terminal, true);
});

// --- TKT-WORLDGEN-GAPC fase 2 (arc-conditions, Stage 1) — ADR-2026-05-31 ACCEPTED.
// Edge `conditions:` block = Dormans lock-and-key. Semantics (ADR D1): AND across
// keys, OR within a list-value, fail-closed on missing state / unknown key,
// passthrough (always eligible) when no conditions block (back-compat). v1 keys =
// { season, prior_node_cleared }. NOTE: prior_node_cleared CONDITION is a
// PREREQUISITE ("node Y must be cleared to traverse") — distinct from the :72
// anti-revisit gate that excludes already-cleared TARGET nodes.
function condGraph(conditions) {
  return {
    nodes: [
      { id: 'A', weight: 0 },
      { id: 'B', biome_id: 'biome_b', weight: 0.5 },
    ],
    edges: [{ from: 'A', to: 'B', type: 'seasonal_bridge', resistance: 0.6, conditions }],
  };
}

test('arc-conditions: no conditions block -> always eligible (back-compat) + blocked []', () => {
  const res = selectNextNodes('A', {
    graph: condGraph(undefined),
    clearedNodes: [],
    season: 'summer',
  });
  assert.equal(res.candidates.length, 1);
  assert.equal(res.candidates[0].node_id, 'B');
  assert.deepEqual(res.blocked, []);
});

test('arc-conditions: season match -> eligible', () => {
  const res = selectNextNodes('A', {
    graph: condGraph({ season: ['winter'] }),
    clearedNodes: [],
    season: 'winter',
  });
  assert.equal(res.candidates.length, 1);
  assert.equal(res.candidates[0].node_id, 'B');
});

test('arc-conditions: season mismatch -> blocked, reason all_blocked, blocked_by season', () => {
  const res = selectNextNodes('A', {
    graph: condGraph({ season: ['winter'] }),
    clearedNodes: [],
    season: 'summer',
  });
  assert.equal(res.candidates.length, 0);
  assert.equal(res.reason, 'all_blocked');
  assert.deepEqual(res.blocked, [{ node_id: 'B', blocked_by: 'season' }]);
  assert.deepEqual(res.excluded, ['B']);
});

test('arc-conditions: season OR within a list-value', () => {
  const res = selectNextNodes('A', {
    graph: condGraph({ season: ['winter', 'autumn'] }),
    clearedNodes: [],
    season: 'autumn',
  });
  assert.equal(res.candidates.length, 1);
});

test('arc-conditions: season match is case-insensitive', () => {
  const res = selectNextNodes('A', {
    graph: condGraph({ season: ['winter'] }),
    clearedNodes: [],
    season: 'Winter',
  });
  assert.equal(res.candidates.length, 1);
});

test('arc-conditions: season fails closed when ctx.season is absent', () => {
  const res = selectNextNodes('A', { graph: condGraph({ season: ['winter'] }), clearedNodes: [] });
  assert.equal(res.candidates.length, 0);
  assert.equal(res.blocked[0].blocked_by, 'season');
});

test('arc-conditions: prior_node_cleared requires the prerequisite node be cleared', () => {
  const ok = selectNextNodes('A', {
    graph: condGraph({ prior_node_cleared: ['X'] }),
    clearedNodes: ['X'],
  });
  assert.equal(ok.candidates.length, 1, 'prerequisite X cleared -> eligible');
  const no = selectNextNodes('A', {
    graph: condGraph({ prior_node_cleared: ['X'] }),
    clearedNodes: [],
  });
  assert.equal(no.candidates.length, 0, 'prerequisite X not cleared -> blocked');
  assert.equal(no.blocked[0].blocked_by, 'prior_node_cleared');
});

test('arc-conditions: AND across keys (season + prior_node_cleared)', () => {
  const cond = { season: ['winter'], prior_node_cleared: ['X'] };
  const both = selectNextNodes('A', {
    graph: condGraph(cond),
    clearedNodes: ['X'],
    season: 'winter',
  });
  assert.equal(both.candidates.length, 1, 'both pass -> eligible');
  const half = selectNextNodes('A', {
    graph: condGraph(cond),
    clearedNodes: ['X'],
    season: 'summer',
  });
  assert.equal(half.candidates.length, 0, 'one fails -> blocked');
});

test('arc-conditions: unknown condition key fails closed (band-safe)', () => {
  const res = selectNextNodes('A', {
    graph: condGraph({ min_pressure: 3 }),
    clearedNodes: [],
    season: 'winter',
  });
  assert.equal(res.candidates.length, 0);
  assert.equal(res.blocked[0].blocked_by, 'min_pressure');
});

// --- TKT-WORLDGEN-GAPC slice A (live routing) — node->encounter + terminal helpers.
// Pure lookups over the resolved graph: which encounter a node serves (MVP N=1 = the
// first id) and whether a node is the terminal climax. Case-insensitive on the node id
// (mirrors selectNextNodes _norm); back-compat null/false on a missing/encounter-less node.
const routeGraph = {
  nodes: [
    { id: 'A', encounters: ['enc_x'], terminal: false },
    { id: 'B', encounters: [], terminal: false },
    { id: 'Z', encounters: ['enc_boss'], terminal: true },
  ],
};

test('encounterForNode: returns the node primary encounter (N=1), case-insensitive', () => {
  assert.equal(encounterForNode(routeGraph, 'A'), 'enc_x');
  assert.equal(encounterForNode(routeGraph, 'a'), 'enc_x');
  assert.equal(encounterForNode(routeGraph, 'Z'), 'enc_boss');
});

test('encounterForNode: null on a missing node, encounter-less node, or bad input', () => {
  assert.equal(encounterForNode(routeGraph, 'MISSING'), null);
  assert.equal(encounterForNode(routeGraph, 'B'), null, 'node with empty encounters -> null');
  assert.equal(encounterForNode(routeGraph, null), null);
  assert.equal(encounterForNode(null, 'A'), null, 'no graph -> null');
});

test('isTerminal: reflects node.terminal, false on missing / bad input', () => {
  assert.equal(isTerminal(routeGraph, 'Z'), true);
  assert.equal(isTerminal(routeGraph, 'z'), true, 'case-insensitive');
  assert.equal(isTerminal(routeGraph, 'A'), false);
  assert.equal(isTerminal(routeGraph, 'MISSING'), false);
  assert.equal(isTerminal(null, 'Z'), false, 'no graph -> false');
});

// Expansion PR1: the edge-condition evaluator is now exported (shared with the completability
// validator) so routing + completability agree on gate semantics (single source of truth).
const { evalEdgeConditions } = require('../../apps/backend/services/worldgen/metaNetworkRouting');

test('evalEdgeConditions: exported, shared gate eval (season + prior_node_cleared)', () => {
  assert.deepEqual(evalEdgeConditions(null, {}), { ok: true, blocked_by: null });
  assert.equal(evalEdgeConditions({ season: ['winter'] }, { season: 'winter' }).ok, true);
  assert.equal(evalEdgeConditions({ season: ['winter'] }, { season: 'summer' }).ok, false);
  assert.equal(evalEdgeConditions({ prior_node_cleared: ['X'] }, { clearedNodes: ['X'] }).ok, true);
  assert.equal(evalEdgeConditions({ prior_node_cleared: ['X'] }, { clearedNodes: [] }).ok, false);
  assert.equal(evalEdgeConditions({ min_pressure: 3 }, {}).ok, false, 'unknown key fails closed');
});
