const assert = require('node:assert/strict');
const { mkdtemp, rm, mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { tmpdir } = require('node:os');
const express = require('express');
const test = require('node:test');
const request = require('supertest');

const { createNebulaRouter } = require('../../server/routes/nebula');
const { createNebulaTelemetryAggregator } = require('../../server/services/nebulaTelemetryAggregator');

function createTempDir(prefix) {
  return mkdtemp(path.join(tmpdir(), prefix));
}

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
      { id: 'wolf-02', name: 'Lupo Beta', readiness: 'Richiede validazione', telemetry: { coverage: 0.67 } },
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
    }),
  );

  const response = await request(app)
    .get('/nebula/atlas')
    .query({ since: '2024-05-17T00:00:00Z', limit: 2 })
    .expect(200);

  assert.equal(response.body.dataset.id, 'nebula-test');
  assert.equal(response.body.telemetry.summary.totalEvents, 2);
  assert.equal(response.body.telemetry.sample.length, 2);
  assert.equal(response.body.telemetry.state, 'live');
  assert.equal(response.body.generator.status, 'success');
  assert.ok(Array.isArray(response.body.orchestrator.events));
  assert.equal(response.body.orchestrator.events.length, 2);
  assert.equal(response.body.orchestrator.summary.errorCount, 1);
  assert.equal(response.body.orchestrator.summary.totalEntries, 2);
  assert.equal(response.body.orchestrator.summary.lastEventAt, '2024-05-18T09:15:00.000Z');

  const telemetryResponse = await request(app)
    .get('/nebula/atlas/telemetry')
    .query({ since: '2024-05-17T00:00:00Z', limit: 1 })
    .expect(200);

  assert.equal(telemetryResponse.body.summary.totalEvents, 2);
  assert.equal(telemetryResponse.body.sample.length, 1);
  assert.equal(telemetryResponse.body.state, 'live');

  const orchestratorResponse = await request(app)
    .get('/nebula/atlas/orchestrator')
    .query({ limit: 1 })
    .expect(200);

  assert.equal(orchestratorResponse.body.events.length, 1);
  assert.equal(orchestratorResponse.body.summary.errorCount, 1);
  assert.ok(orchestratorResponse.body.summary.lastEventAt);
});
