// apps/backend/services/combat/ecoSismico.js
//
// eco_sismico (creature-trait mechanics, trait 5 -- banshee).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//
// Phase B `zona_risonante`: a tile-level timed status (default 2 rounds). A unit that
// ENTERS a zona tile gets `disorient` (an existing unit status); the banshee that laid
// the zone (source_id) is self-immune. This module is the TILE-STATUS PRIMITIVE +
// the move-enter consumer + the end-of-round decay -- the first tile-keyed (not
// unit-keyed) status store in combat. Statuses live on `grid.tile_statuses`
// = [{x, y, status, source_id, expires_round}] (JSON-friendly, mirrors terrain_features).
//
// The PRODUCER -- the active ability that stamps the zone (Phase A reveal pulse range 4
// + Phase B stamp) -- is a forbidden-path follow-up: it needs a new effect_type in
// packages/contracts/schemas/traitMechanics.schema.json + a jobs.yaml re-baseline
// (mirrors matrice/filtri active modes, owner-gated). `stampZonaRisonante` is the seam
// it will call.
//
// Pure (mutates grid.tile_statuses + the entering unit's status). Band-neutral: no
// in-combat path stamps a zone yet AND no sim unit carries eco_sismico, so the consumer
// and decay are no-ops on every existing grid.

'use strict';

const ECO_TRAIT = 'eco_sismico';
const ZONA = 'zona_risonante';
const DISORIENT = 'disorient';
const ZONA_ROUNDS = 2;
const DISORIENT_TURNS = 1;

function _store(grid, create) {
  if (!grid || typeof grid !== 'object') return null;
  if (!Array.isArray(grid.tile_statuses)) {
    if (!create) return null;
    grid.tile_statuses = [];
  }
  return grid.tile_statuses;
}

/**
 * Stamp `zona_risonante` on each {x,y} tile, active for `rounds` (default ZONA_ROUNDS)
 * from `currentRound` -> expires at currentRound + rounds. Refreshes an existing zona
 * on the same tile rather than duplicating. Returns the count of tiles stamped.
 * The producer ability calls this; nothing else does (band-neutral until then).
 */
function stampZonaRisonante(grid, tiles, { sourceId, currentRound, rounds = ZONA_ROUNDS } = {}) {
  const store = _store(grid, true);
  if (!store || !Array.isArray(tiles)) return 0;
  const expires = Number(currentRound) + (Number(rounds) || ZONA_ROUNDS);
  let n = 0;
  for (const t of tiles) {
    if (!t || !Number.isFinite(t.x) || !Number.isFinite(t.y)) continue;
    const existing = store.find((s) => s.status === ZONA && s.x === t.x && s.y === t.y);
    if (existing) {
      existing.expires_round = expires;
      if (sourceId != null) existing.source_id = sourceId;
    } else {
      store.push({
        x: t.x,
        y: t.y,
        status: ZONA,
        source_id: sourceId ?? null,
        expires_round: expires,
      });
    }
    n += 1;
  }
  return n;
}

/**
 * The active zona at (x,y) for `currentRound`, or null. Active while
 * currentRound < expires_round (so a 2-round zona stamped at round R bites on R and R+1).
 */
function zonaAt(grid, x, y, currentRound) {
  const store = _store(grid, false);
  if (!store) return null;
  const r = Number(currentRound);
  for (const s of store) {
    if (s.status === ZONA && s.x === x && s.y === y && r < Number(s.expires_round)) return s;
  }
  return null;
}

/**
 * Move-enter consumer: if a living unit is standing on an active zona it did NOT lay
 * (source self-immune), set `disorient` (not stacked past DISORIENT_TURNS). Returns the
 * event or null. Called after a move resolves a unit's position.
 */
function applyZonaOnEnter({ grid, unit, currentRound } = {}) {
  if (!unit || typeof unit !== 'object') return null;
  const pos = unit.position;
  if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return null;
  if (!(Number(unit.hp) > 0)) return null;
  const z = zonaAt(grid, pos.x, pos.y, currentRound);
  if (!z) return null;
  if (unit.id != null && z.source_id != null && unit.id === z.source_id) return null; // self-immune
  if (!unit.status || typeof unit.status !== 'object') unit.status = {};
  const cur = Number(unit.status[DISORIENT] || 0);
  if (cur < DISORIENT_TURNS) unit.status[DISORIENT] = DISORIENT_TURNS;
  return { unit_id: unit.id ?? null, stato: DISORIENT, turns: DISORIENT_TURNS };
}

/**
 * Enumerate the in-bounds tiles of a square AoE (side `size`, Chebyshev <= floor(size/2))
 * centered on `center`. Mirrors the unitsInArea box semantics (size 3 -> 3x3). Returns
 * [] for a missing/invalid center or bounds. Used by the producer to pick stamp tiles.
 */
function tilesInArea(center, size, bounds) {
  if (!center || !Number.isFinite(center.x) || !Number.isFinite(center.y)) return [];
  if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)) return [];
  const half = Math.floor((Number(size) || 1) / 2);
  const out = [];
  for (let x = center.x - half; x <= center.x + half; x += 1) {
    for (let y = center.y - half; y <= center.y + half; y += 1) {
      if (x >= 0 && y >= 0 && x < bounds.width && y < bounds.height) out.push({ x, y });
    }
  }
  return out;
}

/**
 * End-of-round decay: drop every tile-status whose expiry has passed
 * (expires_round <= currentRound). Returns the count removed.
 */
function decayTileStatuses(grid, currentRound) {
  const store = _store(grid, false);
  if (!store) return 0;
  const r = Number(currentRound);
  let removed = 0;
  for (let i = store.length - 1; i >= 0; i -= 1) {
    if (Number(store[i].expires_round) <= r) {
      store.splice(i, 1);
      removed += 1;
    }
  }
  return removed;
}

module.exports = {
  stampZonaRisonante,
  zonaAt,
  applyZonaOnEnter,
  decayTileStatuses,
  tilesInArea,
  ECO_TRAIT,
  ZONA,
  DISORIENT,
  ZONA_ROUNDS,
  DISORIENT_TURNS,
};
