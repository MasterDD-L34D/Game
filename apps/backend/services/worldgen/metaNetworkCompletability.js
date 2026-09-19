'use strict';
// Dormans completability validator for the meta-network graph. Pure, no I/O. Guarantees
// (pre-flight) that the campaign can always reach a terminal node from the start under every
// season -- a graph that can strand a run is a data bug. Lock-and-key (Dormans): an edge gated
// by prior_node_cleared opens once its prereq nodes are themselves reachable; we iterate
// reachability to a fixpoint, so a key that is generated before its lock is honoured.

const { evalEdgeConditions } = require('./metaNetworkRouting');

function _norm(v) {
  return String(v == null ? '' : v)
    .trim()
    .toLowerCase();
}

// A node is terminal if flagged `terminal` OR it has no outgoing edges (dead-end climax).
function _isTerminalNode(graph, nodeKey) {
  const n = graph.nodes.find((x) => _norm(x.id) === nodeKey);
  if (n && n.terminal) return true;
  return !graph.edges.some((e) => _norm(e.from) === nodeKey);
}

// Fixpoint reachable set from `start` under `season`. clearedNodes = everything reachable so far
// (sound lock-and-key approximation: a prereq is satisfied iff that node is reachable earlier).
function _reachable(graph, start, season) {
  const reach = new Set([_norm(start)]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const e of graph.edges) {
      const from = _norm(e.from);
      const to = _norm(e.to);
      if (!reach.has(from) || reach.has(to)) continue;
      const ctx = { season, clearedNodes: [...reach] };
      if (evalEdgeConditions(e.conditions, ctx).ok) {
        reach.add(to);
        grew = true;
      }
    }
  }
  return reach;
}

// For each (start_node, season) verify a terminal node is reachable. Returns
// { ok, stranded:[{start, season, reachable}], detail }.
function checkCompletable(graph, { seasons = [null] } = {}) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return { ok: false, stranded: [{ start: null, season: null }], detail: 'no_graph' };
  }
  const start = graph.start_node;
  if (!start) return { ok: true, stranded: [], detail: 'no start_node (graph routing inactive)' };
  const stranded = [];
  for (const season of seasons) {
    const reach = _reachable(graph, start, season);
    const hitsTerminal = [...reach].some((k) => _isTerminalNode(graph, k));
    if (!hitsTerminal) stranded.push({ start, season, reachable: [...reach] });
  }
  return {
    ok: stranded.length === 0,
    stranded,
    detail: stranded.length ? 'stranded states' : 'completable',
  };
}

// Dev-surface startup warning (never throws). Returns a one-line string or null.
function completabilityWarning(graph, seasons = [null, 'spring', 'summer', 'autumn', 'winter']) {
  try {
    const r = checkCompletable(graph, { seasons });
    if (r.ok) return null;
    const states = r.stranded.map((s) => ({ start: s.start, season: s.season }));
    return `[metaNetworkCompletability] WARN: graph can strand a run: ${JSON.stringify(states)}`;
  } catch {
    return null;
  }
}

module.exports = { checkCompletable, completabilityWarning, _reachable, _isTerminalNode };
