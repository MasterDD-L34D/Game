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

/**
 * M14-A 2026-04-25 — Triangle Strategy Mechanic 3A elevation damage bonus.
 * Pure helper; not wired into resolver in this PR. Caller passes elevation
 * integers (0..N) and the bonus/penalty coefficients from terrain_defense.yaml
 * (`elevation.attack_damage_bonus`, `attack_damage_penalty`).
 *
 * Contract:
 *   delta >= 1  → 1 + bonus   (attacker above — Fextralife: +30% default)
 *   delta == 0  → 1.0
 *   delta <= -1 → 1 + penalty (attacker below — TS mirror penalty)
 *
 * Null/undefined elevations default to 0 (ground level).
 * Returns the multiplier (never below 0.1 to avoid total negation).
 */
function elevationDamageMultiplier({
  attackerElevation,
  targetElevation,
  bonus = 0.3,
  penalty = -0.15,
} = {}) {
  const a = Number.isFinite(attackerElevation) ? attackerElevation : 0;
  const t = Number.isFinite(targetElevation) ? targetElevation : 0;
  const delta = a - t;
  let mult;
  if (delta >= 1) mult = 1 + bonus;
  else if (delta <= -1) mult = 1 + penalty;
  else mult = 1;
  return Math.max(mult, 0.1);
}

/**
 * M14-B 2026-04-25 — Triangle Strategy Mechanic 3B pincer detection.
 * Pure helper; does NOT enqueue follow-up intents (round orchestrator untouched).
 * Caller receives metadata and can decide whether to emit a follow-up intent.
 *
 * Rule: an ally forms a pincer with `attacker` on `target` iff the ally sits
 * on the antipodal hex from `attacker` relative to `target`. On a hex grid
 * with 6 axial directions, "antipodal" means `ally - target == -(attacker - target)`.
 *
 * Requires attacker at hex distance exactly 1 from target (TS opposite-side
 * adjacent rule).
 *
 * @param {{q,r}} attackerHex
 * @param {{q,r}} targetHex
 * @param {Array<{q,r,id?}>} allies — ally positions (attacker excluded upstream)
 * @returns {{ pincer: boolean, opposite_ally_id: string|null, opposite_hex: {q,r}|null }}
 *
 * Ref: docs/research/triangle-strategy-transfer-plan.md:187,209
 */
function detectPincer(attackerHex, targetHex, allies) {
  if (!attackerHex || !targetHex) {
    return { pincer: false, opposite_ally_id: null, opposite_hex: null };
  }
  if (hexDistance(attackerHex, targetHex) !== 1) {
    return { pincer: false, opposite_ally_id: null, opposite_hex: null };
  }
  const dq = attackerHex.q - targetHex.q;
  const dr = attackerHex.r - targetHex.r;
  const oppositeHex = { q: targetHex.q - dq, r: targetHex.r - dr };
  if (!Array.isArray(allies)) {
    return { pincer: false, opposite_ally_id: null, opposite_hex: oppositeHex };
  }
  const oppositeAlly = allies.find((a) => a && a.q === oppositeHex.q && a.r === oppositeHex.r);
  return {
    pincer: Boolean(oppositeAlly),
    opposite_ally_id: oppositeAlly?.id ?? null,
    opposite_hex: oppositeHex,
  };
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
  elevationDamageMultiplier,
  detectPincer,
};
