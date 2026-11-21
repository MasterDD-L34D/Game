// S1 polish Phase 1 — Skiv companion state store + schema invariants.
//
// Test coverage:
//   1. Save + retrieve roundtrip (in-memory)
//   2. Schema invariant rejection (missing lineage_id, wrong version)
//   3. Signature deterministic cross-call (same state → same hash)
//   4. Privacy whitelist enforcement (PII fields stripped pre-persist)
//   5. Cap 10 ambassador FIFO eviction
//   6. Backward-compat 0.1.0 reader (migrateLegacyState)
//   7. Crossbreed history append idempotent + FIFO 10
//   8. getCrossbreedHistory filtered by lineage_id
//   9. Signature changes when whitelist content changes
//  10. AJV schema canonical accepts v0.2.0 valid sample
//
// Reference: ADR-2026-04-27 §A schema, §D privacy whitelist, sprint-plan Phase 1.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// AJV harness aligned with apps/backend/middleware/schemaValidator.js (no ajv-formats dep).
let Ajv;
try {
  Ajv = require('ajv/dist/2020');
} catch (err) {
  if (err && err.code !== 'MODULE_NOT_FOUND') throw err;
  Ajv = require('ajv');
}

function makeAjv() {
  const ajv = new Ajv({ strict: false, allErrors: true });
  ajv.addFormat('date-time', true);
  ajv.addFormat('uri', true);
  return ajv;
}

const {
  createCompanionStateStore,
  signatureFor,
  sanitizeWhitelist,
  migrateLegacyState,
  isLegacySchema,
  fifoBounded,
  AMBASSADOR_CAP_PER_NIDO,
  CROSSBREED_HISTORY_MAX_ENTRIES,
  CURRENT_SCHEMA_VERSION,
  WHITELIST_TOP_FIELDS,
} = require('../../apps/backend/services/skiv/companionStateStore');

const skivCompanionSchema = require('../../packages/contracts/schemas/skiv_companion.schema.json');

function makeValidState(overrides = {}) {
  return {
    schema_version: '0.2.0',
    unit_id: 'skiv',
    species_id: 'dune_stalker',
    biome_id: 'savana',
    lineage_id: 'skiv-savana-2026-0427-test',
    companion_card_signature: null,
    mbti_axes: {
      E_I: { value: 0.68, coverage: 'full' },
      T_F: { value: 0.72, coverage: 'full' },
      S_N: { value: 0.22, coverage: 'full' },
      J_P: { value: 0.32, coverage: 'full' },
    },
    crossbreed_history: [],
    voice_diary_portable: [],
    share_url: null,
    ...overrides,
  };
}

// ─── 1. Save + retrieve roundtrip ───────────────────────────────────────

test('Phase 1: saveCompanionState + getCompanionState roundtrip', () => {
  const store = createCompanionStateStore();
  const saved = store.saveCompanionState(makeValidState());
  assert.equal(saved.lineage_id, 'skiv-savana-2026-0427-test');
  assert.equal(saved.schema_version, '0.2.0');
  assert.match(saved.companion_card_signature, /^[a-f0-9]{64}$/);
  const fetched = store.getCompanionState('skiv-savana-2026-0427-test');
  assert.deepEqual(fetched, saved);
  assert.equal(store.getCompanionState('unknown'), null);
});

// ─── 2. Schema invariant rejection ──────────────────────────────────────

test('Phase 1: saveCompanionState rejects missing lineage_id', () => {
  const store = createCompanionStateStore();
  assert.throws(() => store.saveCompanionState(makeValidState({ lineage_id: '' })), /lineage_id/);
  assert.throws(
    () => store.saveCompanionState(makeValidState({ lineage_id: undefined })),
    /lineage_id/,
  );
});

test('Phase 1: saveCompanionState rejects wrong schema_version', () => {
  const store = createCompanionStateStore();
  assert.throws(
    () => store.saveCompanionState(makeValidState({ schema_version: '0.3.0' })),
    /schema_version/,
  );
});

// ─── 3. Signature deterministic ─────────────────────────────────────────

test('Phase 1: signatureFor is deterministic across calls (same state → same hash)', () => {
  const state = makeValidState();
  const sig1 = signatureFor(state);
  const sig2 = signatureFor(state);
  assert.equal(sig1, sig2);
  assert.match(sig1, /^[a-f0-9]{64}$/);
  // Property order independence (canonical-JSON sorts keys).
  const reordered = {
    biome_id: state.biome_id,
    schema_version: state.schema_version,
    unit_id: state.unit_id,
    species_id: state.species_id,
    lineage_id: state.lineage_id,
    companion_card_signature: state.companion_card_signature,
    mbti_axes: state.mbti_axes,
    crossbreed_history: state.crossbreed_history,
    voice_diary_portable: state.voice_diary_portable,
    share_url: state.share_url,
  };
  assert.equal(signatureFor(reordered), sig1);
});

