// SPEC-F (Custode Portable Framework) — /api/skiv/* store-backed HTTP routes.
//
// Slices 0-2 (read + propose, NO persisted mutation):
//   GET  /api/skiv/share/:lineage_id?format=json
//   GET  /api/skiv/crossbreed/history/:lineage_id
//   POST /api/skiv/crossbreed  (propose offspring, no store write)
//
// Routes are served from the DI companion router (createCompanionRouter),
// NOT routes/skiv.js (the decoupled fs-json monitor). Both `store` and
// `rollMatingOffspring` are injected so tests stub them deterministically
// (band-neutral, no combat sim -> no N=40 needed).
//
// Mirror: tests/routes/companion.test.js (express app.listen(0) + fetch, DI stubs).
// Reference: docs/design/evo-tactics-custode-portable-framework.md (route names :51-52,
// export contract :97-116, voice_diary opt-out :135-138).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createCompanionRouter } = require('../../apps/backend/routes/companion');
const {
  signatureFor,
  createCompanionStateStore,
} = require('../../apps/backend/services/skiv/companionStateStore');

// A whitelist-shaped Custode state mirroring makeValidState from
// tests/services/skivCompanionState.test.js, plus non-whitelist PII so we can
// assert /share strips it.
function makeShareState(overrides = {}) {
  const base = {
    schema_version: '0.2.0',
    unit_id: 'skiv',
    species_id: 'dune_stalker',
    biome_id: 'savana',
    lineage_id: 'skiv-savana-2026-0427-test',
    companion_card_signature: null,
    mbti_axes: {
      E_I: { value: 0.68, coverage: 'full' },
      T_F: { value: 0.72, coverage: 'full' },
    },
    progression: { level: 4, job: 'stalker' },
    cabinet: ['ambush'],
    mutations: [],
    aspect: { label: 'dune', lifecycle: 'adult' },
    crossbreed_history: [],
    voice_diary_portable: [{ ts: '2026-06-08T00:00:00Z', line: 'sabbia segue' }],
    share_url: null,
    // --- non-whitelist PII / ephemeral (must never leave via /share) ---
    session_id: 'sess-secret-123',
    hp_current: 7,
    _notes: 'private',
    ...overrides,
  };
  return base;
}

// Build a deterministic in-memory store stub exposing only the methods the
// routes call: getCompanionState, getCrossbreedHistory.
function makeStoreStub(seed = {}) {
  const states = new Map(Object.entries(seed));
  const campaigns = new Map(); // lineage_id -> campaignId[] (durable-cooldown mirror)
  return {
    getCompanionState(lineageId) {
      return states.get(lineageId) || null;
    },
    getCrossbreedHistory(lineageId) {
      const s = states.get(lineageId);
      return s && Array.isArray(s.crossbreed_history) ? [...s.crossbreed_history] : [];
    },
    // Slice 3 write path: append a crossbreed event to the lineage history
    // (mirror of the real store.addCrossbreedEvent, FIFO cap 10).
    addCrossbreedEvent(lineageId, event) {
      const s = states.get(lineageId);
      if (!s) throw new Error(`addCrossbreedEvent: no state for ${lineageId}`);
      const ts = event.ts || '2026-06-17T00:00:00Z';
      s.crossbreed_history = [...(s.crossbreed_history || []), { ...event, ts }].slice(-10);
      states.set(lineageId, s);
      return s;
    },
    // Durable cooldown (mirror of the real store's crossbreedCampaigns map).
    recordCrossbreedCampaign(lineageId, campaignId) {
      const list = campaigns.get(lineageId) || [];
      if (!list.includes(campaignId)) campaigns.set(lineageId, [...list, campaignId]);
    },
    getCrossbreedCampaigns(lineageId) {
      return [...(campaigns.get(lineageId) || [])];
    },
    signatureFor,
    _states: states,
  };
}

// Store stub simulating Prisma-backed persistence: getCompanionState reads the
// in-memory map only; saveCompanionState upserts to BOTH memory + a persistent
// map; hydrateAsync repopulates memory from persistence. _restart() clears memory
// (mimics a backend restart) while the persisted rows survive -- the exact shape
// that exposes a memory-only overwrite guard (Codex P1).
function makePersistentStoreStub() {
  const persistent = new Map();
  const memory = new Map();
  return {
    getCompanionState(id) {
      return memory.get(id) || null;
    },
    saveCompanionState(state) {
      const saved = { ...state, companion_card_signature: signatureFor(state) };
      memory.set(state.lineage_id, saved);
      persistent.set(state.lineage_id, saved);
      return saved;
    },
    async hydrateAsync(id) {
      const row = persistent.get(id);
      if (!row) return null;
      memory.set(id, row);
      return row;
    },
    // FC1 resync (additive merge) mirroring the real store: append external
    // arrays to the home row, re-sign, persist to BOTH maps.
    resyncCompanionState(id, card) {
      const existing = memory.get(id);
      if (!existing) throw new Error(`resyncCompanionState: no home state for ${id}`);
      const merged = {
        ...existing,
        crossbreed_history: [
          ...(existing.crossbreed_history || []),
          ...(Array.isArray(card.crossbreed_history) ? card.crossbreed_history : []),
        ],
        voice_diary_portable: [
          ...(existing.voice_diary_portable || []),
          ...(Array.isArray(card.voice_diary_portable) ? card.voice_diary_portable : []),
        ],
      };
      const saved = { ...merged, companion_card_signature: signatureFor(merged) };
      memory.set(id, saved);
      persistent.set(id, saved);
      return saved;
    },
    _restart() {
      memory.clear();
    },
  };
}

function buildApp({
  store,
  rollMatingOffspring,
  offspringStore,
  nidoIsolationEnabled,
  writeAuthEnabled,
  authenticate,
  authStub,
} = {}) {
  const app = express();
  app.use(express.json());
  if (authStub) {
    // Simulate a configured JWT middleware: treat body.player_id as a verified sub
    // (req.auth.userId) so deriveOwner returns { trusted:true } -- the crypto-bound path.
    app.use((req, _res, next) => {
      if (req.body && typeof req.body.player_id === 'string') {
        req.auth = { userId: req.body.player_id };
      }
      next();
    });
  }
  app.use(
    '/api',
    createCompanionRouter({
      store,
      rollMatingOffspring,
      offspringStore,
      nidoIsolationEnabled,
      writeAuthEnabled,
      authenticate,
    }),
  );
  return app;
}

// Option D enforce stub (mirrors createAuthHandlers().authenticate when AUTH_SECRET
// is set): require body.token==='ok', then set req.auth.userId = body.player_id
// (the verified JWT sub); else 401. Injected as `authenticate` for the write-gate.
function makeEnforceAuth() {
  return (req, res, next) => {
    if (!req.body || req.body.token !== 'ok') {
      return res.status(401).json({ error: 'unauthorized' });
    }
    req.auth = { userId: String(req.body.player_id || 'sub') };
    next();
  };
}

// Minimal offspringStore stub -- only getById is called by the promote route.
function makeOffspringStoreStub(seed = {}) {
  const rows = new Map(Object.entries(seed));
  return {
    async getById(id) {
      const r = rows.get(String(id));
      return r ? { ...r } : null;
    },
  };
}

