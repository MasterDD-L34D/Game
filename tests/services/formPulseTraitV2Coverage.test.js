'use strict';

// Form-Pulse trait v2 -- COVERAGE + cap-tier enforcement gate (spec 2026-06-23, PROPOSED).
// Plan: docs/planning/2026-06-23-aa01-form-pulse-trait-v2-coverage-matrix.md
//
// This is the master-dd ratify-condition gate for FORM_PULSE_TRAIT_V2_ENABLED: it locks the
// branco + minor pools against the engine-INERT / near-inert regression that the PR #2992 harsh
// review caught on the minor pool (and that the coverage audit then caught on 3 more poles the
// review missed). It enforces:
//   1. every branco + minor id EXISTS in active_effects.yaml,
//   2. every id is ENGINE-LIVE-RELIABLE (real runtime consumer, not elevation-near-inert, and
//      applies_to/kind side-consistent -- dr only target-side, extra_damage only actor-side),
//   3. CAP-TIER: every MINOR id is T1 (the minor stays "genuinely minor"),
//   4. branco and minor pools are disjoint (the minor is never a 2nd branco-combat trait),
//   5. the predicate actually discriminates -- the 4 OLD broken picks FAIL it.
//
// The `isEngineLiveReliable` HARD-gate now lives in tests/helpers/traitLiveness.js (shared with
// the W3 imprint-mapping liveness test, one SOT for the engine-LIVE mirror).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  PROPOSED_BRANCO_TRAIT_MAPPING,
  PROPOSED_MINOR_TRAIT_MAPPING,
} = require('../../apps/backend/services/identity/brancoTraitEmergence');
const { loadActiveTraitRegistry } = require('../../apps/backend/services/traitEffects');
const { isEngineLiveReliable } = require('../helpers/traitLiveness');

const SILENT = { log() {}, warn() {} };
const registry = loadActiveTraitRegistry(undefined, SILENT);

function poolIds(mapping) {
  return Object.values(mapping).flatMap((p) => [p['+'], p['-']]);
}

const BRANCO_IDS = poolIds(PROPOSED_BRANCO_TRAIT_MAPPING);
const MINOR_IDS = poolIds(PROPOSED_MINOR_TRAIT_MAPPING);

test('coverage: every branco + minor id EXISTS in active_effects.yaml', () => {
  for (const id of [...BRANCO_IDS, ...MINOR_IDS]) {
    assert.ok(registry[id], `trait ${id} must exist in active_effects.yaml`);
  }
});

test('coverage: every branco id is ENGINE-LIVE-RELIABLE (no inert / elevation-near-inert)', () => {
  for (const id of BRANCO_IDS) {
    assert.ok(
      isEngineLiveReliable(registry[id]),
      `branco trait ${id} must be engine-live-reliable`,
    );
  }
});

test('coverage: every minor id is ENGINE-LIVE-RELIABLE', () => {
  for (const id of MINOR_IDS) {
    assert.ok(isEngineLiveReliable(registry[id]), `minor trait ${id} must be engine-live-reliable`);
  }
});

test('CAP-TIER: every minor id is T1 (the minor stays genuinely minor)', () => {
  for (const id of MINOR_IDS) {
    assert.equal(registry[id].tier, 'T1', `minor trait ${id} must be T1 (cap-tier)`);
  }
});

test('branco and minor pools are DISJOINT (minor never a 2nd branco-combat trait)', () => {
  const branco = new Set(BRANCO_IDS);
  for (const id of MINOR_IDS) {
    assert.ok(!branco.has(id), `minor id ${id} must not reuse a branco id`);
  }
});

test('predicate DISCRIMINATES: the 4 OLD broken picks fail isEngineLiveReliable', () => {
  // These were the inert/near-inert picks the coverage audit replaced. The guard must reject them,
  // else it gives false confidence.
  for (const id of [
    'mimetismo_cromatico_passivo', // branco I  -- passive buff_stat = inert
    'empatia_coordinativa', //         branco F  -- passive buff_stat = inert
    'comunicazione_fotonica_coda_coda', // minor F -- passive buff_stat = inert
    'zampe_a_molla', //                branco Agile -- requires posizione_sopraelevata = near-inert
  ]) {
    assert.ok(registry[id], `${id} should still exist in the catalog`);
    assert.equal(
      isEngineLiveReliable(registry[id]),
      false,
      `${id} must FAIL the live-reliable gate`,
    );
  }
});
