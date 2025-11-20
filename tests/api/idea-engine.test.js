const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

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
    category: 'Biomi',
    tags: ['#playtest', 'telemetria'],
    biomes: ['dorsale_termale_tropicale'],
    ecosystems: ['meta_ecosistema_alpha'],
    species: ['dune-stalker'],
    traits: ['focus_frazionato'],
    game_functions: ['telemetria_vc'],
    priority: 'P1',
    actions_next: '- [ ] Stendere schema incontri',
    link_drive: 'https://drive.google.com/test',
    github: 'docs/biomes/foresta_temperata.md',
    note: 'Richiede confronto con bilanciamento VTT',
  };

  const response = await request(app).post('/api/ideas').send(payload).expect(201);

  assert.ok(response.body.idea.id, "l'idea deve avere un id");
  assert.equal(response.body.idea.category, 'Biomi');
  assert.deepEqual(response.body.idea.biomes, ['dorsale_termale_tropicale']);
  assert.deepEqual(response.body.idea.ecosystems, ['meta_ecosistema_alpha']);
  assert.deepEqual(response.body.idea.game_functions, ['telemetria_vc']);
  assert.equal(response.body.idea.tags.length, 2);
  assert.ok(response.body.report.includes('Codex GPT Integration Brief'));
  assert.ok(Array.isArray(response.body.idea.feedback));
  assert.equal(response.body.idea.feedback.length, 0);

  const stored = await repo.getById(response.body.idea.id);
  assert.ok(stored, "l'idea deve essere salvata nel database");
  assert.equal(stored.summary, payload.summary);
  assert.equal(stored.priority, 'P1');
  assert.deepEqual(stored.biomes, payload.biomes);
  assert.deepEqual(stored.species, payload.species);
  assert.deepEqual(stored.traits, payload.traits);
  assert.ok(Array.isArray(stored.feedback));
  assert.equal(stored.feedback.length, 0);
});

test('POST /api/ideas/:id/feedback registra il commento e aggiorna il report', async (t) => {
  const databasePath = createTempDbPath();
  const { app, repo } = createApp({ databasePath });
  await repo.ready;
  t.after(() => {
    // no-op
  });

  const ideaRes = await request(app)
    .post('/api/ideas')
    .send({
      title: 'Supporto widget feedback',
      summary: 'Test modulo feedback',
      category: 'Biomi',
    })
    .expect(201);

  const ideaId = ideaRes.body.idea.id;
  assert.ok(ideaId, 'deve esistere un id idea');

  const feedbackPayload = {
    message: 'Interfaccia chiara, aggiungere autocomplete categorie',
    contact: '@tester',
  };

  const feedbackRes = await request(app)
    .post(`/api/ideas/${ideaId}/feedback`)
    .send(feedbackPayload)
    .expect(201);

  assert.ok(Array.isArray(feedbackRes.body.idea.feedback));
  assert.equal(feedbackRes.body.idea.feedback.length, 1);
  assert.equal(feedbackRes.body.idea.feedback[0].message, feedbackPayload.message);
  assert.equal(feedbackRes.body.idea.feedback[0].contact, feedbackPayload.contact);

  const stored = await repo.getById(ideaId);
  assert.equal(stored.feedback.length, 1);

  const reportRes = await request(app).get(`/api/ideas/${ideaId}/report`).expect(200);

  assert.ok(reportRes.body.report.includes('## Intake Feedback'));
  assert.ok(reportRes.body.report.includes('Interfaccia chiara'));
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

  const response = await request(app).get(`/api/ideas/${idea.id}/report`).expect(200);

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

  const res = await request(app).post('/api/ideas').send({ category: 'Repo' }).expect(400);

  assert.equal(res.body.error, 'Titolo richiesto');
});

test('POST /api/ideas rifiuta categorie non in tassonomia', async (t) => {
  const databasePath = createTempDbPath();
  const { app, repo } = createApp({ databasePath });
  await repo.ready;
  t.after(() => {
    // no-op
  });

  const res = await request(app)
    .post('/api/ideas')
    .send({
      title: 'Idea senza categoria valida',
      summary: 'Test categoria',
      category: 'Non Esiste',
    })
    .expect(400);

  assert.equal(res.body.error, 'Categoria non valida');
});

test('POST /api/ideas rifiuta slug non catalogati senza override', async (t) => {
  const databasePath = createTempDbPath();
  const { app, repo } = createApp({ databasePath });
  await repo.ready;
  t.after(() => {
    // no-op
  });

  const res = await request(app)
    .post('/api/ideas')
    .send({
      title: 'Idea con slug errati',
      summary: 'Test controllo slug',
      category: 'Biomi',
      biomes: ['bioma_sconosciuto'],
      traits: ['mutazione_custom'],
    })
    .expect(400);

  assert.match(res.body.error, /Slug non riconosciuti/);
  assert.ok(res.body.error.includes('Biomi'));
});

test('POST /api/ideas accetta slug non catalogati con override', async (t) => {
  const databasePath = createTempDbPath();
  const { app, repo } = createApp({ databasePath });
  await repo.ready;
  t.after(() => {
    // no-op
  });

  const payload = {
    title: 'Idea con override slug',
    summary: 'Verifica flag override',
    category: 'Biomi',
    biomes: ['nuovo_bioma'],
    allowSlugOverride: true,
  };

  const res = await request(app).post('/api/ideas').send(payload).expect(201);

  assert.deepEqual(res.body.idea.biomes, ['nuovo_bioma']);
});
