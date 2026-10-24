// tests/services/combat/voloRadiciAuthoring.test.js
//
// Phase 2/3 trait authoring: adattamento_volo + radici_ancora_planare are the
// last 2 of the 12-trait creature kit. This asserts they are now "official" in
// the live active_effects registry (loadActiveTraitRegistry) and tie to their
// already-built engine reads (evaluateVoloGrade / anchorState). Per-trait DB
// file + index + glossary coverage are enforced by the 5 trait gates in CI.

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const { loadActiveTraitRegistry } = require('../../../apps/backend/services/traitEffects');
const { evaluateVoloGrade } = require('../../../apps/backend/services/combat/movementResolver');
const {
  applyAnchorAtActivation,
  computeAnchorDR,
  ANCHOR_DR,
} = require('../../../apps/backend/services/combat/anchorState');

test('adattamento_volo is authored in the live registry with a base grade', () => {
  const reg = loadActiveTraitRegistry();
  assert.ok(reg.adattamento_volo, 'adattamento_volo present in active_effects');
  assert.equal(reg.adattamento_volo.tier, 'T1');
  assert.equal(reg.adattamento_volo.category, 'fisiologico');
  assert.equal(reg.adattamento_volo.effect.grade, 1, 'base grade 1 (frees normal terrain)');
  // the move-gate resolver reads the authored grade for a carrier
  assert.equal(evaluateVoloGrade(reg, { traits: ['adattamento_volo'] }), 1);
});

test('radici_ancora_planare is authored in the live registry and ties to the anchor engine', () => {
  const reg = loadActiveTraitRegistry();
  assert.ok(reg.radici_ancora_planare, 'radici_ancora_planare present in active_effects');
  assert.equal(reg.radici_ancora_planare.tier, 'T2');
  assert.equal(reg.radici_ancora_planare.category, 'difensivo');
  // the anchor engine keys on the trait id; a carrier anchors (DR2) regardless
  const u = { traits: ['radici_ancora_planare'], status: {} };
  applyAnchorAtActivation(u);
  assert.equal(computeAnchorDR(u), ANCHOR_DR);
});
