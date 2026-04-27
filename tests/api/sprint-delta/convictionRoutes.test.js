// Sprint δ Meta Systemic — Pattern 4 routes integration tests.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');

const { createConvictionRouter } = require('../../../apps/backend/routes/conviction');
const { _resetBallots } = require('../../../apps/backend/services/meta/convictionVoting');

function startTestServer(t) {
  _resetBallots();
  const app = express();
  app.use(express.json());
  app.use('/api', createConvictionRouter());
  const server = app.listen(0);
  const port = server.address().port;
  t.after(() => server.close());
  return { url: `http://127.0.0.1:${port}` };
}

function request(method, url, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method,
      headers: { 'content-type': 'application/json' },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let parsedBody = null;
        try {
          parsedBody = data ? JSON.parse(data) : null;
        } catch {
          parsedBody = data;
        }
        resolve({ status: res.statusCode, body: parsedBody });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

test('POST /api/v1/conviction/init creates ballot', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('POST', `${url}/api/v1/conviction/init`, {
    session_id: 's1',
    choices: [
      { choice_id: 'attack', vc_axis: 'T_F', vc_target: -0.8 },
      { choice_id: 'parley', vc_axis: 'T_F', vc_target: 0.8, is_status_quo: true },
    ],
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.session_id, 's1');
  assert.equal(res.body.ballot_size, 2);
});

test('POST /api/v1/conviction/init rejects when fewer than 2 choices', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('POST', `${url}/api/v1/conviction/init`, {
    session_id: 's2',
    choices: [{ choice_id: 'lonely' }],
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'choices_min_two_required');
});

test('POST /api/v1/conviction/vote casts and tallies', async (t) => {
  const { url } = startTestServer(t);
  await request('POST', `${url}/api/v1/conviction/init`, {
    session_id: 's3',
    choices: [
      { choice_id: 'a', vc_axis: 'T_F', vc_target: -0.5 },
      { choice_id: 'b', vc_axis: 'T_F', vc_target: 0.5 },
    ],
  });
  const vote = await request('POST', `${url}/api/v1/conviction/vote`, {
    session_id: 's3',
    player_id: 'p1',
    choice_id: 'a',
    vc_snapshot: { axes: { T_F: -0.5 } },
  });
  assert.equal(vote.status, 200);
  assert.equal(vote.body.vote.choice_id, 'a');
  const results = await request('GET', `${url}/api/v1/conviction/results?session_id=s3`);
  assert.equal(results.status, 200);
  assert.equal(results.body.winner_choice_id, 'a');
});

test('GET /api/v1/conviction/results — ballot not found returns 404', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('GET', `${url}/api/v1/conviction/results?session_id=missing`);
  assert.equal(res.status, 404);
});

test('POST /api/v1/conviction/vote — ballot not found returns 404', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('POST', `${url}/api/v1/conviction/vote`, {
    session_id: 'no_init',
    player_id: 'p1',
    choice_id: 'x',
    vc_snapshot: {},
  });
  assert.equal(res.status, 404);
});

test('POST /api/v1/conviction/close finalizes ballot', async (t) => {
  const { url } = startTestServer(t);
  await request('POST', `${url}/api/v1/conviction/init`, {
    session_id: 's_close',
    choices: [{ choice_id: 'a' }, { choice_id: 'b', is_status_quo: true }],
  });
  await request('POST', `${url}/api/v1/conviction/vote`, {
    session_id: 's_close',
    player_id: 'p1',
    choice_id: 'a',
    vc_snapshot: {},
  });
  const close = await request('POST', `${url}/api/v1/conviction/close`, {
    session_id: 's_close',
  });
  assert.equal(close.status, 200);
  assert.equal(close.body.winner_choice_id, 'a');
  const after = await request('GET', `${url}/api/v1/conviction/results?session_id=s_close`);
  assert.equal(after.status, 404);
});