function makeOffspring(overrides = {}) {
  return {
    id: 'off-1',
    lineage_id: 'skiv-savana-2026-0427-offspring',
    session_id: 'sess-1',
    parent_a_id: 'skiv',
    parent_b_id: 'partner',
    mutations: ['glow'],
    trait_inherited: ['ambush', 'burrow'],
    biome_origin: 'savana',
    born_at: '2026-06-08T00:00:00Z',
    ...overrides,
  };
}

// Crossbreed-confirm offspring shape (rollMatingOffspring result), NOT persisted.
function makeCrossbreedOffspring(overrides = {}) {
  return {
    lineage_id: 'skiv-savana-2026-0427-xbred',
    gene_slots: [
      { slot_id: 'gs_speed', value: 3 },
      { slot_id: 'gs_armor', value: 2 },
    ],
    environmental_mutation: { id: 'mut_glow', type: 'mutation', tier: 2 },
    tier_bonus_traits: ['ambush', 'burrow'],
    hybrid_fusions: [{ id: 'fus_x', type: 'fusion' }],
    tier: 2,
    parent_a_id: 'skiv',
    parent_b_id: 'partner',
    biome_id_at_mating: 'savana',
    ...overrides,
  };
}

async function getJson(app, path) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const port = server.address().port;
      try {
        const res = await fetch(`http://127.0.0.1:${port}${path}`);
        const data = await res.json();
        server.close();
        resolve({ status: res.status, body: data });
      } catch (err) {
        server.close();
        reject(err);
      }
    });
  });
}

async function postJson(app, path, body) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const port = server.address().port;
      try {
        const res = await fetch(`http://127.0.0.1:${port}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        server.close();
        resolve({ status: res.status, body: data });
      } catch (err) {
        server.close();
        reject(err);
      }
    });
  });
}

// ─── Slice 1: GET /api/skiv/share/:lineage_id ───────────────────────────

test('GET /skiv/share unknown lineage → 404 lineage_not_found', async () => {
  const app = buildApp({ store: makeStoreStub() });
  const r = await getJson(app, '/api/skiv/share/nope');
  assert.equal(r.status, 404);
  assert.equal(r.body.error, 'lineage_not_found');
});

test('GET /skiv/share returns ONLY whitelist fields (PII stripped)', async () => {
  const lineageId = 'skiv-savana-2026-0427-test';
  const app = buildApp({
    store: makeStoreStub({ [lineageId]: makeShareState() }),
  });
  const r = await getJson(app, `/api/skiv/share/${lineageId}`);
  assert.equal(r.status, 200);
  // PII / ephemeral must be absent.
  assert.equal('session_id' in r.body, false);
  assert.equal('hp_current' in r.body, false);
  assert.equal('_notes' in r.body, false);
  // Whitelist fields present.
  assert.equal(r.body.lineage_id, lineageId);
  assert.equal(r.body.species_id, 'dune_stalker');
});

test('GET /skiv/share strips voice_diary_portable to [] without consent', async () => {
  const lineageId = 'skiv-savana-2026-0427-test';
  const app = buildApp({
    store: makeStoreStub({ [lineageId]: makeShareState() }),
  });
  // include_diary requested but no stored consent → still stripped.
  const r = await getJson(app, `/api/skiv/share/${lineageId}?include_diary=true`);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.voice_diary_portable, []);
});

test('GET /skiv/share includes diary only with consent AND include_diary=true', async () => {
  const lineageId = 'skiv-savana-2026-0427-test';
  const app = buildApp({
    store: makeStoreStub({
      [lineageId]: makeShareState({ voice_diary_consent: true }),
    }),
  });
  // consent present but include_diary not requested → still stripped.
  const stripped = await getJson(app, `/api/skiv/share/${lineageId}`);
  assert.deepEqual(stripped.body.voice_diary_portable, []);
  // consent + include_diary=true → included.
  const included = await getJson(app, `/api/skiv/share/${lineageId}?include_diary=true`);
  assert.equal(included.body.voice_diary_portable.length, 1);
});

test('GET /skiv/share sets generated_at + recomputed companion_card_signature', async () => {
  const lineageId = 'skiv-savana-2026-0427-test';
  const app = buildApp({
    store: makeStoreStub({ [lineageId]: makeShareState() }),
  });
  const r = await getJson(app, `/api/skiv/share/${lineageId}`);
  assert.equal(r.status, 200);
  assert.match(r.body.companion_card_signature, /^[a-f0-9]{64}$/);
  assert.equal(typeof r.body.generated_at, 'string');
});

// --- B4: card / qr export formats (projections of the signed json card) ---

test('GET /skiv/share?format=card returns a display projection (PII-free, summarized)', async () => {
  const lineageId = 'skiv-savana-2026-0427-test';
  const app = buildApp({ store: makeStoreStub({ [lineageId]: makeShareState() }) });
  const r = await getJson(app, `/api/skiv/share/${lineageId}?format=card`);
  assert.equal(r.status, 200);
  assert.equal(r.body.format, 'card');
  assert.equal(r.body.lineage_id, lineageId);
  assert.equal(r.body.species_id, 'dune_stalker');
  // heavy arrays summarized, raw not leaked
  assert.equal(r.body.crossbreed_count, 0);
  assert.equal('crossbreed_history' in r.body, false);
  assert.equal('voice_diary_portable' in r.body, false);
  assert.equal(typeof r.body.has_diary, 'boolean');
  // materialized public share_url for a copy-link affordance
  assert.match(r.body.share_url, /\/api\/skiv\/share\/skiv-savana-2026-0427-test$/);
  // PII never present
  assert.equal('session_id' in r.body, false);
  assert.equal('hp_current' in r.body, false);
  assert.match(r.body.companion_card_signature, /^[a-f0-9]{64}$/);
});

test('GET /skiv/share?format=card honors diary opt-out (has_diary=false without consent)', async () => {
  const lineageId = 'skiv-savana-2026-0427-test';
  const app = buildApp({ store: makeStoreStub({ [lineageId]: makeShareState() }) });
  const r = await getJson(app, `/api/skiv/share/${lineageId}?format=card&include_diary=true`);
  assert.equal(r.status, 200);
  assert.equal(r.body.has_diary, false);
});

test('GET /skiv/share?format=qr encodes the public share_url (ADR :110), no inline blob', async () => {
  const lineageId = 'skiv-savana-2026-0427-test';
  const app = buildApp({ store: makeStoreStub({ [lineageId]: makeShareState() }) });
  const r = await getJson(app, `/api/skiv/share/${lineageId}?format=qr`);
  assert.equal(r.status, 200);
  assert.equal(r.body.format, 'qr');
  assert.equal(r.body.encodes, 'share_url');
  assert.equal(r.body.lineage_id, lineageId);
  // absolute URL pointing back to the fetchable share endpoint for this lineage
  assert.match(r.body.share_url, /^https?:\/\//);
  assert.match(r.body.share_url, /\/api\/skiv\/share\/skiv-savana-2026-0427-test$/);
  // no inline card blob, no PII
  assert.equal('payload' in r.body, false);
  assert.equal('session_id' in r.body, false);
});

test('GET /skiv/share?format=qr prefers a stored absolute share_url when present', async () => {
  const lineageId = 'skiv-savana-2026-0427-test';
  const stored = 'https://cards.example/api/skiv/share/skiv-savana-2026-0427-test';
  const app = buildApp({
    store: makeStoreStub({ [lineageId]: makeShareState({ share_url: stored }) }),
  });
  const r = await getJson(app, `/api/skiv/share/${lineageId}?format=qr`);
  assert.equal(r.body.share_url, stored);
});

test('GET /skiv/share?format=bogus → 400 unsupported_format', async () => {
  const lineageId = 'skiv-savana-2026-0427-test';
  const app = buildApp({ store: makeStoreStub({ [lineageId]: makeShareState() }) });
  const r = await getJson(app, `/api/skiv/share/${lineageId}?format=bogus`);
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'unsupported_format');
});

// --- B4 slice 2: POST /skiv/offspring/:id/promote (offspring -> ambassador) ---

test('POST promote unknown offspring → 404 offspring_not_found', async () => {
  const app = buildApp({
    store: createCompanionStateStore(),
    offspringStore: makeOffspringStoreStub(),
  });
  const r = await postJson(app, '/api/skiv/offspring/nope/promote', { species_id: 'dune_stalker' });
  assert.equal(r.status, 404);
  assert.equal(r.body.error, 'offspring_not_found');
});

test('POST promote without species_id → 400 species_required', async () => {
  const app = buildApp({
    store: createCompanionStateStore(),
    offspringStore: makeOffspringStoreStub({ 'off-1': makeOffspring() }),
  });
  const r = await postJson(app, '/api/skiv/offspring/off-1/promote', {});
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'species_required');
});

test('POST promote persists ambassador + returns spawn_descriptor', async () => {
  const off = makeOffspring();
  const app = buildApp({
    store: createCompanionStateStore(),
    offspringStore: makeOffspringStoreStub({ 'off-1': off }),
  });
  const r = await postJson(app, '/api/skiv/offspring/off-1/promote', {
    species_id: 'dune_stalker',
  });
  assert.equal(r.status, 201);
  // ambassador companion card (species resolved from body, offspring-derived fields)
  assert.equal(r.body.ambassador.lineage_id, off.lineage_id);
  assert.equal(r.body.ambassador.species_id, 'dune_stalker');
  assert.deepEqual(r.body.ambassador.mutations, ['glow']);
  assert.match(r.body.ambassador.companion_card_signature, /^[a-f0-9]{64}$/);
  // spawn descriptor = the unit-half genome (combat stats derived downstream)
  assert.equal(r.body.spawn_descriptor.species_id, 'dune_stalker');
  assert.deepEqual(r.body.spawn_descriptor.trait_ids, ['ambush', 'burrow']);
  assert.deepEqual(r.body.spawn_descriptor.applied_mutations, ['glow']);
  assert.equal(r.body.spawn_descriptor.biome_origin, 'savana');
});

test('POST promote then GET /skiv/share returns the persisted ambassador', async () => {
  const off = makeOffspring();
  const store = createCompanionStateStore();
  const app = buildApp({ store, offspringStore: makeOffspringStoreStub({ 'off-1': off }) });
  await postJson(app, '/api/skiv/offspring/off-1/promote', { species_id: 'dune_stalker' });
  const r = await getJson(app, `/api/skiv/share/${off.lineage_id}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.species_id, 'dune_stalker');
  assert.equal(r.body.lineage_id, off.lineage_id);
});

