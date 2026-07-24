'use strict';
// MA1 part 2 -- emergent branco-trait mechanism (SPEC-M / ADR-2026-06-08).
//
// MECHANISM (objective, tested here): Form-Pulse aggregate -> dominant creature
// axis -> 1 emergent branco trait. MAPPING + THRESHOLD are PROPOSED (ratify N=40,
// same governance as formPulseVc PROPOSED_FP_VC_MAPPING) -- not asserted by value,
// only by shape, so a ratify-tune does not churn these tests.

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  EMERGENCE_THRESHOLD,
  PROPOSED_BRANCO_TRAIT_MAPPING,
  emergeBrancoTrait,
  emergeBrancoTraitFromPulses,
} = require('../../apps/backend/services/identity/brancoTraitEmergence');

const AXES = [
  'solitary_swarm',
  'explore_caution',
  'symbiosis_predation',
  'memory_instinct',
  'agile_robust',
];

test('PROPOSED mapping covers the 5 Form-Pulse creature axes, both poles, non-empty trait ids', () => {
  for (const a of AXES) {
    assert.ok(PROPOSED_BRANCO_TRAIT_MAPPING[a], `axis ${a} mapped`);
    assert.equal(typeof PROPOSED_BRANCO_TRAIT_MAPPING[a]['+'], 'string');
    assert.equal(typeof PROPOSED_BRANCO_TRAIT_MAPPING[a]['-'], 'string');
    assert.ok(PROPOSED_BRANCO_TRAIT_MAPPING[a]['+'].length > 0);
    assert.ok(PROPOSED_BRANCO_TRAIT_MAPPING[a]['-'].length > 0);
  }
});

test('dominant + pole over threshold emerges the + trait', () => {
  const r = emergeBrancoTrait({ solitary_swarm: 0.5 });
  assert.equal(r.axis, 'solitary_swarm');
  assert.equal(r.pole, '+');
  assert.equal(r.trait_id, PROPOSED_BRANCO_TRAIT_MAPPING.solitary_swarm['+']);
  assert.equal(r.magnitude, 0.5);
});

test('dominant - pole over threshold emerges the - trait', () => {
  const r = emergeBrancoTrait({ symbiosis_predation: -0.4 });
  assert.equal(r.axis, 'symbiosis_predation');
  assert.equal(r.pole, '-');
  assert.equal(r.trait_id, PROPOSED_BRANCO_TRAIT_MAPPING.symbiosis_predation['-']);
});

test('below threshold -> null (no emergent trait)', () => {
  assert.equal(emergeBrancoTrait({ solitary_swarm: 0.1 }), null);
});

test('picks the most dominant axis by |avg|', () => {
  const r = emergeBrancoTrait({ solitary_swarm: 0.35, symbiosis_predation: -0.6 });
  assert.equal(r.axis, 'symbiosis_predation');
  assert.equal(r.pole, '-');
});

test('exactly at threshold emerges (>=)', () => {
  const r = emergeBrancoTrait({ memory_instinct: EMERGENCE_THRESHOLD });
  assert.ok(r);
  assert.equal(r.axis, 'memory_instinct');
  assert.equal(r.pole, '+');
});

test('empty / null aggregate -> null (dormant)', () => {
  assert.equal(emergeBrancoTrait({}), null);
  assert.equal(emergeBrancoTrait(null), null);
  assert.equal(emergeBrancoTrait(undefined), null);
});

test('unknown axes are ignored', () => {
  assert.equal(emergeBrancoTrait({ not_an_axis: 0.9 }), null);
});

test('emergeBrancoTraitFromPulses: aggregates per-player pulses then emerges', () => {
  const fpMap = {
    p1: { axes: { solitary_swarm: 0.5 } },
    p2: { axes: { solitary_swarm: 0.7 } },
  };
  const r = emergeBrancoTraitFromPulses(fpMap);
  assert.equal(r.axis, 'solitary_swarm');
  assert.equal(r.pole, '+');
  assert.ok(Math.abs(r.magnitude - 0.6) < 1e-9, `avg magnitude ~0.6, got ${r && r.magnitude}`);
});

test('emergeBrancoTraitFromPulses: opposing players cancel below threshold -> null', () => {
  const fpMap = {
    p1: { axes: { solitary_swarm: 0.5 } },
    p2: { axes: { solitary_swarm: -0.5 } },
  };
  assert.equal(emergeBrancoTraitFromPulses(fpMap), null); // avg 0 < threshold
});

test('emergeBrancoTraitFromPulses: no pulses -> null (dormant until Godot FP UX)', () => {
  assert.equal(emergeBrancoTraitFromPulses(null), null);
  assert.equal(emergeBrancoTraitFromPulses({}), null);
});
