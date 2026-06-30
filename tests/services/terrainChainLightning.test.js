// =============================================================================
// D8 (aa01 CAP-07 carve-out, 2026-06-30) -- chain-lightning strike helper.
//
// Verifies the SQUARE-grid chain propagation + floored occupant shock that the
// session.js electrified branch wires behind TERRAIN_CHAIN_LIGHTNING_ENABLED.
// Flag OFF (default) = the wire never calls this helper -> byte-identical legacy.
// =============================================================================

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  chainLightningStrike,
  isChainLightningEnabled,
  PROPOSED_CHAIN_MAX_DEPTH,
  PROPOSED_CHAIN_SHOCK,
} = require('../../apps/backend/services/combat/terrainReactions');

// A "x,y" -> water-tile map for the given coords.
function waterMap(coords) {
  const m = {};
  for (const [x, y] of coords) m[`${x},${y}`] = { type: 'water', ttl: 2, source_actor: null };
  return m;
}

test('flag OFF by default; only "true" enables', () => {
  assert.equal(isChainLightningEnabled({}), false);
  assert.equal(isChainLightningEnabled({ TERRAIN_CHAIN_LIGHTNING_ENABLED: 'false' }), false);
  assert.equal(isChainLightningEnabled({ TERRAIN_CHAIN_LIGHTNING_ENABLED: '1' }), false);
  assert.equal(isChainLightningEnabled({ TERRAIN_CHAIN_LIGHTNING_ENABLED: 'true' }), true);
  assert.equal(isChainLightningEnabled(null), false);
});

test('PROPOSED values are the conservative wire defaults', () => {
  assert.equal(PROPOSED_CHAIN_MAX_DEPTH, 2);
  assert.equal(PROPOSED_CHAIN_SHOCK, 2);
});

test('spreads through adjacent water, excludes origin, respects maxDepth 2', () => {
  // Origin (0,0) struck; water line (1,0),(2,0),(3,0). maxDepth 2 -> (3,0) is depth 3, dropped.
  const map = waterMap([
    [1, 0],
    [2, 0],
    [3, 0],
  ]);
  map['0,0'] = { type: 'electrified', ttl: 1, source_actor: null };
  const res = chainLightningStrike({ x: 0, y: 0 }, map, []);
  assert.deepEqual(
    res.electrified_tiles.sort(),
    ['1,0', '2,0'],
    'origin excluded, (3,0) out of range',
  );
  assert.equal(map['1,0'].type, 'electrified');
  assert.equal(map['2,0'].type, 'electrified');
  assert.equal(map['3,0'].type, 'water', 'beyond maxDepth stays water');
});

test('occupants on newly-electrified tiles take floored shock; origin occupant untouched', () => {
  const map = waterMap([
    [1, 0],
    [2, 0],
  ]);
  map['0,0'] = { type: 'electrified', ttl: 1, source_actor: null };
  const units = [
    { id: 'origin_unit', position: { x: 0, y: 0 }, hp: 5 }, // origin -> NOT chained
    { id: 'foe', position: { x: 1, y: 0 }, hp: 5 }, // -2 -> 3
    { id: 'low', position: { x: 2, y: 0 }, hp: 2 }, // floor: 2 -> 1, applied 1
  ];
  const res = chainLightningStrike({ x: 0, y: 0 }, map, units, { actorId: 'caster' });
  assert.equal(units[0].hp, 5, 'origin occupant not shocked by the chain');
  assert.equal(units[1].hp, 3);
  assert.equal(units[2].hp, 1, 'floored at 1, never below');
  const byId = Object.fromEntries(res.hits.map((h) => [h.actor_id, h.shock_damage]));
  assert.deepEqual(byId, { foe: 2, low: 1 });
});

test('an occupant already at 1 HP is not a hit (0 applied), tile still electrified', () => {
  const map = waterMap([[1, 0]]);
  map['0,0'] = { type: 'electrified', ttl: 1, source_actor: null };
  const units = [{ id: 'spent', position: { x: 1, y: 0 }, hp: 1 }];
  const res = chainLightningStrike({ x: 0, y: 0 }, map, units);
  assert.equal(units[0].hp, 1);
  assert.deepEqual(res.electrified_tiles, ['1,0']);
  assert.equal(res.hits.length, 0, 'no meaningful shock -> no hit recorded');
});

test('friendly-fire: allies on chained water tiles are shocked too', () => {
  const map = waterMap([
    [0, 1],
    [0, -1],
  ]);
  map['0,0'] = { type: 'electrified', ttl: 1, source_actor: null };
  const units = [
    { id: 'ally_a', position: { x: 0, y: 1 }, hp: 6, team: 'players' },
    { id: 'ally_b', position: { x: 0, y: -1 }, hp: 6, team: 'players' },
  ];
  const res = chainLightningStrike({ x: 0, y: 0 }, map, units);
  assert.equal(units[0].hp, 4);
  assert.equal(units[1].hp, 4);
  assert.equal(res.hits.length, 2);
});

test('does not spread through non-water tiles', () => {
  // (1,0) is fire, not water -> chain stops at the origin.
  const map = { '1,0': { type: 'fire', ttl: 2, source_actor: null } };
  map['0,0'] = { type: 'electrified', ttl: 1, source_actor: null };
  const res = chainLightningStrike({ x: 0, y: 0 }, map, []);
  assert.deepEqual(res.electrified_tiles, [], 'no adjacent water -> no spread');
  assert.equal(map['1,0'].type, 'fire');
});

test('bad origin / no units -> safe empty result, never throws', () => {
  assert.deepEqual(chainLightningStrike(null, {}, []), { electrified_tiles: [], hits: [] });
  assert.deepEqual(chainLightningStrike({ x: 'nope' }, {}, []), {
    electrified_tiles: [],
    hits: [],
  });
  const map = waterMap([[1, 0]]);
  map['0,0'] = { type: 'electrified', ttl: 1, source_actor: null };
  const res = chainLightningStrike({ x: 0, y: 0 }, map, null);
  assert.deepEqual(res.electrified_tiles, ['1,0']);
  assert.equal(res.hits.length, 0);
});
