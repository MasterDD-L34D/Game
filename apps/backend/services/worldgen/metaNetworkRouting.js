// Meta-network campaign routing — TKT-WORLDGEN-GAPC (MVP fase 1 + fase 2 arc-conditions).
//
// Pure next-node selection over the meta-network graph. Q4 verdict =
// player-choice (Into the Breach / Slay the Spire): given the current node and
// campaign context, return the ELIGIBLE next-node candidates WITH preview
// (biome, weight, edge type/resistance) for the player to pick — never an
// auto-pick. The Godot HUD renders the choice (fase 3); the backend supplies the
// candidates + a deterministic order so tests + replays are stable.
//
// Fase 1: TOPOLOGY-ONLY filter (anti-revisit: a candidate is excluded if its
// target node is already cleared, unless ctx.allowRevisit).
//
// Fase 2 (arc-conditions, ADR-2026-05-31 ACCEPTED — Stage 1): edges may carry a
// `conditions:` block = Dormans lock-and-key (an edge is a door, the condition is
// the key). Semantics (ADR D1):
//   - no conditions block / empty -> always eligible (passthrough, back-compat);
//   - AND across keys (all must pass);
//   - OR within a list-value (e.g. season: [winter, autumn] -> any match);
//   - fail-closed: a required state missing, or an unknown/not-yet-implemented
//     condition key, blocks the edge (band-safe: at worst the caller falls back
//     to the static route — a gate never silently opens).
// Stage-1 evaluators: { season, prior_node_cleared }. min_pressure/max_pressure
// + biome_affinity are fase-2 v1.1 (ADR) and hit the unknown-key fail-closed
// path until implemented. NOTE: the prior_node_cleared CONDITION is a
// PREREQUISITE ("node Y must be cleared to traverse this edge") — distinct from
// the anti-revisit gate that excludes already-cleared TARGET nodes.
//
// Parallel edges: a target is eligible if AT LEAST ONE edge to it passes both
// gates (OR across parallel edges); it is reported blocked only when NO edge to
// it passes. Representative edge = lowest resistance; all types kept in
// edge_types so no routing info is lost.
//
// Deterministic ordering: weight DESC, then node_id ASC. No RNG (keeps the MVP
// reproducible; weighted-random is an opt-in fase-3 alternative).
//
// Pure: graph + context injected; no I/O. Mirrors foodwebFilter's thin-transform
// role. Returns:
//   { applied, from, candidates:[{node_id, biome_id, weight, edge_type,
//     resistance, seasonality, edge_types}], excluded:[node_id],
//     blocked:[{node_id, blocked_by}], reason }
//   reason ∈ no_graph | no_node | terminal | all_cleared | all_blocked |
//            filtered | eligible

'use strict';

function _norm(v) {
  return String(v == null ? '' : v)
    .trim()
    .toLowerCase();
}

function _list(v) {
  return Array.isArray(v) ? v : [v];
}

// Arc-condition evaluators (fase 2, Stage 1). Each is pure: (value, ctx) -> bool.
// Adding a key here makes it "known"; unknown keys fail closed in evalEdgeConditions.
const _COND = {
  // Current campaign season is in the allowed set (EN enum, case-insensitive).
  // Reads ctx.season (e.g. campaignSeasonalState.current_season). Fail-closed
  // when absent: a season-gated edge stays locked until the season is known.
  season(value, ctx) {
    if (ctx.season == null) return false;
    return _list(value).map(_norm).includes(_norm(ctx.season));
  },
  // PREREQUISITE key: every listed node must be in ctx.clearedNodes.
  prior_node_cleared(value, ctx) {
    const cleared = new Set((Array.isArray(ctx.clearedNodes) ? ctx.clearedNodes : []).map(_norm));
    return _list(value).every((id) => cleared.has(_norm(id)));
  },
};

// Evaluate an edge's conditions against ctx. Returns { ok, blocked_by }.
// No conditions / empty -> ok (passthrough). AND across keys; the first failing
// or unknown key -> { ok:false, blocked_by:key }.
function evalEdgeConditions(conditions, ctx) {
  if (!conditions || typeof conditions !== 'object') return { ok: true, blocked_by: null };
  const keys = Object.keys(conditions);
  if (keys.length === 0) return { ok: true, blocked_by: null };
  for (const key of keys) {
    const evaluator = _COND[key];
    if (!evaluator || !evaluator(conditions[key], ctx)) {
      return { ok: false, blocked_by: key };
    }
  }
  return { ok: true, blocked_by: null };
}

