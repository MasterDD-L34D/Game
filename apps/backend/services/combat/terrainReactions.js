// M14-A 2026-04-25 — Triangle Strategy Mechanic 4 terrain reactions.
// Pure stateless helpers. Caller owns the per-session tile state map and
// round-end TTL decrement. No I/O, no runtime wire in this PR.
// Ref: docs/research/triangle-strategy-transfer-plan.md:236
//
// Tile state shape (caller-defined):
//   { type: 'normal'|'fire'|'ice'|'water'|'electrified',
//     ttl: number (rounds remaining), source_actor?: string }
//
// Usage:
//   const { nextState, burstDamage, effects } =
//     reactTile(currentState, { element, actor_id, baseTtl });
//   if (nextState.type === 'electrified') {
//     const chain = chainElectrified(hex, tileStateMap, hexNeighbors, 5);
//   }

'use strict';

const TILE_TYPES = ['normal', 'fire', 'ice', 'water', 'electrified'];
const ELEMENTS = ['fire', 'ice', 'water', 'lightning'];

const DEFAULT_TTL = {
  fire: 2,
  ice: 2,
  water: 2,
  electrified: 1,
};

/**
 * Compute next tile state + damage burst for a single element→tile interaction.
 *
 * @param {object} current  — current tile state { type, ttl, source_actor? }
 * @param {object} incoming — { element, actor_id?, baseTtl? }
 * @returns {{ nextState, burstDamage, effects }}
 *   burstDamage — immediate damage to the tile occupant (0 if none)
 *   effects     — labels for logging ('steam_burst', 'evaporate', ...)
 */
function reactTile(current, incoming) {
  const cur = normalizeState(current);
  if (!incoming || !ELEMENTS.includes(incoming.element)) {
    return { nextState: cur, burstDamage: 0, effects: [] };
  }
  const { element, actor_id: actorId = null, baseTtl } = incoming;

  // fire + ice → water (steam burst 1 dmg)
  if (element === 'fire' && cur.type === 'ice') {
    return {
      nextState: mkState('water', pickTtl(baseTtl, 'water'), actorId),
      burstDamage: 1,
      effects: ['steam_burst'],
    };
  }
  // fire + water → normal (evaporate, no damage)
  if (element === 'fire' && cur.type === 'water') {
    return {
      nextState: mkState('normal', 0, null),
      burstDamage: 0,
      effects: ['evaporate'],
    };
  }
  // fire + normal → fire (burn tile)
  if (element === 'fire' && cur.type === 'normal') {
    return {
      nextState: mkState('fire', pickTtl(baseTtl, 'fire'), actorId),
      burstDamage: 0,
      effects: ['ignite'],
    };
  }
  // lightning + water → electrified (chain via chainElectrified)
  if (element === 'lightning' && cur.type === 'water') {
    return {
      nextState: mkState('electrified', pickTtl(baseTtl, 'electrified'), actorId),
      burstDamage: 2,
      effects: ['electrify', 'chain_trigger'],
    };
  }
  // ice + fire → water (symmetric to fire+ice but damage only to occupants once)
  if (element === 'ice' && cur.type === 'fire') {
    return {
      nextState: mkState('water', pickTtl(baseTtl, 'water'), actorId),
      burstDamage: 0,
      effects: ['quench'],
    };
  }
  // water + fire → normal (dousing)
  if (element === 'water' && cur.type === 'fire') {
    return {
      nextState: mkState('normal', 0, null),
      burstDamage: 0,
      effects: ['douse'],
    };
  }
  // water + normal → water puddle
  if (element === 'water' && cur.type === 'normal') {
    return {
      nextState: mkState('water', pickTtl(baseTtl, 'water'), actorId),
      burstDamage: 0,
      effects: ['puddle'],
    };
  }
  // ice + normal → ice
  if (element === 'ice' && cur.type === 'normal') {
    return {
      nextState: mkState('ice', pickTtl(baseTtl, 'ice'), actorId),
      burstDamage: 0,
      effects: ['freeze'],
    };
  }

  // No reaction defined — element just coats without change (e.g. lightning on normal).
  return { nextState: cur, burstDamage: 0, effects: ['no_reaction'] };
}

/**
 * BFS flood from origin through adjacent `water` tiles, converting them to
 * `electrified`. Caps the propagation depth (TS-style) to avoid infinite
 * chains. Returns the list of electrified hex keys + total occupant shock
 * damage the caller should apply.
 *
 * @param {object} origin        — { q, r } hex where lightning struck
 * @param {Map|object} tileStateMap — Map<hexKey, state> (writable — we mutate it)
 * @param {function} hexKeyFn    — fn({q,r}) → string key (usually hexGrid.hexKey)
 * @param {function} hexNeighborsFn — fn(hex) → [{q,r}...]
 * @param {object}   opts        — { maxDepth=5, baseTtl, actorId, shockDamagePerTile=2 }
 * @returns {{ electrified: string[], chainDamage: number }}
 */
function chainElectrified(origin, tileStateMap, hexKeyFn, hexNeighborsFn, opts = {}) {
  const maxDepth = Number.isFinite(opts.maxDepth) ? opts.maxDepth : 5;
  const baseTtl = opts.baseTtl;
  const actorId = opts.actorId ?? null;
  const shockDamagePerTile = Number.isFinite(opts.shockDamagePerTile) ? opts.shockDamagePerTile : 2;
  if (typeof hexKeyFn !== 'function' || typeof hexNeighborsFn !== 'function') {
    throw new Error('hexKeyFn_and_hexNeighborsFn_required');
  }
  const get = (key) => (tileStateMap instanceof Map ? tileStateMap.get(key) : tileStateMap[key]);
  const set = (key, value) => {
    if (tileStateMap instanceof Map) tileStateMap.set(key, value);
    else tileStateMap[key] = value;
  };

  const electrified = [];
  const visited = new Set();
  const queue = [{ hex: origin, depth: 0 }];
  while (queue.length > 0) {
    const { hex, depth } = queue.shift();
    if (depth > maxDepth) continue;
    const key = hexKeyFn(hex.q, hex.r);
    if (visited.has(key)) continue;
    visited.add(key);
    const cur = normalizeState(get(key));
    if (cur.type !== 'water' && depth > 0) continue;
    // Convert to electrified.
    set(key, mkState('electrified', pickTtl(baseTtl, 'electrified'), actorId));
    electrified.push(key);
    for (const nb of hexNeighborsFn(hex)) {
      queue.push({ hex: nb, depth: depth + 1 });
    }
  }

  return {
    electrified,
    chainDamage: electrified.length * shockDamagePerTile,
  };
}

// ─── internals ───────────────────────────────────────────────────────────

function normalizeState(state) {
  if (!state || typeof state !== 'object') return mkState('normal', 0, null);
  if (!TILE_TYPES.includes(state.type)) return mkState('normal', 0, null);
  return state;
}

function mkState(type, ttl, actorId) {
  return { type, ttl: Math.max(0, ttl | 0), source_actor: actorId };
}

function pickTtl(override, type) {
  if (Number.isFinite(override)) return override;
  return DEFAULT_TTL[type] ?? 0;
}

module.exports = {
  reactTile,
  chainElectrified,
  TILE_TYPES,
  ELEMENTS,
  DEFAULT_TTL,
};
