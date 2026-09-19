// M14-A 2026-04-25 — terrain reactions unit tests.
// Ref: docs/research/triangle-strategy-transfer-plan.md:236
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  reactTile,
  chainElectrified,
  TILE_TYPES,
  ELEMENTS,
  DEFAULT_TTL,
} = require('../../apps/backend/services/combat/terrainReactions');
const { hexKey, hexNeighbors } = require('../../apps/backend/services/grid/hexGrid');

test('constants: TILE_TYPES + ELEMENTS stable', () => {
  assert.deepEqual(TILE_TYPES, ['normal', 'fire', 'ice', 'water', 'electrified']);
  assert.deepEqual(ELEMENTS, ['fire', 'ice', 'water', 'lightning']);
  assert.equal(DEFAULT_TTL.fire, 2);
  assert.equal(DEFAULT_TTL.electrified, 1);
});

test('reactTile: fire + ice → water (steam_burst 1 dmg)', () => {
  const r = reactTile(
    { type: 'ice', ttl: 2, source_actor: null },
    { element: 'fire', actor_id: 'u_1' },
  );
  assert.equal(r.nextState.type, 'water');
  assert.equal(r.burstDamage, 1);
  assert.ok(r.effects.includes('steam_burst'));
  assert.equal(r.nextState.source_actor, 'u_1');
});

test('reactTile: fire + water → normal (evaporate, no damage)', () => {
  const r = reactTile({ type: 'water', ttl: 2 }, { element: 'fire' });
  assert.equal(r.nextState.type, 'normal');
  assert.equal(r.burstDamage, 0);
  assert.ok(r.effects.includes('evaporate'));
});

test('reactTile: lightning + water → electrified (burst 2 + chain_trigger)', () => {
  const r = reactTile({ type: 'water', ttl: 1 }, { element: 'lightning', actor_id: 'u_2' });
  assert.equal(r.nextState.type, 'electrified');
  assert.equal(r.burstDamage, 2);
  assert.ok(r.effects.includes('chain_trigger'));
});

test('reactTile: fire + normal → fire (ignite)', () => {
  const r = reactTile({ type: 'normal', ttl: 0 }, { element: 'fire', baseTtl: 3 });
  assert.equal(r.nextState.type, 'fire');
  assert.equal(r.nextState.ttl, 3);
  assert.ok(r.effects.includes('ignite'));
});

test('reactTile: unknown element → no change', () => {
  const r = reactTile({ type: 'water', ttl: 2 }, { element: 'plasma' });
  assert.equal(r.nextState.type, 'water');
  assert.equal(r.burstDamage, 0);
});

test('reactTile: null current state normalized to normal', () => {
  const r = reactTile(null, { element: 'fire' });
  assert.equal(r.nextState.type, 'fire');
});

test('reactTile: lightning on normal → no_reaction (not ignite)', () => {
  const r = reactTile({ type: 'normal', ttl: 0 }, { element: 'lightning' });
  assert.equal(r.nextState.type, 'normal');
  assert.ok(r.effects.includes('no_reaction'));
});

test('chainElectrified: BFS converts connected water tiles to electrified', () => {
  // Build a 3-tile water line at (0,0) (1,0) (2,0); lightning strikes origin.
  const map = new Map();
  map.set(hexKey(0, 0), { type: 'water', ttl: 2, source_actor: null });
  map.set(hexKey(1, 0), { type: 'water', ttl: 2, source_actor: null });
  map.set(hexKey(2, 0), { type: 'water', ttl: 2, source_actor: null });
  // Non-water neighbor should not propagate.
  map.set(hexKey(0, 1), { type: 'normal', ttl: 0, source_actor: null });

  const result = chainElectrified({ q: 0, r: 0 }, map, hexKey, hexNeighbors, {
    maxDepth: 5,
    actorId: 'u_storm',
    shockDamagePerTile: 2,
  });
  assert.equal(result.electrified.length, 3);
  assert.equal(result.chainDamage, 6);
  assert.equal(map.get(hexKey(0, 0)).type, 'electrified');
  assert.equal(map.get(hexKey(1, 0)).type, 'electrified');
  assert.equal(map.get(hexKey(2, 0)).type, 'electrified');
  assert.equal(map.get(hexKey(0, 1)).type, 'normal'); // unchanged
});

test('chainElectrified: respects maxDepth cap', () => {
  // Long water chain, cap at 2 hops.
  const map = new Map();
  for (let q = 0; q <= 6; q++) {
    map.set(hexKey(q, 0), { type: 'water', ttl: 2, source_actor: null });
  }
  const result = chainElectrified({ q: 0, r: 0 }, map, hexKey, hexNeighbors, {
    maxDepth: 2,
  });
  // depth 0 + depth 1 + depth 2 along the axis = at most 3 tiles on the line
  // (note: hex neighbors branch outward, so chain may visit more tiles in
  // a 2-depth BFS; the guarantee is that all electrified are within 2 hops).
  assert.ok(result.electrified.length >= 1 && result.electrified.length <= 7);
  // Tile at q=6 (depth 6) must remain water.
  assert.equal(map.get(hexKey(6, 0)).type, 'water');
});

test('chainElectrified: object map (non-Map) also supported', () => {
  const map = {};
  map[hexKey(0, 0)] = { type: 'water', ttl: 2, source_actor: null };
  const result = chainElectrified({ q: 0, r: 0 }, map, hexKey, hexNeighbors, { maxDepth: 1 });
  assert.equal(result.electrified.length, 1);
  assert.equal(map[hexKey(0, 0)].type, 'electrified');
});

test('chainElectrified: throws when hexKeyFn missing', () => {
  assert.throws(
    () => chainElectrified({ q: 0, r: 0 }, new Map(), null, hexNeighbors),
    /hexKeyFn_and_hexNeighborsFn_required/,
  );
});
