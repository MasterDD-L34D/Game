// M14-A CAP-07 (2026-04-25) — Bridge cartesian session state ↔ pure terrain reactions.
//
// Why this file exists:
//   `services/combat/terrainReactions.js` espone `reactTile` + `chainElectrified`
//   come **pure helpers stateless** che assumono coordinate hex axial {q, r}.
//   La session usa coordinate cartesiane Manhattan {x, y} (vedi session.units[].position).
//   Cablare direttamente i pure helpers nel damage step richiederebbe coordinate refactor.
//
// Soluzione MVP (low-risk, scope-contained):
//   Bridge function che tratta {x, y} come opaque hex shape (q→x, r→y mapping).
//   Per chainElectrified, passo Manhattan-style 4-neighbors invece di hex 6-neighbors.
//   Funzionalmente equivalente per scope BFS (cap maxDepth=5); semanticamente
//   non-hex ma corretto per la session corrente.
//
// Out of scope CAP-07:
//   - NON cabliamo questo bridge nel damage step di abilityExecutor (richiede
//     decisione design su `ability.channel` field, attualmente assente in jobs.yaml).
//   - NON convertiamo session in axial coords (refactor architetturale separato).
//
// Quando questo bridge diventa obsoleto:
//   Quando ability schema avrà `channel: fire|ice|water|lightning` e session userà
//   axial coords (q,r), questo bridge si riduce a chiamata diretta dei pure helpers.

'use strict';

const { reactTile, chainElectrified } = require('./terrainReactions');

const DEFAULT_BASE_TTL = 3;
const DEFAULT_CHAIN_MAX_DEPTH = 5;
const VALID_ELEMENTS = new Set(['fire', 'ice', 'water', 'lightning']);

/**
 * Convert {x, y} cartesian position to a stable string key for tileStateMap.
 * Matches the format used elsewhere in session (e.g. hazard_tiles consumers).
 */
function tileKey(x, y) {
  return `${Number(x) | 0},${Number(y) | 0}`;
}

/**
 * 4-connected Manhattan neighbors. Used as `hexNeighborsFn` for chainElectrified
 * over cartesian-keyed tileStateMap. Returns objects shaped as {q, r} solely for
 * shape compatibility with chainElectrified's hexKeyFn output (q→x alias, r→y alias).
 */
function cartesianNeighbors(hex) {
  const x = hex.q;
  const y = hex.r;
  return [
    { q: x + 1, r: y },
    { q: x - 1, r: y },
    { q: x, r: y + 1 },
    { q: x, r: y - 1 },
  ];
}

/**
 * Apply an elemental incoming effect to the tile at (x, y) in the given session.
 * Mutates `session.tileStateMap` in place; never throws on invalid input
 * (returns a no-op result instead, so callers from damage step do not need
 * defensive guards).
 *
 * @param {object} session — must own `tileStateMap` object (bootstrapped in /start handler)
 * @param {number} x — cartesian column
 * @param {number} y — cartesian row
 * @param {string} element — one of: fire, ice, water, lightning
 * @param {object} [opts]
 * @param {string} [opts.actorId] — id of unit that caused the reaction
 * @param {number} [opts.baseTtl=3] — initial ttl applied when creating new tile state
 * @returns {{ applied: boolean, tileKey: string, prevState: object|null, nextState: object, burstDamage: number, effects: string[], chain: { electrified: object[], chainDamage: number }|null }}
 */
function applyTerrainReaction(session, x, y, element, opts = {}) {
  const result = {
    applied: false,
    tileKey: tileKey(x, y),
    prevState: null,
    nextState: { type: 'normal', ttl: 0 },
    burstDamage: 0,
    effects: [],
    chain: null,
  };

  if (!session || typeof session !== 'object') return result;
  if (!session.tileStateMap || typeof session.tileStateMap !== 'object') return result;
  if (!VALID_ELEMENTS.has(element)) return result;

  const key = result.tileKey;
  const prev = session.tileStateMap[key] || null;
  result.prevState = prev;

  const reaction = reactTile(prev, {
    element,
    actor_id: opts.actorId || null,
    baseTtl: Number.isFinite(Number(opts.baseTtl)) ? Number(opts.baseTtl) : DEFAULT_BASE_TTL,
  });

  // Persist nextState. If reaction nullifies the tile (type=normal ttl=0) we
  // delete the key to keep the map sparse; otherwise we write the new state.
  if (reaction.nextState && reaction.nextState.type !== 'normal') {
    session.tileStateMap[key] = { ...reaction.nextState };
  } else if (prev) {
    delete session.tileStateMap[key];
  }

  result.applied = true;
  result.nextState = reaction.nextState;
  result.burstDamage = Number(reaction.burstDamage) || 0;
  result.effects = Array.isArray(reaction.effects) ? reaction.effects.slice() : [];

  // Chain trigger: lightning + water → electrified BFS over neighbors.
  if (result.effects.includes('chain_trigger')) {
    const chain = chainElectrified(
      { q: Number(x) | 0, r: Number(y) | 0 },
      session.tileStateMap,
      (h) => tileKey(h.q, h.r),
      cartesianNeighbors,
      { maxDepth: DEFAULT_CHAIN_MAX_DEPTH },
    );
    result.chain = chain;
  }

  return result;
}

/**
 * End-of-round TTL decay. Decrements ttl on every tile state and removes
 * entries with ttl <= 0. Called from sessionRoundBridge.applyEndOfRoundSideEffects.
 *
 * @param {object} session
 * @returns {{ decayed: number, removed: number }}
 */
function decayTileStates(session) {
  const stats = { decayed: 0, removed: 0 };
  if (!session || !session.tileStateMap || typeof session.tileStateMap !== 'object') {
    return stats;
  }
  for (const key of Object.keys(session.tileStateMap)) {
    const tile = session.tileStateMap[key];
    if (!tile || typeof tile !== 'object') {
      delete session.tileStateMap[key];
      stats.removed += 1;
      continue;
    }
    const ttl = Number(tile.ttl);
    if (!Number.isFinite(ttl) || ttl <= 1) {
      delete session.tileStateMap[key];
      stats.removed += 1;
    } else {
      tile.ttl = ttl - 1;
      stats.decayed += 1;
    }
  }
  return stats;
}

module.exports = {
  applyTerrainReaction,
  decayTileStates,
  tileKey,
  cartesianNeighbors,
  VALID_ELEMENTS,
};
