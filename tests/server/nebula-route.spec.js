const assert = require('node:assert/strict');
const { mkdtemp, rm, mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { tmpdir } = require('node:os');
const express = require('express');
const test = require('node:test');
const request = require('supertest');

const { createNebulaRouter } = require('../../server/routes/nebula');
const {
  createNebulaTelemetryAggregator,
} = require('../../server/services/nebulaTelemetryAggregator');

function createTempDir(prefix) {
  return mkdtemp(path.join(tmpdir(), prefix));
}

const testRolloutFlag = {
  description: 'Flag di test Nebula Atlas',
  default: false,
  rollout: {
    phase: 'canary',
    stageGate: 'nebula-pilot-go',
    start: '2024-01-01',
    cohorts: ['nebula-alpha', 'nebula-beta', 'qa-delta'],
  },
};

test('nebula router aggrega dataset, telemetria e orchestrator con filtri e caching', async (t) => {
  const tempDir = await createTempDir('nebula-route-');
  const logsDir = path.join(tempDir, 'logs');
  await mkdir(logsDir, { recursive: true });
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const telemetryPath = path.join(tempDir, 'qa-telemetry.json');
  const generatorPath = path.join(tempDir, 'generator.json');
  const orchestratorLog = path.join(logsDir, 'orchestrator.jsonl');
  const speciesMatrixPath = path.join(tempDir, 'species_matrix.csv');

  const telemetryRecords = [
    {
      id: 'evt-001',
      event_timestamp: '2024-05-18T09:00:00Z',
      priority: 'high',
      status: 'open',
    },
    {
      id: 'evt-002',
      event_timestamp: '2024-05-17T11:00:00Z',
      priority: 'low',
      status: 'closed',
    },
    {
      id: 'evt-003',
      event_timestamp: '2024-05-16T18:30:00Z',
      priority: 'medium',
      status: 'acknowledged',
    },
  ];
  await writeFile(telemetryPath, `${JSON.stringify(telemetryRecords)}\n`, 'utf8');

  const generatorProfile = {
    status: 'success',
    metrics: {
      generation_time_ms: 420,
      species_total: 5,
      enriched_species: 3,
      event_total: 4,
    },
    generated_at: '2024-05-18T09:10:00Z',
  };
  await writeFile(generatorPath, `${JSON.stringify(generatorProfile)}\n`, 'utf8');

  const matrixRows = [
    'species_slug,legacy_default_slot_count,terraforming_max_slots,sentience_index,terraforming_band_slots',
    'wolf-01,0,3,T1,0;1;2',
    'wolf-02,0,2,T0,0;1',
  ];
  await writeFile(speciesMatrixPath, `${matrixRows.join('\n')}\n`, 'utf8');

  const orchestratorLines = [
    { timestamp: '2024-05-18T09:05:00Z', level: 'info', message: 'bootstrap orchestrator' },
    { timestamp: '2024-05-18T09:15:00Z', level: 'error', message: 'workflow failure' },
    { timestamp: '2024-05-16T20:00:00Z', level: 'warn', message: 'retry scheduled' },
  ]
    .map((entry) => JSON.stringify(entry))
    .join('\n');
  await writeFile(orchestratorLog, `${orchestratorLines}\n`, 'utf8');

  const staticDataset = {
    id: 'nebula-test',
    title: 'Nebula Test Dataset',
    summary: 'Dataset di test per il router Nebula.',
    species: [
      { id: 'wolf-01', name: 'Lupo Alfa', readiness: 'Pronto', telemetry: { coverage: 0.82 } },
      {
        id: 'wolf-02',
        name: 'Lupo Beta',
        readiness: 'Richiede validazione',
        telemetry: { coverage: 0.67 },
      },
    ],
  };

  const aggregator = createNebulaTelemetryAggregator({
    telemetryPath,
    generatorTelemetryPath: generatorPath,
    orchestrator: {
      logDir: logsDir,
      filePattern: '*.jsonl',
      maxEvents: 5,
    },
    telemetry: {
      defaultLimit: 5,
      timelineDays: 7,
    },
    cacheTTL: 5_000,
    staticDataset,
    speciesMatrixPath,
  });

  const app = express();
  app.use(
    '/nebula',
    createNebulaRouter({
      aggregator,
      config: {
        cache: { ttlMs: 5_000 },
        telemetry: { defaultLimit: 5, timelineDays: 7 },
        orchestrator: { maxEvents: 5 },
      },
      rollout: { flag: testRolloutFlag },
    }),
  );

  const rolloutQuery = { cohort: 'nebula-alpha', stageGate: 'nebula-pilot-go' };

  const response = await request(app)
    .get('/nebula/atlas')
    .query({ since: '2024-05-17T00:00:00Z', limit: 2, ...rolloutQuery })
    .expect(200);

  assert.equal(response.headers['x-nebula-rollout-state'], 'enabled');
  assert.equal(response.headers['x-nebula-rollout-reason'], 'cohort_enabled');
  assert.equal(response.headers['x-nebula-rollout-stage-gate'], 'nebula-pilot-go');
  assert.equal(response.headers['x-nebula-rollout-cohort'], 'nebula-alpha');
  assert.equal(response.body.dataset.id, 'nebula-test');
  assert.equal(response.body.telemetry.summary.totalEvents, 2);
  assert.equal(response.body.telemetry.sample.length, 2);
  assert.equal(response.body.telemetry.state, 'live');
  assert.deepEqual(response.body.telemetry.incidents.sentienceIndexDistribution, { T0: 1, T1: 1 });
  assert.equal(response.body.generator.status, 'success');
  assert.ok(Array.isArray(response.body.orchestrator.events));
  assert.equal(response.body.orchestrator.events.length, 2);
  assert.equal(response.body.orchestrator.summary.errorCount, 1);
  assert.equal(response.body.orchestrator.summary.totalEntries, 2);
  assert.equal(response.body.orchestrator.summary.lastEventAt, '2024-05-18T09:15:00.000Z');
  assert.equal(response.body.dataset.species[0].legacy.defaultSlotCount, 3);
  assert.equal(response.body.dataset.species[0].legacy.fallbackSlotCount, 3);
  assert.equal(response.body.dataset.species[0].sentienceIndex, 'T1');
  assert.equal(response.body.dataset.species[1].legacy.defaultSlotCount, 2);
  assert.equal(response.body.dataset.species[1].sentienceIndex, 'T0');

  const telemetryResponse = await request(app)
    .get('/nebula/atlas/telemetry')
    .query({ since: '2024-05-17T00:00:00Z', limit: 1, ...rolloutQuery })
    .expect(200);

  assert.equal(telemetryResponse.headers['x-nebula-rollout-state'], 'enabled');
  assert.equal(telemetryResponse.headers['x-nebula-rollout-reason'], 'cohort_enabled');
  assert.equal(telemetryResponse.body.summary.totalEvents, 2);
  assert.equal(telemetryResponse.body.sample.length, 1);
  assert.equal(telemetryResponse.body.state, 'live');
  assert.deepEqual(telemetryResponse.body.incidents.sentienceIndexDistribution, { T0: 1, T1: 1 });

  const orchestratorResponse = await request(app)
    .get('/nebula/atlas/orchestrator')
    .query({ limit: 1, ...rolloutQuery })
    .expect(200);

  assert.equal(orchestratorResponse.headers['x-nebula-rollout-state'], 'enabled');
  assert.equal(orchestratorResponse.headers['x-nebula-rollout-reason'], 'cohort_enabled');
  assert.equal(orchestratorResponse.body.events.length, 1);
  assert.equal(orchestratorResponse.body.summary.errorCount, 1);
  assert.ok(orchestratorResponse.body.summary.lastEventAt);
});

test('nebula router usa fallback statico quando il rollout non supera lo stage gate', async (t) => {
  const tempDir = await createTempDir('nebula-route-fallback-');
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const aggregator = createNebulaTelemetryAggregator({
    telemetryPath: path.join(tempDir, 'telemetry.json'),
    generatorTelemetryPath: path.join(tempDir, 'generator.json'),
    orchestrator: { logDir: path.join(tempDir, 'orchestrator') },
  });

  const app = express();
  app.use(
    '/nebula',
    createNebulaRouter({
      aggregator,
      config: {
        cache: { ttlMs: 5_000 },
        telemetry: { defaultLimit: 5, timelineDays: 7 },
        orchestrator: { maxEvents: 5 },
      },
      rollout: { flag: testRolloutFlag },
    }),
  );

  const datasetResponse = await request(app)
    .get('/nebula/atlas')
    .query({ cohort: 'nebula-alpha' })
    .expect(200);

  assert.equal(datasetResponse.headers['x-nebula-rollout-state'], 'disabled');
  assert.equal(datasetResponse.headers['x-nebula-rollout-reason'], 'stage_gate_required');
  assert.equal(datasetResponse.headers['x-nebula-rollout-stage-gate'], 'nebula-pilot-go');

  const telemetryResponse = await request(app)
    .get('/nebula/atlas/telemetry')
    .query({ cohort: 'nebula-alpha' })
    .expect(200);

  assert.equal(telemetryResponse.headers['x-nebula-rollout-state'], 'disabled');
  assert.equal(telemetryResponse.headers['x-nebula-rollout-reason'], 'stage_gate_required');

  const orchestratorResponse = await request(app)
    .get('/nebula/atlas/orchestrator')
    .query({ cohort: 'nebula-alpha' })
    .expect(404);

  assert.equal(orchestratorResponse.headers['x-nebula-rollout-state'], 'disabled');
  assert.equal(orchestratorResponse.headers['x-nebula-rollout-reason'], 'stage_gate_required');
  assert.equal(
    orchestratorResponse.body.error,
    'Telemetria orchestrator non disponibile per rollout Nebula',
  );
});
