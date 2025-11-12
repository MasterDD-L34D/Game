const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, writeFile, mkdir, rm, readFile } = require('node:fs/promises');
const path = require('node:path');
const { tmpdir } = require('node:os');

const { runWithOptions } = require('../../tools/deploy/generateStatusReport.js');

async function createTempDir(prefix) {
  return mkdtemp(path.join(tmpdir(), prefix));
}

test('generateStatusReport applies species rollout matrix to nebula dataset', async (t) => {
  const tempDir = await createTempDir('status-report-');
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const statusPath = path.join(tempDir, 'status.json');
  const snapshotPath = path.join(tempDir, 'snapshot.json');
  const telemetryPath = path.join(tempDir, 'telemetry.json');
  const generatorPath = path.join(tempDir, 'generator.json');
  const traitBaselinePath = path.join(tempDir, 'trait-baseline.json');
  const orchestratorDir = path.join(tempDir, 'orchestrator');
  const matrixPath = path.join(tempDir, 'matrix.csv');

  await writeFile(
    snapshotPath,
    JSON.stringify({
      biomeSummary: { validated: 1, pending: 0 },
      encounterSummary: { variants: 1, warnings: 0, seeds: 1 },
      qualityRelease: { checks: { traits: { passed: 1, total: 1, conflicts: 0 } } },
    }),
    'utf8',
  );
  await writeFile(
    telemetryPath,
    JSON.stringify([
      {
        id: 'evt-01',
        event_timestamp: '2024-05-18T09:00:00Z',
        priority: 'high',
        status: 'open',
      },
    ]),
    'utf8',
  );
  await writeFile(
    generatorPath,
    JSON.stringify({ status: 'success', metrics: { generationTimeMs: 120, speciesTotal: 6 } }),
    'utf8',
  );
  await mkdir(orchestratorDir, { recursive: true });
  await writeFile(
    path.join(orchestratorDir, 'events.jsonl'),
    `${JSON.stringify({ timestamp: '2024-05-18T09:05:00Z', level: 'info', message: 'ready' })}\n`,
    'utf8',
  );
  await writeFile(
    traitBaselinePath,
    JSON.stringify({
      summary: {
        total_traits: 2,
        glossary_ok: 2,
        with_conflicts: 0,
        matrix_mismatch: 0,
        glossary_missing: 0,
      },
      generated_at: '2024-05-18T10:00:00Z',
    }),
    'utf8',
  );
  await writeFile(
    matrixPath,
    [
      'species_slug,legacy_default_slot_count,terraforming_max_slots,sentience_index,terraforming_band_slots',
      'nebula-alpha,2,3,T1,0;1',
    ].join('\n'),
    'utf8',
  );

  const result = await runWithOptions({
    status: statusPath,
    snapshot: snapshotPath,
    telemetry: telemetryPath,
    generatorTelemetry: generatorPath,
    traitBaseline: traitBaselinePath,
    orchestratorLogDir: orchestratorDir,
    speciesMatrix: matrixPath,
  });

  assert.ok(result);
  const persisted = JSON.parse(await readFile(statusPath, 'utf8'));
  const atlas = persisted?.telemetry?.nebula?.atlas;
  assert.ok(atlas, 'Nebula atlas payload is available');
  const nebulaAlpha = (atlas.dataset?.species || []).find((entry) => entry.id === 'nebula-alpha');
  assert.ok(nebulaAlpha, 'Expected species nebula-alpha in dataset');
  assert.equal(nebulaAlpha.sentienceIndex, 'T1');
  assert.equal(nebulaAlpha.legacy?.defaultSlotCount, 2);
  assert.equal(nebulaAlpha.legacy?.fallbackSlotCount, 3);
});
