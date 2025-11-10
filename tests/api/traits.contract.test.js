const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const express = require('express');

const { createTraitRouter } = require('../../server/routes/traits');
const { signJwt } = require('../../server/utils/jwt');
const { TRAIT_ID, buildTraitPayload, buildIndexDocument, buildTraitResponse } = require('./fixtures/traitContractSamples');

const AUTH_SECRET = 'test-secret';

function createToken(roles) {
  return signJwt({ sub: 'trait-tester', roles }, AUTH_SECRET, { expiresIn: '1h' });
}

function createTraitApp(repository, overrides = {}) {
  const { auth: overrideAuth, ...rest } = overrides || {};
  const router = createTraitRouter({
    repository,
    ...rest,
    auth: {
      secret: AUTH_SECRET,
      ...(overrideAuth || {}),
    },
  });
  const app = express();
  app.use(express.json());
  app.use('/api/traits', router);
  return app;
}

test('GET /api/traits/index returns normalized payload for reviewer role', async () => {
  const indexDocument = buildIndexDocument();
  const repository = {
    getIndex: async () => indexDocument,
  };
  const app = createTraitApp(repository);
  const token = createToken(['reviewer']);

  const response = await request(app)
    .get('/api/traits/index')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.deepEqual(response.body.traits, indexDocument.traits);
  assert.deepEqual(response.body.meta, indexDocument.meta);
  assert.deepEqual(response.body.legacy, indexDocument.legacy);
  assert.deepEqual(response.body.index, indexDocument.legacy);
});

test('GET /api/traits/index rejects viewer role', async () => {
  const repository = {
    getIndex: async () => buildIndexDocument(),
  };
  const app = createTraitApp(repository);
  const token = createToken(['viewer']);

  await request(app)
    .get('/api/traits/index')
    .set('Authorization', `Bearer ${token}`)
    .expect(403);
});

test('GET /api/traits/:id returns normalized payload and exposes ETag header', async () => {
  const traitResponse = buildTraitResponse({
    meta: { etag: '"etag-beta"' },
  });
  const repository = {
    getTrait: async (traitId) => {
      assert.equal(traitId, TRAIT_ID);
      return traitResponse;
    },
  };
  const app = createTraitApp(repository);
  const token = createToken(['editor']);

  const response = await request(app)
    .get(`/api/traits/${TRAIT_ID}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.deepEqual(response.body, traitResponse);
  assert.equal(response.headers.etag, traitResponse.meta.etag);
});

test('GET /api/traits/:id rejects viewer role', async () => {
  const repository = {
    getTrait: async () => buildTraitResponse(),
  };
  const app = createTraitApp(repository);
  const token = createToken(['viewer']);

  await request(app)
    .get(`/api/traits/${TRAIT_ID}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(403);
});

test('PUT /api/traits/:id enforces editor role', async () => {
  let called = false;
  const repository = {
    updateTrait: async () => {
      called = true;
      return buildTraitResponse();
    },
  };
  const app = createTraitApp(repository);
  const token = createToken(['reviewer']);

  await request(app)
    .put(`/api/traits/${TRAIT_ID}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ trait: buildTraitPayload() })
    .expect(403);

  assert.equal(called, false);
});

test('PUT /api/traits/:id updates trait with concurrency metadata and headers', async () => {
  const updateCalls = [];
  const repository = {
    updateTrait: async (traitId, payload, options) => {
      updateCalls.push({ traitId, payload, options });
      return buildTraitResponse({
        trait: { ...payload },
        meta: {
          version: '2024-02-20T18:42:00.000Z',
          savedAt: '2024-02-20T18:42:00.000Z',
          updatedAt: '2024-02-20T18:42:00.000Z',
          etag: '"etag-updated"',
          savedBy: options.author,
        },
      });
    },
  };
  const app = createTraitApp(repository);
  const token = createToken(['editor']);

  const body = {
    trait: buildTraitPayload({ label: 'i18n:traits.alpha_trait.label_updated' }),
    meta: {
      version: '2024-01-15T10:00:00.000Z',
    },
  };

  const response = await request(app)
    .put(`/api/traits/${TRAIT_ID}`)
    .set('Authorization', `Bearer ${token}`)
    .set('If-Match', 'W/"etag-alpha"')
    .set('X-Trait-Author', 'Editor Header')
    .set('X-Trait-Version', '2024-01-15T10:00:00.000Z')
    .send(body)
    .expect(200);

  assert.equal(updateCalls.length, 1);
  const call = updateCalls[0];
  assert.equal(call.traitId, TRAIT_ID);
  assert.equal(call.payload.label, body.trait.label);
  assert.equal(call.options.author, 'Editor Header');
  assert.equal(call.options.expectedVersion, '2024-01-15T10:00:00.000Z');
  assert.equal(call.options.expectedEtag, '"etag-alpha"');

  assert.equal(response.body.trait.label, body.trait.label);
  assert.equal(response.body.meta.savedBy, 'Editor Header');
  assert.equal(response.body.meta.version, '2024-02-20T18:42:00.000Z');
  assert.equal(response.headers.etag, '"etag-updated"');
});

test('PUT /api/traits/:id returns 428 when concurrency guard is missing', async () => {
  const repository = {
    updateTrait: async () => {
      const error = new Error('Versione o ETag richiesto per aggiornare il trait');
      error.statusCode = 428;
      throw error;
    },
  };
  const app = createTraitApp(repository);
  const token = createToken(['editor']);

  const response = await request(app)
    .put(`/api/traits/${TRAIT_ID}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ trait: buildTraitPayload() })
    .expect(428);

  assert.match(response.body.error, /Versione|ETag/i);
});

test('PUT /api/traits/:id returns 412 when repository detects stale version', async () => {
  const repository = {
    updateTrait: async () => {
      const error = new Error('Versione del trait non aggiornata: ricaricare prima di salvare');
      error.statusCode = 412;
      throw error;
    },
  };
  const app = createTraitApp(repository);
  const token = createToken(['editor']);

  const response = await request(app)
    .put(`/api/traits/${TRAIT_ID}`)
    .set('Authorization', `Bearer ${token}`)
    .set('If-Match', '"etag-alpha"')
    .send({
      trait: buildTraitPayload(),
      meta: {
        version: '2024-01-10T08:00:00.000Z',
      },
    })
    .expect(412);

  assert.match(response.body.error, /ricaricare/i);
});
