// tests/services/combat/ecoSismico.test.js
//
// eco_sismico (creature-trait mechanics, trait 5 -- banshee). Part 1 = the tile-level
// timed-status primitive + the move-enter consumer. Spec:
// docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//   Phase B: `zona_risonante` terrain (2 rounds) -- units ENTERING get `disorient`;
//   the banshee (source) is self-immune.
// The producer (the active ability that stamps the zone) is a forbidden-path follow-up
// (new effect_type). This part is band-neutral: nothing stamps a zone in combat yet AND
// no sim unit carries the trait, so the consumer + decay are no-ops on every real grid.
// Real-module tests (CommonJS), CI-gated via tests/services/*/*.test.js.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  stampZonaRisonante,
  zonaAt,
  applyZonaOnEnter,
  decayTileStatuses,
  ECO_TRAIT,
  ZONA,
  ZONA_ROUNDS,
  DISORIENT_TURNS,
} = require('../../../apps/backend/services/combat/ecoSismico');

function grid() {
  return { width: 6, height: 6 };
}

test('stamp creates a zona_risonante tile-status that zonaAt reads back (active before expiry)', () => {
  const g = grid();
  const n = stampZonaRisonante(g, [{ x: 2, y: 2 }], { sourceId: 'banshee', currentRound: 1 });
  assert.equal(n, 1);
  const z = zonaAt(g, 2, 2, 1);
  assert.ok(z);
  assert.equal(z.status, ZONA);
  assert.equal(z.source_id, 'banshee');
});

test('stamp marks each tile and sets expiry = currentRound + ZONA_ROUNDS', () => {
  const g = grid();
  stampZonaRisonante(
    g,
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ],
    { sourceId: 's', currentRound: 3 },
  );
  assert.equal(zonaAt(g, 0, 0, 3).expires_round, 3 + ZONA_ROUNDS);
  assert.ok(zonaAt(g, 1, 0, 3));
  assert.equal(zonaAt(g, 5, 5, 3), null, 'unstamped tile has no zone');
});

test('a unit entering a zona gets disorient (banshee self-immune skipped)', () => {
  const g = grid();
  stampZonaRisonante(g, [{ x: 4, y: 4 }], { sourceId: 'banshee', currentRound: 1 });
  const victim = { id: 'enemy', position: { x: 4, y: 4 }, hp: 10, status: {} };
  const r = applyZonaOnEnter({ grid: g, unit: victim, currentRound: 1 });
  assert.deepEqual(r, { unit_id: 'enemy', stato: 'disorient', turns: DISORIENT_TURNS });
  assert.equal(victim.status.disorient, DISORIENT_TURNS);
});

test('the source banshee is immune to its own zona', () => {
  const g = grid();
  stampZonaRisonante(g, [{ x: 4, y: 4 }], { sourceId: 'banshee', currentRound: 1 });
  const banshee = { id: 'banshee', position: { x: 4, y: 4 }, hp: 10, status: {} };
  assert.equal(applyZonaOnEnter({ grid: g, unit: banshee, currentRound: 1 }), null);
  assert.equal(banshee.status.disorient, undefined);
});

test('entering a tile with no zona -> null (no status)', () => {
  const g = grid();
  stampZonaRisonante(g, [{ x: 4, y: 4 }], { sourceId: 's', currentRound: 1 });
  const u = { id: 'e', position: { x: 0, y: 0 }, hp: 10, status: {} };
  assert.equal(applyZonaOnEnter({ grid: g, unit: u, currentRound: 1 }), null);
});

test('an expired zona does not disorient (entered after expiry round)', () => {
  const g = grid();
  stampZonaRisonante(g, [{ x: 4, y: 4 }], { sourceId: 's', currentRound: 1 }); // expires at 3
  const u = { id: 'e', position: { x: 4, y: 4 }, hp: 10, status: {} };
  assert.equal(zonaAt(g, 4, 4, 3), null, 'zone expired at its expiry round');
  assert.equal(applyZonaOnEnter({ grid: g, unit: u, currentRound: 3 }), null);
});

test('disorient does not stack beyond DISORIENT_TURNS', () => {
  const g = grid();
  stampZonaRisonante(g, [{ x: 4, y: 4 }], { sourceId: 's', currentRound: 1 });
  const u = { id: 'e', position: { x: 4, y: 4 }, hp: 10, status: { disorient: 5 } };
  applyZonaOnEnter({ grid: g, unit: u, currentRound: 1 });
  assert.equal(u.status.disorient, 5, 'a higher existing disorient is not lowered');
});

test('a downed unit entering a zona is not disoriented', () => {
  const g = grid();
  stampZonaRisonante(g, [{ x: 4, y: 4 }], { sourceId: 's', currentRound: 1 });
  const u = { id: 'e', position: { x: 4, y: 4 }, hp: 0, status: {} };
  assert.equal(applyZonaOnEnter({ grid: g, unit: u, currentRound: 1 }), null);
});

test('decay removes zones whose expiry has passed, keeps active ones', () => {
  const g = grid();
  stampZonaRisonante(g, [{ x: 1, y: 1 }], { sourceId: 's', currentRound: 1 }); // expires 3
  stampZonaRisonante(g, [{ x: 2, y: 2 }], { sourceId: 's', currentRound: 5 }); // expires 7
  const removed = decayTileStatuses(g, 3);
  assert.equal(removed, 1);
  assert.equal(zonaAt(g, 1, 1, 3), null);
  assert.ok(zonaAt(g, 2, 2, 5));
});

test('tolerant of missing grid / unit / position', () => {
  assert.equal(stampZonaRisonante(null, [{ x: 0, y: 0 }], { sourceId: 's', currentRound: 1 }), 0);
  assert.equal(applyZonaOnEnter({ grid: null, unit: { id: 'e' }, currentRound: 1 }), null);
  assert.equal(applyZonaOnEnter({ grid: grid(), unit: { id: 'e' }, currentRound: 1 }), null);
  assert.equal(decayTileStatuses(null, 1), 0);
});

test('constants', () => {
  assert.equal(ECO_TRAIT, 'eco_sismico');
  assert.equal(ZONA, 'zona_risonante');
  assert.equal(ZONA_ROUNDS, 2);
  assert.equal(DISORIENT_TURNS, 1);
});