test('Phase 1: signatureFor changes when whitelist content changes', () => {
  const a = makeValidState();
  const b = makeValidState({ biome_id: 'tundra' });
  assert.notEqual(signatureFor(a), signatureFor(b));
});

// ─── 4. Privacy whitelist enforcement ───────────────────────────────────

test('Phase 1: sanitizeWhitelist drops PII fields (session_id, _notes, email)', () => {
  const dirty = {
    ...makeValidState(),
    session_id: 'sess_secret_123',
    _notes: 'private trainer note',
    email: 'leak@example.com',
    ip_address: '192.0.2.1',
    diary: [{ ts: '2026-04-26T00:00:00Z', payload: { secret: true } }],
  };
  const clean = sanitizeWhitelist(dirty);
  assert.equal('session_id' in clean, false);
  assert.equal('_notes' in clean, false);
  assert.equal('email' in clean, false);
  assert.equal('ip_address' in clean, false);
  assert.equal('diary' in clean, false);
  // Whitelist fields preserved.
  assert.equal(clean.unit_id, 'skiv');
  assert.equal(clean.lineage_id, 'skiv-savana-2026-0427-test');
});

test('Phase 1: saveCompanionState does not persist PII fields', () => {
  const store = createCompanionStateStore();
  const stored = store.saveCompanionState({
    ...makeValidState(),
    session_id: 'sess_leaked',
    _notes: 'should not survive',
    diary: [{ ts: 'x', payload: 'pii' }],
  });
  assert.equal('session_id' in stored, false);
  assert.equal('_notes' in stored, false);
  assert.equal('diary' in stored, false);
  // Signature computed only over whitelist (no PII influence).
  const cleanSig = signatureFor(makeValidState());
  assert.equal(stored.companion_card_signature, cleanSig);
});

// ─── 5. Cap 10 ambassador FIFO eviction ─────────────────────────────────

test('Phase 1: ambassador cap 10 + FIFO eviction at 11th add', () => {
  const store = createCompanionStateStore();
  for (let i = 0; i < AMBASSADOR_CAP_PER_NIDO; i++) {
    store.saveCompanionState(
      makeValidState({ lineage_id: `skiv-test-${String(i).padStart(2, '0')}-aaaa` }),
    );
  }
  assert.equal(store.size(), AMBASSADOR_CAP_PER_NIDO);
  assert.equal(store.getCompanionState('skiv-test-00-aaaa').lineage_id, 'skiv-test-00-aaaa');
  // 11th add → oldest (00) evicted.
  store.saveCompanionState(makeValidState({ lineage_id: 'skiv-test-99-eleventh' }));
  assert.equal(store.size(), AMBASSADOR_CAP_PER_NIDO);
  assert.equal(store.getCompanionState('skiv-test-00-aaaa'), null);
  assert.equal(
    store.getCompanionState('skiv-test-99-eleventh').lineage_id,
    'skiv-test-99-eleventh',
  );
});

test('Phase 1: re-saving existing lineage does not trigger eviction', () => {
  const store = createCompanionStateStore({ ambassadorCap: 3 });
  store.saveCompanionState(makeValidState({ lineage_id: 'skiv-aaa-test' }));
  store.saveCompanionState(makeValidState({ lineage_id: 'skiv-bbb-test' }));
  store.saveCompanionState(makeValidState({ lineage_id: 'skiv-ccc-test' }));
  assert.equal(store.size(), 3);
  // Re-save aaa → no eviction (already present).
  store.saveCompanionState(makeValidState({ lineage_id: 'skiv-aaa-test', biome_id: 'tundra' }));
  assert.equal(store.size(), 3);
  assert.equal(store.getCompanionState('skiv-aaa-test').biome_id, 'tundra');
  assert.notEqual(store.getCompanionState('skiv-bbb-test'), null);
});

// ─── 5b. Per-owner cap (SPEC-F Nido isolation, Option A) ────────────────