test('POST promote rate-limits after 10/h per IP → 429 (parity w/ crossbreed write)', async () => {
  const off = makeOffspring();
  const app = buildApp({
    store: createCompanionStateStore(),
    offspringStore: makeOffspringStoreStub({ 'off-1': off }),
  });
  let last;
  for (let i = 0; i < 11; i++) {
    last = await postJson(app, '/api/skiv/offspring/off-1/promote', { species_id: 'dune_stalker' });
  }
  assert.equal(last.status, 429);
  assert.equal(last.body.error, 'rate_limited');
});

test('POST promote a CROSSBREED descriptor (body.offspring) maps genome + no store lookup', async () => {
  // Empty offspringStore -> proves the body descriptor path does not need a persisted record.
  const app = buildApp({
    store: createCompanionStateStore(),
    offspringStore: makeOffspringStoreStub(),
  });
  const xbred = makeCrossbreedOffspring();
  const r = await postJson(app, `/api/skiv/offspring/${xbred.lineage_id}/promote`, {
    species_id: 'dune_stalker',
    offspring: xbred,
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.ambassador.lineage_id, xbred.lineage_id);
  // genome projection: env_mutation + hybrid_fusions -> mutations (objects, cap 3)
  assert.deepEqual(
    r.body.ambassador.mutations.map((m) => m.id),
    ['mut_glow', 'fus_x'],
  );
  // tier_bonus_traits + gene_slot ids -> cabinet.unlocked
  assert.deepEqual(r.body.ambassador.cabinet.unlocked, [
    'ambush',
    'burrow',
    'gs_speed',
    'gs_armor',
  ]);
  assert.deepEqual(r.body.spawn_descriptor.trait_ids, ['ambush', 'burrow', 'gs_speed', 'gs_armor']);
  assert.equal(r.body.spawn_descriptor.biome_origin, 'savana');
});

test('POST promote crossbreed descriptor with non-array hybrid_fusions does NOT crash (Codex P1)', async () => {
  const app = buildApp({
    store: createCompanionStateStore(),
    offspringStore: makeOffspringStoreStub(),
  });
  // malformed unauthenticated input: a non-array (non-iterable) hybrid_fusions
  const xbred = makeCrossbreedOffspring({ hybrid_fusions: { not: 'an array' } });
  const r = await postJson(app, `/api/skiv/offspring/${xbred.lineage_id}/promote`, {
    species_id: 'dune_stalker',
    offspring: xbred,
  });
  // gracefully handled (fusions ignored), not a 500/crash
  assert.equal(r.status, 201);
  assert.deepEqual(
    r.body.ambassador.mutations.map((m) => m.id),
    ['mut_glow'],
  );
});

test('POST promote refuses to overwrite an existing ambassador → 409 (anti-clobber)', async () => {
  const store = createCompanionStateStore();
  const app = buildApp({ store, offspringStore: makeOffspringStoreStub() });
  const xbred = makeCrossbreedOffspring();
  // first promote creates the ambassador
  const first = await postJson(app, `/api/skiv/offspring/${xbred.lineage_id}/promote`, {
    species_id: 'dune_stalker',
    offspring: xbred,
  });
  assert.equal(first.status, 201);
  // an attacker re-uses the SAME lineage_id with different species -> refused, not clobbered
  const attack = await postJson(app, `/api/skiv/offspring/${xbred.lineage_id}/promote`, {
    species_id: 'attacker_sp',
    offspring: makeCrossbreedOffspring({ tier_bonus_traits: ['attacker_trait'] }),
  });
  assert.equal(attack.status, 409);
  assert.equal(attack.body.error, 'lineage_already_promoted');
  // victim card unchanged
  const share = await getJson(app, `/api/skiv/share/${xbred.lineage_id}`);
  assert.equal(share.body.species_id, 'dune_stalker');
});

test('POST promote refuses a cross-restart overwrite (hydrates persistent store → 409, Codex P1)', async () => {
  const store = makePersistentStoreStub();
  const app = buildApp({ store, offspringStore: makeOffspringStoreStub() });
  const xbred = makeCrossbreedOffspring();
  const first = await postJson(app, `/api/skiv/offspring/${xbred.lineage_id}/promote`, {
    species_id: 'dune_stalker',
    offspring: xbred,
  });
  assert.equal(first.status, 201);
  store._restart(); // memory cleared, persisted ambassador survives
  const r = await postJson(app, `/api/skiv/offspring/${xbred.lineage_id}/promote`, {
    species_id: 'attacker_sp',
    offspring: makeCrossbreedOffspring({ tier_bonus_traits: ['attacker_trait'] }),
  });
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'lineage_already_promoted');
});

