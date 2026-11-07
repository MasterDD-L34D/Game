// Skiv-as-Monitor route integration — git-event-driven creature feed.

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const express = require('express');
const {
  createSkivRouter,
  renderAsciiCard,
  FALLBACK_STATE,
} = require('../../apps/backend/routes/skiv');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'skiv-route-test-'));
}

function buildApp({ statePath, feedPath, webhookSecret } = {}) {
  const app = express();
  app.use('/api', createSkivRouter({ statePath, feedPath, webhookSecret }));
  return app;
}

test('GET /api/skiv/status — missing state file → fallback payload', async () => {
  const dir = tmpDir();
  const app = buildApp({ statePath: path.join(dir, 'missing.json') });
  const r = await request(app).get('/api/skiv/status');
  assert.equal(r.status, 200);
  assert.equal(r.body.unit_id, 'skiv');
  assert.equal(r.body._fallback, true);
  assert.ok(r.body.gauges);
});

test('GET /api/skiv/status — reads seeded state JSON', async () => {
  const dir = tmpDir();
  const statePath = path.join(dir, 'state.json');
  const seed = { ...FALLBACK_STATE, level: 9, last_voice: 'Test voice', _fallback: false };
  delete seed._fallback;
  fs.writeFileSync(statePath, JSON.stringify(seed), 'utf8');
  const app = buildApp({ statePath });
  const r = await request(app).get('/api/skiv/status');
  assert.equal(r.status, 200);
  assert.equal(r.body.level, 9);
  assert.equal(r.body.last_voice, 'Test voice');
});

test('GET /api/skiv/feed — missing feed → empty entries 200', async () => {
  const dir = tmpDir();
  const app = buildApp({ feedPath: path.join(dir, 'missing.jsonl') });
  const r = await request(app).get('/api/skiv/feed');
  assert.equal(r.status, 200);
  assert.equal(r.body.count, 0);
  assert.deepEqual(r.body.entries, []);
});

test('GET /api/skiv/feed — limit clamp to 500', async () => {
  const dir = tmpDir();
  const feedPath = path.join(dir, 'feed.jsonl');
  // 700 entries.
  const lines = [];
  for (let i = 0; i < 700; i += 1) {
    lines.push(
      JSON.stringify({
        ts: '2026-04-25T00:00:00Z',
        event: { kind: 'pr_merged', number: i },
        voice: 'v',
      }),
    );
  }
  fs.writeFileSync(feedPath, lines.join('\n') + '\n', 'utf8');
  const app = buildApp({ feedPath });
  const r = await request(app).get('/api/skiv/feed?limit=9999');
  assert.equal(r.status, 200);
  assert.equal(r.body.count, 500);
});

test('GET /api/skiv/card — text/plain ASCII card with banner', async () => {
  const dir = tmpDir();
  const statePath = path.join(dir, 'state.json');
  fs.writeFileSync(statePath, JSON.stringify(FALLBACK_STATE), 'utf8');
  const app = buildApp({ statePath, feedPath: path.join(dir, 'missing.jsonl') });
  const r = await request(app).get('/api/skiv/card');
  assert.equal(r.status, 200);
  assert.match(r.headers['content-type'], /text\/plain/);
  assert.match(r.text, /S K I V/);
  assert.match(r.text, /Sabbia segue/);
});

test('renderAsciiCard — handles malformed state gracefully', () => {
  const out = renderAsciiCard({});
  assert.match(out, /S K I V/);
  assert.match(out, /Sabbia segue/);
});

test('POST /api/skiv/webhook — disabled when secret unset', async () => {
  const app = buildApp({ webhookSecret: '' });
  const r = await request(app).post('/api/skiv/webhook').send({ action: 'opened' });
  assert.equal(r.status, 503);
  assert.equal(r.body.error, 'webhook_disabled');
});

test('POST /api/skiv/webhook — invalid signature → 401', async () => {
  const app = buildApp({ webhookSecret: 'topsecret' });
  const r = await request(app)
    .post('/api/skiv/webhook')
    .set('X-Hub-Signature-256', 'sha256=deadbeef')
    .set('X-GitHub-Event', 'pull_request')
    .send({ action: 'opened' });
  assert.equal(r.status, 401);
  assert.equal(r.body.error, 'invalid_signature');
});

