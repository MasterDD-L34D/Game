'use strict';

// SPEC-J sez.6 / fork J3 -- Nido wound rituals (heal / transform). Pure service:
// operates on a unit's `grave` scars (woundSystem) + an optional persisted scar
// map; no chronicle I/O (the wire site emits). Resource cost (SPEC-E E6) is NOT
// here -- the campaign resource pool is Godot/client-owned (godotV2State), so
// cost-enforcement is forward-work, not part of this slice.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const nidoRitual = require('../../../apps/backend/services/combat/nidoRitual');

function unitWithScar(over = {}) {
  return {
    id: 'u1',
    name: 'Skiv',
    species_id: 'dune_stalker',
    status: {
      wounds: [
        { location: 'torso', severity: 'grave', stat: 'defense_mod', malus: -2 },
        { location: 'testa', severity: 'lieve', stat: 'accuracy', malus: -1 },
      ],
    },
    ...over,
  };
}

// --- findScar ------------------------------------------------------------

test('findScar: returns the grave wound at a location', () => {
  const u = unitWithScar();
  const scar = nidoRitual.findScar(u, 'torso');
  assert.equal(scar.location, 'torso');
  assert.equal(scar.severity, 'grave');
});

test('findScar: a lieve/media wound is NOT a scar (only grave)', () => {
  const u = unitWithScar();
  assert.equal(nidoRitual.findScar(u, 'testa'), null); // testa is lieve, not a scar
});

test('findScar: no scar / bad input -> null', () => {
  assert.equal(nidoRitual.findScar(unitWithScar(), 'arti_anteriori'), null);
  assert.equal(nidoRitual.findScar(null, 'torso'), null);
  assert.equal(nidoRitual.findScar({ id: 'x' }, 'torso'), null);
});

// --- healScar ------------------------------------------------------------

test('healScar: removes the grave scar from status.wounds, keeps other wounds', () => {
  const u = unitWithScar();
  const out = nidoRitual.healScar(u, 'torso');
  assert.equal(out.healed, true);
  assert.equal(out.scar.location, 'torso');
  assert.equal(out.unit_id, 'u1');
  // grave removed, the lieve testa wound preserved.
  assert.equal(
    u.status.wounds.some((w) => w.location === 'torso' && w.severity === 'grave'),
    false,
  );
  assert.equal(
    u.status.wounds.some((w) => w.location === 'testa'),
    true,
  );
});

test('healScar: also clears the scar from the persisted cross-encounter map', () => {
  const u = unitWithScar();
  const sessionMap = {
    u1: [{ location: 'torso', severity: 'grave', stat: 'defense_mod', malus: -2 }],
  };
  nidoRitual.healScar(u, 'torso', { sessionMap });
  assert.equal(
    (sessionMap.u1 || []).some((w) => w.location === 'torso'),
    false,
  );
});

test('healScar: no scar at location -> { healed:false, reason }', () => {
  const u = unitWithScar();
  const out = nidoRitual.healScar(u, 'arti_posteriori');
  assert.equal(out.healed, false);
  assert.equal(out.reason, 'no_scar');
});

test('healScar: bad unit -> { healed:false }, never throws', () => {
  assert.equal(nidoRitual.healScar(null, 'torso').healed, false);
  assert.equal(nidoRitual.healScar({}, 'torso').healed, false);
});

// --- transformScar -------------------------------------------------------

test('transformScar: removes the scar + returns a deterministic narrative mark', () => {
  const u = unitWithScar();
  const out = nidoRitual.transformScar(u, 'torso');
  assert.equal(out.transformed, true);
  assert.equal(out.scar.location, 'torso');
  assert.ok(out.mark && typeof out.mark.id === 'string');
  assert.equal(out.mark.origin_location, 'torso');
  assert.equal(
    u.status.wounds.some((w) => w.location === 'torso' && w.severity === 'grave'),
    false,
  );
});

test('transformScar: mark is deterministic for the same scar (no RNG / no content pool)', () => {
  const a = nidoRitual.transformScar(unitWithScar(), 'torso');
  const b = nidoRitual.transformScar(unitWithScar(), 'torso');
  assert.deepEqual(a.mark, b.mark);
});

test('transformScar: records the mark into permanentMarks when provided (campaign lore)', () => {
  const u = unitWithScar();
  const permanentMarks = [];
  nidoRitual.transformScar(u, 'torso', { permanentMarks });
  assert.equal(permanentMarks.length, 1);
  assert.equal(permanentMarks[0].creature_id, 'u1');
  assert.equal(permanentMarks[0].origin_location, 'torso');
});

test('transformScar: also clears the persisted scar map', () => {
  const u = unitWithScar();
  const sessionMap = {
    u1: [{ location: 'torso', severity: 'grave', stat: 'defense_mod', malus: -2 }],
  };
  nidoRitual.transformScar(u, 'torso', { sessionMap });
  assert.equal(
    (sessionMap.u1 || []).some((w) => w.location === 'torso'),
    false,
  );
});

test('transformScar: no scar -> { transformed:false, reason }, never throws', () => {
  assert.equal(nidoRitual.transformScar(unitWithScar(), 'arti_anteriori').transformed, false);
  assert.equal(nidoRitual.transformScar(null, 'torso').transformed, false);
});
