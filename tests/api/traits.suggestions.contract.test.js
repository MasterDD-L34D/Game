// ADR-2026-05-29 TKT-BR-08 -- GET /api/traits/suggestions contract guard.
//
// Locks the ERMES suggestions read endpoint invariants:
//   1. reports dir absent -> 200 empty contract (schema + note, suggestions []).
//   2. reports dir present but no *-ermes-suggestions.json -> 200 empty contract.
//   3. latest report served (mtime descending) + ETag header W/"mtime-size".
//   4. If-None-Match matching ETag -> 304 (no body).
//   5. role gate: reviewer/editor/admin allowed, viewer rejected (403).
//
// Test runner: node:test (run-test-api.cjs glob tests/api/*.test.js).
// suggestionsDir seam (options.suggestionsDir) keeps fixtures in os.tmpdir,
// no pollution of repo-root reports/traits.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const express = require('express');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createTraitRouter } = require('../../apps/backend/routes/traits');
const { signJwt } = require('../../apps/backend/utils/jwt');

const AUTH_SECRET = 'test-secret';

function createToken(roles) {
  return signJwt({ sub: 'suggestions-tester', roles }, AUTH_SECRET, { expiresIn: '1h' });
}

function createApp(overrides = {}) {
  const router = createTraitRouter({
    repository: {},
    auth: { secret: AUTH_SECRET },
    ...overrides,
  });
  const app = express();
  app.use(express.json());
  app.use('/api/traits', router);
  return app;
}

function mkReportsDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ermes-suggestions-'));
}

function writeReport(dir, name, payload, mtimeEpochSec) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, JSON.stringify(payload));
  if (typeof mtimeEpochSec === 'number') {
    fs.utimesSync(p, mtimeEpochSec, mtimeEpochSec);
  }
  return p;
}

test('GET /suggestions -> 200 empty contract when reports dir absent', async () => {
  const absent = path.join(os.tmpdir(), `ermes-absent-${Date.now()}`);
  const app = createApp({ suggestionsDir: absent });
  const token = createToken(['reviewer']);

  const res = await request(app)
    .get('/api/traits/suggestions')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(res.body.schema, 'ermes_trait_suggestion');
  assert.equal(res.body.schema_version, '1.0.0');
  assert.deepEqual(res.body.suggestions, []);
  assert.ok(typeof res.body.note === 'string' && res.body.note.length > 0);
});

test('GET /suggestions -> 200 empty contract when dir present but no report files', async () => {
  const dir = mkReportsDir();
  try {
    fs.writeFileSync(path.join(dir, 'unrelated.json'), '{}');
    const app = createApp({ suggestionsDir: dir });
    const token = createToken(['reviewer']);

    const res = await request(app)
      .get('/api/traits/suggestions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    assert.equal(res.body.schema_version, '1.0.0');
    assert.deepEqual(res.body.suggestions, []);
    assert.match(res.body.note, /nessun report/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('GET /suggestions -> 200 latest report + ETag header', async () => {
  const dir = mkReportsDir();
  try {
    writeReport(
      dir,
      '2026-05-28-ermes-suggestions.json',
      { schema_version: '1.0.0', suggestions: [{ trait_id: 'old' }] },
      1000000,
    );
    writeReport(
      dir,
      '2026-05-29-ermes-suggestions.json',
      {
        schema: 'ermes_trait_suggestion',
        schema_version: '1.0.0',
        suggestions: [{ trait_id: 'fresh', biome_id: 'savana', kind: 'extinction_risk_warning' }],
      },
      2000000,
    );
    const app = createApp({ suggestionsDir: dir });
    const token = createToken(['editor']);

    const res = await request(app)
      .get('/api/traits/suggestions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    assert.equal(res.body.suggestions.length, 1);
    assert.equal(res.body.suggestions[0].trait_id, 'fresh');
    assert.match(res.headers.etag, /^W\/"\d+-\d+"$/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('GET /suggestions -> 304 when If-None-Match matches ETag', async () => {
  const dir = mkReportsDir();
  try {
    writeReport(
      dir,
      '2026-05-29-ermes-suggestions.json',
      { schema_version: '1.0.0', suggestions: [] },
      2000000,
    );
    const app = createApp({ suggestionsDir: dir });
    const token = createToken(['reviewer']);

    const first = await request(app)
      .get('/api/traits/suggestions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const etag = first.headers.etag;
    assert.ok(etag, 'first response must expose ETag');

    await request(app)
      .get('/api/traits/suggestions')
      .set('Authorization', `Bearer ${token}`)
      .set('If-None-Match', etag)
      .expect(304);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('GET /suggestions -> 403 for viewer role', async () => {
  const dir = mkReportsDir();
  try {
    const app = createApp({ suggestionsDir: dir });
    const token = createToken(['viewer']);
    await request(app)
      .get('/api/traits/suggestions')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