test('Phase 1: per-owner cap isolates FIFO eviction (isolate + owner)', () => {
  const store = createCompanionStateStore({ ambassadorCap: 2 });
  const put = (id, owner) =>
    store.saveCompanionState(makeValidState({ lineage_id: id }), { owner, isolate: true });
  put('A-one-xxxx', 'A');
  put('A-two-xxxx', 'A'); // A at cap 2
  put('B-one-xxxx', 'B');
  put('B-two-xxxx', 'B'); // B at cap 2 -- must NOT evict any of A's (per-owner, not global)
  assert.equal(store.size(), 4); // both Nidos hold their full cap
  assert.ok(store.getCompanionState('A-one-xxxx'));
  // A's 3rd add evicts A's OWN oldest (A-one), never B's
  put('A-three-xx', 'A');
  assert.equal(store.getCompanionState('A-one-xxxx'), null); // A's oldest gone
  assert.ok(store.getCompanionState('A-two-xxxx'));
  assert.ok(store.getCompanionState('B-one-xxxx')); // B untouched
  assert.ok(store.getCompanionState('B-two-xxxx'));
  assert.ok(store.getCompanionState('A-three-xx'));
  assert.equal(store.size(), 4);
});

test('Phase 1: isolate=false keeps the GLOBAL cap (byte-identical default)', () => {
  const store = createCompanionStateStore({ ambassadorCap: 2 });
  // owners passed but isolate off -> global cap 2, cross-owner eviction (current behavior)
  store.saveCompanionState(makeValidState({ lineage_id: 'A-one-xxxx' }), {
    owner: 'A',
    isolate: false,
  });
  store.saveCompanionState(makeValidState({ lineage_id: 'B-one-xxxx' }), {
    owner: 'B',
    isolate: false,
  });
  store.saveCompanionState(makeValidState({ lineage_id: 'B-two-xxxx' }), {
    owner: 'B',
    isolate: false,
  });
  assert.equal(store.size(), 2);
  assert.equal(store.getCompanionState('A-one-xxxx'), null); // A-one (oldest global) evicted
});

// ─── 6. Backward-compat 0.1.0 reader ────────────────────────────────────

test('Phase 1: isLegacySchema detects 0.1.x', () => {
  assert.equal(isLegacySchema({ schema_version: '0.1.0' }), true);
  assert.equal(isLegacySchema({ schema_version: '0.1.99' }), true);
  assert.equal(isLegacySchema({ schema_version: '0.2.0' }), false);
  assert.equal(isLegacySchema({}), true); // missing version = legacy
});

test('Phase 1: migrateLegacyState bumps 0.1.0 → 0.2.0 + initializes new fields', () => {
  const legacy = {
    schema_version: '0.1.0',
    unit_id: 'skiv',
    species_id: 'dune_stalker',
    biome_id: 'savana',
    mbti_axes: { E_I: { value: 0.5, coverage: 'partial' } },
  };
  const migrated = migrateLegacyState(legacy);
  assert.equal(migrated.schema_version, CURRENT_SCHEMA_VERSION);
  assert.equal(migrated.lineage_id, 'skiv-savana-legacy-skiv');
  assert.deepEqual(migrated.crossbreed_history, []);
  assert.deepEqual(migrated.voice_diary_portable, []);
  assert.equal(migrated.share_url, null);
  assert.equal(migrated.companion_card_signature, null);
  // Existing fields preserved.
  assert.equal(migrated.unit_id, 'skiv');
  assert.deepEqual(migrated.mbti_axes.E_I, { value: 0.5, coverage: 'partial' });
});

test('Phase 1: saveCompanionState auto-migrates 0.1.0 input', () => {
  const store = createCompanionStateStore();
  const stored = store.saveCompanionState({
    schema_version: '0.1.0',
    unit_id: 'skiv',
    species_id: 'dune_stalker',
    biome_id: 'savana',
  });
  assert.equal(stored.schema_version, '0.2.0');
  assert.match(stored.companion_card_signature, /^[a-f0-9]{64}$/);
  assert.deepEqual(stored.crossbreed_history, []);
});

// ─── 7. Crossbreed history append + FIFO 10 ─────────────────────────────

test('Phase 1: addCrossbreedEvent appends + recomputes signature', () => {
  const store = createCompanionStateStore();
  store.saveCompanionState(makeValidState());
  const sigBefore = store.getCompanionState('skiv-savana-2026-0427-test').companion_card_signature;
  const updated = store.addCrossbreedEvent('skiv-savana-2026-0427-test', {
    role: 'parent_a',
    with_lineage_id: 'skiv-tundra-other',
    offspring_lineage_id: 'skiv-savana-offspring-x',
    biome_at_crossbreed: 'savana',
    biome_environmental_mutation: 'frost_resilience',
    tier: 'gold',
  });
  assert.equal(updated.crossbreed_history.length, 1);
  assert.equal(updated.crossbreed_history[0].role, 'parent_a');
  assert.match(updated.crossbreed_history[0].ts, /^\d{4}-\d{2}-\d{2}T/);
  assert.notEqual(updated.companion_card_signature, sigBefore);
});

