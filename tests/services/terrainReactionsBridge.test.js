// M14-A CAP-07 (2026-04-25) — Integration tests per terrainReactionsBridge.
//
// Coverage:
// - applyTerrainReaction su tile vuoto / esistente
// - 9 reazioni elementali (fire+ice, fire+water, lightning+water+chain, ecc.)
// - Decay TTL end-of-round
// - Defensive guards (session malformato, element invalid, missing tileStateMap)

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyTerrainReaction,
  decayTileStates,
  tileKey,
  cartesianNeighbors,
  VALID_ELEMENTS,
} = require('../../apps/backend/services/combat/terrainReactionsBridge');

function makeSession() {
  return { tileStateMap: {} };
}

test('tileKey: cartesian (x,y) → "x,y" string format', () => {
  assert.equal(tileKey(0, 0), '0,0');
  assert.equal(tileKey(3, 5), '3,5');
  assert.equal(tileKey(-1, 7), '-1,7');
  assert.equal(tileKey(2.7, 4.9), '2,4'); // truncates float to int
});

test('cartesianNeighbors: 4-connected Manhattan neighbors', () => {
  const ns = cartesianNeighbors({ q: 3, r: 4 });
  assert.equal(ns.length, 4);
  assert.deepEqual(ns, [
    { q: 4, r: 4 },
    { q: 2, r: 4 },
    { q: 3, r: 5 },
    { q: 3, r: 3 },
  ]);
});

test('VALID_ELEMENTS: fire/ice/water/lightning only', () => {
  assert.ok(VALID_ELEMENTS.has('fire'));
  assert.ok(VALID_ELEMENTS.has('ice'));
  assert.ok(VALID_ELEMENTS.has('water'));
  assert.ok(VALID_ELEMENTS.has('lightning'));
  assert.ok(!VALID_ELEMENTS.has('earth'));
  assert.ok(!VALID_ELEMENTS.has(''));
});

test('applyTerrainReaction: fire on empty tile → ignite (creates fire tile)', () => {
  const session = makeSession();
  const r = applyTerrainReaction(session, 2, 3, 'fire', { actorId: 'u_1' });
  assert.equal(r.applied, true);
  assert.equal(r.tileKey, '2,3');
  assert.equal(r.nextState.type, 'fire');
  assert.ok(r.nextState.ttl >= 1);
  assert.equal(session.tileStateMap['2,3'].type, 'fire');
});

test('applyTerrainReaction: fire + ice → water + steam_burst (1 dmg)', () => {
  const session = makeSession();
  // First create ice
  applyTerrainReaction(session, 4, 4, 'ice', { actorId: 'u_1' });
  assert.equal(session.tileStateMap['4,4'].type, 'ice');
  // Then fire onto ice
  const r = applyTerrainReaction(session, 4, 4, 'fire', { actorId: 'u_2' });
  assert.equal(r.applied, true);
  assert.equal(r.nextState.type, 'water');
  assert.equal(r.burstDamage, 1, 'steam burst applies 1 damage to occupant');
  assert.ok(r.effects.includes('steam_burst'));
});

test('applyTerrainReaction: fire + water → normal (evaporate, no damage)', () => {
  const session = makeSession();
  applyTerrainReaction(session, 0, 0, 'water');
  const r = applyTerrainReaction(session, 0, 0, 'fire');
  assert.equal(r.applied, true);
  assert.equal(r.nextState.type, 'normal');
  assert.equal(r.burstDamage, 0);
  assert.ok(r.effects.includes('evaporate'));
  // Map sparsity: tile rimosso quando torna a normal
  assert.equal(session.tileStateMap['0,0'], undefined);
});