test('POST promote crossbreed descriptor without lineage_id → 400 lineage_id_required', async () => {
  const app = buildApp({
    store: createCompanionStateStore(),
    offspringStore: makeOffspringStoreStub(),
  });
  const xbred = makeCrossbreedOffspring({ lineage_id: undefined });
  const r = await postJson(app, '/api/skiv/offspring/x/promote', {
    species_id: 'dune_stalker',
    offspring: xbred,
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'lineage_id_required');
});

// --- B4: POST /skiv/import (foreign card -> ambassador, FC4-A signature+rate-limit) ---

test('POST /skiv/import missing card → 400 card_required', async () => {
  const app = buildApp({ store: createCompanionStateStore() });
  const r = await postJson(app, '/api/skiv/import', {});
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'card_required');
});

test('POST /skiv/import tampered signature → 400 signature_mismatch', async () => {
  const app = buildApp({ store: createCompanionStateStore() });
  const card = makePartnerCard();
  card.companion_card_signature = 'deadbeef'.repeat(8); // 64 hex, wrong
  const r = await postJson(app, '/api/skiv/import', { card });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'signature_mismatch');
});

test('POST /skiv/import card without lineage_id → 400 lineage_id_required', async () => {
  const app = buildApp({ store: createCompanionStateStore() });
  // a validly-signed card that simply has no lineage_id
  const card = makePartnerCard({ lineage_id: undefined });
  const r = await postJson(app, '/api/skiv/import', { card });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'lineage_id_required');
});

test('POST /skiv/import valid foreign card → 201 persists ambassador (server re-signs)', async () => {
  const store = createCompanionStateStore();
  const app = buildApp({ store });
  const card = makePartnerCard();
  const r = await postJson(app, '/api/skiv/import', { card });
  assert.equal(r.status, 201);
  assert.equal(r.body.ambassador.lineage_id, card.lineage_id);
  assert.equal(r.body.ambassador.species_id, 'reef_drifter');
  // server recomputes the signature over its own whitelist (never trusts client sig)
  assert.match(r.body.ambassador.companion_card_signature, /^[a-f0-9]{64}$/);
  // persisted: a later /share returns the imported ambassador
  const share = await getJson(app, `/api/skiv/share/${card.lineage_id}`);
  assert.equal(share.status, 200);
  assert.equal(share.body.species_id, 'reef_drifter');
});

test('POST /skiv/import strips PII present on the incoming card (whitelist-only persist)', async () => {
  const store = createCompanionStateStore();
  const app = buildApp({ store });
  // a signed card that also carries ephemeral PII -> must never be persisted
  const card = makePartnerCard();
  card.session_id = 'sess-leak';
  card.hp_current = 3;
  // (adding PII does not change the signature: signatureFor sanitizes to whitelist)
  const r = await postJson(app, '/api/skiv/import', { card });
  assert.equal(r.status, 201);
  assert.equal('session_id' in r.body.ambassador, false);
  assert.equal('hp_current' in r.body.ambassador, false);
});

test('POST /skiv/import refuses to overwrite an existing lineage → 409 (FC1 home-authoritative)', async () => {
  const store = createCompanionStateStore();
  const app = buildApp({ store });
  const card = makePartnerCard();
  const first = await postJson(app, '/api/skiv/import', { card });
  assert.equal(first.status, 201);
  // an attacker re-imports the SAME lineage_id with a different (validly-signed) species
  const attack = makePartnerCard({ species_id: 'attacker_sp' });
  attack.lineage_id = card.lineage_id;
  attack.companion_card_signature = signatureFor(attack);
  const r = await postJson(app, '/api/skiv/import', { card: attack });
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'lineage_already_imported');
  // victim card unchanged
  const share = await getJson(app, `/api/skiv/share/${card.lineage_id}`);
  assert.equal(share.body.species_id, 'reef_drifter');
});

test('POST /skiv/import rate-limits after 10/h per IP → 429', async () => {
  const store = createCompanionStateStore();
  const app = buildApp({ store });
  let last;
  for (let i = 0; i < 11; i += 1) {
    // distinct lineage each time so the cap/overwrite guard never trips first
    const card = makePartnerCard({ lineage_id: `partner-lineage-import-${i}` });
    card.companion_card_signature = signatureFor(card);
    last = await postJson(app, '/api/skiv/import', { card });
  }
  assert.equal(last.status, 429);
  assert.equal(last.body.error, 'rate_limited');
});

test('POST /skiv/import array card → 400 card_required (Array.isArray guard, #3131)', async () => {
  const app = buildApp({ store: createCompanionStateStore() });
  const r = await postJson(app, '/api/skiv/import', { card: [] });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'card_required');
});

test('POST /skiv/import garbage requests DO consume the rate-limit budget → 429', async () => {
  const app = buildApp({ store: createCompanionStateStore() });
  let last;
  for (let i = 0; i < 11; i += 1) {
    // empty body (no card) -> each is a 400 card_required, but still counts.
    last = await postJson(app, '/api/skiv/import', {});
  }
  assert.equal(last.status, 429);
  assert.equal(last.body.error, 'rate_limited');
});

test('POST /skiv/import refuses a cross-restart overwrite (hydrates persistent store → 409, Codex P1)', async () => {
  const store = makePersistentStoreStub();
  const app = buildApp({ store });
  const card = makePartnerCard();
  assert.equal((await postJson(app, '/api/skiv/import', { card })).status, 201);
  // backend restart: memory cleared, the persisted ambassador row survives.
  store._restart();
  // a validly-signed re-import of the SAME lineage_id must STILL be refused
  // (memory-only guard would 201 here and overwrite the persisted row).
  const attack = makePartnerCard({ species_id: 'attacker_sp' });
  attack.lineage_id = card.lineage_id;
  attack.companion_card_signature = signatureFor(attack);
  const r = await postJson(app, '/api/skiv/import', { card: attack });
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'lineage_already_imported');
});

// --- B4: POST /skiv/resync (returning Custode additive merge, FC1 home-authoritative) ---

// A validly-signed returning card (re-signs after overrides so a mutated field
// does not fail signature-verify).
function makeReturningCard(overrides = {}) {
  const card = { ...makePartnerCard(), ...overrides };
  card.companion_card_signature = signatureFor(card);
  return card;
}

// Seed a home lineage into a real store and return { store, app, lineageId }.
function seedHome(seedOverrides = {}) {
  const store = createCompanionStateStore();
  const lineageId = 'skiv-savana-2026-0427-home';
  store.saveCompanionState(makeShareState({ lineage_id: lineageId, ...seedOverrides }));
  return { store, app: buildApp({ store }), lineageId };
}

test('POST /skiv/resync missing card → 400 card_required', async () => {
  const { app } = seedHome();
  const r = await postJson(app, '/api/skiv/resync', {});
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'card_required');
});