test('Phase 1: addCrossbreedEvent throws on unknown lineage_id', () => {
  const store = createCompanionStateStore();
  assert.throws(
    () => store.addCrossbreedEvent('skiv-nonexistent', { role: 'parent_a' }),
    /no state for lineage_id/,
  );
});

test('Phase 1: crossbreed_history FIFO bounded to 10 entries', () => {
  const store = createCompanionStateStore();
  store.saveCompanionState(makeValidState());
  for (let i = 0; i < 12; i++) {
    store.addCrossbreedEvent('skiv-savana-2026-0427-test', {
      role: 'parent_a',
      with_lineage_id: `partner-${i}`,
      tier: 'no-glow',
    });
  }
  const history = store.getCrossbreedHistory('skiv-savana-2026-0427-test');
  assert.equal(history.length, CROSSBREED_HISTORY_MAX_ENTRIES);
  // Oldest 2 entries (with_lineage_id partner-0, partner-1) evicted FIFO.
  assert.equal(history[0].with_lineage_id, 'partner-2');
  assert.equal(history[history.length - 1].with_lineage_id, 'partner-11');
});

// ─── 8. getCrossbreedHistory filter by lineage_id ───────────────────────

test('Phase 1: getCrossbreedHistory returns [] for unknown lineage', () => {
  const store = createCompanionStateStore();
  assert.deepEqual(store.getCrossbreedHistory('unknown'), []);
});

test('Phase 1: getCrossbreedHistory isolated per lineage_id', () => {
  const store = createCompanionStateStore();
  store.saveCompanionState(makeValidState({ lineage_id: 'skiv-aaa-test' }));
  store.saveCompanionState(makeValidState({ lineage_id: 'skiv-bbb-test' }));
  store.addCrossbreedEvent('skiv-aaa-test', { role: 'parent_a', tier: 'gold' });
  store.addCrossbreedEvent('skiv-bbb-test', { role: 'parent_b', tier: 'rainbow' });
  store.addCrossbreedEvent('skiv-bbb-test', { role: 'offspring', tier: 'no-glow' });
  assert.equal(store.getCrossbreedHistory('skiv-aaa-test').length, 1);
  assert.equal(store.getCrossbreedHistory('skiv-bbb-test').length, 2);
  assert.equal(store.getCrossbreedHistory('skiv-aaa-test')[0].tier, 'gold');
});

// ─── 9. fifoBounded helper ──────────────────────────────────────────────

test('Phase 1: fifoBounded preserves last N entries', () => {
  assert.deepEqual(fifoBounded([1, 2, 3], 5), [1, 2, 3]);
  assert.deepEqual(fifoBounded([1, 2, 3, 4, 5, 6], 3), [4, 5, 6]);
  assert.deepEqual(fifoBounded([], 5), []);
  assert.deepEqual(fifoBounded(null, 5), []);
});

// ─── 10. AJV schema canonical accepts v0.2.0 valid sample ───────────────

test('Phase 1: AJV schema canonical accepts valid v0.2.0 state', () => {
  const ajv = makeAjv();
  const validate = ajv.compile(skivCompanionSchema);
  const state = makeValidState({
    companion_card_signature: 'a'.repeat(64),
    crossbreed_history: [
      {
        ts: '2026-04-27T12:00:00Z',
        role: 'parent_a',
        with_lineage_id: 'partner-x',
        partner_card_signature: 'b'.repeat(64),
        offspring_lineage_id: 'skiv-offspring-y',
        biome_at_crossbreed: 'savana',
        biome_environmental_mutation: 'frost_resilience',
        tier: 'gold',
      },
    ],
    voice_diary_portable: [
      {
        ts: '2026-04-26T01:00:00Z',
        phase: 'mature',
        voice_line: 'Sabbia segue.',
        trigger_event: 'synergy_triggered',
      },
    ],
  });
  const ok = validate(state);
  assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
});

test('Phase 1: AJV schema rejects schema_version 0.1.x', () => {
  const ajv = makeAjv();
  const validate = ajv.compile(skivCompanionSchema);
  const state = makeValidState({ schema_version: '0.1.0' });
  assert.equal(validate(state), false);
});

test('Phase 1: AJV schema rejects crossbreed_history > 10 entries', () => {
  const ajv = makeAjv();
  const validate = ajv.compile(skivCompanionSchema);
  const state = makeValidState({
    crossbreed_history: Array.from({ length: 11 }, (_, i) => ({
      ts: '2026-04-27T12:00:00Z',
      role: 'parent_a',
      with_lineage_id: `partner-${i}`,
    })),
  });
  assert.equal(validate(state), false);
});

