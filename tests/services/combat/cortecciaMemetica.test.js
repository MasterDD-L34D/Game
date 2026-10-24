// tests/services/combat/cortecciaMemetica.test.js
//
// corteccia_memetica (creature-trait mechanics slice 3, trait 4 -- treant).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//   On a hit that deals >= 3 damage to the carrier: the bark hardens
//   (corteccia_attiva -> damage_reduction 2 on future hits) AND it broadcasts
//   `risonanza_memetica` (single-use +1 atk) to same-faction allies within
//   range 3 (Darkest Dungeon ripple / Banner Saga willpower).
// Real-module tests (CommonJS), CI-gated via tests/services/*/*.test.js.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyCortecciaReaction,
  computeCortecciaDR,
  consumeRisonanza,
  CORTECCIA_DMG_THRESHOLD,
  CORTECCIA_DR,
  CORTECCIA_ATTIVA,
  RISONANZA,
  RISONANZA_RANGE,
} = require('../../../apps/backend/services/combat/cortecciaMemetica');

function unit(id, faction, x, y, extra = {}) {
  return {
    id,
    controlled_by: faction,
    hp: 20,
    position: { x, y },
    status: {},
    traits: [],
    ...extra,
  };
}

// ─── applyCortecciaReaction ──────────────────────────────────────────────────

test('reaction fires on a >=3 dmg hit: hardens self + broadcasts risonanza to allies in range', () => {
  const treant = unit('treant', 'players', 0, 0, { traits: ['corteccia_memetica'] });
  const allyNear = unit('near', 'players', 3, 0); // distance 3 == RISONANZA_RANGE
  const allyFar = unit('far', 'players', 4, 0); // distance 4 > range
  const res = applyCortecciaReaction({
    target: treant,
    damageDealt: 3,
    units: [treant, allyNear, allyFar],
  });
  assert.ok(res, 'reaction returns an outcome');
  assert.ok(Number(treant.status[CORTECCIA_ATTIVA]) > 0, 'bark hardened (corteccia_attiva set)');
  assert.ok(Number(allyNear.status[RISONANZA]) > 0, 'near ally got risonanza_memetica');
  assert.ok(!(Number(allyFar.status[RISONANZA]) > 0), 'far ally out of range');
  assert.ok(Array.isArray(res.broadcast) && res.broadcast.length === 1);
});

test('reaction does NOT fire below the 3-damage threshold', () => {
  const treant = unit('treant', 'players', 0, 0, { traits: ['corteccia_memetica'] });
  const ally = unit('ally', 'players', 1, 0);
  const res = applyCortecciaReaction({ target: treant, damageDealt: 2, units: [treant, ally] });
  assert.equal(res, null);
  assert.ok(!(CORTECCIA_ATTIVA in treant.status));
  assert.ok(!(RISONANZA in ally.status));
});

test('reaction does NOT fire for a unit without the trait', () => {
  const plain = unit('plain', 'players', 0, 0); // no corteccia_memetica
  const ally = unit('ally', 'players', 1, 0);
  const res = applyCortecciaReaction({ target: plain, damageDealt: 9, units: [plain, ally] });
  assert.equal(res, null);
  assert.ok(!(RISONANZA in ally.status));
});

test('risonanza broadcast never reaches enemies', () => {
  const treant = unit('treant', 'players', 0, 0, { traits: ['corteccia_memetica'] });
  const enemy = unit('foe', 'sistema', 1, 0);
  applyCortecciaReaction({ target: treant, damageDealt: 5, units: [treant, enemy] });
  assert.ok(!(RISONANZA in enemy.status));
});

test('reaction tolerates traits given as object array {id}', () => {
  const treant = unit('treant', 'players', 0, 0, { traits: [{ id: 'corteccia_memetica' }] });
  const ally = unit('ally', 'players', 1, 0);
  const res = applyCortecciaReaction({ target: treant, damageDealt: 4, units: [treant, ally] });
  assert.ok(res, 'object-shaped trait id resolved');
  assert.ok(Number(ally.status[RISONANZA]) > 0);
});

// ─── computeCortecciaDR (the damage_reduction 2 consumer) ────────────────────

test('computeCortecciaDR: 2 while corteccia_attiva is up, 0 otherwise', () => {
  assert.equal(computeCortecciaDR({ status: { [CORTECCIA_ATTIVA]: 2 } }), CORTECCIA_DR);
  assert.equal(computeCortecciaDR({ status: {} }), 0);
  assert.equal(computeCortecciaDR(null), 0);
});

// ─── consumeRisonanza (single-use) ────────────────────────────────────────────

test('consumeRisonanza: removes the buff and reports it was consumed', () => {
  const u = { status: { [RISONANZA]: 2 } };
  assert.equal(consumeRisonanza(u), true);
  assert.ok(!(RISONANZA in u.status), 'single-use -> cleared after one attack');
  assert.equal(consumeRisonanza(u), false, 'nothing left to consume');
  assert.equal(consumeRisonanza(null), false);
});

test('constants', () => {
  assert.equal(CORTECCIA_DMG_THRESHOLD, 3);
  assert.equal(CORTECCIA_DR, 2);
  assert.equal(CORTECCIA_ATTIVA, 'corteccia_attiva');
  assert.equal(RISONANZA, 'risonanza_memetica');
  assert.equal(RISONANZA_RANGE, 3);
});