test('POST /api/skiv/webhook — valid HMAC → 200 ok', async () => {
  const crypto = require('node:crypto');
  const secret = 'topsecret';
  const payload = { action: 'opened', number: 9001 };
  const raw = JSON.stringify(payload);
  const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const app = buildApp({ webhookSecret: secret });
  const r = await request(app)
    .post('/api/skiv/webhook')
    .set('X-Hub-Signature-256', sig)
    .set('X-GitHub-Event', 'pull_request')
    .set('Content-Type', 'application/json')
    .send(raw);
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.event_type, 'pull_request');
});

test('POST /api/skiv/webhook — pull_request merged → appends feed entry', async () => {
  const crypto = require('node:crypto');
  const secret = 'topsecret';
  const dir = tmpDir();
  const feedPath = path.join(dir, 'feed.jsonl');
  const payload = {
    action: 'closed',
    pull_request: {
      number: 9999,
      merged: true,
      merged_at: '2026-04-25T22:00:00Z',
      title: 'feat(p2): test webhook live',
      labels: [{ name: 'feat/p2-test' }],
      html_url: 'https://example/pr/9999',
      user: { login: 'webhook-test' },
    },
  };
  const raw = JSON.stringify(payload);
  const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const app = buildApp({ webhookSecret: secret, feedPath });
  const r = await request(app)
    .post('/api/skiv/webhook')
    .set('X-Hub-Signature-256', sig)
    .set('X-GitHub-Event', 'pull_request')
    .set('Content-Type', 'application/json')
    .send(raw);
  assert.equal(r.status, 200);
  assert.equal(r.body.processed, true);
  assert.equal(r.body.entry_id, 'pr-9999');
  // Wait briefly for async append.
  await new Promise((res) => setTimeout(res, 50));
  const feedContent = fs.readFileSync(feedPath, 'utf8');
  const entry = JSON.parse(feedContent.trim().split('\n').pop());
  assert.equal(entry.event.kind, 'pr_merged');
  assert.equal(entry.event.number, 9999);
  assert.equal(entry.category, 'feat_p2');
  assert.equal(entry.source, 'webhook_live');
});

test('POST /api/skiv/webhook — handler field reports octokit when lib loaded', async () => {
  const crypto = require('node:crypto');
  const secret = 'topsecret';
  const dir = tmpDir();
  const feedPath = path.join(dir, 'feed.jsonl');
  const payload = {
    action: 'closed',
    pull_request: {
      number: 8001,
      merged: true,
      merged_at: '2026-04-26T10:00:00Z',
      title: 'fix: octokit handler verify',
      labels: [],
      html_url: 'https://example/pr/8001',
      user: { login: 'octokit-test' },
    },
  };
  const raw = JSON.stringify(payload);
  const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const app = buildApp({ webhookSecret: secret, feedPath });
  const r = await request(app)
    .post('/api/skiv/webhook')
    .set('X-Hub-Signature-256', sig)
    .set('X-GitHub-Event', 'pull_request')
    .set('Content-Type', 'application/json')
    .send(raw);
  assert.equal(r.status, 200);
  assert.equal(r.body.processed, true);
  // Handler should be 'octokit' if @octokit/webhooks loaded, else 'inline'.
  assert.match(r.body.handler, /^(octokit|inline)$/);
});

test('POST /api/skiv/webhook — non-actionable event_type returns processed:false', async () => {
  const crypto = require('node:crypto');
  const secret = 'topsecret';
  const payload = { action: 'starred' };
  const raw = JSON.stringify(payload);
  const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const app = buildApp({ webhookSecret: secret });
  const r = await request(app)
    .post('/api/skiv/webhook')
    .set('X-Hub-Signature-256', sig)
    .set('X-GitHub-Event', 'star')
    .set('Content-Type', 'application/json')
    .send(raw);
  assert.equal(r.status, 200);
  assert.equal(r.body.processed, false);
});
