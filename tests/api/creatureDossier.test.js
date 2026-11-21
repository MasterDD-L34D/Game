// Creature dossier route -- per-creature story-card composed from the durable
// chronicle (run_id + actor_id keyed). Pure-read attachment surface (SPEC-J/Q):
// name (creature_named) + scars (scar_*) + mutations (mutation_*) + biome wounds
// + fate (creature_death) + chronological timeline + summary counts.

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { composeDossier } = require('../../apps/backend/routes/creatureDossier');

function tmpBaseDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'creature-dossier-test-'));
}

function mkApp(t, baseDir) {
  // The dossier reads the SAME chronicle store as the chronicle route, so it
  // shares the chronicle baseDir override.
  const { app, close } = createApp({ databasePath: null, chronicle: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  return app;
}

async function seed(app, runId, event) {
  const r = await request(app).post(`/api/chronicle/${runId}`).send(event);
  assert.equal(r.status, 201, JSON.stringify(r.body));
}

test('composeDossier (pure) -- empty events -> anonymous zero card', () => {
  const d = composeDossier([], { run_id: 'r1', actor_id: 'a1' });
  assert.equal(d.run_id, 'r1');
  assert.equal(d.actor_id, 'a1');
  assert.equal(d.named, false);
  assert.equal(d.name, null);
  assert.equal(d.event_count, 0);
  assert.equal(d.fate.fallen, false);
  assert.deepEqual(d.scars, []);
  assert.deepEqual(d.mutations, []);
  assert.deepEqual(d.biome_wounds, []);
  assert.deepEqual(d.timeline, []);
  assert.equal(d.summary.total, 0);
});

test('composeDossier -- latest creature_named wins for name + stage', () => {
  const evs = [
    {
      ts: '2026-06-01T00:00:00Z',
      type: 'creature_named',
      actor_id: 'a1',
      payload: { name: 'Vega', stage: 'juvenile' },
    },
    {
      ts: '2026-06-02T00:00:00Z',
      type: 'creature_named',
      actor_id: 'a1',
      payload: { name: 'Vega', stage: 'mature', mbti_reveal: true },
    },
  ];
  const d = composeDossier(evs, { run_id: 'r1', actor_id: 'a1' });
  assert.equal(d.named, true);
  assert.equal(d.name, 'Vega');
  assert.equal(d.stage, 'mature');
  assert.equal(d.mbti_reveal, true);
});

test('GET /api/creature/:run_id/:actor_id/dossier -- empty -> 200 anonymous', async (t) => {
  const app = mkApp(t, tmpBaseDir());
  const r = await request(app).get('/api/creature/run1/skiv/dossier');
  assert.equal(r.status, 200);
  assert.equal(r.body.run_id, 'run1');
  assert.equal(r.body.actor_id, 'skiv');
  assert.equal(r.body.named, false);
  assert.equal(r.body.event_count, 0);
});

test('GET dossier -- composes a story-card from the actor chronicle + filters by actor', async (t) => {
  const app = mkApp(t, tmpBaseDir());
  // actor skiv life-events
  await seed(app, 'run1', {
    type: 'creature_named',
    actor_id: 'skiv',
    payload: { name: 'Sabbia', stage: 'juvenile' },
  });
  await seed(app, 'run1', {
    type: 'scar_earned',
    actor_id: 'skiv',
    payload: { location: 'torso', severity: 'grave' },
  });
  await seed(app, 'run1', {
    type: 'mutation_acquired',
    actor_id: 'skiv',
    payload: { mutation_id: 'artigli_grip_to_glass' },
  });
  await seed(app, 'run1', {
    type: 'biome_wound',
    actor_id: 'skiv',
    payload: { biome_id: 'savana' },
  });
  await seed(app, 'run1', {
    type: 'scar_healed',
    actor_id: 'skiv',
    payload: { location: 'torso' },
  });
  // a DIFFERENT actor's event must NOT leak into skiv's dossier
  await seed(app, 'run1', {
    type: 'creature_named',
    actor_id: 'other',
    payload: { name: 'Ombra', stage: 'mature' },
  });

  const r = await request(app).get('/api/creature/run1/skiv/dossier');
  assert.equal(r.status, 200);
  const d = r.body;
  assert.equal(d.named, true);
  assert.equal(d.name, 'Sabbia');
  assert.equal(d.event_count, 5, 'only skiv events counted');
  assert.equal(d.scars.length, 2, 'earned + healed');
  assert.equal(d.mutations.length, 1);
  assert.equal(d.biome_wounds.length, 1);
  assert.equal(d.fate.fallen, false);
  // timeline is chronological + actor-scoped
  assert.equal(d.timeline.length, 5);
  assert.equal(d.timeline[0].type, 'creature_named');
  assert.ok(d.timeline.every((e) => e.type !== undefined));
  assert.equal(d.summary.total, 5);
  assert.equal(d.summary.by_type.scar_earned, 1);
  // no leak from 'other'
  assert.notEqual(d.name, 'Ombra');
});

test('GET dossier -- creature_death marks fate.fallen', async (t) => {
  const app = mkApp(t, tmpBaseDir());
  await seed(app, 'run1', {
    type: 'creature_named',
    actor_id: 'skiv',
    payload: { name: 'Sabbia', stage: 'mature' },
  });
  await seed(app, 'run1', {
    type: 'creature_death',
    actor_id: 'skiv',
    payload: { biome_id: 'caverna' },
  });
  const r = await request(app).get('/api/creature/run1/skiv/dossier');
  assert.equal(r.status, 200);
  assert.equal(r.body.fate.fallen, true);
  assert.equal(r.body.fate.type, 'creature_death');
  assert.ok(r.body.fate.at, 'fate carries a timestamp');
});

test('GET dossier -- secret/private tier events are fail-closed excluded (SPEC-B sez.10)', async (t) => {
  const app = mkApp(t, tmpBaseDir());
  await seed(app, 'run1', {
    type: 'creature_named',
    actor_id: 'skiv',
    tier: 'public',
    payload: { name: 'Sabbia', stage: 'mature' },
  });
  // a secret + a private event for the SAME actor must NOT appear in the card
  await seed(app, 'run1', {
    type: 'mutation_acquired',
    actor_id: 'skiv',
    tier: 'secret',
    payload: { mutation_id: 'hidden_ability' },
  });
  await seed(app, 'run1', {
    type: 'biome_wound',
    actor_id: 'skiv',
    tier: 'private',
    payload: { biome_id: 'caverna' },
  });
  const r = await request(app).get('/api/creature/run1/skiv/dossier');
  assert.equal(r.status, 200);
  const d = r.body;
  assert.equal(d.event_count, 1, 'only the public creature_named is surfaced');
  assert.equal(d.mutations.length, 0, 'secret mutation excluded');
  assert.equal(d.biome_wounds.length, 0, 'private biome_wound excluded');
  assert.equal(d.timeline.length, 1);
  assert.equal(d.timeline[0].tier, 'public');
});

test('GET dossier -- ?limit caps the timeline (structured summary stays full)', async (t) => {
  const app = mkApp(t, tmpBaseDir());
  for (let i = 0; i < 5; i++) {
    await seed(app, 'run1', {
      type: 'mutation_acquired',
      actor_id: 'skiv',
      payload: { mutation_id: `m${i}` },
    });
  }
  const r = await request(app).get('/api/creature/run1/skiv/dossier?limit=3');
  assert.equal(r.status, 200);
  const d = r.body;
  assert.equal(d.timeline.length, 3, 'timeline capped to limit');
  assert.equal(d.timeline_truncated, true);
  assert.equal(d.event_count, 5, 'full count preserved');
  assert.equal(d.mutations.length, 5, 'structured fields stay full');
  assert.equal(d.summary.total, 5);
  // most-recent kept, chronological order preserved
  assert.equal(d.timeline[2].payload.mutation_id, 'm4');
});

test('composeDossier -- default timeline cap is generous (no truncation under 100)', () => {
  const evs = Array.from({ length: 10 }, (_, i) => ({
    ts: `2026-06-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    type: 'mutation_acquired',
    actor_id: 'a1',
    tier: 'public',
    payload: { mutation_id: `m${i}` },
  }));
  const d = composeDossier(evs, { run_id: 'r1', actor_id: 'a1' });
  assert.equal(d.timeline.length, 10);
  assert.equal(d.timeline_truncated, false);
});

test('GET dossier -- 400 on missing actor_id segment is not possible (route requires it); blank run handled', async (t) => {
  const app = mkApp(t, tmpBaseDir());
  // unknown run -> empty card, still 200 (mirrors chronicle route semantics)
  const r = await request(app).get('/api/creature/nope/ghost/dossier');
  assert.equal(r.status, 200);
  assert.equal(r.body.event_count, 0);
  assert.equal(r.body.named, false);
});
