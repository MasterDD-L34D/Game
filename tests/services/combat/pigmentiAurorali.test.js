// tests/services/combat/pigmentiAurorali.test.js
//
// pigmenti_aurorali (creature-trait mechanics slice 7, trait 9 -- treant).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//   PASSIVE: while HP >= 50%, at end-of-round enemies ending adjacent get
//   `abbagliato` (-1 atk on their next attack). Dims as HP drops (Slay-the-Spire
//   Glow). The ACTIVE intensify (-2 + disorient on attackers) is DEFERRED (ability
//   path, owner-gated like filtri/matrice active). eco_sismico (the LARGE tile-
//   status partner of slice 7) is DEFERRED -- its tile-entry trigger needs the
//   move/terrain substrate (being built separately); see the slice-7 PR.
// Real-module tests (CommonJS), CI-gated via tests/services/*/*.test.js.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyEndRoundGlow,
  consumeAbbagliato,
  disorientAttacker,
  hasTrait,
  PIGMENTI_TRAIT,
  PIGMENTI_INTENSIFICATO,
  ABBAGLIATO,
  ABBAGLIATO_TTL,
  INTENSIFIED_ATK,
  DISORIENT,
  HP_GATE,
} = require('../../../apps/backend/services/combat/pigmentiAurorali');

function unit(id, faction, x, y, extra = {}) {
  return {
    id,
    controlled_by: faction,
    hp: 20,
    max_hp: 20,
    position: { x, y },
    status: {},
    traits: [],
    ...extra,
  };
}

test('while HP >= 50%, an adjacent enemy gets abbagliato', () => {
  const treant = unit('treant', 'players', 0, 0, {
    traits: ['pigmenti_aurorali'],
    hp: 20,
    max_hp: 20,
  });
  const enemy = unit('foe', 'sistema', 1, 0);
  const events = applyEndRoundGlow({ carrier: treant, units: [treant, enemy] });
  assert.equal(enemy.status[ABBAGLIATO], ABBAGLIATO_TTL);
  assert.equal(events.length, 1);
  assert.equal(events[0].unit_id, 'foe');
});

test('dims below the HP gate -- no glow when HP < 50%', () => {
  const treant = unit('treant', 'players', 0, 0, {
    traits: ['pigmenti_aurorali'],
    hp: 9,
    max_hp: 20,
  });
  const enemy = unit('foe', 'sistema', 1, 0);
  const events = applyEndRoundGlow({ carrier: treant, units: [treant, enemy] });
  assert.ok(!(ABBAGLIATO in enemy.status), 'no glow below the gate');
  assert.equal(events.length, 0);
});

test('exactly at the HP gate (50%) still glows', () => {
  const treant = unit('treant', 'players', 0, 0, {
    traits: ['pigmenti_aurorali'],
    hp: 10,
    max_hp: 20,
  });
  const enemy = unit('foe', 'sistema', 1, 0);
  applyEndRoundGlow({ carrier: treant, units: [treant, enemy] });
  assert.equal(enemy.status[ABBAGLIATO], ABBAGLIATO_TTL);
});

test('only ADJACENT enemies are dazzled', () => {
  const treant = unit('treant', 'players', 0, 0, { traits: ['pigmenti_aurorali'] });
  const far = unit('far', 'sistema', 2, 0); // distance 2
  applyEndRoundGlow({ carrier: treant, units: [treant, far] });
  assert.ok(!(ABBAGLIATO in far.status));
});

test('allies are never dazzled (enemies only)', () => {
  const treant = unit('treant', 'players', 0, 0, { traits: ['pigmenti_aurorali'] });
  const ally = unit('ally', 'players', 1, 0);
  applyEndRoundGlow({ carrier: treant, units: [treant, ally] });
  assert.ok(!(ABBAGLIATO in ally.status));
});

test('a downed enemy is skipped', () => {
  const treant = unit('treant', 'players', 0, 0, { traits: ['pigmenti_aurorali'] });
  const dead = unit('dead', 'sistema', 1, 0, { hp: 0 });
  applyEndRoundGlow({ carrier: treant, units: [treant, dead] });
  assert.ok(!(ABBAGLIATO in dead.status));
});

test('a non-carrier never glows', () => {
  const plain = unit('plain', 'players', 0, 0); // no pigmenti_aurorali
  const enemy = unit('foe', 'sistema', 1, 0);
  assert.deepEqual(applyEndRoundGlow({ carrier: plain, units: [plain, enemy] }), []);
  assert.ok(!(ABBAGLIATO in enemy.status));
});

