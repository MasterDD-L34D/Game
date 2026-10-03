// OD-024 D7 co-op-path measure -- the full loop is single-player, so the party
// never goes through coopOrchestrator.submitCharacter (only the enemies get the
// interoception grant via session /start, D3). applyPartyInteroceptionGrant is an
// OPT-IN sim helper that applies the REAL producer to the party combat units too, so
// an N=40 batch can measure the SYMMETRIC (party + enemy) flip condition. Default off
// = byte-identical.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { applyPartyInteroceptionGrant } = require('../../tools/sim/full-loop-runner');

describe('OD-024 D7 -- applyPartyInteroceptionGrant (opt-in symmetric measure)', () => {
  test('disabled -> roster returned unchanged (same reference, byte-identical default)', () => {
    const roster = [{ id: 'u1', species_id: 'anguis_magnetica', traits: [] }];
    const out = applyPartyInteroceptionGrant(roster, { enabled: false });
    assert.equal(out, roster);
  });

  test('enabled -> qualifying party unit gains its interoception set (real catalog)', () => {
    // anguis_magnetica = T1 + atollo_obsidiana + danger 2 -> D4 override [prop, vest, noci].
    const roster = [{ id: 'u1', species_id: 'anguis_magnetica', traits: [] }];
    const out = applyPartyInteroceptionGrant(roster, { enabled: true });
    assert.deepEqual([...out[0].traits].sort(), [
      'equilibrio_vestibolare',
      'nocicezione',
      'propriocezione',
    ]);
  });

  test('enabled -> unknown species (not in catalog) left unchanged (fail-closed)', () => {
    const roster = [{ id: 'u1', species_id: 'does_not_exist', traits: ['coda_balanciere'] }];
    const out = applyPartyInteroceptionGrant(roster, { enabled: true });
    assert.deepEqual(out[0].traits, ['coda_balanciere']);
  });

  test('enabled -> preserves pre-existing traits, no duplicates', () => {
    const roster = [
      { id: 'u1', species_id: 'anguis_magnetica', traits: ['propriocezione', 'coda_balanciere'] },
    ];
    const out = applyPartyInteroceptionGrant(roster, { enabled: true });
    assert.ok(out[0].traits.includes('coda_balanciere'));
    assert.equal(out[0].traits.filter((t) => t === 'propriocezione').length, 1);
  });
});
