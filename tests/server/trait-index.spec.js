const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const express = require('express');
const request = require('supertest');

const { createTraitRouter } = require('../../apps/backend/routes/traits');
const { TraitRepository } = require('../../apps/backend/services/traitRepository');

const DATA_ROOT = path.resolve(__dirname, '..', '..', 'data');

test('buildIndexDocument returns trait metadata and legacy payload', async () => {
  const repository = new TraitRepository({ dataRoot: DATA_ROOT });
  const document = await repository.buildIndexDocument();

  assert.ok(document);
  assert.ok(document.traits);
  assert.ok(document.meta);
  assert.ok(document.legacy);

  assert.equal(document.meta.schema.version, '2.0');
  assert.equal(document.meta.schema.path, 'config/schemas/trait.schema.json');
  assert.equal(document.meta.glossary.path, 'data/core/traits/glossary.json');

  const traitMeta = document.meta.traits.ali_fulminee;
  assert.ok(traitMeta, 'expected metadata for ali_fulminee');
  assert.equal(traitMeta.category, 'sensoriale');
  assert.equal(traitMeta.isDraft, false);
  assert.equal(traitMeta.path, path.join('traits', 'sensoriale', 'ali_fulminee.json'));
  assert.match(traitMeta.etag, /^"[0-9a-f]+-[0-9a-f]+"$/i);
  assert.equal(typeof traitMeta.updatedAt, 'string');
  assert.equal(typeof traitMeta.version, 'string');
});

test('GET /traits/index exposes traits with metadata and legacy index', async () => {
  const app = express();
  app.use(express.json());
  const router = createTraitRouter({ dataRoot: DATA_ROOT, auth: { disabled: true } });
  app.use('/traits', router);

  const response = await request(app).get('/traits/index').expect(200);

  assert.ok(response.body.traits);
  assert.ok(response.body.meta);
  assert.ok(response.body.index);
  assert.equal(response.body.meta.schema.version, '2.0');
  assert.equal(response.body.index.schema_version, '2.0');

  const traitMeta = response.body.meta.traits.ali_fulminee;
  assert.ok(traitMeta, 'expected ali_fulminee metadata in response');
  assert.equal(traitMeta.category, 'sensoriale');
  assert.equal(traitMeta.isDraft, false);
});