test('POST /skiv/resync array card → 400 card_required (Array.isArray guard)', async () => {
  const { app } = seedHome();
  const r = await postJson(app, '/api/skiv/resync', { card: [] });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'card_required');
});

test('POST /skiv/resync tampered signature → 400 signature_mismatch', async () => {
  const { app, lineageId } = seedHome();
  const card = makeReturningCard({ lineage_id: lineageId });
  card.companion_card_signature = 'deadbeef'.repeat(8); // 64 hex, wrong
  const r = await postJson(app, '/api/skiv/resync', { card });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'signature_mismatch');
});

test('POST /skiv/resync unknown lineage → 404 lineage_not_found (RETURN requires existing home)', async () => {
  const { app } = seedHome();
  // valid card for a lineage that was never seeded home
  const card = makeReturningCard({ lineage_id: 'skiv-never-seeded-xyz' });
  const r = await postJson(app, '/api/skiv/resync', { card });
  assert.equal(r.status, 404);
  assert.equal(r.body.error, 'lineage_not_found');
});

test('POST /skiv/resync appends external history + diary to home (deduped) → 200', async () => {
  const eventA = { role: 'initiator', with_lineage_id: 'p1', tier: 'gold' };
  const eventB = { role: 'initiator', with_lineage_id: 'p2', tier: 'no-glow' };
  const { app, lineageId } = seedHome({
    crossbreed_history: [eventA],
    voice_diary_portable: [{ ts: 't1', voice_line: 'home' }],
  });
  // returning card: brings eventA (dup) + eventB (new) + a new diary line
  const card = makeReturningCard({
    lineage_id: lineageId,
    crossbreed_history: [eventA, eventB],
    voice_diary_portable: [
      { ts: 't1', voice_line: 'home' },
      { ts: 't2', voice_line: 'ext' },
    ],
  });
  const r = await postJson(app, '/api/skiv/resync', { card });
  assert.equal(r.status, 200);
  // eventA deduped, eventB appended
  assert.equal(r.body.ambassador.crossbreed_history.length, 2);
  assert.deepEqual(
    r.body.ambassador.crossbreed_history.map((e) => e.with_lineage_id),
    ['p1', 'p2'],
  );
  // diary: home line deduped, ext appended
  assert.equal(r.body.ambassador.voice_diary_portable.length, 2);
  assert.deepEqual(
    r.body.ambassador.voice_diary_portable.map((d) => d.voice_line),
    ['home', 'ext'],
  );
});

test('POST /skiv/resync strips nested PII from appended history/diary items (Codex P1)', async () => {
  const { app, lineageId } = seedHome();
  // a validly-signed returning card whose ARRAY ITEMS smuggle nested PII past the
  // top-level whitelist -- must never persist / leak.
  const card = makeReturningCard({
    lineage_id: lineageId,
    crossbreed_history: [
      {
        role: 'initiator',
        with_lineage_id: 'p1',
        tier: 'gold',
        partner_card_url: 'http://leak.example',
        session_id: 'sess-x',
      },
    ],
    voice_diary_portable: [{ ts: 't9', voice_line: 'hi', _notes: 'private', email: 'a@b.c' }],
  });
  const r = await postJson(app, '/api/skiv/resync', { card });
  assert.equal(r.status, 200);
  const ev = r.body.ambassador.crossbreed_history.find((e) => e.with_lineage_id === 'p1');
  assert.ok(ev);
  assert.equal('partner_card_url' in ev, false); // nested PII stripped
  assert.equal('session_id' in ev, false);
  assert.equal(ev.tier, 'gold'); // schema field survives
  const d = r.body.ambassador.voice_diary_portable.find((x) => x.voice_line === 'hi');
  assert.ok(d);
  assert.equal('_notes' in d, false);
  assert.equal('email' in d, false);
});

test('POST /skiv/resync is home-authoritative: card cannot regress home stat fields', async () => {
  const { app, lineageId } = seedHome({
    species_id: 'dune_stalker',
    progression: { level: 4, job: 'stalker' },
  });
  // card claims a different species + a higher level -> home MUST win
  const card = makeReturningCard({
    lineage_id: lineageId,
    species_id: 'attacker_sp',
    progression: { level: 99, job: 'hacked' },
    crossbreed_history: [{ role: 'initiator', with_lineage_id: 'p9', tier: 'rainbow' }],
  });
  const r = await postJson(app, '/api/skiv/resync', { card });
  assert.equal(r.status, 200);
  assert.equal(r.body.ambassador.species_id, 'dune_stalker'); // home wins
  assert.equal(r.body.ambassador.progression.level, 4); // home wins
  // but the additive array still merged the external event
  assert.equal(r.body.ambassador.crossbreed_history.length, 1);
  assert.equal(r.body.ambassador.crossbreed_history[0].with_lineage_id, 'p9');
});

test('POST /skiv/resync FIFO-caps crossbreed_history at 10 (newest kept)', async () => {
  const home = Array.from({ length: 8 }, (_, i) => ({
    role: 'initiator',
    with_lineage_id: `h${i}`,
    tier: 'no-glow',
  }));
  const { app, lineageId } = seedHome({ crossbreed_history: home });
  const extra = Array.from({ length: 5 }, (_, i) => ({
    role: 'initiator',
    with_lineage_id: `n${i}`,
    tier: 'gold',
  }));
  const card = makeReturningCard({
    lineage_id: lineageId,
    crossbreed_history: [...home, ...extra], // 8 dup + 5 new = 13 merged -> cap 10
  });
  const r = await postJson(app, '/api/skiv/resync', { card });
  assert.equal(r.status, 200);
  const ids = r.body.ambassador.crossbreed_history.map((e) => e.with_lineage_id);
  assert.equal(ids.length, 10);
  assert.equal(ids.includes('n4'), true); // newest kept
  assert.equal(ids.includes('h0'), false); // oldest dropped
});

test('POST /skiv/resync rate-limits after 10/h per IP → 429', async () => {
  const { app, lineageId } = seedHome();
  let last;
  for (let i = 0; i < 11; i += 1) {
    const card = makeReturningCard({ lineage_id: lineageId });
    last = await postJson(app, '/api/skiv/resync', { card });
  }
  assert.equal(last.status, 429);
  assert.equal(last.body.error, 'rate_limited');
});

test('POST /skiv/resync hydrates a persisted home across a restart → 200 (Codex P1 pattern)', async () => {
  const store = makePersistentStoreStub();
  const app = buildApp({ store });
  const lineageId = 'skiv-persist-home';
  store.saveCompanionState({
    schema_version: '0.2.0',
    lineage_id: lineageId,
    species_id: 'dune_stalker',
    crossbreed_history: [{ role: 'initiator', with_lineage_id: 'h0', tier: 'gold' }],
    voice_diary_portable: [],
  });
  // backend restart: memory cleared, the persisted home row survives.
  store._restart();
  const card = makeReturningCard({
    lineage_id: lineageId,
    crossbreed_history: [{ role: 'initiator', with_lineage_id: 'n0', tier: 'no-glow' }],
  });
  const r = await postJson(app, '/api/skiv/resync', { card });
  // memory-only would 404 here; lineageExists hydrates the persisted row first.
  assert.equal(r.status, 200);
  const ids = r.body.ambassador.crossbreed_history.map((e) => e.with_lineage_id);
  assert.deepEqual(ids, ['h0', 'n0']);
});

