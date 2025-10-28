const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const request = require('supertest');
const { createApp } = require('../../server/app');

function createTempDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idea-engine-'));
  return path.join(dir, 'ideas.db');
}

test('POST /api/ideas salva nel database e genera il report Codex', async (t) => {
  const databasePath = createTempDbPath();
  const { app, repo } = createApp({ databasePath });
  await repo.ready;
  t.after(() => {
    // nedb non richiede chiusura esplicita
  });

  const payload = {
    title: 'Nuova idea Playtest',
    summary: 'Dungeon modulare con telemetria',
    category: 'Meccaniche',
    tags: ['#playtest', 'telemetria'],
    module: 'NR04 Fangwood',
    entities: 'Cervo Bianco',
    priority: 'P1',
    actions_next: '- [ ] Stendere schema incontri',
    link_drive: 'https://drive.google.com/test',
    github: 'docs/modules/fangwood.md',
    note: 'Richiede confronto con bilanciamento VTT',
  };

  const response = await request(app)
    .post('/api/ideas')
    .send(payload)
    .expect(201);

  assert.ok(response.body.idea.id, 'l\'idea deve avere un id');
  assert.equal(response.body.idea.category, 'Meccaniche');
  assert.equal(response.body.idea.tags.length, 2);
  assert.ok(response.body.report.includes('Codex GPT Integration Brief'));

  const stored = await repo.getById(response.body.idea.id);
  assert.ok(stored, 'l\'idea deve essere salvata nel database');
  assert.equal(stored.summary, payload.summary);
  assert.equal(stored.priority, 'P1');
});

test('GET /api/ideas/:id/report restituisce il report salvato', async (t) => {
  const databasePath = createTempDbPath();
  const { app, repo } = createApp({ databasePath });
  await repo.ready;
  t.after(() => {
    // no-op
  });

  const idea = await repo.create({
    title: 'Boss per capitolo finale',
    summary: 'Scontro multi fase in arena',
    category: 'Narrativa',
    tags: ['finale'],
    priority: 'P0',
    actions_next: '- [ ] Scrivere dialoghi\n- [ ] Bilanciare fase 2',
  });

  const response = await request(app)
    .get(`/api/ideas/${idea.id}/report`)
    .expect(200);

  assert.equal(response.body.idea.id, idea.id);
  assert.ok(response.body.report.includes('Boss per capitolo finale'));
  assert.ok(response.body.report.includes('### Next Actions'));
});

test('POST /api/ideas valida i campi obbligatori', async (t) => {
  const databasePath = createTempDbPath();
  const { app, repo } = createApp({ databasePath });
  await repo.ready;
  t.after(() => {
    // no-op
  });

  const res = await request(app)
    .post('/api/ideas')
    .send({ category: 'Repo' })
    .expect(400);

  assert.equal(res.body.error, 'Titolo richiesto');
});
