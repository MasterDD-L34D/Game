// Sprint 12 (Surface-DEAD #4) — Mating lifecycle wire.
//
// Engine LIVE: apps/backend/services/metaProgression.js esplicita
// rollMatingOffspring (3-tier MHS gene grid) + canMate(npcId) gate +
// offspringRegistry. Wire complete da PR #1879.
//
// Surface DEAD pre-Sprint 12: debrief panel non emette offspring eligible
// quando victory + units survived. Player non vede mai pair-bond candidates
// post-encounter — il ciclo Nido→offspring→lineage_id resta invisibile.
//
// Surface NEW: debrief includes `mating_eligibles[]` con pair survivors
// player team. Frontend renderizza card "🏠 Lineage Eligibili" che mostra
// 🦎 parent_a + 🦎 parent_b → ✨ offspring expected nel biome corrente.
//
// Helper pure: zero side effect, zero IO. Caller decide whether to surface.

'use strict';

// Cap massimo coppie surface (n choose 2 cresce in fretta).
// 4 unit → 6 pair, 8 unit → 28 pair. Cap 6 mantiene UI leggibile.
const DEFAULT_MAX_PAIRS = 6;

// Default: ogni pair-bond produce 1 offspring (rollMatingOffspring spec).
const DEFAULT_OFFSPRING_PER_PAIR = 1;

/**
 * Pure: filtra unit player team alive con id stabile.
 * @param {Array} units — session.units array
 * @returns {Array} survivors (filtered + sanitized)
 */
function filterPlayerSurvivors(units) {
  if (!Array.isArray(units)) return [];
  const out = [];
  for (const u of units) {
    if (!u || typeof u !== 'object') continue;
    if (!u.id || typeof u.id !== 'string') continue;
    // Player team identification: controlled_by 'player' OR team 'player'/'ally'.
    const team = u.team || u.faction || u.owner_team || null;
    const controlledBy = u.controlled_by || u.controller || null;
    const isPlayerSide =
      controlledBy === 'player' || controlledBy === 'ally' || team === 'player' || team === 'ally';
    if (!isPlayerSide) continue;
    const hp = Number(u.hp);
    if (!Number.isFinite(hp) || hp <= 0) continue;
    out.push(u);
  }
  return out;
}

/**
 * Pure: genera coppie n-choose-2 (combinations, NOT permutations).
 * @param {Array} survivors
 * @returns {Array<[unit, unit]>}
 */
function pairCombinations(survivors) {
  const pairs = [];
  for (let i = 0; i < survivors.length; i += 1) {
    for (let j = i + 1; j < survivors.length; j += 1) {
      pairs.push([survivors[i], survivors[j]]);
    }
  }
  return pairs;
}

/**
 * Compute mating eligibles per debrief surface.
 *
 * @param {Array} survivors — session.units (will be filtered internally)
 * @param {string|null} encounterBiomeId — biome corrente (per offspring spawn)
 * @param {object} [options]
 * @param {object} [options.metaTracker] — opzionale; gate via canMate(npcId).
 *   IMPORTANT: tracker.canMate must be SYNCHRONOUS and return strict boolean.
 *   Async trackers (createMetaStore which returns a Promise from canMate) are
 *   NOT supported — this helper rejects non-boolean returns to avoid silent
 *   bypass (Boolean(Promise) === true would surface blocked pairs as eligible).
 *   For async path, await tracker.canMate(...) at the call site and pass a
 *   pre-resolved sync wrapper, OR don't pass options.metaTracker at all
 *   (default permissive surface, Sprint 12 default behavior).
 * @param {number} [options.maxPairs] — cap coppie (default 6)
 * @returns {Array<{parent_a_id, parent_b_id, parent_a_name, parent_b_name, biome_id, can_mate, expected_offspring_count, reason?}>}
 */
function computeMatingEligibles(survivors, encounterBiomeId, options = {}) {
  const playerSurvivors = filterPlayerSurvivors(survivors);
  if (playerSurvivors.length < 2) return [];

  const maxPairs = Number.isFinite(options.maxPairs) ? options.maxPairs : DEFAULT_MAX_PAIRS;
  const tracker =
    options.metaTracker && typeof options.metaTracker === 'object' ? options.metaTracker : null;
  const biomeId = encounterBiomeId || null;

  const pairs = pairCombinations(playerSurvivors);
  const out = [];
  for (const [a, b] of pairs) {
    if (out.length >= maxPairs) break;
    const entry = {
      parent_a_id: a.id,
      parent_b_id: b.id,
      parent_a_name: a.name || a.id,
      parent_b_name: b.name || b.id,
      biome_id: biomeId,
      can_mate: true,
      expected_offspring_count: DEFAULT_OFFSPRING_PER_PAIR,
    };
    if (tracker && typeof tracker.canMate === 'function') {
      try {
        const aRaw = tracker.canMate(a.id);
        const bRaw = tracker.canMate(b.id);
        // Strict boolean check: Promise / undefined / number / object → reject.
        // Boolean(Promise) === true would silently surface blocked pairs as
        // eligible — explicitly fail-closed for non-boolean tracker returns.
        const aValid = typeof aRaw === 'boolean';
        const bValid = typeof bRaw === 'boolean';
        if (!aValid || !bValid) {
          entry.can_mate = false;
          entry.reason = 'tracker_non_boolean_return';
        } else {
          entry.can_mate = aRaw && bRaw;
          if (!entry.can_mate) {
            entry.reason =
              !aRaw && !bRaw ? 'gate_not_met_both' : !aRaw ? 'gate_not_met_a' : 'gate_not_met_b';
          }
        }
      } catch {
        // tracker malformed (throws sync) — graceful fallback to permissive
        // default. Distinct from non-boolean return: a throw signals an
        // implementation bug we shouldn't penalize the player for.
      }
    }
    if (entry.can_mate) out.push(entry);
  }
  return out;
}

module.exports = {
  computeMatingEligibles,
  filterPlayerSurvivors,
  pairCombinations,
  DEFAULT_MAX_PAIRS,
  DEFAULT_OFFSPRING_PER_PAIR,
};