// ─── Whitelist coverage (constants are stable across releases) ──────────

test('Phase 1: WHITELIST_TOP_FIELDS includes critical share-safe fields', () => {
  assert.ok(WHITELIST_TOP_FIELDS.includes('lineage_id'));
  assert.ok(WHITELIST_TOP_FIELDS.includes('companion_card_signature'));
  assert.ok(WHITELIST_TOP_FIELDS.includes('crossbreed_history'));
  assert.ok(WHITELIST_TOP_FIELDS.includes('voice_diary_portable'));
  // PII MUST NOT be in whitelist (defense-in-depth).
  assert.equal(WHITELIST_TOP_FIELDS.includes('session_id'), false);
  assert.equal(WHITELIST_TOP_FIELDS.includes('_notes'), false);
  assert.equal(WHITELIST_TOP_FIELDS.includes('email'), false);
  assert.equal(WHITELIST_TOP_FIELDS.includes('diary'), false);
});

// ─── Persist-all-fields + bulk-hydrate (TKT-PERSISTENCE-LAYER) ───────────
//
// A faithful fake Prisma delegate (rows Map = the DB). Exercises the REAL store's
// persistAsync -> row -> fromPrismaRow -> hydrateAllAsync path across a simulated
// restart (a NEW store instance over the SAME rows), per lesson_durable_test_must_hydrate
// (an in-memory-shared stub "persists" trivially and would hide the truncation).

function makeFakePrisma() {
  const rows = new Map(); // lineageId -> row
  let clock = 0; // monotonic stand-in for @updatedAt (Prisma stamps it server-side)
  return {
    rows,
    skivCompanionState: {
      async upsert({ where, create, update }) {
        const existing = rows.get(where.lineageId);
        const updatedAt = ++clock;
        // createdAt stamps ONCE at insert (like Prisma @default(now())); updates
        // bump updatedAt only -- the FIFO index sorts on createdAt (Codex P2).
        rows.set(
          where.lineageId,
          existing
            ? { ...existing, ...update, updatedAt }
            : { ...create, createdAt: updatedAt, updatedAt },
        );
        return rows.get(where.lineageId);
      },
      async findUnique({ where }) {
        return rows.get(where.lineageId) || null;
      },
      async update({ where, data }) {
        const existing = rows.get(where.lineageId);
        if (!existing) throw new Error(`update: no row for ${where.lineageId}`);
        rows.set(where.lineageId, { ...existing, ...data, updatedAt: ++clock });
        return rows.get(where.lineageId);
      },
      async findMany(args = {}) {
        let list = [...rows.values()];
        // Honor orderBy like real Prisma: object or array form, updatedAt with an
        // optional lineageId tiebreaker (reviewer finding: the earlier mock ignored
        // 'asc' entirely, so the isolate-hydrate test passed by insertion-order
        // coincidence instead of exercising the query's contract).
        const orderBy = Array.isArray(args.orderBy)
          ? args.orderBy
          : args.orderBy
            ? [args.orderBy]
            : [];
        if (orderBy.length > 0) {
          const NUMERIC = new Set(['updatedAt', 'createdAt']);
          list.sort((a, b) => {
            for (const clause of orderBy) {
              const [field, dir] = Object.entries(clause)[0];
              const av = NUMERIC.has(field) ? a[field] || 0 : a[field] || '';
              const bv = NUMERIC.has(field) ? b[field] || 0 : b[field] || '';
              if (av < bv) return dir === 'asc' ? -1 : 1;
              if (av > bv) return dir === 'asc' ? 1 : -1;
            }
            return 0;
          });
        }
        if (Number.isFinite(args.take)) list = list.slice(0, args.take);
        return list;
      },
    },
  };
}

const flush = () => new Promise((r) => setImmediate(r));