// --- B4: per-Nido isolation (Option A, flag SPEC_F_NIDO_ISOLATION_ENABLED) ---

// Import a distinct, validly-signed card owned by `player`.
async function importAs(app, lineageId, player) {
  const card = makePartnerCard({ lineage_id: lineageId });
  card.companion_card_signature = signatureFor(card);
  return postJson(app, '/api/skiv/import', { card, player_id: player });
}

test('isolation ON: per-owner cap -- owner B does not evict owner A (import)', async () => {
  const store = createCompanionStateStore({ ambassadorCap: 2 });
  const app = buildApp({ store, nidoIsolationEnabled: true });
  await importAs(app, 'A-alpha-1111', 'playerA');
  await importAs(app, 'A-beta-2222', 'playerA'); // A at cap 2
  await importAs(app, 'B-gamma-3333', 'playerB'); // B's save must NOT evict A's oldest
  assert.equal((await getJson(app, '/api/skiv/share/A-alpha-1111')).status, 200);
  // A's 3rd add evicts A's OWN oldest only; B untouched
  await importAs(app, 'A-delta-4444', 'playerA');
  assert.equal((await getJson(app, '/api/skiv/share/A-alpha-1111')).status, 404); // A oldest gone
  assert.equal((await getJson(app, '/api/skiv/share/A-beta-2222')).status, 200);
  assert.equal((await getJson(app, '/api/skiv/share/B-gamma-3333')).status, 200); // B safe
});

test('isolation ON + JWT-trusted owner: rate-limit is per-owner (A hitting 10/h does not block B)', async () => {
  const store = createCompanionStateStore();
  // authStub -> body.player_id becomes a verified JWT sub (trusted owner).
  const app = buildApp({ store, nidoIsolationEnabled: true, authStub: true });
  let last;
  for (let i = 0; i < 11; i += 1) last = await importAs(app, `A-rl-${i}-zzzz`, 'playerA');
  assert.equal(last.status, 429); // A exhausted its own budget
  const rB = await importAs(app, 'B-rl-0-zzzz', 'playerB');
  assert.notEqual(rB.status, 429); // B has an independent budget
});

test('isolation ON + SELF-ASSERTED player_id: rate-limit stays per-IP (rotating id cannot bypass)', async () => {
  const store = createCompanionStateStore();
  const app = buildApp({ store, nidoIsolationEnabled: true }); // NO authStub -> untrusted
  let last;
  // a griefer rotating a fresh player_id each request must NOT mint fresh budgets:
  // all share the one per-IP bucket -> the 11th is 429.
  for (let i = 0; i < 11; i += 1) last = await importAs(app, `rot-${i}-wwww`, `griefer-${i}`);
  assert.equal(last.status, 429);
});

test('isolation OFF (default): rate-limit stays per-IP -- player_id is ignored (byte-identical)', async () => {
  const store = createCompanionStateStore();
  const app = buildApp({ store }); // flag off
  let last;
  // distinct player_ids all share the one per-IP bucket -> 11th across owners = 429
  for (let i = 0; i < 11; i += 1) last = await importAs(app, `mix-${i}-wwww`, i % 2 ? 'x' : 'y');
  assert.equal(last.status, 429);
});

test('isolation ON with no player_id uses the shared anon bucket (no crash)', async () => {
  const store = createCompanionStateStore();
  const app = buildApp({ store, nidoIsolationEnabled: true });
  const card = makePartnerCard();
  const r = await postJson(app, '/api/skiv/import', { card }); // no player_id, no JWT
  assert.equal(r.status, 201);
});

test('isolation ON: an ownerless write cannot evict an owned Nido (Codex P2)', async () => {
  const store = createCompanionStateStore({ ambassadorCap: 2 });
  const app = buildApp({ store, nidoIsolationEnabled: true });
  await importAs(app, 'A-one-1111', 'playerA');
  await importAs(app, 'A-two-2222', 'playerA'); // playerA's bucket full at cap 2
  // anonymous imports (no player_id) must land in the shared anon bucket + evict only
  // each other -- NOT playerA's ambassadors (dropping the owner field must not bypass).
  const anon = async (id) => {
    const card = makePartnerCard({ lineage_id: id });
    card.companion_card_signature = signatureFor(card);
    return postJson(app, '/api/skiv/import', { card });
  };
  await anon('anon-one-11');
  await anon('anon-two-22');
  await anon('anon-thr-33'); // 3rd anon evicts anon-one (anon bucket), never playerA's
  assert.equal((await getJson(app, '/api/skiv/share/A-one-1111')).status, 200); // A safe
  assert.equal((await getJson(app, '/api/skiv/share/A-two-2222')).status, 200);
  assert.equal((await getJson(app, '/api/skiv/share/anon-one-11')).status, 404); // anon evicted anon
});

test('isolation ON: a non-string player_id (object) is ignored, not used as a key', async () => {
  const store = createCompanionStateStore();
  const app = buildApp({ store, nidoIsolationEnabled: true });
  const card = makePartnerCard();
  // malformed untrusted input: player_id as an object must never become a Map/rate key.
  const r = await postJson(app, '/api/skiv/import', { card, player_id: { evil: 1 } });
  assert.equal(r.status, 201); // treated as anonymous (global path), no crash / no [object Object]
});

// --- B4: Option D JWT write-gate (flag SPEC_F_WRITE_AUTH_ENABLED) ---

test('Option D OFF (default): writes stay open, no token required (byte-identical)', async () => {
  const store = createCompanionStateStore();
  const app = buildApp({ store }); // write-auth off
  const card = makePartnerCard();
  const r = await postJson(app, '/api/skiv/import', { card });
  assert.equal(r.status, 201);
});

test('Option D ON: a write without a valid token is rejected (401)', async () => {
  const store = createCompanionStateStore();
  const app = buildApp({ store, writeAuthEnabled: true, authenticate: makeEnforceAuth() });
  const card = makePartnerCard();
  const r = await postJson(app, '/api/skiv/import', { card }); // no token
  assert.equal(r.status, 401);
});

test('Option D ON: a valid token succeeds + owner is JWT-trusted (per-owner rate-limit)', async () => {
  const store = createCompanionStateStore();
  const app = buildApp({
    store,
    nidoIsolationEnabled: true,
    writeAuthEnabled: true,
    authenticate: makeEnforceAuth(),
  });
  // playerA (verified sub) exhausts its own 10/h; playerB is unaffected -> the JWT sub
  // is the trusted owner key (adversarial-safe, not the self-asserted body path).
  let last;
  for (let i = 0; i < 11; i += 1) {
    const card = makePartnerCard({ lineage_id: `A-d-${i}-zzzz` });
    card.companion_card_signature = signatureFor(card);
    last = await postJson(app, '/api/skiv/import', { card, token: 'ok', player_id: 'playerA' });
  }
  assert.equal(last.status, 429);
  const cardB = makePartnerCard({ lineage_id: 'B-d-0-zzzz' });
  cardB.companion_card_signature = signatureFor(cardB);
  const rB = await postJson(app, '/api/skiv/import', {
    card: cardB,
    token: 'ok',
    player_id: 'playerB',
  });
  assert.notEqual(rB.status, 429);
});

