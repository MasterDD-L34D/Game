'use strict';

// SPEC-E / SPEC-J sez.6 -- scar->transform MECHANICAL trait grant (verdetto
// master-dd 2026-06-23 = trait meccanico, non solo narrativo).
//
// The grant is OFF by default at the wire site (flag SCAR_TRANSFORM_TRAIT_GRANT_ENABLED).
// nidoRitual stays pure: it derives the trait id from the scar via an injected
// PROPOSED map + an injected valid-id set (active_effects SoT). No grant unless the
// caller passes both -> band-neutral when the flag is OFF.

const test = require('node:test');
const assert = require('node:assert');

const {
  transformScar,
  deriveScarTrait,
  SCAR_TRAIT_MAP,
} = require('../../../apps/backend/services/combat/nidoRitual');

function graveScar(location, stat) {
  return { location, severity: 'grave', stat: stat || 'defense_mod', malus: -2 };
}
function scarredUnit(location, stat) {
  return { id: 'u1', status: { wounds: [graveScar(location, stat)] } };
}

// The 3 PROPOSED real trait ids (validated against active_effects in the map).
const VALID = new Set(['pelle_elastomera', 'martello_osseo', 'zampe_a_molla', 'whatever']);

test('SCAR_TRAIT_MAP maps the 3 stat-scar locations to real proposed traits, leaves testa unmapped', () => {
  assert.equal(SCAR_TRAIT_MAP.torso, 'pelle_elastomera');
  assert.equal(SCAR_TRAIT_MAP.arti_anteriori, 'martello_osseo');
  assert.equal(SCAR_TRAIT_MAP.arti_posteriori, 'zampe_a_molla');
  assert.ok(!('testa' in SCAR_TRAIT_MAP), 'testa is intentionally unmapped (master-dd gate)');
});

test('deriveScarTrait returns the mapped trait when it is a valid id', () => {
  const t = deriveScarTrait(graveScar('torso'), SCAR_TRAIT_MAP, VALID);
  assert.equal(t, 'pelle_elastomera');
});

test('deriveScarTrait fail-closes on an unmapped location (testa)', () => {
  assert.equal(deriveScarTrait(graveScar('testa', 'accuracy'), SCAR_TRAIT_MAP, VALID), null);
});

test('deriveScarTrait fail-closes when the mapped id is not in the valid-id set (SoT)', () => {
  const t = deriveScarTrait(graveScar('torso'), { torso: 'not_a_real_trait' }, VALID);
  assert.equal(t, null);
});

test('deriveScarTrait is deterministic (same scar -> same trait)', () => {
  const a = deriveScarTrait(graveScar('arti_anteriori', 'attack_mod'), SCAR_TRAIT_MAP, VALID);
  const b = deriveScarTrait(graveScar('arti_anteriori', 'attack_mod'), SCAR_TRAIT_MAP, VALID);
  assert.equal(a, 'martello_osseo');
  assert.equal(a, b);
});

test('transformScar WITHOUT the map = band-neutral (no granted_trait, unchanged behavior)', () => {
  const u = scarredUnit('torso');
  const r = transformScar(u, 'torso', {});
  assert.equal(r.transformed, true);
  assert.ok(r.mark, 'narrative mark still produced');
  assert.equal(r.granted_trait, undefined, 'no trait granted when no map passed');
});

test('transformScar WITH map+validIds returns granted_trait for a mapped scar', () => {
  const u = scarredUnit('arti_posteriori', 'mobility');
  const r = transformScar(u, 'arti_posteriori', {
    scarTraitMap: SCAR_TRAIT_MAP,
    validTraitIds: VALID,
  });
  assert.equal(r.transformed, true);
  assert.equal(r.granted_trait, 'zampe_a_molla');
});

test('transformScar WITH map but unmapped scar (testa) = no granted_trait, still transforms', () => {
  const u = scarredUnit('testa', 'accuracy');
  const r = transformScar(u, 'testa', {
    scarTraitMap: SCAR_TRAIT_MAP,
    validTraitIds: VALID,
  });
  assert.equal(r.transformed, true);
  assert.equal(r.granted_trait, undefined);
});

test('transformScar still fail-closes when there is no scar at the location', () => {
  const u = scarredUnit('torso');
  const r = transformScar(u, 'arti_anteriori', {
    scarTraitMap: SCAR_TRAIT_MAP,
    validTraitIds: VALID,
  });
  assert.equal(r.transformed, false);
  assert.equal(r.reason, 'no_scar');
});
