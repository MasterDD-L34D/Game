// apps/backend/services/combat/senseReveal.js
//
// Skiv Personal Sprint Goal 2 — Echolocation visual fog-of-war pulse.
// Pure helper that derives "revealed tile" coords for actors with an
// echolocation sense (or any sense entry on `actor.default_parts.senses`).
//
// Anti-pattern killed: Engine LIVE Surface DEAD. Trait `sensori_geomagnetici`
// + `default_parts.senses: [echolocation]` were silent on the player surface.
// This helper is the seam between mechanic state and the canvas pulse drawn
// by `apps/play/src/render.js drawEcholocationPulse`.
//
// Output: array of tile coords `{ x, y }` that should be momentarily revealed
// on hover-near-target (cell-hover ≥500ms threshold). Cooldown 2 round per
// actor enforced via `actor._sense_reveal_cooldown_until_round`.
//
// Pure function. No side effect, no Date.now, no I/O. Caller decides if/when
// to mutate the cooldown (we expose `markCooldown`).
//
// Range:
//   • base radius = 1 (4 adjacent tiles around target)
//   • +1 radius bonus if actor has trait `sensori_geomagnetici` in
//     `actor.trait_ids` (or `actor.traits`).

'use strict';

const BASE_RADIUS = 1;
const BONUS_TRAIT_ID = 'sensori_geomagnetici';
const COOLDOWN_ROUNDS = 2;

function _hasEcholocationSense(actor) {
  if (!actor || typeof actor !== 'object') return false;
  const parts = actor.default_parts;
  if (!parts || typeof parts !== 'object') return false;
  const senses = parts.senses;
  if (!Array.isArray(senses) || senses.length === 0) return false;
  return senses.some((s) => typeof s === 'string' && s.toLowerCase() === 'echolocation');
}

function _hasTrait(actor, traitId) {
  if (!actor || !traitId) return false;
  const ids = actor.trait_ids || actor.traits;
  if (!Array.isArray(ids)) return false;
  return ids.some((t) => typeof t === 'string' && t === traitId);
}

function _resolveRadius(actor) {
  let r = BASE_RADIUS;
  if (_hasTrait(actor, BONUS_TRAIT_ID)) r += 1;
  return r;
}

function _isOnCooldown(actor, currentRound) {
  if (!actor) return false;
  const until = Number(actor._sense_reveal_cooldown_until_round);
  if (!Number.isFinite(until)) return false;
  return Number(currentRound || 0) < until;
}

/**
 * Compute the tile coords revealed by `actor` echolocating around `target`.
 *
 * @param {object} actor — needs `default_parts.senses` containing 'echolocation'.
 * @param {object} target — needs `position.{x,y}` (or `x`,`y`).
 * @param {object} [world] — optional `{ width, height, currentRound }` context.
 * @returns {Array<{x:number,y:number}>} revealed tile coords (empty if blocked).
 */
function getRevealedTiles(actor, target, world = {}) {
  if (!_hasEcholocationSense(actor)) return [];
  if (!target || typeof target !== 'object') return [];
  const tx = Number(target.position ? target.position.x : target.x);
  const ty = Number(target.position ? target.position.y : target.y);
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) return [];

  const round = Number((world && world.currentRound) || 0);
  if (_isOnCooldown(actor, round)) return [];

  const radius = _resolveRadius(actor);
  const width = Number((world && world.width) || Infinity);
  const height = Number((world && world.height) || Infinity);

  const tiles = [];
  for (let dx = -radius; dx <= radius; dx += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      // Manhattan radius (no diagonals beyond ring).
      if (Math.abs(dx) + Math.abs(dy) > radius) continue;
      // Skip the target tile itself (already visible to player).
      if (dx === 0 && dy === 0) continue;
      const x = tx + dx;
      const y = ty + dy;
      if (x < 0 || y < 0) continue;
      if (Number.isFinite(width) && x >= width) continue;
      if (Number.isFinite(height) && y >= height) continue;
      tiles.push({ x, y });
    }
  }
  return tiles;
}

/**
 * Mark cooldown after a successful pulse. Mutates actor in place.
 * Caller responsible for invoking when the pulse is consumed.
 */
function markCooldown(actor, currentRound) {
  if (!actor || typeof actor !== 'object') return;
  const r = Number(currentRound || 0);
  actor._sense_reveal_cooldown_until_round = r + COOLDOWN_ROUNDS;
}

module.exports = {
  getRevealedTiles,
  markCooldown,
  BASE_RADIUS,
  BONUS_TRAIT_ID,
  COOLDOWN_ROUNDS,
  // exported for tests
  _hasEcholocationSense,
};
