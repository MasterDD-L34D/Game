// =============================================================================
// D6 (aa01 L'Impronta, 2026-06-30) -- imprint axis->trait grant producer.
//
// Master-dd ratify: stacking B + mechanism (a) designated-axis = locomotion.
// Pure producer (mirror brancoTraitEmergence). Flag default OFF -> dormant.
// =============================================================================

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  emergeImprintTrait,
  isImprintTraitGrantEnabled,
  PROPOSED_IMPRINT_TRAIT_MAPPING,
  DESIGNATED_AXIS,
} = require('../../apps/backend/services/imprint/imprintTraitGrant');

test('designated axis is locomotion (mechanism a)', () => {
  assert.equal(DESIGNATED_AXIS, 'locomotion');
});

test('VELOCE -> coda_stabilizzatrice_vortex; SILENZIOSA -> cartilagini_flessoacustiche', () => {
  assert.deepEqual(emergeImprintTrait({ locomotion: 'VELOCE' }), {
    trait_id: 'coda_stabilizzatrice_vortex',
    axis: 'locomotion',
    pole: 'VELOCE',
    source: 'imprint',
  });
  assert.deepEqual(emergeImprintTrait({ locomotion: 'SILENZIOSA' }), {
    trait_id: 'cartilagini_flessoacustiche',
    axis: 'locomotion',
    pole: 'SILENZIOSA',
    source: 'imprint',
  });
});

test('case-insensitive on the pole value', () => {
  assert.equal(
    emergeImprintTrait({ locomotion: 'veloce' }).trait_id,
    'coda_stabilizzatrice_vortex',
  );
});

test('only the designated axis is read; the other 3 are cosmetic for the trait', () => {
  const t = emergeImprintTrait({
    locomotion: 'SILENZIOSA',
    offense: 'PROFONDA',
    defense: 'DURA',
    senses: 'LONTANO',
  });
  assert.equal(t.trait_id, 'cartilagini_flessoacustiche');
  // A tuple WITHOUT locomotion grants nothing, even if other axes are set.
  assert.equal(emergeImprintTrait({ offense: 'PROFONDA', defense: 'DURA' }), null);
});

test('dormant / silent no-op on bad input', () => {
  assert.equal(emergeImprintTrait(null), null);
  assert.equal(emergeImprintTrait(undefined), null);
  assert.equal(emergeImprintTrait({}), null);
  assert.equal(emergeImprintTrait({ locomotion: 'UNKNOWN_POLE' }), null);
  assert.equal(emergeImprintTrait('nope'), null);
});

test('mapping uses audited-LIVE picks, NOT the inert draft ones', () => {
  const ids = Object.values(PROPOSED_IMPRINT_TRAIT_MAPPING.locomotion);
  // Verify-first correction: the draft proposed these inert/near-inert traits.
  assert.ok(!ids.includes('zampe_a_molla'), 'near-inert (min_mos>=5) must not ship as PROPOSED');
  assert.ok(!ids.includes('mimetismo_cromatico_passivo'), 'passive -> no consumer = inert');
  assert.ok(
    !ids.includes('spore_psichiche_silenziate'),
    'melee_attack trigger = inert via traitEffects',
  );
});

test('flag gate: OFF by default; requires BOTH grant flag AND imprint-beat flag', () => {
  assert.equal(isImprintTraitGrantEnabled({}), false);
  assert.equal(
    isImprintTraitGrantEnabled({ IMPRINT_TRAIT_GRANT_ENABLED: 'true' }),
    false,
    'beat off',
  );
  assert.equal(
    isImprintTraitGrantEnabled({
      IMPRINT_TRAIT_GRANT_ENABLED: 'true',
      IMPRINT_BEAT_ENABLED: 'false',
    }),
    false,
  );
  assert.equal(
    isImprintTraitGrantEnabled({ IMPRINT_BEAT_ENABLED: 'true' }),
    false,
    'grant flag off',
  );
  assert.equal(
    isImprintTraitGrantEnabled({
      IMPRINT_TRAIT_GRANT_ENABLED: 'true',
      IMPRINT_BEAT_ENABLED: 'true',
    }),
    true,
  );
  assert.equal(isImprintTraitGrantEnabled(null), false);
});
