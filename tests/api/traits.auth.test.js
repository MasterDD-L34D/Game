const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs/promises');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');
const { signJwt } = require('../../apps/backend/utils/jwt');

const AUTH_SECRET = 'test-secret';

function createToken(roles) {
  return signJwt({ sub: 'test-user', roles }, AUTH_SECRET, { expiresIn: '1h' });
}

function createAppWithOptions(options = {}) {
  const { app } = createApp({
    traits: {
      auth: {
        secret: AUTH_SECRET,
        ...(options.auth || {}),
      },
      ...(options.traits || {}),
    },
  });
  return app;
}

test('POST /api/traits/validate richiede un token JWT', async () => {
  const app = createAppWithOptions();
  await request(app).post('/api/traits/validate').send({ payload: {} }).expect(401);
});

test('POST /api/traits/validate rifiuta ruoli non autorizzati', async () => {
  const app = createAppWithOptions();
  const token = createToken(['viewer']);
  await request(app)
    .post('/api/traits/validate')
    .set('Authorization', `Bearer ${token}`)
    .send({ payload: {} })
    .expect(403);
});

test('DELETE /api/traits/:traitId richiede ruolo admin e registra audit', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'traits-audit-'));
  const logPath = path.join(tmpDir, 'audit.log');
  const calls = [];
  const repository = {
    deleteTrait: async (traitId) => {
      calls.push(traitId);
      return { meta: { id: traitId } };
    },
  };
  const app = createAppWithOptions({
    auth: { audit: { filePath: logPath } },
    traits: { repository },
  });
  const token = createToken(['admin']);

  await request(app)
    .delete('/api/traits/alpha_trait')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.deepEqual(calls, ['alpha_trait']);
  const content = await fs.readFile(logPath, 'utf8');
  const entries = content
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(entries.length, 1);
  assert.equal(entries[0].action, 'trait.delete');
  assert.equal(entries[0].user, 'test-user');
  assert.deepEqual(entries[0].roles, ['admin']);
  assert.equal(entries[0].metadata.traitId, 'alpha_trait');
  assert.ok(entries[0].timestamp, 'timestamp mancante');
});
