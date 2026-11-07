const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const express = require('express');
const request = require('supertest');

const { createTraitRouter } = require('../../apps/backend/routes/traits');

function createBaseTrait(id) {
  return {
    id,
    label: `i18n:traits.${id}.label`,
    famiglia_tipologia: 'Supporto/Logistico',
    fattore_mantenimento_energetico: `i18n:traits.${id}.fattore`,
    tier: 'T1',
    slot: [],
    sinergie: [],
    conflitti: [],
    mutazione_indotta: `i18n:traits.${id}.mutazione`,
    uso_funzione: `i18n:traits.${id}.uso`,
    spinta_selettiva: `i18n:traits.${id}.spinta`,
    metrics: [
      {
        name: 'Output',
        value: 1,
        unit: '1',
      },
    ],
    species_affinity: [
      {
        species_id: `${id}-species`,
        roles: ['core'],
        weight: 1,
      },
    ],
    applicability: {
      envo_terms: ['http://purl.obolibrary.org/obo/ENVO_01000000'],
    },
    data_origin: 'pack',
    usage_tags: ['core'],
    biome_tags: ['savanna'],
    completion_flags: { has_biome: true },
  };
}

async function setupTraitApp() {
  const dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'trait-router-'));
  await fs.mkdir(path.join(dataRoot, 'traits'), { recursive: true });
  const app = express();
  app.use(express.json());
  const router = createTraitRouter({ dataRoot, auth: { disabled: true } });
  app.use('/traits', router);
  return {
    app,
    dataRoot,
    async cleanup() {
      await fs.rm(dataRoot, { recursive: true, force: true });
    },
  };
}

test('POST /traits accepts legacy and nested payloads', async () => {
  const { app, cleanup } = await setupTraitApp();
  try {
    const legacyTrait = createBaseTrait('legacy_trait');
    const legacyResponse = await request(app)
      .post('/traits')
      .send({ ...legacyTrait, category: 'test' })
      .expect(201);
    assert.equal(legacyResponse.body.trait.id, 'legacy_trait');

    const nestedTrait = createBaseTrait('nested_trait');
    const nestedResponse = await request(app)
      .post('/traits')
      .send({ trait: nestedTrait, category: 'test', meta: { author: 'Nested' } })
      .expect(201);
    assert.equal(nestedResponse.body.trait.id, 'nested_trait');
    assert.equal(nestedResponse.body.meta.savedBy, 'Nested');
  } finally {
    await cleanup();
  }
});

test('PUT /traits/:id accepts nested and legacy payloads', async () => {
  const { app, cleanup } = await setupTraitApp();
  try {
    const base = createBaseTrait('update_trait');
    const created = await request(app)
      .post('/traits')
      .send({ trait: base, category: 'test', meta: { author: 'Creator' } })
      .expect(201);
    const initialMeta = created.body.meta;

    const nestedPayload = {
      trait: {
        ...base,
        label: `i18n:traits.${base.id}.label_nested`,
      },
      meta: {
        version: initialMeta.version,
        etag: initialMeta.etag,
        author: 'Nested Updater',
      },
    };
    const nestedResponse = await request(app)
      .put(`/traits/${base.id}`)
      .send(nestedPayload)
      .expect(200);
    assert.equal(nestedResponse.body.trait.label, nestedPayload.trait.label);
    assert.equal(nestedResponse.body.meta.savedBy, 'Nested Updater');

    const legacyPayload = {
      ...nestedPayload.trait,
      label: `i18n:traits.${base.id}.label_legacy`,
      expectedVersion: nestedResponse.body.meta.version,
      expectedEtag: nestedResponse.body.meta.etag,
      author: 'Legacy Updater',
    };
    const legacyResponse = await request(app)
      .put(`/traits/${base.id}`)
      .send(legacyPayload)
      .expect(200);
    assert.equal(legacyResponse.body.trait.label, legacyPayload.label);
    assert.equal(legacyResponse.body.meta.savedBy, 'Legacy Updater');
  } finally {
    await cleanup();
  }
});

