// tests/services/combat/allyAuraMark.test.js
//
// ally_aura_mark primitive (creature-trait mechanics slice 3, primitive P4).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//   A carrier broadcasts a self-status to same-faction allies within manhattan
//   range R. Shared by nuclei_di_controllo (coordinamento, range 2, while the
//   nucleus is intact) and corteccia_memetica (risonanza_memetica, range 3).
//   `refreshNucleiCoordinamento` is the roster producer for the sustained
//   coordinamento aura (clear-then-rebroadcast from every intact carrier).
// Real-module tests (CommonJS), CI-gated via tests/services/*/*.test.js.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  broadcastAura,
  refreshNucleiCoordinamento,
  COORDINAMENTO,
  COORD_RANGE,
} = require('../../../apps/backend/services/combat/allyAuraMark');

function unit(id, faction, x, y, extra = {}) {
  return { id, controlled_by: faction, hp: 10, position: { x, y }, status: {}, ...extra };
}

// ─── broadcastAura ──────────────────────────────────────────────────────────

test('broadcastAura: sets the status on a same-faction living ally in range', () => {
  const source = unit('src', 'players', 0, 0);
  const ally = unit('ally', 'players', 1, 0);
  const events = broadcastAura({
    source,
    units: [source, ally],
    stato: 'boon',
    turns: 3,
    range: 2,
  });
  assert.equal(ally.status.boon, 3);
  assert.equal(events.length, 1);
  assert.equal(events[0].unit_id, 'ally');
  assert.equal(events[0].stato, 'boon');
});

test('broadcastAura: never marks the source itself', () => {
  const source = unit('src', 'players', 0, 0);
  broadcastAura({ source, units: [source], stato: 'boon', turns: 3, range: 5 });
  assert.ok(!('boon' in source.status), 'the broadcaster does not buff itself here');
});

test('broadcastAura: skips enemies (different controlled_by)', () => {
  const source = unit('src', 'players', 0, 0);
  const enemy = unit('foe', 'sistema', 1, 0);
  const events = broadcastAura({
    source,
    units: [source, enemy],
    stato: 'boon',
    turns: 3,
    range: 2,
  });
  assert.ok(!('boon' in enemy.status));
  assert.equal(events.length, 0);
});

test('broadcastAura: skips dead allies (hp <= 0)', () => {
  const source = unit('src', 'players', 0, 0);
  const dead = unit('dead', 'players', 1, 0, { hp: 0 });
  broadcastAura({ source, units: [source, dead], stato: 'boon', turns: 3, range: 2 });
  assert.ok(!('boon' in dead.status));
});

test('broadcastAura: skips allies out of manhattan range', () => {
  const source = unit('src', 'players', 0, 0);
  const far = unit('far', 'players', 2, 1); // distance 3 > range 2
  broadcastAura({ source, units: [source, far], stato: 'boon', turns: 3, range: 2 });
  assert.ok(!('boon' in far.status));
});

test('broadcastAura: refresh-up policy -- never lowers a higher remaining count', () => {
  const source = unit('src', 'players', 0, 0);
  const allyHi = unit('hi', 'players', 1, 0, { status: { boon: 9 } });
  const allyLo = unit('lo', 'players', 0, 1, { status: { boon: 1 } });
  broadcastAura({ source, units: [source, allyHi, allyLo], stato: 'boon', turns: 3, range: 2 });
  assert.equal(allyHi.status.boon, 9, 'higher value preserved');
  assert.equal(allyLo.status.boon, 3, 'lower value raised to target');
});

test('broadcastAura: tolerant of missing source/position/units', () => {
  assert.deepEqual(broadcastAura({ source: null, units: [], stato: 'b', turns: 1, range: 1 }), []);
  assert.deepEqual(
    broadcastAura({
      source: { id: 'x', controlled_by: 'p' },
      units: [],
      stato: 'b',
      turns: 1,
      range: 1,
    }),
    [],
    'no position -> no broadcast',
  );
});

// ─── refreshNucleiCoordinamento (the coordinamento aura producer) ────────────

test('refreshNucleiCoordinamento: an intact carrier coordinates allies within range 2', () => {
  const golem = unit('golem', 'players', 0, 0, { status: { nucleo_intatto: 99 } });
  const near = unit('near', 'players', 2, 0); // distance 2 == COORD_RANGE
  const far = unit('far', 'players', 3, 0); // distance 3 > range
  refreshNucleiCoordinamento([golem, near, far]);
  assert.ok(Number(near.status[COORDINAMENTO]) > 0, 'near ally coordinated');
  assert.ok(!(Number(far.status[COORDINAMENTO]) > 0), 'far ally not coordinated');
  assert.ok(!(COORDINAMENTO in golem.status), 'the carrier itself is not coordinamento-marked');
});

test('refreshNucleiCoordinamento: clears stale coordinamento before rebroadcast (aura recompute)', () => {
  // ally was coordinated last round but is now out of range and no carrier covers it.
  const golem = unit('golem', 'players', 0, 0, { status: { nucleo_intatto: 99 } });
  const drifted = unit('drift', 'players', 5, 5, { status: { [COORDINAMENTO]: 99 } });
  refreshNucleiCoordinamento([golem, drifted]);
  assert.ok(!(COORDINAMENTO in drifted.status), 'stale aura cleared when out of range');
});

test('refreshNucleiCoordinamento: a broken (danno_nucleo) carrier does NOT broadcast', () => {
  const golem = unit('golem', 'players', 0, 0, { status: { danno_nucleo: 99 } });
  const near = unit('near', 'players', 1, 0);
  const events = refreshNucleiCoordinamento([golem, near]);
  assert.ok(!(COORDINAMENTO in near.status), 'a damaged nucleus no longer coordinates');
  assert.equal(events.length, 0);
});

test('refreshNucleiCoordinamento: constants', () => {
  assert.equal(COORDINAMENTO, 'coordinamento');
  assert.equal(COORD_RANGE, 2);
});
