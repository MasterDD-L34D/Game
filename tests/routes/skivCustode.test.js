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
    signatureFor,
    _states: states,
  };
}

function buildApp({ store, rollMatingOffspring, offspringStore } = {}) {
  const app = express();
  app.use(express.json());
  app.use('/api', createCompanionRouter({ store, rollMatingOffspring, offspringStore }));
  return app;
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
