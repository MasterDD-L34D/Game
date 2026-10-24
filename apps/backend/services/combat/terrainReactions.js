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

// D8 (aa01 CAP-07 carve-out, 2026-06-30): chain-lightning runtime gate + PROPOSED
// conservative balance values. OFF by default = byte-identical legacy (the single-tile
// electrify burst still fires; ONLY the multi-tile chain propagation is gated). The
// radius (maxDepth) + per-tile shock are PROPOSED -- ratify via N=40 before the flip
// (mirror IMPRINT_BEAT_ENABLED / STAMINA_FATIGUE_ENABLED gating). The helper's own
// defaults are wider (maxDepth 5); these are the deliberately conservative wire values.
const CHAIN_LIGHTNING_FLAG = 'TERRAIN_CHAIN_LIGHTNING_ENABLED';
// Caps = 3/2 (master-dd grilling verdict 2026-06-30; was 2/2 as-built #3082). maxDepth 3 =
// one more BFS hop than the conservative wire; shock 2 unchanged. Still well under the helper
// default (5). Footprint of the bump = tools/sim/d8-chain-footprint.js. PROPOSED (flip + cap
// ratify = master-dd, non-band-neutral -- the chain reaches more water tiles).
const PROPOSED_CHAIN_MAX_DEPTH = 3; // blast radius (helper default is 5)
const PROPOSED_CHAIN_SHOCK = 2; // per-tile occupant shock (== the electrify burst)

// Square-grid 4-neighbour offsets for the chain BFS (mirror membraneOsmotiche ADJ).
const CHAIN_ADJ = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// True iff the chain flag is explicitly 'true' (mirror isImprintEnabled / isFatigueEnabled).
function isChainLightningEnabled(env = process.env) {
  return Boolean(env) && env[CHAIN_LIGHTNING_FLAG] === 'true';
}

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

/**
 * D8 (aa01 CAP-07): full chain-lightning strike on a SQUARE grid. BFS-spreads the
 * electrified state from `origin` through adjacent water tiles (via chainElectrified)
 * and applies a FLOORED shock to every occupant standing on a NEWLY-electrified tile.
 * The origin tile is excluded (its occupant already took the single-tile electrify
 * burst at the call-site). Mutates `tileStateMap` (electrified spread) + `unit.hp`.
 * Occupants are floored at 1 HP -- the chain weakens but never lands a killing blow
 * (so no mid-attack death pipeline fires on a non-target unit). Friendly-fire by
 * design (positioning telegraph). Never throws; bad origin -> empty result.
 *
 * @param {{x:number,y:number}} origin  hex where lightning electrified a water tile
 * @param {Map|object} tileStateMap     keyed "x,y" (mutated)
 * @param {Array} units                 session units (read position + hp; hp mutated)
 * @param {object} opts { maxDepth, shockDamagePerTile, actorId }
 * @returns {{ electrified_tiles: string[], hits: Array<{actor_id,tile,shock_damage:number}> }}
 */
function chainLightningStrike(origin, tileStateMap, units, opts = {}) {
  const ox = Number(origin && origin.x);
  const oy = Number(origin && origin.y);
  if (!Number.isFinite(ox) || !Number.isFinite(oy)) return { electrified_tiles: [], hits: [] };
  const maxDepth = Number.isFinite(opts.maxDepth) ? opts.maxDepth : PROPOSED_CHAIN_MAX_DEPTH;
  const shock = Number.isFinite(opts.shockDamagePerTile)
    ? opts.shockDamagePerTile
    : PROPOSED_CHAIN_SHOCK;
  const keyFn = (x, y) => `${x},${y}`;
  const originKey = keyFn(ox, oy);
  const chain = chainElectrified(
    { q: ox, r: oy },
    tileStateMap,
    (q, r) => keyFn(q, r),
    ({ q, r }) => CHAIN_ADJ.map(([dx, dy]) => ({ q: q + dx, r: r + dy })),
    { maxDepth, shockDamagePerTile: shock, actorId: opts.actorId ?? null },
  );
  const electrified_tiles = chain.electrified.filter((k) => k !== originKey);
  const hits = [];
  const list = Array.isArray(units) ? units : [];
  for (const tkey of electrified_tiles) {
    const occupant = list.find(
      (u) =>
        u &&
        u.position &&
        keyFn(Number(u.position.x), Number(u.position.y)) === tkey &&
        Number(u.hp) > 0,
    );
    if (!occupant) continue;
    const pre = Number(occupant.hp);
    occupant.hp = Math.max(1, pre - shock);
    const applied = pre - occupant.hp;
    // Only a meaningful shock is a hit (an occupant already at the 1-HP floor takes 0).
    if (applied > 0) hits.push({ actor_id: occupant.id, tile: tkey, shock_damage: applied });
  }
  return { electrified_tiles, hits };
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
  chainLightningStrike,
  isChainLightningEnabled,
  CHAIN_LIGHTNING_FLAG,
  PROPOSED_CHAIN_MAX_DEPTH,
  PROPOSED_CHAIN_SHOCK,
  TILE_TYPES,
  ELEMENTS,
  DEFAULT_TTL,
};