test('persistence-layer: full card (species/progression) survives a restart via bulk-hydrate', async () => {
  const prisma = makeFakePrisma();
  const store = createCompanionStateStore({ prisma });
  assert.equal(store._mode, 'prisma');
  store.saveCompanionState(
    makeValidState({
      lineage_id: 'skiv-persist-full-0001',
      species_id: 'dune_stalker',
      biome_id: 'savana',
      progression: { level: 7, xp: 4200 },
      cabinet: { unlocked: ['thought-a', 'thought-b'] },
      mutations: [{ id: 'frost', ts: '2026-04-27T00:00:00Z' }],
      aspect: { name: 'ashen' },
    }),
  );
  await flush(); // let the fire-and-forget persistAsync upsert settle

  // Simulate restart: a fresh store over the SAME persisted rows starts EMPTY.
  const store2 = createCompanionStateStore({ prisma });
  assert.equal(store2.getCompanionState('skiv-persist-full-0001'), null);
  const n = await store2.hydrateAllAsync();
  assert.equal(n, 1);

  const card = store2.getCompanionState('skiv-persist-full-0001');
  assert.ok(card, 'card hydrated after restart');
  // These were UNDEFINED before persist-all-fields (only 6 columns survived).
  assert.equal(card.species_id, 'dune_stalker');
  assert.equal(card.biome_id, 'savana');
  assert.equal(card.progression.level, 7);
  assert.deepEqual(card.cabinet.unlocked, ['thought-a', 'thought-b']);
  assert.equal(card.mutations[0].id, 'frost');
  assert.equal(card.aspect.name, 'ashen');
  assert.equal(card.mbti_axes.E_I.value, 0.68);
  // Signature is preserved (computed at save-time, stored inside the blob).
  assert.match(card.companion_card_signature, /^[a-f0-9]{64}$/);
});

test('persistence-layer: fromPrismaRow falls back to 6 legacy columns when state is NULL', async () => {
  const prisma = makeFakePrisma();
  // A pre-migration row: 6 columns present, no `state` blob (NULL).
  prisma.rows.set('skiv-legacy-0002', {
    lineageId: 'skiv-legacy-0002',
    schemaVersion: '0.2.0',
    signature: 'c'.repeat(64),
    crossbreedHistory: [{ role: 'parent_a', tier: 'gold' }],
    voiceDiaryPortable: [],
    shareUrl: 'https://example.test/skiv/share/skiv-legacy-0002',
    state: null,
  });
  const store = createCompanionStateStore({ prisma });
  const n = await store.hydrateAllAsync();
  assert.equal(n, 1);
  const card = store.getCompanionState('skiv-legacy-0002');
  assert.ok(card, 'legacy row reconstructs from the 6 columns without crashing');
  assert.equal(card.lineage_id, 'skiv-legacy-0002');
  assert.equal(card.share_url, 'https://example.test/skiv/share/skiv-legacy-0002');
  assert.equal(card.crossbreed_history[0].tier, 'gold');
  // The truncated fields are genuinely absent for a legacy row (unchanged behaviour).
  assert.equal(card.species_id, undefined);
  assert.equal(card.progression, undefined);
});

test('persistence-layer: hydrateAllAsync is a no-op (0) for an in-memory store', async () => {
  const store = createCompanionStateStore();
  assert.equal(store._mode, 'in-memory');
  assert.equal(await store.hydrateAllAsync(), 0);
});

// ─── Option C: durable per-Nido cap (owner column + isolate hydrate) ─────

test('option-c: owner persists on owned writes and survives ownerless follow-ups', async () => {
  const prisma = makeFakePrisma();
  const store = createCompanionStateStore({ prisma });
  store.saveCompanionState(makeValidState({ lineage_id: 'skiv-ownc-keep-01' }), {
    owner: 'player-alpha',
    isolate: true,
  });
  await flush();
  assert.equal(prisma.rows.get('skiv-ownc-keep-01').owner, 'player-alpha');
  // Internal ownerless write (event append) must NOT wipe the stored owner.
  store.addCrossbreedEvent('skiv-ownc-keep-01', { role: 'parent_a', tier: 'gold' });
  await flush();
  assert.equal(prisma.rows.get('skiv-ownc-keep-01').owner, 'player-alpha');
});

