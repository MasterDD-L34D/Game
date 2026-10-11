// Onboarding card -- la riga del tratto. Oggi mostra al giocatore l'id grezzo
// (`Trait: zampe_a_molla`). Con il bundle `traits` curato deve mostrare il nome e
// l'effetto in chiaro; per i tratti non ancora curati deve degradare, non rompersi.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadModule() {
  return import('../../apps/play/src/onboardingPanel.js');
}

describe('traitLineFor', () => {
  test('curated trait -> label + effetto in chiaro', async () => {
    const { traitLineFor } = await loadModule();
    assert.equal(
      traitLineFor('denti_seghettati', 'it'),
      'Denti Seghettati -- Il morso lacera la carne e applica sanguinamento profondo per 2 turni.',
    );
  });

  test('uncurated trait -> vecchia riga `Trait: <id>`, mai la chiave grezza', async () => {
    const { traitLineFor } = await loadModule();
    const line = traitLineFor('tratto_non_ancora_curato', 'it');
    assert.equal(line, 'Trait: tratto_non_ancora_curato');
    assert.ok(!line.includes('traits.'), 'non deve perdere una chiave i18n nella UI');
  });

  test('i tre tratti dell onboarding sono tutti curati, IT e EN', async () => {
    const { traitLineFor } = await loadModule();
    for (const id of ['zampe_a_molla', 'pelle_elastomera', 'denti_seghettati']) {
      for (const loc of ['it', 'en']) {
        const line = traitLineFor(id, loc);
        assert.ok(line.includes(' -- '), `${id}/${loc}: manca l'effetto in chiaro (${line})`);
        assert.ok(!line.startsWith('Trait: '), `${id}/${loc}: caduto nel fallback`);
      }
    }
  });
});