test('POST /traits/:id/versions/:versionId/restore accepts nested and legacy metadata', async () => {
  const { app, cleanup } = await setupTraitApp();
  try {
    const base = createBaseTrait('restore_trait');
    const created = await request(app)
      .post('/traits')
      .send({ trait: base, category: 'test', meta: { author: 'Creator' } })
      .expect(201);

    await request(app)
      .put(`/traits/${base.id}`)
      .send({
        trait: {
          ...base,
          label: `i18n:traits.${base.id}.label_v1`,
        },
        meta: {
          version: created.body.meta.version,
          etag: created.body.meta.etag,
          author: 'Updater',
        },
      })
      .expect(200);

    const versionsResponse = await request(app).get(`/traits/${base.id}/versions`).expect(200);
    assert.ok(Array.isArray(versionsResponse.body.versions));
    assert.ok(versionsResponse.body.versions.length >= 1);
    const versionId = versionsResponse.body.versions[0].id;

    const versionDetail = await request(app)
      .get(`/traits/${base.id}/versions/${versionId}`)
      .expect(200);
    const targetLabel = versionDetail.body.trait.label;

    const currentState = await request(app).get(`/traits/${base.id}`).expect(200);
    const nestedRestore = await request(app)
      .post(`/traits/${base.id}/versions/${versionId}/restore`)
      .send({
        meta: {
          version: currentState.body.meta.version,
          etag: currentState.body.meta.etag,
          author: 'Restorer A',
        },
      })
      .expect(200);
    assert.equal(nestedRestore.body.trait.label, targetLabel);
    assert.equal(nestedRestore.body.meta.restoredFrom, versionId);
    assert.equal(nestedRestore.body.meta.savedBy, 'Restorer A');

    const secondUpdate = await request(app)
      .put(`/traits/${base.id}`)
      .send({
        trait: {
          ...nestedRestore.body.trait,
          label: `i18n:traits.${base.id}.label_v2`,
        },
        meta: {
          version: nestedRestore.body.meta.version,
          etag: nestedRestore.body.meta.etag,
          author: 'Updater 2',
        },
      })
      .expect(200);

    const current = await request(app).get(`/traits/${base.id}`).expect(200);
    const legacyRestore = await request(app)
      .post(`/traits/${base.id}/versions/${versionId}/restore`)
      .send({
        expectedVersion: current.body.meta.version,
        expectedEtag: current.body.meta.etag,
        author: 'Restorer B',
      })
      .expect(200);
    assert.equal(legacyRestore.body.trait.label, targetLabel);
    assert.equal(legacyRestore.body.meta.restoredFrom, versionId);
    assert.equal(legacyRestore.body.meta.savedBy, 'Restorer B');

    // Ensure restore produced a new version snapshot for the state before legacy restore
    assert.ok(secondUpdate.body.meta.version !== legacyRestore.body.meta.version);
  } finally {
    await cleanup();
  }
});

test('POST /traits/clone accepts overrides in legacy and nested payloads', async () => {
  const { app, cleanup } = await setupTraitApp();
  try {
    const sourceTrait = createBaseTrait('clone_source');
    await request(app)
      .post('/traits')
      .send({ trait: sourceTrait, category: 'test', meta: { author: 'Creator' } })
      .expect(201);

    const legacyClone = await request(app)
      .post('/traits/clone')
      .send({
        sourceId: sourceTrait.id,
        overrides: {
          id: 'legacy_clone',
          label: 'i18n:traits.legacy_clone.label',
        },
        category: 'test',
        meta: { author: 'Legacy Cloner' },
      })
      .expect(201);
    assert.equal(legacyClone.body.trait.id, 'legacy_clone');
    assert.equal(legacyClone.body.trait.label, 'i18n:traits.legacy_clone.label');
    assert.equal(legacyClone.body.meta.clonedFrom, sourceTrait.id);

    const sourceDetail = await request(app).get(`/traits/${sourceTrait.id}`).expect(200);
    const nestedOverride = {
      ...sourceDetail.body.trait,
      id: 'nested_clone',
      label: 'i18n:traits.nested_clone.label',
      species_affinity: [
        {
          species_id: 'nested_clone-species',
          roles: ['core'],
          weight: 1,
        },
      ],
    };
    const nestedClone = await request(app)
      .post('/traits/clone')
      .send({
        sourceId: sourceTrait.id,
        trait: nestedOverride,
        category: 'test',
        meta: { author: 'Nested Cloner' },
      })
      .expect(201);
    assert.equal(nestedClone.body.trait.id, 'nested_clone');
    assert.equal(nestedClone.body.trait.label, 'i18n:traits.nested_clone.label');
    assert.equal(nestedClone.body.meta.clonedFrom, sourceTrait.id);
  } finally {
    await cleanup();
  }
});