test('Option D ON: public reads stay open (GET share needs no token)', async () => {
  const lineageId = 'skiv-savana-2026-0427-test';
  const store = makeStoreStub({ [lineageId]: makeShareState() });
  const app = buildApp({ store, writeAuthEnabled: true, authenticate: makeEnforceAuth() });
  const r = await getJson(app, `/api/skiv/share/${lineageId}`);
  assert.equal(r.status, 200); // reads are public-tier, never gated
});

test('Option D ON without AUTH_SECRET does NOT fall back to the legacy trait token (Codex P2)', async () => {
  const prevSecret = process.env.AUTH_SECRET;
  const prevTrait = process.env.TRAIT_EDITOR_TOKEN;
  delete process.env.AUTH_SECRET;
  process.env.TRAIT_EDITOR_TOKEN = 'legacy-secret'; // present, but must NOT gate SPEC-F writes
  try {
    const store = createCompanionStateStore();
    // NO injected authenticate -> exercises the real createAuthHandlers({legacyToken:null}).
    const app = buildApp({ store, writeAuthEnabled: true });
    const card = makePartnerCard();
    const r = await postJson(app, '/api/skiv/import', { card }); // no token
    assert.equal(r.status, 201); // open (noop), NOT 401 legacy-token-gated
  } finally {
    if (prevSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = prevSecret;
    if (prevTrait === undefined) delete process.env.TRAIT_EDITOR_TOKEN;
    else process.env.TRAIT_EDITOR_TOKEN = prevTrait;
  }
});

// ─── Slice 1: GET /api/skiv/crossbreed/history/:lineage_id ──────────────

test('GET /skiv/crossbreed/history unknown lineage → [] count 0', async () => {
  const app = buildApp({ store: makeStoreStub() });
  const r = await getJson(app, '/api/skiv/crossbreed/history/nope');
  assert.equal(r.status, 200);
  assert.equal(r.body.lineage_id, 'nope');
  assert.equal(r.body.count, 0);
  assert.deepEqual(r.body.history, []);
});

test('GET /skiv/crossbreed/history populated returns seeded entries', async () => {
  const lineageId = 'skiv-savana-2026-0427-test';
  const seeded = makeShareState({
    crossbreed_history: [{ ts: '2026-06-08T00:00:00Z', partner_lineage_id: 'partner-x' }],
  });
  const app = buildApp({ store: makeStoreStub({ [lineageId]: seeded }) });
  const r = await getJson(app, `/api/skiv/crossbreed/history/${lineageId}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.count, 1);
  assert.equal(r.body.history[0].partner_lineage_id, 'partner-x');
});

// ─── Slice 2: POST /api/skiv/crossbreed (propose, NO persist) ───────────

function makePartnerCard(overrides = {}) {
  const partner = {
    schema_version: '0.2.0',
    unit_id: 'partner',
    species_id: 'reef_drifter',
    biome_id: 'oceano',
    lineage_id: 'partner-lineage-9999',
    mbti_axes: { E_I: { value: 0.3, coverage: 'full' } },
    progression: { level: 2 },
    cabinet: [],
    mutations: [],
    aspect: {},
    crossbreed_history: [],
    voice_diary_portable: [],
    share_url: null,
    ...overrides,
  };
  partner.companion_card_signature = signatureFor(partner);
  return partner;
}

test('POST /skiv/crossbreed missing local lineage → 404', async () => {
  const app = buildApp({ store: makeStoreStub() });
  const r = await postJson(app, '/api/skiv/crossbreed', {
    lineage_id: 'nope',
    partner_card_json: makePartnerCard(),
  });
  assert.equal(r.status, 404);
  assert.equal(r.body.error, 'lineage_not_found');
});

test('POST /skiv/crossbreed partner signature mismatch → 400', async () => {
  const lineageId = 'skiv-savana-2026-0427-test';
  const app = buildApp({
    store: makeStoreStub({ [lineageId]: makeShareState() }),
  });
  const partner = makePartnerCard();
  partner.companion_card_signature = 'deadbeef'.repeat(8); // 64 hex but wrong
  const r = await postJson(app, '/api/skiv/crossbreed', {
    lineage_id: lineageId,
    partner_card_json: partner,
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'signature_mismatch');
});

test('POST /skiv/crossbreed narrative partner (no species_id) → 422', async () => {
  const lineageId = 'skiv-savana-2026-0427-test';
  const app = buildApp({
    store: makeStoreStub({ [lineageId]: makeShareState() }),
  });
  const partner = makePartnerCard({ species_id: undefined });
  const r = await postJson(app, '/api/skiv/crossbreed', {
    lineage_id: lineageId,
    partner_card_json: partner,
  });
  assert.equal(r.status, 422);
  assert.equal(r.body.error, 'crossbreed_requires_biological');
});

test('POST /skiv/crossbreed narrative LOCAL (no species_id) → 422', async () => {
  const lineageId = 'skiv-savana-2026-0427-test';
  const app = buildApp({
    store: makeStoreStub({
      [lineageId]: makeShareState({ species_id: undefined }),
    }),
  });
  const r = await postJson(app, '/api/skiv/crossbreed', {
    lineage_id: lineageId,
    partner_card_json: makePartnerCard(),
  });
  assert.equal(r.status, 422);
  assert.equal(r.body.error, 'crossbreed_requires_biological');
});

test('POST /skiv/crossbreed valid → 200 {proposal,tier,visual_hints}, no persist', async () => {
  const lineageId = 'skiv-savana-2026-0427-test';
  const store = makeStoreStub({ [lineageId]: makeShareState() });
  let captured = null;
  const rollStub = (input) => {
    captured = input;
    return {
      success: true,
      offspring: { lineage_id: 'offspring-xyz', gene_slots: {} },
      tier: 'rare',
      visual_hints: { glow: true },
    };
  };
  const app = buildApp({ store, rollMatingOffspring: rollStub });
  const r = await postJson(app, '/api/skiv/crossbreed', {
    lineage_id: lineageId,
    partner_card_json: makePartnerCard(),
    biome_id: 'caverna',
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.proposal.lineage_id, 'offspring-xyz');
  assert.equal(r.body.tier, 'rare');
  assert.deepEqual(r.body.visual_hints, { glow: true });
  // engine called with biological parents + gene-encoder + chosen biome.
  assert.equal(captured.parentA.species_id, 'dune_stalker');
  assert.equal(captured.parentB.species_id, 'reef_drifter');
  assert.equal(captured.biomeId, 'caverna');
  assert.equal(captured.context.useGeneEncoder, true);
  // NO store write: crossbreed_history still empty.
  assert.deepEqual(store.getCrossbreedHistory(lineageId), []);
});

test('POST /skiv/crossbreed defaults biome to local biome_id when omitted', async () => {
  const lineageId = 'skiv-savana-2026-0427-test';
  const store = makeStoreStub({ [lineageId]: makeShareState() });
  let captured = null;
  const app = buildApp({
    store,
    rollMatingOffspring: (input) => {
      captured = input;
      return { success: true, offspring: {}, tier: 'common', visual_hints: {} };
    },
  });
  await postJson(app, '/api/skiv/crossbreed', {
    lineage_id: lineageId,
    partner_card_json: makePartnerCard(),
  });
  assert.equal(captured.biomeId, 'savana');
});

test('POST /skiv/crossbreed missing partner_card_json → 400', async () => {
  const lineageId = 'skiv-savana-2026-0427-test';
  const app = buildApp({
    store: makeStoreStub({ [lineageId]: makeShareState() }),
  });
  const r = await postJson(app, '/api/skiv/crossbreed', { lineage_id: lineageId });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'partner_card_required');
});

// ─── Slice 3: POST /api/skiv/crossbreed/confirm (persist + cooldown + rate-limit) ───

const LINEAGE = 'skiv-savana-2026-0427-test';

function rollStubOk() {
  return (input) => ({
    success: true,
    offspring: { lineage_id: 'offspring-confirmed', gene_slots: {} },
    tier: 'gold',
    visual_hints: { glow: true },
    _rng_is_fn: typeof input.context?.rng === 'function',
  });
}

test('POST /skiv/crossbreed/confirm valid → 200 confirmed + PERSISTS to history', async () => {
  const store = makeStoreStub({ [LINEAGE]: makeShareState() });
  let captured = null;
  const app = buildApp({
    store,
    rollMatingOffspring: (input) => {
      captured = input;
      return rollStubOk()(input);
    },
  });
  const r = await postJson(app, '/api/skiv/crossbreed/confirm', {
    lineage_id: LINEAGE,
    partner_card_json: makePartnerCard(),
    biome_id: 'caverna',
    campaign_id: 'camp-A',
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.confirmed, true);
  assert.equal(r.body.offspring.lineage_id, 'offspring-confirmed');
  assert.equal(r.body.tier, 'gold'); // schema-valid engine tier (no-glow/gold/rainbow)
  // engine got a seeded rng (preview-integrity) + a numeric crossbreed_seed echoed.
  assert.equal(typeof captured.context.rng, 'function');
  assert.equal(typeof r.body.crossbreed_seed, 'number');
  // PERSISTED: schema-compliant event (skiv_companion item is
  // additionalProperties:false -> with_lineage_id, NOT campaign_id/partner_lineage_id).
  // Cooldown campaign_id is tracked in-memory, never on the history item.
  const hist = store.getCrossbreedHistory(LINEAGE);
  assert.equal(hist.length, 1);
  assert.equal(hist[0].with_lineage_id, 'partner-lineage-9999');
  assert.equal(hist[0].offspring_lineage_id, 'offspring-confirmed');
  assert.equal(hist[0].campaign_id, undefined); // NOT persisted (schema-forbidden)
});

test('POST /skiv/crossbreed/confirm seed echo: a passed crossbreed_seed is reused (preview-match)', async () => {
  const store = makeStoreStub({ [LINEAGE]: makeShareState() });
  const app = buildApp({ store, rollMatingOffspring: rollStubOk() });
  const r = await postJson(app, '/api/skiv/crossbreed/confirm', {
    lineage_id: LINEAGE,
    partner_card_json: makePartnerCard(),
    campaign_id: 'camp-seed',
    crossbreed_seed: 123456,
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.crossbreed_seed, 123456);
});

test('POST /skiv/crossbreed/confirm cooldown: 2nd confirm same campaign → 409', async () => {
  const store = makeStoreStub({ [LINEAGE]: makeShareState() });
  const app = buildApp({ store, rollMatingOffspring: rollStubOk() });
  const body = {
    lineage_id: LINEAGE,
    partner_card_json: makePartnerCard(),
    campaign_id: 'camp-dup',
  };
  const r1 = await postJson(app, '/api/skiv/crossbreed/confirm', body);
  assert.equal(r1.status, 200);
  const r2 = await postJson(app, '/api/skiv/crossbreed/confirm', body);
  assert.equal(r2.status, 409);
  assert.equal(r2.body.error, 'crossbreed_cooldown_active');
});

test('POST /skiv/crossbreed/confirm different campaigns are allowed (cooldown is per-campaign)', async () => {
  const store = makeStoreStub({ [LINEAGE]: makeShareState() });
  const app = buildApp({ store, rollMatingOffspring: rollStubOk() });
  const mk = (cid) => ({
    lineage_id: LINEAGE,
    partner_card_json: makePartnerCard(),
    campaign_id: cid,
  });
  assert.equal((await postJson(app, '/api/skiv/crossbreed/confirm', mk('c1'))).status, 200);
  assert.equal((await postJson(app, '/api/skiv/crossbreed/confirm', mk('c2'))).status, 200);
});

test('POST /skiv/crossbreed/confirm missing campaign_id → 400', async () => {
  const store = makeStoreStub({ [LINEAGE]: makeShareState() });
  const app = buildApp({ store, rollMatingOffspring: rollStubOk() });
  const r = await postJson(app, '/api/skiv/crossbreed/confirm', {
    lineage_id: LINEAGE,
    partner_card_json: makePartnerCard(),
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'campaign_id_required');
});

test('POST /skiv/crossbreed/confirm rate-limit: 11th request in-window → 429', async () => {
  const store = makeStoreStub({ [LINEAGE]: makeShareState() });
  const app = buildApp({ store, rollMatingOffspring: rollStubOk() });
  let last;
  for (let i = 0; i < 11; i += 1) {
    last = await postJson(app, '/api/skiv/crossbreed/confirm', {
      lineage_id: LINEAGE,
      partner_card_json: makePartnerCard(),
      campaign_id: `camp-rl-${i}`, // distinct campaigns -> cooldown never trips
    });
  }
  assert.equal(last.status, 429);
  assert.equal(last.body.error, 'rate_limited');
});

test('POST /skiv/crossbreed/confirm re-uses the validation gates (404 / 400 / 422)', async () => {
  // 404 unknown local
  let app = buildApp({ store: makeStoreStub(), rollMatingOffspring: rollStubOk() });
  let r = await postJson(app, '/api/skiv/crossbreed/confirm', {
    lineage_id: 'nope',
    partner_card_json: makePartnerCard(),
    campaign_id: 'c',
  });
  assert.equal(r.status, 404);
  // 400 signature mismatch
  app = buildApp({
    store: makeStoreStub({ [LINEAGE]: makeShareState() }),
    rollMatingOffspring: rollStubOk(),
  });
  const bad = makePartnerCard();
  bad.companion_card_signature = 'deadbeef'.repeat(8);
  r = await postJson(app, '/api/skiv/crossbreed/confirm', {
    lineage_id: LINEAGE,
    partner_card_json: bad,
    campaign_id: 'c',
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'signature_mismatch');
  // 422 narrative partner (no species_id)
  app = buildApp({
    store: makeStoreStub({ [LINEAGE]: makeShareState() }),
    rollMatingOffspring: rollStubOk(),
  });
  r = await postJson(app, '/api/skiv/crossbreed/confirm', {
    lineage_id: LINEAGE,
    partner_card_json: makePartnerCard({ species_id: undefined }),
    campaign_id: 'c',
  });
  assert.equal(r.status, 422);
  assert.equal(r.body.error, 'crossbreed_requires_biological');
});

test('POST /skiv/crossbreed (proposal, slice 2) now returns a crossbreed_seed for preview-match', async () => {
  const store = makeStoreStub({ [LINEAGE]: makeShareState() });
  const app = buildApp({ store, rollMatingOffspring: rollStubOk() });
  const r = await postJson(app, '/api/skiv/crossbreed', {
    lineage_id: LINEAGE,
    partner_card_json: makePartnerCard(),
  });
  assert.equal(r.status, 200);
  assert.equal(typeof r.body.crossbreed_seed, 'number');
});