test('option-c: isolate hydrate rebuilds per-owner windows + FIFO stays per-owner', async () => {
  const prisma = makeFakePrisma();
  const cap = 2;
  const store = createCompanionStateStore({ prisma, ambassadorCap: cap });
  // Owner A saves cap+1 (oldest FIFO-evicted from memory; all 3 rows persisted),
  // owner B saves 1, one ownerless (anon bucket).
  for (let i = 0; i < cap + 1; i += 1) {
    store.saveCompanionState(makeValidState({ lineage_id: `skiv-ownc-a${i}-000` }), {
      owner: 'nido-a',
      isolate: true,
    });
  }
  store.saveCompanionState(makeValidState({ lineage_id: 'skiv-ownc-b0-000' }), {
    owner: 'nido-b',
    isolate: true,
  });
  store.saveCompanionState(makeValidState({ lineage_id: 'skiv-ownc-anon-000' }), {
    owner: null,
    isolate: true,
  });
  await flush();
  assert.equal(prisma.rows.size, cap + 3, 'all rows persisted (eviction never deletes)');

  // Restart with isolation ON: per-owner windows, NOT the global take:cap.
  const store2 = createCompanionStateStore({ prisma, ambassadorCap: cap });
  const n = await store2.hydrateAllAsync({ isolate: true });
  assert.equal(n, cap + 2, "A's newest 2 + B's 1 + anon 1 (A's evicted oldest stays out)");
  assert.equal(store2.getCompanionState('skiv-ownc-a0-000'), null, 'A oldest not revived');
  assert.ok(store2.getCompanionState('skiv-ownc-a2-000'), 'A newest hydrated');
  assert.ok(store2.getCompanionState('skiv-ownc-b0-000'), 'B hydrated (own window)');
  assert.ok(store2.getCompanionState('skiv-ownc-anon-000'), 'anon hydrated (ANON bucket)');

  // Post-hydrate FIFO is per-owner: a new A save evicts A's oldest KEPT, never B/anon.
  store2.saveCompanionState(makeValidState({ lineage_id: 'skiv-ownc-a3-000' }), {
    owner: 'nido-a',
    isolate: true,
  });
  assert.equal(store2.getCompanionState('skiv-ownc-a1-000'), null, "A's oldest-kept evicted");
  assert.ok(store2.getCompanionState('skiv-ownc-b0-000'), 'B untouched');
  assert.ok(store2.getCompanionState('skiv-ownc-anon-000'), 'anon untouched');
});

test('option-c: ownerless update does not turn the rebuilt FIFO into an LRU (Codex P2)', async () => {
  const prisma = makeFakePrisma();
  const cap = 2;
  const store = createCompanionStateStore({ prisma, ambassadorCap: cap });
  // Owner A inserts oldest then newest; the OLDEST then receives an ownerless
  // event append (bumps updatedAt, createdAt untouched).
  store.saveCompanionState(makeValidState({ lineage_id: 'skiv-lru-old-000' }), {
    owner: 'nido-a',
    isolate: true,
  });
  store.saveCompanionState(makeValidState({ lineage_id: 'skiv-lru-new-000' }), {
    owner: 'nido-a',
    isolate: true,
  });
  store.addCrossbreedEvent('skiv-lru-old-000', { role: 'parent_a', tier: 'gold' });
  await flush();

  // Restart: the rebuilt index must be INSERTION order (old first), not LRU.
  const store2 = createCompanionStateStore({ prisma, ambassadorCap: cap });
  await store2.hydrateAllAsync({ isolate: true });
  // Next save at cap must evict the true oldest-INSERTED (skiv-lru-old-000),
  // even though its updatedAt is now the newest of the two.
  store2.saveCompanionState(makeValidState({ lineage_id: 'skiv-lru-third-00' }), {
    owner: 'nido-a',
    isolate: true,
  });
  assert.equal(
    store2.getCompanionState('skiv-lru-old-000'),
    null,
    'true oldest evicted despite the newer updatedAt',
  );
  assert.ok(store2.getCompanionState('skiv-lru-new-000'), 'newer quiet lineage survives');
  assert.ok(store2.getCompanionState('skiv-lru-third-00'));
});

// ─── Durable crossbreed cooldown (crossbreed_campaigns column) ───────────

test('cooldown: record/get + idempotent + FIFO cap 20', () => {
  const store = createCompanionStateStore();
  store.saveCompanionState(makeValidState({ lineage_id: 'skiv-cd-basic-000' }));
  store.recordCrossbreedCampaign('skiv-cd-basic-000', 'camp-A');
  store.recordCrossbreedCampaign('skiv-cd-basic-000', 'camp-A'); // idempotent
  store.recordCrossbreedCampaign('skiv-cd-basic-000', 'camp-B');
  assert.deepEqual(store.getCrossbreedCampaigns('skiv-cd-basic-000'), ['camp-A', 'camp-B']);
  // FIFO cap 20: 21st campaign drops the oldest.
  for (let i = 0; i < 20; i += 1) {
    store.recordCrossbreedCampaign('skiv-cd-basic-000', `camp-${i}`);
  }
  const list = store.getCrossbreedCampaigns('skiv-cd-basic-000');
  assert.equal(list.length, 20);
  assert.equal(list.includes('camp-A'), false, 'oldest dropped at cap');
  assert.ok(list.includes('camp-19'));
  // Unknown lineage / bad input -> [] (never throws).
  assert.deepEqual(store.getCrossbreedCampaigns('unknown'), []);
  assert.deepEqual(store.getCrossbreedCampaigns(null), []);
  // Defense-in-depth: an oversized campaign id is rejected (route 400s first;
  // this guards any future non-route caller from bloating the JSONB column).
  store.recordCrossbreedCampaign('skiv-cd-basic-000', 'x'.repeat(129));
  assert.equal(
    store.getCrossbreedCampaigns('skiv-cd-basic-000').some((c) => c.length > 128),
    false,
  );
});

