// apps/backend/services/combat/moveCost.js
'use strict';

// Pure cheapest-path move cost (Q-B verdict 2026-06-23: Dijkstra on the grid, terrain-only).
// Cost to ENTER a tile = profile.terrain_cost_multiplier[type] ?? default. Source tile not
// counted. 4-neighbour grid. Ignores intermediate units (matches the engine's teleport, which
// only checks the destination tile for occupancy). All-default terrain -> cost == Manhattan,
// so the wire is band-neutral even flag-ON until a map carries typed terrain.

function terrainAtFromFeatures(features) {
  const map = new Map();
  for (const f of Array.isArray(features) ? features : []) {
    if (f && Number.isFinite(f.x) && Number.isFinite(f.y) && f.type) {
      map.set(`${f.x},${f.y}`, String(f.type));
    }
  }
  return (x, y) => map.get(`${x},${y}`) || null;
}

function _enterCost(profile, type) {
  const m = (profile && profile.terrain_cost_multiplier) || {};
  const base = m.default ?? 1.0;
  if (!type) return base;
  return m[type] ?? base;
}

function _inBounds(x, y, bounds) {
  return x >= 0 && y >= 0 && x < bounds.width && y < bounds.height;
}

function moveCost(from, dest, profile, terrainAt, bounds) {
  if (!from || !dest || !bounds) return Infinity;
  if (!_inBounds(dest.x, dest.y, bounds) || !_inBounds(from.x, from.y, bounds)) return Infinity;
  if (from.x === dest.x && from.y === dest.y) return 0;

  const key = (x, y) => `${x},${y}`;
  const dist = new Map([[key(from.x, from.y), 0]]);
  // Array-based priority frontier (grid is tiny, perf is a non-issue).
  const frontier = [{ x: from.x, y: from.y, c: 0 }];
  const NEIGHBORS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (frontier.length) {
    let bi = 0;
    for (let i = 1; i < frontier.length; i += 1) {
      if (frontier[i].c < frontier[bi].c) bi = i;
    }
    const cur = frontier.splice(bi, 1)[0];
    if (cur.x === dest.x && cur.y === dest.y) return cur.c;
    const curKey = key(cur.x, cur.y);
    if (cur.c > (dist.get(curKey) ?? Infinity)) continue;
    for (const [dx, dy] of NEIGHBORS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!_inBounds(nx, ny, bounds)) continue;
      const stepCost = _enterCost(profile, terrainAt(nx, ny));
      const nc = cur.c + stepCost;
      const nKey = key(nx, ny);
      if (nc < (dist.get(nKey) ?? Infinity)) {
        dist.set(nKey, nc);
        frontier.push({ x: nx, y: ny, c: nc });
      }
    }
  }
  return Infinity;
}

module.exports = { moveCost, terrainAtFromFeatures, _enterCost };
