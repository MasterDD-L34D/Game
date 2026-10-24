// tests/services/combat/tessutiAdattivi.test.js
//
// tessuti_adattivi (creature-trait mechanics slice 4, trait 11 -- rakshasa).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//   On taking >= 2 damage of a given channel: set adattamento_<channel> ->
//   +15% resist to that channel for 3 rounds + heal 1; cap 2 channels at once
//   (Hades Stubborn Roots). Detect runs post-hit; the +15% resist (a
//   resistanceEngine delta) only bites on FUTURE hits of that channel.
// Real-module tests (CommonJS), CI-gated via tests/services/*/*.test.js.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyTessutiAdaptation,
  computeTessutiResistDelta,
  hasTrait,
  TESSUTI_TRAIT,
  TESSUTI_DMG_THRESHOLD,
  ADATTAMENTO_PREFIX,
  RESIST_PCT,
  ADATTAMENTO_TURNS,
  MAX_CHANNELS,
} = require('../../../apps/backend/services/combat/tessutiAdattivi');

function unit(extra = {}) {
  return { id: 'rak', hp: 10, max_hp: 20, status: {}, traits: ['tessuti_adattivi'], ...extra };
}

// ─── applyTessutiAdaptation (the on-taking-damage detect/heal) ────────────────

test('adapts on a >=2 dmg hit of a channel: sets adattamento_<channel>=3 + heals 1', () => {
  const u = unit({ hp: 10 });
  const res = applyTessutiAdaptation({ target: u, channel: 'fuoco', damageDealt: 2 });
  assert.ok(res, 'returns an adaptation outcome');
  assert.equal(u.status[`${ADATTAMENTO_PREFIX}fuoco`], ADATTAMENTO_TURNS);
  assert.equal(u.hp, 11, 'healed 1');
  assert.equal(res.channel, 'fuoco');
  assert.equal(res.healed, 1);
});

test('does NOT adapt below the damage threshold', () => {
  const u = unit();
  assert.equal(applyTessutiAdaptation({ target: u, channel: 'fuoco', damageDealt: 1 }), null);
  assert.ok(!(`${ADATTAMENTO_PREFIX}fuoco` in u.status));
});

test('does NOT adapt without the trait', () => {
  const u = unit({ traits: ['other'] });
  assert.equal(applyTessutiAdaptation({ target: u, channel: 'fuoco', damageDealt: 5 }), null);
});

test('does NOT adapt without a channel', () => {
  const u = unit();
  assert.equal(applyTessutiAdaptation({ target: u, channel: null, damageDealt: 5 }), null);
});

test('caps at MAX_CHANNELS distinct channels; refreshing an active channel is always allowed', () => {
  const u = unit({ hp: 5 });
  applyTessutiAdaptation({ target: u, channel: 'fuoco', damageDealt: 3 });
  applyTessutiAdaptation({ target: u, channel: 'ghiaccio', damageDealt: 3 });
  // a 3rd NEW channel is rejected (cap reached)
  const third = applyTessutiAdaptation({ target: u, channel: 'psionico', damageDealt: 3 });
  assert.equal(third, null, 'cap reached -> no new channel');
  assert.ok(!(`${ADATTAMENTO_PREFIX}psionico` in u.status));
  // refreshing an already-active channel still works (does not count as a new one)
  u.status[`${ADATTAMENTO_PREFIX}fuoco`] = 1; // simulate decay
  const refresh = applyTessutiAdaptation({ target: u, channel: 'fuoco', damageDealt: 3 });
  assert.ok(refresh, 'refresh of an active channel allowed at cap');
  assert.equal(u.status[`${ADATTAMENTO_PREFIX}fuoco`], ADATTAMENTO_TURNS);
});

test('heal is capped at max_hp (no overheal) and never heals a downed unit', () => {
  const full = unit({ hp: 20, max_hp: 20 });
  const res = applyTessutiAdaptation({ target: full, channel: 'fuoco', damageDealt: 5 });
  assert.ok(res, 'still adapts at full HP');
  assert.equal(full.hp, 20, 'no overheal');
  assert.equal(res.healed, 0);
  const dead = unit({ hp: 0 });
  assert.equal(applyTessutiAdaptation({ target: dead, channel: 'fuoco', damageDealt: 5 }), null);
});

// ─── computeTessutiResistDelta (the apply-zone read) ─────────────────────────

test('computeTessutiResistDelta: +15 delta for an adapted channel, empty otherwise', () => {
  const u = unit({ status: { [`${ADATTAMENTO_PREFIX}fuoco`]: 2 } });
  const delta = computeTessutiResistDelta(u, 'fuoco');
  assert.deepEqual(delta, [{ channel: 'fuoco', modifier_pct: RESIST_PCT }]);
  assert.deepEqual(
    computeTessutiResistDelta(u, 'ghiaccio'),
    [],
    'no delta for an un-adapted channel',
  );
  assert.deepEqual(computeTessutiResistDelta({ status: {} }, 'fuoco'), []);
  assert.deepEqual(computeTessutiResistDelta(null, 'fuoco'), []);
});

test('hasTrait + constants', () => {
  assert.equal(hasTrait({ traits: [{ id: 'tessuti_adattivi' }] }, TESSUTI_TRAIT), true);
  assert.equal(TESSUTI_TRAIT, 'tessuti_adattivi');
  assert.equal(TESSUTI_DMG_THRESHOLD, 2);
  assert.equal(ADATTAMENTO_PREFIX, 'adattamento_');
  assert.equal(RESIST_PCT, 15);
  assert.equal(ADATTAMENTO_TURNS, 3);
  assert.equal(MAX_CHANNELS, 2);
});
