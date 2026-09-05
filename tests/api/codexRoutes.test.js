// Bundle B.3 — Tunic decipher Codex pages route tests.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const codexState = require('../../apps/backend/services/codex/codexState');

function freshSid() {
  return `test_codex_${Math.random().toString(36).slice(2, 10)}`;
}

test('codex: GET /pages registry ritorna ≥5 pages with deciphered flag', async (t) => {
  codexState._resetAll();
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = freshSid();
  const r = await request(app).get('/api/v1/codex/pages').query({ session_id: sid });
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.pages), 'pages array');
  assert.ok(r.body.total >= 5, `expected ≥5 pages, got ${r.body.total}`);
  // Tutorial sempre deciphered
  const tut = r.body.pages.find((p) => p.id === 'codex_tutorial_intro');
  assert.ok(tut, 'tutorial page presente');
  assert.equal(tut.deciphered, true, 'tutorial sempre decifrato');
  // Biome page non-deciphered di default
  const savana = r.body.pages.find((p) => p.id === 'codex_biome_savana');
  assert.ok(savana);
  assert.equal(savana.deciphered, false);
  assert.ok(savana.decipher_hint, 'hint visibile su pagina blurred');
});

test('codex: POST /decipher kill_species marks page deciphered', async (t) => {
  codexState._resetAll();
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = freshSid();
  const r = await request(app)
    .post('/api/v1/codex/decipher')
    .send({
      session_id: sid,
      page_id: 'codex_species_lupo_pianura',
      trigger_data: { species_id: 'lupo_pianura' },
    });
  assert.equal(r.status, 200);
  assert.equal(r.body.deciphered, true);
  assert.equal(r.body.newly_added, true);
  assert.ok(r.body.content.includes('Canis vaganensis'), 'clear content esposto');
});

test('codex: POST /decipher con trigger sbagliato → 409', async (t) => {
  codexState._resetAll();
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = freshSid();
  const r = await request(app)
    .post('/api/v1/codex/decipher')
    .send({
      session_id: sid,
      page_id: 'codex_biome_savana',
      // Wrong trigger: biome_id mismatch
      trigger_data: { biome_id: 'caverna' },
    });
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'TRIGGER_MISMATCH');
  assert.ok(r.body.expected, 'expected trigger esposto in error');
});

test('codex: persistence cross-call (decipher poi GET ritorna deciphered)', async (t) => {
  codexState._resetAll();
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = freshSid();
  // Step 1: decipher savana via enter_biome
  const d = await request(app)
    .post('/api/v1/codex/decipher')
    .send({
      session_id: sid,
      page_id: 'codex_biome_savana',
      trigger_data: { biome_id: 'savana' },
    });
  assert.equal(d.status, 200);
  // Step 2: GET pages, savana deve essere deciphered
  const g = await request(app).get('/api/v1/codex/pages').query({ session_id: sid });
  assert.equal(g.status, 200);
  const savana = g.body.pages.find((p) => p.id === 'codex_biome_savana');
  assert.equal(savana.deciphered, true);
  assert.ok(savana.content.includes('insolazione'));
  // Other session = isolated state
  const sid2 = freshSid();
  const g2 = await request(app).get('/api/v1/codex/pages').query({ session_id: sid2 });
  const savana2 = g2.body.pages.find((p) => p.id === 'codex_biome_savana');
  assert.equal(savana2.deciphered, false, 'session isolation');
});

test('codex: GET /pages 400 se session_id mancante', async (t) => {
  codexState._resetAll();
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const r = await request(app).get('/api/v1/codex/pages');
  assert.equal(r.status, 400);
  assert.match(r.body.error, /session_id/);
});

test('codex: POST /decipher 404 se page_id inesistente', async (t) => {
  codexState._resetAll();
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const r = await request(app)
    .post('/api/v1/codex/decipher')
    .send({ session_id: freshSid(), page_id: 'codex_nonexistent_xyz', trigger_data: {} });
  assert.equal(r.status, 404);
});

test('codex: idempotente — re-decipher stessa page → newly_added false', async (t) => {
  codexState._resetAll();
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = freshSid();
  await request(app)
    .post('/api/v1/codex/decipher')
    .send({
      session_id: sid,
      page_id: 'codex_biome_caverna',
      trigger_data: { biome_id: 'caverna' },
    });
  const r2 = await request(app)
    .post('/api/v1/codex/decipher')
    .send({
      session_id: sid,
      page_id: 'codex_biome_caverna',
      trigger_data: { biome_id: 'caverna' },
    });
  assert.equal(r2.status, 200);
  assert.equal(r2.body.deciphered, true);
  assert.equal(r2.body.newly_added, false);
});
