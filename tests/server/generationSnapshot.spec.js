const assert = require('node:assert/strict');
const { mkdtemp, rm, writeFile, readFile } = require('node:fs/promises');
const path = require('node:path');
const { tmpdir } = require('node:os');
const test = require('node:test');

const {
  createGenerationSnapshotStore,
} = require('../../apps/backend/services/generationSnapshotStore');
const { createMockFs } = require('../helpers/mockFs');

function createTempDir(prefix) {
  return mkdtemp(path.join(tmpdir(), prefix));
}

test('applyPatch aggiorna la cache e persiste i dati su disco', async (t) => {
  const tempDir = await createTempDir('snapshot-store-');
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });
  const datasetPath = path.join(tempDir, 'atlas-snapshot.json');
  const initialDataset = {
    overview: { completion: { completed: 1, total: 4 } },
    species: { curated: 2, total: 10, shortlist: ['alpha'] },
    biomeSummary: { validated: 1, pending: 2 },
    encounterSummary: { variants: 0, seeds: 0, warnings: 0 },
  };
  await writeFile(datasetPath, `${JSON.stringify(initialDataset, null, 2)}\n`, 'utf8');

  const store = createGenerationSnapshotStore({ datasetPath });
  const baseline = await store.getSnapshot();
  assert.equal(baseline.species.curated, 2);

  await store.applyPatch({
    runtime: {
      lastBlueprintId: 'blueprint-42',
      fallbackUsed: false,
      validationMessages: 1,
      lastRequestId: 'req-42',
    },
    speciesStatus: { curated: 3, shortlist: ['alpha', 'beta'] },
    overview: { completion: { completed: 2 } },
    biomeSummary: { pending: 1 },
    encounterSummary: { variants: 1, seeds: 3 },
  });

  const cached = await store.getSnapshot();
  assert.equal(cached.runtime.lastBlueprintId, 'blueprint-42');
  assert.equal(cached.species.curated, 3);
  assert.deepEqual(cached.species.shortlist, ['alpha', 'beta']);
  assert.deepEqual(cached.overview.completion, { completed: 2, total: 4 });
  assert.deepEqual(cached.biomeSummary, { validated: 1, pending: 1 });
  assert.deepEqual(cached.encounterSummary, { variants: 1, seeds: 3, warnings: 0 });

  const persisted = JSON.parse(await readFile(datasetPath, 'utf8'));
  assert.equal(persisted.runtime.lastBlueprintId, 'blueprint-42');
  assert.equal(persisted.species.curated, 3);
  assert.deepEqual(persisted.overview.completion, { completed: 2, total: 4 });
});

test('getSnapshot({ refresh: true }) invalida la cache e ricarica il file', async (t) => {
  const tempDir = await createTempDir('snapshot-store-refresh-');
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });
  const datasetPath = path.join(tempDir, 'atlas.json');
  const datasetV1 = { overview: { title: 'Versione 1' } };
  const datasetV2 = { overview: { title: 'Versione 2' } };
  await writeFile(datasetPath, `${JSON.stringify(datasetV1, null, 2)}\n`, 'utf8');

  const store = createGenerationSnapshotStore({ datasetPath });
  const first = await store.getSnapshot();
  assert.equal(first.overview.title, 'Versione 1');

  await writeFile(datasetPath, `${JSON.stringify(datasetV2, null, 2)}\n`, 'utf8');

  const cached = await store.getSnapshot();
  assert.equal(cached.overview.title, 'Versione 1');

  const refreshed = await store.getSnapshot({ refresh: true });
  assert.equal(refreshed.overview.title, 'Versione 2');
});

test('usa il dataset statico quando il file non è disponibile', async (t) => {
  const tempDir = await createTempDir('snapshot-store-static-');
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });
  const datasetPath = path.join(tempDir, 'missing.json');
  const staticDataset = {
    overview: { title: 'Statico' },
    species: { curated: 0, total: 5 },
  };

  const store = createGenerationSnapshotStore({ datasetPath, staticDataset });
  const snapshot = await store.getSnapshot();
  assert.equal(snapshot.overview.title, 'Statico');
  assert.equal(snapshot.species.total, 5);

  await store.applyPatch({ speciesStatus: { curated: 1 } });
  const persisted = JSON.parse(await readFile(datasetPath, 'utf8'));
  assert.equal(persisted.species.curated, 1);
  assert.equal(persisted.species.total, 5);
});

test('recupera automaticamente da snapshot temporaneo dopo un crash', async () => {
  const datasetPath = '/data/flow-shell/atlas-snapshot.json';
  const fsMock = createMockFs({
    [`${datasetPath}.tmp`]: { overview: { title: 'Tmp' } },
    [`${datasetPath}.bak`]: { overview: { title: 'Backup' } },
  });

  const store = createGenerationSnapshotStore({ datasetPath, fs: fsMock });
  const snapshot = await store.getSnapshot();
  assert.equal(snapshot.overview.title, 'Tmp');
});

test('riutilizza il backup quando il file principale è corrotto', async () => {
  const datasetPath = '/data/flow-shell/atlas-snapshot.json';
  const corrupted = '{"overview": {"title": "bad"}';
  const fsMock = createMockFs({
    [datasetPath]: corrupted,
    [`${datasetPath}.bak`]: { overview: { title: 'Backup OK' } },
  });

  const store = createGenerationSnapshotStore({ datasetPath, fs: fsMock });
  const snapshot = await store.getSnapshot();
  assert.equal(snapshot.overview.title, 'Backup OK');

  await store.applyPatch({ overview: { title: 'Nuova versione' } });
  const persisted = JSON.parse(fsMock.__files.get(datasetPath).content);
  assert.equal(persisted.overview.title, 'Nuova versione');
});
