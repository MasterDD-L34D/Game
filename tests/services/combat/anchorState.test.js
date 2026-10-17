// tests/services/combat/anchorState.test.js
//
// Phase 3 -- radici_ancora_planare anchor (always-on trait-slice, band-neutral by
// no-carrier; NOT gated on MOVE_TERRAIN_COST_ENABLED per the 2026-06-23 master-dd
// framing -- decouples the defensive DR from terrain cost, like the 11 merged slices).
// Producer sets `ancorato` (DR2) at activation if the unit carries the trait; a move
// breaks the anchor; computeAnchorDR realizes the DR at the mitigation seam.

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  applyAnchorAtActivation,
  breakAnchor,
  computeAnchorDR,
  ANCORATO,
  ANCHOR_DR,
  RADICI_TRAIT,
} = require('../../../apps/backend/services/combat/anchorState');

const carrier = (extra = {}) => ({
  id: 'treant',
  hp: 20,
  status: {},
  traits: [RADICI_TRAIT],
  ...extra,
});

test('activation anchors a carrier (DR2), no flag needed', () => {
  const u = carrier();
  applyAnchorAtActivation(u);
  assert.ok(u.status[ANCORATO]);
  assert.equal(computeAnchorDR(u), ANCHOR_DR);
});

test('ANCHOR_DR is the proposed value 2', () => {
  assert.equal(ANCHOR_DR, 2);
});

test('non-carrier never anchors', () => {
  const u = carrier({ traits: [] });
  applyAnchorAtActivation(u);
  assert.ok(!u.status[ANCORATO]);
  assert.equal(computeAnchorDR(u), 0);
});

test('carrier via object-trait form ({id}) also anchors', () => {
  const u = carrier({ traits: [{ id: RADICI_TRAIT }] });
  applyAnchorAtActivation(u);
  assert.ok(u.status[ANCORATO]);
});

test('activation seeds a missing status map', () => {
  const u = { id: 'x', traits: [RADICI_TRAIT] };
  applyAnchorAtActivation(u);
  assert.ok(u.status && u.status[ANCORATO]);
});

test('breakAnchor clears the status and the DR (forfeit on move)', () => {
  const u = carrier();
  applyAnchorAtActivation(u);
  breakAnchor(u);
  assert.ok(!u.status[ANCORATO]);
  assert.equal(computeAnchorDR(u), 0);
});

test('breakAnchor on a non-anchored unit is a safe no-op', () => {
  const u = carrier({ traits: [] });
  assert.doesNotThrow(() => breakAnchor(u));
  breakAnchor(undefined);
});

test('computeAnchorDR is 0 when status absent or unit malformed', () => {
  assert.equal(computeAnchorDR(null), 0);
  assert.equal(computeAnchorDR({}), 0);
  assert.equal(computeAnchorDR({ status: {} }), 0);
});

test('re-activation is idempotent (still DR2)', () => {
  const u = carrier();
  applyAnchorAtActivation(u);
  applyAnchorAtActivation(u);
  assert.equal(computeAnchorDR(u), ANCHOR_DR);
});
