'use strict';

// Unified branco-trait producer -- W2 (one weighted argmax over the Form-Pulse continuous axes
// UNION the imprint binary axes) + W4 (the single gate collapses the two old intertwined flags).
// Grilling 2026-06-30 verdicts P-c (combine: both signals contribute) + D-2 (ALL 4 imprint axes).
//
// Discipline mirrors brancoTraitEmergence: pure, no-mutate, deterministic tie-break, single slot.
// Byte-identical when the unified flag is OFF (combined=false): it delegates to emergeBrancoTrait,
// so the imprint NEVER participates and the output is exactly today's Form-Pulse-only branco.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  produceBrancoTrait,
  resolveImprintWeight,
  PROPOSED_IMPRINT_WEIGHT,
} = require('../../apps/backend/services/identity/brancoTraitProducer');
const {
  emergeBrancoTrait,
  PROPOSED_BRANCO_TRAIT_MAPPING,
} = require('../../apps/backend/services/identity/brancoTraitEmergence');
const {
  PROPOSED_IMPRINT_TRAIT_MAPPING,
} = require('../../apps/backend/services/imprint/imprintTraitGrant');

const VELOCE_TRAIT = PROPOSED_IMPRINT_TRAIT_MAPPING.locomotion.VELOCE;
const AGILE_TRAIT = PROPOSED_BRANCO_TRAIT_MAPPING.agile_robust['-']; // strong agile lean

// ---- OFF (combined=false): byte-identical to emergeBrancoTrait ----

test('OFF: delegates to emergeBrancoTrait exactly (byte-identical, form-pulse only)', () => {
  const aggregate = { agile_robust: -0.8, solitary_swarm: 0.2 };
  const expected = emergeBrancoTrait(aggregate, { threshold: 0.3 });
  const got = produceBrancoTrait({ aggregate, combined: false, threshold: 0.3 });
  assert.deepEqual(got, expected);
});

test('OFF: imprint is IGNORED even when a tuple is present', () => {
  const aggregate = { agile_robust: -0.8 };
  const withImprint = produceBrancoTrait({
    aggregate,
    imprintTuple: { locomotion: 'VELOCE' },
    combined: false,
    threshold: 0.3,
    w: 99,
  });
  assert.equal(withImprint.trait_id, AGILE_TRAIT, 'still the form-pulse trait');
});

test('OFF: sub-threshold aggregate -> null (matches emergeBrancoTrait at 0.30)', () => {
  const aggregate = { agile_robust: 0.1 };
  assert.equal(produceBrancoTrait({ aggregate, combined: false, threshold: 0.3 }), null);
});

// ---- ON (combined=true): combined argmax, single slot ----

test('ON: form-pulse lean stronger than the imprint weight -> form wins', () => {
  const aggregate = { agile_robust: -0.9 }; // |avg| 0.9 > w 0.5
  const got = produceBrancoTrait({
    aggregate,
    imprintTuple: { locomotion: 'VELOCE' },
    combined: true,
    threshold: 0,
    w: 0.5,
  });
  assert.equal(got.trait_id, AGILE_TRAIT);
  assert.equal(got.axis, 'agile_robust');
  assert.equal(got.source, 'formpulse');
});

test('ON: imprint weight stronger than every form lean -> imprint supplies the trait', () => {
  const aggregate = { agile_robust: -0.2, solitary_swarm: 0.1 }; // max |avg| 0.2 < w 0.6
  const got = produceBrancoTrait({
    aggregate,
    imprintTuple: { locomotion: 'VELOCE' },
    combined: true,
    threshold: 0,
    w: 0.6,
  });
  assert.equal(got.trait_id, VELOCE_TRAIT);
  assert.equal(got.axis, 'locomotion');
  assert.equal(got.pole, 'VELOCE');
  assert.equal(got.source, 'imprint');
});

test('ON: exact tie (w == form |avg|) -> Form-Pulse precedence wins', () => {
  const aggregate = { agile_robust: -0.5 };
  const got = produceBrancoTrait({
    aggregate,
    imprintTuple: { locomotion: 'VELOCE' },
    combined: true,
    threshold: 0,
    w: 0.5,
  });
  assert.equal(got.trait_id, AGILE_TRAIT, 'form-pulse wins the tie');
});

test('ON: empty aggregate + imprint present -> imprint is the only candidate', () => {
  const got = produceBrancoTrait({
    aggregate: {},
    imprintTuple: { locomotion: 'VELOCE' },
    combined: true,
    threshold: 0,
    w: 0.5,
  });
  assert.equal(got.trait_id, VELOCE_TRAIT);
});

test('ON: no imprint tuple -> form-pulse only (always-emerge at threshold 0)', () => {
  const aggregate = { agile_robust: -0.05 }; // weak lean, but threshold 0 -> still emerges
  const got = produceBrancoTrait({ aggregate, combined: true, threshold: 0, w: 0.5 });
  assert.equal(got.trait_id, AGILE_TRAIT);
});

test('single slot: returns at most ONE trait (never stacks)', () => {
  const got = produceBrancoTrait({
    aggregate: { agile_robust: -0.9, solitary_swarm: 0.8 },
    imprintTuple: { locomotion: 'VELOCE' },
    combined: true,
    threshold: 0,
    w: 2.0,
  });
  assert.ok(got && typeof got.trait_id === 'string');
  // it is a single object, not an array
  assert.ok(!Array.isArray(got));
});

test('ON: deterministic tie-break among imprint axes (mapping order, first wins)', () => {
  // both locomotion + senses present; equal weight -> the first mapping axis wins.
  const imprintMapping = {
    locomotion: { VELOCE: 'trait_loco' },
    senses: { ACUTO: 'trait_senses' },
  };
  const got = produceBrancoTrait({
    aggregate: {},
    imprintTuple: { locomotion: 'VELOCE', senses: 'ACUTO' },
    combined: true,
    threshold: 0,
    w: 0.5,
    imprintMapping,
  });
  assert.equal(got.trait_id, 'trait_loco');
});

test('null / garbage inputs -> null, never throws', () => {
  assert.equal(produceBrancoTrait(), null);
  assert.equal(produceBrancoTrait({}), null);
  assert.equal(produceBrancoTrait({ aggregate: null, combined: true, threshold: 0 }), null);
  assert.equal(
    produceBrancoTrait({
      aggregate: 'nope',
      imprintTuple: 'nope',
      combined: true,
      threshold: 0,
      w: 0.5,
    }),
    null,
  );
});

// ---- resolveImprintWeight: PROPOSED env knob (value = master-dd N=40, not fixed here) ----

test('resolveImprintWeight: PROPOSED default, env override, invalid fallback', () => {
  assert.equal(resolveImprintWeight({}), PROPOSED_IMPRINT_WEIGHT);
  assert.equal(resolveImprintWeight({ FORM_PULSE_IMPRINT_WEIGHT: '0.7' }), 0.7);
  assert.equal(resolveImprintWeight({ FORM_PULSE_IMPRINT_WEIGHT: '0' }), 0);
  assert.equal(
    resolveImprintWeight({ FORM_PULSE_IMPRINT_WEIGHT: 'nope' }),
    PROPOSED_IMPRINT_WEIGHT,
  );
  assert.equal(resolveImprintWeight({ FORM_PULSE_IMPRINT_WEIGHT: '-1' }), PROPOSED_IMPRINT_WEIGHT);
});