test('cooldown: campaigns survive a restart via bulk-hydrate (durable cooldown)', async () => {
  const prisma = makeFakePrisma();
  const store = createCompanionStateStore({ prisma });
  store.saveCompanionState(makeValidState({ lineage_id: 'skiv-cd-dur-0001' }));
  await flush(); // row exists before the cooldown UPDATE fires
  store.recordCrossbreedCampaign('skiv-cd-dur-0001', 'camp-X');
  await flush();
  assert.deepEqual(prisma.rows.get('skiv-cd-dur-0001').crossbreedCampaigns, ['camp-X']);

  // Restart: fresh store, bulk-hydrate -> the cooldown set is BACK (the old
  // per-router Set reset here = the re-crossbreed exploit this closes).
  const store2 = createCompanionStateStore({ prisma });
  await store2.hydrateAllAsync();
  assert.deepEqual(store2.getCrossbreedCampaigns('skiv-cd-dur-0001'), ['camp-X']);

  // Lazy per-lineage hydrate path carries it too (guarded-write path).
  const store3 = createCompanionStateStore({ prisma });
  await store3.hydrateAsync('skiv-cd-dur-0001');
  assert.deepEqual(store3.getCrossbreedCampaigns('skiv-cd-dur-0001'), ['camp-X']);
});

test('cooldown: survives when recorded BEFORE the first card upsert lands (Codex P2 race)', async () => {
  const prisma = makeFakePrisma();
  const store = createCompanionStateStore({ prisma });
  // First-save race: confirm path records the cooldown while the lineage row does
  // NOT yet exist in Prisma (saveCompanionState's own upsert still in flight).
  // An UPDATE would throw + get swallowed -> durable cooldown silently lost.
  store.recordCrossbreedCampaign('skiv-cd-race-001', 'camp-R');
  await flush();
  assert.deepEqual(
    prisma.rows.get('skiv-cd-race-001').crossbreedCampaigns,
    ['camp-R'],
    'upsert created the row instead of failing',
  );
  // The in-flight card save then converges the same row (update branch).
  store.saveCompanionState(makeValidState({ lineage_id: 'skiv-cd-race-001' }));
  await flush();
  const row = prisma.rows.get('skiv-cd-race-001');
  assert.deepEqual(row.crossbreedCampaigns, ['camp-R'], 'cooldown kept through card save');
  assert.ok(row.state, 'card converged onto the same row');

  // Restart: BOTH the card and the cooldown hydrate.
  const store2 = createCompanionStateStore({ prisma });
  await store2.hydrateAllAsync();
  assert.ok(store2.getCompanionState('skiv-cd-race-001'));
  assert.deepEqual(store2.getCrossbreedCampaigns('skiv-cd-race-001'), ['camp-R']);
});

test('persistence-layer: bulk-hydrate respects the cap + drops FIFO-evicted rows (Codex P1)', async () => {
  const prisma = makeFakePrisma();
  const cap = 3;
  const store = createCompanionStateStore({ prisma, ambassadorCap: cap });
  // Save cap+2 lineages. The in-memory store FIFO-evicts the 2 oldest (keeps 3),
  // but every save persisted a row -> the DB holds all 5 (eviction never deletes).
  for (let i = 0; i < cap + 2; i += 1) {
    store.saveCompanionState(makeValidState({ lineage_id: `skiv-cap-${i}-000` }));
  }
  await flush();
  assert.equal(store.size(), cap, 'in-memory store held at the cap');
  assert.equal(prisma.rows.size, cap + 2, 'all rows persisted (evicted rows survive in DB)');

  // Restart: a bulk-hydrate must NOT revive the 2 evicted rows past the cap.
  const store2 = createCompanionStateStore({ prisma, ambassadorCap: cap });
  const n = await store2.hydrateAllAsync();
  assert.equal(n, cap, 'hydrated exactly the cap, not all 5');
  assert.equal(store2.size(), cap);
  // The 2 oldest (evicted, oldest updatedAt) are excluded; the 3 newest survive.
  assert.equal(store2.getCompanionState('skiv-cap-0-000'), null);
  assert.equal(store2.getCompanionState('skiv-cap-1-000'), null);
  assert.ok(store2.getCompanionState('skiv-cap-4-000'), 'newest ambassador hydrated');
});
