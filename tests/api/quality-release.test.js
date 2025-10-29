const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../server/app');

const speciesEntry = {
  id: 'spec-runtime-node',
  display_name: 'Predatore Nodo QA',
  role_trofico: 'predatore_apice_test',
  functional_tags: 'predatore',
  vc: {},
  playable_unit: false,
  spawn_rules: {},
  balance: {},
};

test('POST /api/quality/suggestions/apply esegue fix specie via runtime validator', async () => {
  const { app } = createApp();

  const response = await request(app)
    .post('/api/quality/suggestions/apply')
    .send({
      suggestion: {
        id: 'spec-fix',
        scope: 'species',
        action: 'fix',
        payload: {
          biomeId: 'badlands',
          entries: [speciesEntry],
        },
      },
    })
    .expect(200);

  const { result, logs } = response.body;
  assert.ok(Array.isArray(result?.corrected), 'il risultato deve includere le correzioni');
  assert.ok(Array.isArray(logs), 'i log devono essere un array');
  assert.ok(logs.every((log) => log.scope === 'species'), 'i log devono essere marcati come specie');
});

test('POST /api/quality/suggestions/apply rigenera batch tramite orchestrator', async () => {
  const { app } = createApp();

  const response = await request(app)
    .post('/api/quality/suggestions/apply')
    .send({
      suggestion: {
        id: 'spec-regenerate',
        scope: 'species',
        action: 'regenerate',
        payload: {
          entries: [
            {
              trait_ids: ['artigli_sette_vie', 'coda_frusta_cinetica', 'scheletro_idro_regolante'],
              biome_id: 'caverna_risonante',
              seed: 'QA-regen-01',
              request_id: 'regen-qa-01',
            },
          ],
        },
      },
    })
    .expect(200);

  const { result, logs } = response.body;
  assert.ok(Array.isArray(result?.results), 'la rigenerazione deve restituire risultati');
  assert.ok(result.results.length >= 1, 'almeno una specie deve essere rigenerata');
  assert.ok(Array.isArray(logs), 'i log devono essere un array');
  assert.ok(logs.some((log) => log.level === 'success'), 'deve esserci un log di successo');
});
