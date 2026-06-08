// SPEC-Q M-3 -- mutation_lineage emitter wiring (offspring-birth path).
//
// POST /api/v1/lineage/offspring-ritual with a campaign_id appends a
// mutation_lineage chronicle event (best-effort). Without campaign_id it stays
// dormant. The legacy-death path (session.js kill-propagate) reuses the same
// emitMutationLineage, unit-tested in tests/services/chronicleEmitters.test.js.
//
// The router is mounted standalone with a tmp chronicle baseDir (prod plugin-load
// passes no opts -> chronicleStore default baseDir, which is correct for prod).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const request = require('supertest');

const { createLineageRouter } = require('../../apps/backend/routes/lineage');
const { getChronicle } = require('../../apps/backend/services/chronicle/chronicleStore');
const offspringStore = require('../../apps/backend/services/lineage/offspringStore');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mut-lin-wire-'));
}

function appWith(baseDir) {
  offspringStore._resetMemory();
  const app = express();
  app.use(express.json());
  app.use('/api/v1/lineage', createLineageRouter({ chronicle: { baseDir } }));
  return app;
}

test('offspring-ritual with campaign_id -> mutation_lineage chronicle event (offspring_birth)', async () => {
  const baseDir = tmp();
  const app = appWith(baseDir);
  const res = await request(app)
    .post('/api/v1/lineage/offspring-ritual')
    .send({
      session_id: 'sess-1',
      parent_a_id: 'a',
      parent_b_id: 'b',
      mutations: ['armatura_residua', 'cuore_doppio'],
      campaign_id: 'run_branco_x',
    })
    .expect(201);

  const chron = getChronicle('run_branco_x', { baseDir });
  assert.equal(chron.length, 1);
  assert.equal(chron[0].type, 'mutation_lineage');
  assert.equal(chron[0].tier, 'public');
  assert.equal(chron[0].payload.source, 'offspring_birth');
  assert.deepEqual(chron[0].payload.mutations, ['armatura_residua', 'cuore_doppio']);
  assert.equal(chron[0].payload.count, 2);
  assert.equal(chron[0].payload.lineage_id, res.body.lineage_id);
});

test('offspring-ritual WITHOUT campaign_id -> dormant (no chronicle written)', async () => {
  const baseDir = tmp();
  const app = appWith(baseDir);
  await request(app)
    .post('/api/v1/lineage/offspring-ritual')
    .send({
      session_id: 'sess-2',
      parent_a_id: 'a',
      parent_b_id: 'b',
      mutations: ['armatura_residua'],
    })
    .expect(201);
  assert.equal(fs.readdirSync(baseDir).length, 0);
});
