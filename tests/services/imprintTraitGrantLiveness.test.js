'use strict';

// W3 imprint mapping liveness HARD-gate (grilling 2026-06-30). EVERY wired imprint pick MUST be
// a trait the engine actually FIRES -- a non-no-op (lesson #3083: the draft's inert picks would
// pass an N=40 ratify falsely as ~0 delta). This is the imprint counterpart of
// formPulseTraitV2Coverage.test.js for the branco/minor pools; it shares the same engine-LIVE
// predicate (tests/helpers/traitLiveness).
//
// It also LOCKS the two balance-pick cells (offense/RAPIDA, defense/FLESSIBILE) UNWIRED -- they
// are a master-dd / N=40 pick (no clean trait today), NOT auto-assigned.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  PROPOSED_IMPRINT_TRAIT_MAPPING,
} = require('../../apps/backend/services/imprint/imprintTraitGrant');
const { loadActiveTraitRegistry } = require('../../apps/backend/services/traitEffects');
const { isEngineLiveReliable } = require('../helpers/traitLiveness');

const SILENT = { log() {}, warn() {} };
const registry = loadActiveTraitRegistry(undefined, SILENT);

function wiredPicks(mapping) {
  const out = [];
  for (const [axis, poles] of Object.entries(mapping)) {
    for (const [pole, trait_id] of Object.entries(poles)) {
      if (trait_id) out.push({ axis, pole, trait_id });
    }
  }
  return out;
}

const WIRED = wiredPicks(PROPOSED_IMPRINT_TRAIT_MAPPING);

test('all 4 imprint axes are present in the mapping', () => {
  for (const axis of ['locomotion', 'offense', 'defense', 'senses']) {
    assert.ok(PROPOSED_IMPRINT_TRAIT_MAPPING[axis], `axis ${axis} must be mapped`);
  }
});

test('every WIRED imprint pick EXISTS in active_effects.yaml', () => {
  assert.ok(WIRED.length >= 6, 'expected the 6 audited-LIVE cells wired');
  for (const { trait_id } of WIRED) {
    assert.ok(registry[trait_id], `imprint trait ${trait_id} must exist in active_effects.yaml`);
  }
});

test('HARD-gate: every WIRED imprint pick is ENGINE-LIVE-RELIABLE (the trait actually fires)', () => {
  for (const { axis, pole, trait_id } of WIRED) {
    assert.ok(
      isEngineLiveReliable(registry[trait_id]),
      `imprint ${axis}/${pole} -> ${trait_id} must be engine-live (no inert / near-inert no-op)`,
    );
  }
});

test('the 2 balance-pick cells stay UNWIRED (master-dd / N=40, never auto-assigned)', () => {
  assert.equal(
    PROPOSED_IMPRINT_TRAIT_MAPPING.offense.RAPIDA,
    undefined,
    'offense/RAPIDA is a balance pick -- must NOT be auto-assigned',
  );
  assert.equal(
    PROPOSED_IMPRINT_TRAIT_MAPPING.defense.FLESSIBILE,
    undefined,
    'defense/FLESSIBILE has no clean evasion trait today -- must NOT be auto-assigned',
  );
});

test('predicate DISCRIMINATES: known inert/near-inert ids fail the HARD-gate (not a no-op)', () => {
  // The exact defect the audit rejected -- if the gate passed these it would give false confidence.
  for (const id of ['mimetismo_cromatico_passivo', 'zampe_a_molla']) {
    assert.ok(registry[id], `${id} should still exist in the catalog`);
    assert.equal(
      isEngineLiveReliable(registry[id]),
      false,
      `${id} (inert/near-inert) must FAIL the live-reliable gate`,
    );
  }
});
