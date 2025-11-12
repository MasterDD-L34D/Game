const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, writeFile, rm } = require('node:fs/promises');
const path = require('node:path');
const { tmpdir } = require('node:os');

const { generateAtlasBundle } = require('../../scripts/mock/generate-demo-data.js');

async function createTempDir(prefix) {
  return mkdtemp(path.join(tmpdir(), prefix));
}

test('generate-demo-data aggregator enriches species from rollout matrix', async (t) => {
  const tempDir = await createTempDir('demo-data-');
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const telemetryPath = path.join(tempDir, 'telemetry.json');
  const generatorPath = path.join(tempDir, 'generator.json');
  const matrixPath = path.join(tempDir, 'matrix.csv');

  await writeFile(
    telemetryPath,
    JSON.stringify([
      {
        id: 'evt-02',
        event_timestamp: '2024-05-18T09:30:00Z',
        priority: 'medium',
        status: 'acknowledged',
      },
    ]),
    'utf8',
  );
  await writeFile(
    generatorPath,
    JSON.stringify({ status: 'success', metrics: { generationTimeMs: 200, speciesTotal: 6 } }),
    'utf8',
  );
  await writeFile(
    matrixPath,
    [
      'species_slug,legacy_default_slot_count,terraforming_max_slots,sentience_index,terraforming_band_slots',
      'nebula-alpha,4,5,T2,0;1;2',
    ].join('\n'),
    'utf8',
  );

  const atlas = await generateAtlasBundle({
    telemetryPath,
    generatorTelemetryPath: generatorPath,
    speciesMatrixPath: matrixPath,
    writeTargets: false,
  });

  const nebulaAlpha = (atlas.dataset?.species || []).find((entry) => entry.id === 'nebula-alpha');
  assert.ok(nebulaAlpha, 'Expected nebula-alpha species present');
  assert.equal(nebulaAlpha.sentienceIndex, 'T2');
  assert.equal(nebulaAlpha.legacy?.defaultSlotCount, 4);
  assert.equal(nebulaAlpha.legacy?.fallbackSlotCount, 5);
  assert.deepEqual(nebulaAlpha.legacy?.bandSlots, [0, 1, 2]);
  const distribution = atlas.telemetry?.incidents?.sentienceIndexDistribution || {};
  assert.equal(distribution.T2, 1);
  assert.ok(distribution.Unknown >= 1, 'Expected fallback bucket for species without rollout data');
});