function selectNextNodes(currentNodeId, ctx = {}) {
  const graph = ctx.graph || null;
  const empty = (applied, reason) => ({
    applied,
    from: currentNodeId || null,
    candidates: [],
    excluded: [],
    blocked: [],
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

  // The player picks a NODE, not an edge. Collapse parallel edges to the same
  // target into ONE candidate (the real graph has e.g. CRYOSTEPPE -> BADLANDS
  // via both corridor and trophic_spillover). Representative edge = the
  // easiest-to-traverse (lowest resistance); all parallel edge types are kept
  // in edge_types so no routing info is lost.
  const byTarget = new Map(); // node_id key -> candidate (edge passed both gates)
  const clearExcluded = new Set(); // target node already cleared (anti-revisit)
  const condBlockedBy = new Map(); // target key -> { node_id, blocked_by } (arc-condition)
  for (const e of outgoing) {
    const toKey = _norm(e.to);
    if (!allowRevisit && cleared.has(toKey)) {
      clearExcluded.add(e.to);
      continue;
    }
    const cond = evalEdgeConditions(e.conditions, ctx);
    if (!cond.ok) {
      // Record once per target; a later parallel edge may still pass (OR).
      if (!condBlockedBy.has(toKey)) {
        condBlockedBy.set(toKey, { node_id: e.to, blocked_by: cond.blocked_by });
      }
      continue;
    }
    const targetNode = nodeByKey.get(toKey) || null;
    const resistance = Number.isFinite(Number(e.resistance)) ? Number(e.resistance) : 0;
    const edgeType = e.type || 'corridor';
    const existing = byTarget.get(toKey);
    if (!existing) {
      byTarget.set(toKey, {
        node_id: e.to,
        biome_id: targetNode ? (targetNode.biome_id ?? null) : null,
        weight: targetNode ? Number(targetNode.weight) || 0 : 0,
        edge_type: edgeType,
        resistance,
        seasonality: e.seasonality ?? null,
        edge_types: [edgeType],
      });
      continue;
    }
    // Merge parallel edge: record its type; adopt it as representative when it
    // is easier to traverse (lower resistance).
    if (!existing.edge_types.includes(edgeType)) existing.edge_types.push(edgeType);
    if (resistance < existing.resistance) {
      existing.edge_type = edgeType;
      existing.resistance = resistance;
      existing.seasonality = e.seasonality ?? null;
    }
  }

  const candidates = [...byTarget.values()];
  for (const c of candidates) c.edge_types.sort();

  // A target blocked by a condition is only "blocked" if NO edge to it passed
  // (OR across parallel edges).
  const blocked = [];
  for (const [toKey, info] of condBlockedBy) {
    if (!byTarget.has(toKey)) blocked.push(info);
  }

  const excludedSet = new Set(clearExcluded);
  for (const b of blocked) excludedSet.add(b.node_id);
  const excluded = [...excludedSet];

  // Deterministic: weight DESC, then node_id ASC.
  candidates.sort((a, b) => b.weight - a.weight || a.node_id.localeCompare(b.node_id));

  let reason;
  if (candidates.length === 0) {
    reason = blocked.length > 0 ? 'all_blocked' : 'all_cleared';
  } else if (excluded.length > 0) {
    reason = 'filtered';
  } else {
    reason = 'eligible';
  }

  return { applied: true, from: currentNodeId, candidates, excluded, blocked, reason };
}

// --- TKT-WORLDGEN-GAPC slice A (live routing) — node->encounter + terminal lookups.
// Pure helpers over a resolved graph (metaNetworkResolver shape: nodes carry
// encounters[] + terminal). selectNextNodes decides WHERE to go; these decide WHAT a
// node serves and whether the run ends there.

// The encounter a node serves. MVP N=1: the first id is the node's encounter (node =
// region, 1:N, default N=1 — master-dd verdict). Case-insensitive on the node id;
// null on a missing graph/node or an encounter-less node (fail-closed: surfaced, no serve).
function encounterForNode(graph, nodeId) {
  if (!graph || !Array.isArray(graph.nodes) || !nodeId) return null;
  const n = graph.nodes.find((x) => _norm(x.id) === _norm(nodeId));
  return n && Array.isArray(n.encounters) && n.encounters.length ? n.encounters[0] : null;
}

// Whether a node is the terminal climax (reaching + clearing it ends the run). Case-
// insensitive; false on a missing graph/node (a graph that can strand a run is a data
// bug caught by the completability assertion, not a crash here).
function isTerminal(graph, nodeId) {
  if (!graph || !Array.isArray(graph.nodes) || !nodeId) return false;
  const n = graph.nodes.find((x) => _norm(x.id) === _norm(nodeId));
  return !!(n && n.terminal);
}

module.exports = { selectNextNodes, encounterForNode, isTerminal, evalEdgeConditions };