// Single-use consume: abbagliato is durable (PERSISTENT, decay-proof so it survives
// from the end-of-round set until the dazzled enemy next attacks) and is consumed on
// that attack -> exactly "-1 atk on the next attack", then gone (not a permanent dazzle).
test('consumeAbbagliato: removes the dazzle and reports it was spent', () => {
  const u = { status: { [ABBAGLIATO]: 1 } };
  assert.equal(consumeAbbagliato(u), true);
  assert.ok(!(ABBAGLIATO in u.status), 'cleared after one attack');
  assert.equal(consumeAbbagliato(u), false, 'nothing left to consume');
  assert.equal(consumeAbbagliato(null), false);
});

test('hasTrait + constants', () => {
  assert.equal(hasTrait({ traits: [{ id: 'pigmenti_aurorali' }] }, PIGMENTI_TRAIT), true);
  assert.equal(PIGMENTI_TRAIT, 'pigmenti_aurorali');
  assert.equal(ABBAGLIATO, 'abbagliato');
  assert.equal(ABBAGLIATO_TTL, 99);
  assert.equal(HP_GATE, 0.5);
  assert.equal(PIGMENTI_INTENSIFICATO, 'pigmenti_intensificato');
  assert.equal(INTENSIFIED_ATK, 2);
  assert.equal(DISORIENT, 'disorient');
});

// ─── ACTIVE mode (pigmenti_intensificato): glow -2 + disorient on attackers ──────
// The active ability (1 AP, apply_status self pigmenti_intensificato) is dispatched by
// the existing executeApplyStatus; these are its two engine consumers.

test('intensified glow: the dazzle is -2 (abbagliato intensity 2) on adjacent enemies', () => {
  const treant = unit('treant', 'players', 0, 0, {
    traits: ['pigmenti_aurorali'],
    status: { [PIGMENTI_INTENSIFICATO]: 2 },
  });
  const enemy = unit('foe', 'sistema', 1, 0);
  applyEndRoundGlow({ carrier: treant, units: [treant, enemy] });
  assert.ok(Number(enemy.status[ABBAGLIATO]) > 0, 'still dazzled');
  assert.equal(enemy.status_intensity[ABBAGLIATO], INTENSIFIED_ATK, 'intensity 2 -> -2 atk');
});

test('non-intensified glow: abbagliato has no intensity boost (defaults to -1)', () => {
  const treant = unit('treant', 'players', 0, 0, { traits: ['pigmenti_aurorali'] });
  const enemy = unit('foe', 'sistema', 1, 0);
  applyEndRoundGlow({ carrier: treant, units: [treant, enemy] });
  assert.ok(!(enemy.status_intensity && enemy.status_intensity[ABBAGLIATO] > 1), 'no -2 boost');
});

test('disorientAttacker: an intensified carrier disorients whoever attacks it', () => {
  const treant = unit('treant', 'players', 0, 0, {
    traits: ['pigmenti_aurorali'],
    status: { [PIGMENTI_INTENSIFICATO]: 2 },
  });
  const attacker = unit('foe', 'sistema', 1, 0);
  const ev = disorientAttacker({ carrier: treant, attacker });
  assert.ok(ev, 'returns a disorient event');
  assert.ok(Number(attacker.status[DISORIENT]) > 0, 'attacker disoriented');
});

test('disorientAttacker: no-op when the carrier is NOT intensified, or lacks the trait', () => {
  const calm = unit('treant', 'players', 0, 0, { traits: ['pigmenti_aurorali'] }); // not intensified
  const attacker = unit('foe', 'sistema', 1, 0);
  assert.equal(disorientAttacker({ carrier: calm, attacker }), null);
  assert.ok(!(DISORIENT in attacker.status));
  const plain = unit('plain', 'players', 0, 0, { status: { [PIGMENTI_INTENSIFICATO]: 2 } }); // no trait
  assert.equal(disorientAttacker({ carrier: plain, attacker }), null);
});

test('disorientAttacker: tolerant of a null/self/dead attacker', () => {
  const treant = unit('treant', 'players', 0, 0, {
    traits: ['pigmenti_aurorali'],
    status: { [PIGMENTI_INTENSIFICATO]: 2 },
  });
  assert.equal(disorientAttacker({ carrier: treant, attacker: null }), null);
  assert.equal(disorientAttacker({ carrier: treant, attacker: treant }), null, 'not self');
  const dead = unit('dead', 'sistema', 1, 0, { hp: 0 });
  assert.equal(disorientAttacker({ carrier: treant, attacker: dead }), null);
});
