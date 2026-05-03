// Sprint R.1 — Lobby REST returns signed JWTs (HS256) on create + join.
//
// Backward-compat: response field names unchanged (host_token / player_token).
// Verifies the value is a valid JWT bearing canonical claims.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

// Pin secret BEFORE app load so signed tokens use it.
process.env.AUTH_SECRET = 'test-secret-must-be-at-least-16-chars-long';

const { createApp } = require('../../apps/backend/app');
const { verifyPlayerToken } = require('../../apps/backend/services/network/jwtAuth');

function newApp() {
  return createApp({ databasePath: null });
}

test('POST /api/lobby/create returns JWT host_token bearing canonical claims', async () => {
  const { app, close } = newApp();
  try {
    const res = await request(app)
      .post('/api/lobby/create')
      .send({ host_name: 'Alice' })
      .expect(201);
    assert.equal(typeof res.body.host_token, 'string');
    // JWT format: 3 base64url segments separated by dots.
    assert.match(res.body.host_token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    const claims = verifyPlayerToken(res.body.host_token);
    assert.equal(claims.player_id, res.body.host_id);
    assert.equal(claims.room_code, res.body.code);
    assert.equal(claims.role, 'host');
    assert.ok(claims.exp > claims.iat);
  } finally {
    await close();
  }
});

test('POST /api/lobby/join returns JWT player_token bearing canonical claims', async () => {
  const { app, close } = newApp();
  try {
    const create = await request(app)
      .post('/api/lobby/create')
      .send({ host_name: 'Alice' })
      .expect(201);
    const join = await request(app)
      .post('/api/lobby/join')
      .send({ code: create.body.code, player_name: 'Bob' })
      .expect(201);
    assert.equal(typeof join.body.player_token, 'string');
    assert.match(join.body.player_token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    const claims = verifyPlayerToken(join.body.player_token);
    assert.equal(claims.player_id, join.body.player_id);
    assert.equal(claims.room_code, create.body.code);
    assert.equal(claims.role, 'player');
  } finally {
    await close();
  }
});

test('POST /api/lobby/close still accepts JWT host_token (string-equality legacy path)', async () => {
  const { app, close } = newApp();
  try {
    const create = await request(app)
      .post('/api/lobby/create')
      .send({ host_name: 'Alice' })
      .expect(201);
    await request(app)
      .post('/api/lobby/close')
      .send({ code: create.body.code, host_token: create.body.host_token })
      .expect(200);
  } finally {
    await close();
  }
});

test('POST /api/lobby/close 403 on non-matching token', async () => {
  const { app, close } = newApp();
  try {
    const create = await request(app)
      .post('/api/lobby/create')
      .send({ host_name: 'Alice' })
      .expect(201);
    await request(app)
      .post('/api/lobby/close')
      .send({ code: create.body.code, host_token: 'NOT-A-VALID-JWT' })
      .expect(403);
  } finally {
    await close();
  }
});
