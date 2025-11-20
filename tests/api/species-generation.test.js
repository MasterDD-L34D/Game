const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

test('POST /api/v1/generation/species restituisce blueprint validato', async () => {
  const { app } = createApp();

  const response = await request(app)
    .post('/api/v1/generation/species')
    .send({
      trait_ids: ['artigli_sette_vie', 'coda_frusta_cinetica', 'scheletro_idro_regolante'],
      seed: 99,
      biome_id: 'caverna_risonante',
      base_name: 'Predatore QA',
    })
    .expect(200);

  const { blueprint, validation, meta } = response.body;
  assert.ok(blueprint, 'la risposta deve contenere blueprint');
  assert.ok(blueprint.display_name.includes('Predatore'), 'il nome deve riflettere la base name');
  assert.ok(
    Array.isArray(validation?.messages),
    'devono essere presenti i messaggi di validazione',
  );
  assert.equal(validation.discarded.length, 0, 'nessuna specie deve essere scartata');
  assert.equal(meta.fallback_used, false, 'non deve essere necessario il fallback');
});

test('POST /api/v1/generation/species ritorna 400 senza trait', async () => {
  const { app } = createApp();

  const response = await request(app)
    .post('/api/v1/generation/species')
    .send({ trait_ids: [] })
    .expect(400);

  assert.match(response.body.error, /trait_ids/i);
});
