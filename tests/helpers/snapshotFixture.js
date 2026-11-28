// Helper per i test API che sollecitano /api/v1/generation/species|biomes.
// Quegli endpoint trigggerano persistRuntime -> applyPatch -> rename del
// file dataset reale (`data/flow-shell/atlas-snapshot.json`), lasciando il
// working tree dirty dopo ogni `npm run test:api`. Vedi issue #1341.
//
// Uso:
//   const { createIsolatedSnapshotStore } = require('../helpers/snapshotFixture');
//   const handle = createApp({ generationSnapshot: { store: createIsolatedSnapshotStore() } });
//
// Lo store ritornato e' un vero `createGenerationSnapshotStore` ma backed
// dal mockFs in-memory: tutte le read/write avvengono su una mappa interna,
// nessuna I/O su disco, e la dir `data/flow-shell/` resta intoccata.

const fs = require('node:fs');
const path = require('node:path');

const { createMockFs } = require('./mockFs');
const {
  createGenerationSnapshotStore,
} = require('../../apps/backend/services/generationSnapshotStore');

const REAL_SNAPSHOT_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'data',
  'flow-shell',
  'atlas-snapshot.json',
);

let cachedSnapshotJson = null;

function loadSnapshotJson() {
  if (cachedSnapshotJson === null) {
    cachedSnapshotJson = fs.readFileSync(REAL_SNAPSHOT_PATH, 'utf8');
  }
  return cachedSnapshotJson;
}

function createIsolatedSnapshotStore() {
  const datasetPath = REAL_SNAPSHOT_PATH;
  const seed = { [datasetPath]: loadSnapshotJson() };
  const mockFs = createMockFs(seed);
  return createGenerationSnapshotStore({ datasetPath, fs: mockFs });
}

module.exports = { createIsolatedSnapshotStore };
