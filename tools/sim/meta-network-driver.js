'use strict';
// fase-2c routing wiring: a meta-network traversal harness over the GAP-C routing graph.
// Thin wrapper on GET /api/campaign/meta-network/next (selectNextNodes) + a greedy graph
// walk, so the full-loop sim family can EXERCISE the routing graph in test-context. The
// endpoint is flag-gated (META_NETWORK_ROUTING=true); when the flag is off it returns
// { enabled:false } and this driver is a no-op -- matching the live campaign (the runner's
// act/chapter routing is untouched; PROD-enable of meta-network routing is a separate
// master-dd verdict, goal doc fase-2c). `http` injected (supertest in tests, fetch in prod).

// One next-node query. Returns the endpoint body verbatim:
//   { enabled, network_id?, applied?, from?, candidates[], excluded[], blocked[], reason? }
async function nextNodes(http, { from, cleared = [], allowRevisit = false, season } = {}) {
  const query = { from };
  if (Array.isArray(cleared) && cleared.length) query.cleared = cleared.join(',');
  if (allowRevisit) query.allow_revisit = '1';
  if (season) query.season = season;
  const r = await http.get('/api/campaign/meta-network/next', query);
  return r.body || {};
}

// Greedy traversal of the routing graph: from `start`, repeatedly take the FIRST candidate
// (selectNextNodes already orders weight DESC, node_id ASC -> deterministic "pick the
// strongest open route"), mark the current node cleared (anti-revisit), and move on. Stops
// on a terminal/all-cleared/all-blocked node, when no candidate remains, or at maxSteps.
// Flag-aware: a disabled endpoint short-circuits to a no-op result. Returns the path + a
// per-step trace + coverage stats (distinct nodes + reasons seen) = routing-graph coverage.
async function traverse(http, { start, season, allowRevisit = false, maxSteps = 12 } = {}) {
  const path = [];
  const steps = [];
  const cleared = [];
  let current = start;
  let enabled = true;
  let terminalReason = 'max_steps';

  for (let i = 0; i < maxSteps; i += 1) {
    const res = await nextNodes(http, { from: current, cleared, allowRevisit, season });
    if (res.enabled === false) {
      enabled = false;
      terminalReason = 'flag_off';
      break;
    }
    const candidates = Array.isArray(res.candidates) ? res.candidates : [];
    path.push(current);
    steps.push({
      from: current,
      reason: res.reason || 'unknown',
      candidates: candidates.length,
      excluded: Array.isArray(res.excluded) ? res.excluded.length : 0,
      blocked: Array.isArray(res.blocked) ? res.blocked.length : 0,
      picked: candidates.length ? candidates[0].node_id : null,
    });
    if (!candidates.length) {
      terminalReason = res.reason || 'no_candidate';
      break;
    }
    cleared.push(current);
    current = candidates[0].node_id;
  }

  const visited = [...new Set(path)];
  return {
    enabled,
    start,
    season: season || null,
    path,
    steps,
    cleared,
    terminalReason,
    coverage: {
      nodes_visited: visited.length,
      reasons: [...new Set(steps.map((s) => s.reason))],
    },
  };
}

module.exports = { nextNodes, traverse };
