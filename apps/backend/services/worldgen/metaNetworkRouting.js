// Meta-network campaign routing — TKT-WORLDGEN-GAPC MVP fase 1 (2026-05-31).
//
// Pure next-node selection over the meta-network graph. Q4 verdict =
// player-choice (Into the Breach / Slay the Spire): given the current node and
// campaign context, return the ELIGIBLE next-node candidates WITH preview
// (biome, weight, edge type/resistance) for the player to pick — never an
// auto-pick. The Godot HUD renders the choice (fase 3); the backend supplies the
// candidates + a deterministic order so tests + replays are stable.
//
// MVP conditions are TOPOLOGY-ONLY (no new data fields, no data mutation): a
// candidate is eligible unless its target node is already cleared
// (prior_node_cleared), unless ctx.allowRevisit. Richer arc-conditions
// (requires_trait / min_pressure / season / biome_affinity) need a YAML schema
// bump = DATA GATE, deferred to fase 2 (spec §7.3-Q2, master-dd verdict).
//
// Deterministic ordering: weight DESC, then node_id ASC. No RNG (keeps the MVP
// reproducible; weighted-random is an opt-in fase-2/3 alternative, spec §7.3-Q4).
//
// Pure: graph + context injected; no I/O. Mirrors foodwebFilter's thin-transform
// role. Returns:
//   { applied, from, candidates:[{node_id, biome_id, weight, edge_type,
//     resistance, seasonality}], excluded:[node_id], reason }
//   reason ∈ no_graph | no_node | terminal | all_cleared | filtered | eligible

'use strict';

function _norm(v) {
  return String(v == null ? '' : v)
    .trim()
    .toLowerCase();
}

function selectNextNodes(currentNodeId, ctx = {}) {
  const graph = ctx.graph || null;
  const empty = (applied, reason) => ({
    applied,
    from: currentNodeId || null,
    candidates: [],
    excluded: [],
    reason,
  });

  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return empty(false, 'no_graph');
  }

  const nodeByKey = new Map();
  for (const n of graph.nodes) nodeByKey.set(_norm(n.id), n);

  const fromKey = _norm(currentNodeId);
  if (!nodeByKey.has(fromKey)) {
    return empty(false, 'no_node');
  }

  const outgoing = graph.edges.filter((e) => _norm(e.from) === fromKey);
  if (outgoing.length === 0) {
    return empty(true, 'terminal');
  }

  const cleared = new Set((Array.isArray(ctx.clearedNodes) ? ctx.clearedNodes : []).map(_norm));
  const allowRevisit = ctx.allowRevisit === true;

  const candidates = [];
  const excluded = [];
  for (const e of outgoing) {
    const targetNode = nodeByKey.get(_norm(e.to)) || null;
    if (!allowRevisit && cleared.has(_norm(e.to))) {
      excluded.push(e.to);
      continue;
    }
    candidates.push({
      node_id: e.to,
      biome_id: targetNode ? (targetNode.biome_id ?? null) : null,
      weight: targetNode ? Number(targetNode.weight) || 0 : 0,
      edge_type: e.type || 'corridor',
      resistance: Number.isFinite(Number(e.resistance)) ? Number(e.resistance) : 0,
      seasonality: e.seasonality ?? null,
    });
  }

  // Deterministic: weight DESC, then node_id ASC.
  candidates.sort((a, b) => b.weight - a.weight || a.node_id.localeCompare(b.node_id));

  let reason;
  if (candidates.length === 0) reason = 'all_cleared';
  else if (excluded.length > 0) reason = 'filtered';
  else reason = 'eligible';

  return { applied: true, from: currentNodeId, candidates, excluded, reason };
}

module.exports = { selectNextNodes };