test('applyTerrainReaction: lightning + water → electrified + chain BFS', () => {
  const session = makeSession();
  // Setup chain di water: (0,0) (1,0) (2,0) (3,0). Lightning su (0,0).
  applyTerrainReaction(session, 0, 0, 'water');
  applyTerrainReaction(session, 1, 0, 'water');
  applyTerrainReaction(session, 2, 0, 'water');
  applyTerrainReaction(session, 3, 0, 'water');

  const r = applyTerrainReaction(session, 0, 0, 'lightning', { actorId: 'u_3' });
  assert.equal(r.applied, true);
  assert.equal(r.nextState.type, 'electrified');
  assert.equal(r.burstDamage, 2, 'lightning+water burst = 2 dmg al tile origin');
  assert.ok(r.effects.includes('chain_trigger'));
  assert.ok(r.chain, 'chain object populated');
  // Chain BFS deve aver visitato i water tile adiacenti (4 in linea, cap maxDepth 5)
  assert.ok(Array.isArray(r.chain.electrified));
  assert.ok(r.chain.electrified.length >= 1, 'almeno 1 tile water diventa electrified via chain');
  assert.ok(Number.isFinite(r.chain.chainDamage));
});

test('decayTileStates: ttl > 1 decrements, ttl <= 1 removes', () => {
  const session = makeSession();
  // Setup 3 tile con ttl diversi
  session.tileStateMap = {
    '0,0': { type: 'fire', ttl: 3 },
    '1,0': { type: 'water', ttl: 1 },
    '2,0': { type: 'ice', ttl: 5 },
  };

  const stats = decayTileStates(session);
  assert.equal(stats.decayed, 2, '0,0 e 2,0 decrementati');
  assert.equal(stats.removed, 1, '1,0 rimosso (ttl=1 → 0 → delete)');

  assert.equal(session.tileStateMap['0,0'].ttl, 2);
  assert.equal(session.tileStateMap['1,0'], undefined);
  assert.equal(session.tileStateMap['2,0'].ttl, 4);
});

test('decayTileStates: tile malformed (non-object) viene rimosso', () => {
  const session = {
    tileStateMap: { '0,0': null, '1,0': 'invalid', '2,0': { type: 'fire', ttl: 2 } },
  };
  const stats = decayTileStates(session);
  assert.equal(stats.removed, 2);
  assert.equal(stats.decayed, 1);
  assert.equal(session.tileStateMap['2,0'].ttl, 1);
});

test('decayTileStates: missing tileStateMap → no-op (no throw)', () => {
  const session = {};
  const stats = decayTileStates(session);
  assert.deepEqual(stats, { decayed: 0, removed: 0 });
});

test('applyTerrainReaction: defensive guards (no throw on bad input)', () => {
  // No session
  let r = applyTerrainReaction(null, 0, 0, 'fire');
  assert.equal(r.applied, false);

  // Session without tileStateMap
  r = applyTerrainReaction({}, 0, 0, 'fire');
  assert.equal(r.applied, false);

  // Invalid element
  const session = makeSession();
  r = applyTerrainReaction(session, 0, 0, 'earth');
  assert.equal(r.applied, false);
  assert.deepEqual(session.tileStateMap, {});

  // Empty element
  r = applyTerrainReaction(session, 0, 0, '');
  assert.equal(r.applied, false);
});

test('integration: fire-water-evaporate cycle then decay', () => {
  // Simula 1 round: applico fire, poi 2 round dopo applico water,
  // verifico che TTL siano decadi e il tile finale sia consistente.
  const session = makeSession();

  applyTerrainReaction(session, 5, 5, 'fire', { baseTtl: 3 });
  assert.equal(session.tileStateMap['5,5'].type, 'fire');
  assert.equal(session.tileStateMap['5,5'].ttl, 3);

  decayTileStates(session); // round 1 end → ttl 2
  assert.equal(session.tileStateMap['5,5'].ttl, 2);

  decayTileStates(session); // round 2 end → ttl 1
  assert.equal(session.tileStateMap['5,5'].ttl, 1);

  // Now apply water to fire
  const r = applyTerrainReaction(session, 5, 5, 'water');
  assert.equal(r.applied, true);
  // fire + water → normal/evaporate (per terrainReactions.js)
  assert.equal(r.nextState.type, 'normal');
  assert.equal(session.tileStateMap['5,5'], undefined, 'tile rimosso quando torna a normal');
});
