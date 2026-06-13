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
