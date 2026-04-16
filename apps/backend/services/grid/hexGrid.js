// Hex grid engine — axial coordinates (q, r).
// Reference: Red Blob Games hexagonal grids guide.
// ADR: docs/adr/ADR-2026-04-16-grid-type-hex-axial.md
//
// Coordinate system: axial (q, r). Cube s = -q - r.
// Distance: max(|q|, |r|, |q+r|)
// Neighbors: 6 directions, equidistant.
//
// Exports:
//   hexDistance(a, b)
//   hexNeighbors(hex)
//   getReachableTiles(origin, maxCost, costFn)
//   findPath(from, to, costFn, maxCost)
//   getTilesInRange(center, range)
//   getLineOfSight(from, to, blocksLosFn)

'use strict';

// --- Axial directions (flat-top hex) ---
const DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

/** Hex key for Map/Set usage. */
function hexKey(q, r) {
  return `${q},${r}`;
}

/** Parse hex key back to {q, r}. */
function parseKey(key) {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

/** Cube distance between two axial hexes. */
function hexDistance(a, b) {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
}

/** Return 6 neighbor coordinates. */
function hexNeighbors(hex) {
  return DIRECTIONS.map((d) => ({ q: hex.q + d.q, r: hex.r + d.r }));
}

/**
 * Dijkstra flood-fill from origin up to maxCost.
 * costFn(from, to) → number|null. null = impassable.
 * Returns Map<hexKey, {cost, parent}>.
 */
function getReachableTiles(origin, maxCost, costFn) {
  const result = new Map();
  const key0 = hexKey(origin.q, origin.r);
  result.set(key0, { cost: 0, parent: null });

  // Priority queue as sorted array (small grids, adequate perf)
  const frontier = [{ q: origin.q, r: origin.r, cost: 0 }];

  while (frontier.length > 0) {
    // Pop lowest cost
    frontier.sort((a, b) => a.cost - b.cost);
    const current = frontier.shift();

    for (const nb of hexNeighbors(current)) {
      const moveCost = costFn(current, nb);
      if (moveCost == null) continue; // impassable

      const totalCost = current.cost + moveCost;
      if (totalCost > maxCost) continue;

      const nbKey = hexKey(nb.q, nb.r);
      const existing = result.get(nbKey);
      if (!existing || totalCost < existing.cost) {
        result.set(nbKey, { cost: totalCost, parent: hexKey(current.q, current.r) });
        frontier.push({ q: nb.q, r: nb.r, cost: totalCost });
      }
    }
  }

  return result;
}

/**
 * A* pathfinding from → to.
 * costFn(from, to) → number|null.
 * Returns array of {q,r} (path including from and to), or null if unreachable.
 */
function findPath(from, to, costFn, maxCost = Infinity) {
  const openSet = new Map();
  const closedSet = new Set();
  const gScore = new Map();
  const cameFrom = new Map();
  const MAX_NODES = 1000; // safety: prevent infinite search on unbounded grid

  const startKey = hexKey(from.q, from.r);
  const goalKey = hexKey(to.q, to.r);

  gScore.set(startKey, 0);
  openSet.set(startKey, hexDistance(from, to));

  while (openSet.size > 0) {
    // Find lowest fScore in openSet
    let currentKey = null;
    let lowestF = Infinity;
    for (const [key, f] of openSet) {
      if (f < lowestF) {
        lowestF = f;
        currentKey = key;
      }
    }

    if (currentKey === goalKey) {
      // Reconstruct path
      const path = [];
      let k = goalKey;
      while (k) {
        path.unshift(parseKey(k));
        k = cameFrom.get(k) || null;
      }
      return path;
    }

    openSet.delete(currentKey);
    closedSet.add(currentKey);
    if (closedSet.size > MAX_NODES) return null; // safety bail
    const current = parseKey(currentKey);
    const currentG = gScore.get(currentKey);

    for (const nb of hexNeighbors(current)) {
      const nbKey = hexKey(nb.q, nb.r);
      if (closedSet.has(nbKey)) continue;

      const moveCost = costFn(current, nb);
      if (moveCost == null) continue;

      const tentativeG = currentG + moveCost;
      if (tentativeG > maxCost) continue;

      const prevG = gScore.get(nbKey);
      if (prevG != null && tentativeG >= prevG) continue;

      cameFrom.set(nbKey, currentKey);
      gScore.set(nbKey, tentativeG);
      openSet.set(nbKey, tentativeG + hexDistance(nb, to));
    }
  }

  return null; // no path
}

/**
 * All hexes within range (BFS, ignores terrain cost).
 * Returns array of {q, r}.
 */
function getTilesInRange(center, range) {
  const results = [];
  for (let q = -range; q <= range; q++) {
    for (let r = Math.max(-range, -q - range); r <= Math.min(range, -q + range); r++) {
      results.push({ q: center.q + q, r: center.r + r });
    }
  }
  return results;
}

/**
 * Line of sight between two hexes using linear interpolation.
 * blocksLosFn(hex) → boolean. Returns {clear, tiles[]}.
 */
function getLineOfSight(from, to, blocksLosFn) {
  const n = hexDistance(from, to);
  if (n === 0) return { clear: true, tiles: [{ q: from.q, r: from.r }] };

  const tiles = [];
  const eps = 1e-6; // nudge to avoid boundary issues

  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // Interpolate in cube coordinates
    const cubeQ = from.q + (to.q - from.q) * t;
    const cubeR = from.r + (to.r - from.r) * t;
    // Round to nearest hex
    const hex = cubeRound(cubeQ + eps, cubeR + eps);
    tiles.push(hex);

    // Check blockage (skip start and end)
    if (i > 0 && i < n && blocksLosFn(hex)) {
      return { clear: false, tiles };
    }
  }

  return { clear: true, tiles };
}

/** Round fractional axial coords to nearest hex (cube rounding). */
function cubeRound(fq, fr) {
  const fs = -fq - fr;
  let q = Math.round(fq);
  let r = Math.round(fr);
  let s = Math.round(fs);

  const dq = Math.abs(q - fq);
  const dr = Math.abs(r - fr);
  const ds = Math.abs(s - fs);

  if (dq > dr && dq > ds) {
    q = -r - s;
  } else if (dr > ds) {
    r = -q - s;
  }
  // else s = -q - r (implicit)

  return { q, r };
}

module.exports = {
  DIRECTIONS,
  hexKey,
  parseKey,
  hexDistance,
  hexNeighbors,
  getReachableTiles,
  findPath,
  getTilesInRange,
  getLineOfSight,
  cubeRound,
};
