const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, writeFile, rm } = require('node:fs/promises');
const path = require('node:path');
const { tmpdir } = require('node:os');

const { generateAtlasBundle } = require('../../scripts/mock/generate-demo-data.js');

test('generateAtlasBundle applica il rollout Nebula su specie demo', async (t) => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'demo-atlas-'));
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const telemetryPath = path.join(tempDir, 'telemetry.json');
  await writeFile(telemetryPath, '[]\n', 'utf8');
  const generatorPath = path.join(tempDir, 'generator.json');
  await writeFile(generatorPath, '{}\n', 'utf8');
  const speciesMatrixPath = path.join(tempDir, 'species_matrix.csv');
  const matrixRows = [
    'species_slug,legacy_default_slot_count,terraforming_max_slots,sentience_index,terraforming_band_slots',
    'wolf-01,0,3,T1,0;1;2',
    'wolf-02,1,2,T0,0;1',
  ];
  await writeFile(speciesMatrixPath, `${matrixRows.join('\n')}\n`, 'utf8');

  const atlasTarget = path.join(tempDir, 'atlas.json');
  const telemetryTarget = path.join(tempDir, 'atlas-telemetry.json');

  const dataset = {
    id: 'nebula-demo',
    title: 'Nebula Demo Dataset',
    species: [
      { id: 'wolf-01', name: 'Lupo Alfa' },
      { id: 'wolf-02', name: 'Lupo Beta' },
    ],
  };

  const atlas = await generateAtlasBundle({
    dataset,
    telemetryPath,
    generatorTelemetryPath: generatorPath,
    speciesMatrixPath,
    atlasTarget,
    telemetryTarget,
  });

  const first = atlas.dataset?.species?.find((entry) => entry.id === 'wolf-01');
  const second = atlas.dataset?.species?.find((entry) => entry.id === 'wolf-02');

  assert.ok(first, 'la specie wolf-01 deve essere presente nel bundle');
  assert.equal(first.sentienceIndex, 'T1');
  assert.ok(first.legacy, 'la specie wolf-01 deve includere dati legacy');
  assert.equal(first.legacy.defaultSlotCount, 3);
  assert.equal(first.legacy.fallbackSlotCount, 3);

  assert.ok(second, 'la specie wolf-02 deve essere presente nel bundle');
  assert.equal(second.sentienceIndex, 'T0');
  assert.ok(second.legacy, 'la specie wolf-02 deve includere dati legacy');
  assert.equal(second.legacy.fallbackSlotCount, 2);
});
