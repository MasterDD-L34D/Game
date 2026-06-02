// Meta-network graph resolver — TKT-WORLDGEN-GAPC MVP fase 1 (2026-05-31).
//
// Read-only loader: parses packs/evo_tactics_pack/data/ecosystems/network/
// meta_network_alpha.yaml into a campaign-routing graph (biome nodes + directed
// typed edges). Consumed by metaNetworkRouting (next-node selection). No writes,
// no generation, no data mutation — the generative Dormans grammar is POST-MVP
// (see spec docs/superpowers/specs/2026-05-31-worldgen-gapc-...). Mirrors
// ecosystemResolver (GAP-A): cache + _resetCache test seam + graceful warn.
//
// YAML shape (network block):
//   network:
//     id: ET_NET_ALPHA
//     nodes: [{ id, biome_id, path, weight }]
//     edges: [{ from, to, type, resistance, seasonality, notes, conditions? }]
//       conditions (fase 2, schema 2.1): optional arc-condition map (lock-and-key)
//
// API:
//   getNetwork()              -> { id, label, nodes:[...], edges:[...] } | null
//   getNode(nodeId)           -> node | null     (case-insensitive on id)
//   getOutgoingEdges(nodeId)  -> [edge]          (directed from nodeId; [] if none)
//   _resetCache()             — test seam (re-read from disk on next call)

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const NETWORK_FILE = path.resolve(
  __dirname,
  '../../../../packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml',
);

let _cache = null;

function _norm(value) {
  return String(value == null ? '' : value)
    .trim()
    .toLowerCase();
}

function _load() {
  if (_cache) return _cache;
  let parsed = null;
  try {
    const raw = fs.readFileSync(NETWORK_FILE, 'utf-8');
    parsed = yaml.load(raw);
  } catch (err) {
    console.warn('[metaNetworkResolver] read failed:', NETWORK_FILE, err.message);
  }
  const net = parsed && parsed.network;
  if (!net || !Array.isArray(net.nodes)) {
    // Graceful: no graph -> empty structure (routing passthrough/back-compat).
    _cache = { network: null, nodeIndex: new Map(), edgesBySource: new Map() };
    return _cache;
  }

  const nodes = net.nodes.map((n) => ({
    id: String(n.id || '').trim(),
    biome_id: n.biome_id != null ? String(n.biome_id).trim() : null,
    path: n.path != null ? String(n.path) : null,
    weight: Number.isFinite(Number(n.weight)) ? Number(n.weight) : 0,
  }));
  const edges = (Array.isArray(net.edges) ? net.edges : []).map((e) => ({
    from: String(e.from || '').trim(),
    to: String(e.to || '').trim(),
    type: e.type != null ? String(e.type) : 'corridor',
    resistance: Number.isFinite(Number(e.resistance)) ? Number(e.resistance) : 0,
    seasonality: e.seasonality != null ? String(e.seasonality) : null,
    notes: e.notes != null ? String(e.notes) : null,
    // Fase 2 (arc-conditions, schema 2.1): carry the edge `conditions:` block
    // verbatim (ADR-2026-05-31). The resolver stays "dumb" — it does NOT
    // interpret conditions; metaNetworkRouting evaluates them. Absent -> null.
    // Without this pass-through the mapper would silently drop conditions.
    conditions: e.conditions != null ? e.conditions : null,
  }));

  const nodeIndex = new Map();
  for (const n of nodes) nodeIndex.set(_norm(n.id), n);

  const edgesBySource = new Map();
  for (const e of edges) {
    const key = _norm(e.from);
    if (!edgesBySource.has(key)) edgesBySource.set(key, []);
    edgesBySource.get(key).push(e);
  }

  _cache = {
    network: { id: net.id || null, label: net.label || null, nodes, edges },
    nodeIndex,
    edgesBySource,
  };
  return _cache;
}

function getNetwork() {
  return _load().network;
}

function getNode(nodeId) {
  if (!nodeId) return null;
  return _load().nodeIndex.get(_norm(nodeId)) || null;
}

function getOutgoingEdges(nodeId) {
  if (!nodeId) return [];
  const list = _load().edgesBySource.get(_norm(nodeId));
  return Array.isArray(list) ? list.slice() : [];
}

function _resetCache() {
  _cache = null;
}

module.exports = { getNetwork, getNode, getOutgoingEdges, _resetCache, NETWORK_FILE };
