const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const request = require('supertest');

const { createApp } = require('../../server/app');
const { signJwt } = require('../../server/utils/jwt');

const SAMPLE_TRAIT = path.resolve(
  __dirname,
  '..',
  '..',
  'data',
  'traits',
  'metabolico',
  'circolazione_cooling_loop.json',
);

const AUTH_SECRET = 'test-secret';

function buildAuthToken(roles) {
  return signJwt({ sub: 'tester', roles }, AUTH_SECRET, { expiresIn: '1h' });
}

function createAuthenticatedApp() {
  const { app } = createApp({
    traits: {
      auth: {
        secret: AUTH_SECRET,
      },
    },
  });
  return app;
}

test('POST /api/traits/validate restituisce suggerimenti stile', async () => {
  const payload = JSON.parse(await fs.readFile(SAMPLE_TRAIT, 'utf8'));
  payload.label = 'Circolazione Cooling Loop';
  payload.tier = 't1';

  const app = createAuthenticatedApp();
  const token = buildAuthToken(['reviewer']);

  const response = await request(app)
    .post('/api/traits/validate')
    .set('Authorization', `Bearer ${token}`)
    .send({ payload })
    .expect(200);

  assert.equal(response.body.valid, true);
  assert.equal(Array.isArray(response.body.errors) ? response.body.errors.length : 0, 0);

  const suggestions = response.body.suggestions || [];
  assert.ok(suggestions.length >= 1, 'attesi suggerimenti dallo stile');

  const labelSuggestion = suggestions.find((item) => item.path === '/label');
  assert.ok(labelSuggestion, 'atteso suggerimento per label');
  assert.equal(labelSuggestion.severity, 'error');
  assert.match(labelSuggestion.message, /i18n/i);

  const tierSuggestion = suggestions.find((item) => item.path === '/tier');
  assert.ok(tierSuggestion, 'atteso suggerimento per tier');
  assert.match(tierSuggestion.message, /T1/);
});

test('POST /api/traits/validate segnala errori schema quando il payload è incompleto', async () => {
  const app = createAuthenticatedApp();
  const token = buildAuthToken(['reviewer']);

  const response = await request(app)
    .post('/api/traits/validate')
    .set('Authorization', `Bearer ${token}`)
    .send({ payload: { label: 'Trait incompleto' } })
    .expect(200);

  assert.equal(response.body.valid, false);
  assert.ok(Array.isArray(response.body.errors));
  assert.ok(response.body.errors.length > 0, 'attesi errori di validazione schema');
  assert.ok(Array.isArray(response.body.suggestions));
  const idSuggestion = response.body.suggestions.find((item) => item.path === '/id');
  assert.ok(idSuggestion, 'atteso suggerimento per id mancante');
});
