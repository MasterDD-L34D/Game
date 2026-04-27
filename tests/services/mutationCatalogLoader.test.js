// M14 Path A — Mutation catalog loader unit tests.
// Coverage: parse + indexes + filter + memoization + malformed YAML graceful.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  loadMutationCatalog,
  getMutation,
  listEligibleForUnit,
  DEFAULT_CATALOG_PATH,
  _resetCacheForTest,
} = require('../../apps/backend/services/mutations/mutationCatalogLoader');

test('loadMutationCatalog: returns parsed catalog with all 36 entries + indexes', () => {
  _resetCacheForTest();
  const data = loadMutationCatalog({ refresh: true });
  const entries = Object.keys(data.byId);
  // Path B rebalance 2026-04-27: 30 → 36 (+3 symbiotic +2 behavioral +1 sensorial).
  // Fixes anti-pattern S6 (ADR-2026-04-26): physiological dominance 47% → 38.9%.
  assert.equal(
    entries.length,
    36,
    'expected 36 mutations in shipped catalog (post Path B rebalance)',
  );
  assert.ok(data.byId.artigli_freeze_to_glacier, 'artigli_freeze_to_glacier present');
  assert.ok(data.byId.ferocia_to_supercritical, 'ferocia_to_supercritical present');
  assert.ok(data.byId.simbionte_micorriza_radici, 'simbionte_micorriza_radici (Path B) present');
  assert.equal(data.schema_version, '0.1.0');
  assert.ok(data.byCategory.physiological && data.byCategory.physiological.length > 0);
  assert.ok(data.byTier['2'] && data.byTier['2'].length > 0);
  assert.ok(data.byTier['3'] && data.byTier['3'].length > 0);
});

test('byId / byCategory / byTier indexes are correct', () => {
  _resetCacheForTest();
  const data = loadMutationCatalog({ refresh: true });
  // byId entries should be enriched with `id` field.
  for (const [id, entry] of Object.entries(data.byId)) {
    assert.equal(entry.id, id, `byId[${id}].id matches key`);
  }
  // byCategory groups all entries.
  let totalByCategory = 0;
  for (const arr of Object.values(data.byCategory)) totalByCategory += arr.length;
  assert.equal(totalByCategory, 36);
  // byTier groups all entries.
  let totalByTier = 0;
  for (const arr of Object.values(data.byTier)) totalByTier += arr.length;
  assert.equal(totalByTier, 36);
});

test('listEligibleForUnit: filters by trait prerequisites', () => {
  _resetCacheForTest();
  // Unit con artigli_ipo_termici → unlocks artigli_freeze_to_glacier.
  const unit = { id: 'u1', trait_ids: ['artigli_ipo_termici'] };
  const eligible = listEligibleForUnit(unit);
  const ids = eligible.map((e) => e.id);
  assert.ok(ids.includes('artigli_freeze_to_glacier'), 'artigli_freeze_to_glacier eligible');
  // Unit senza prereq → no match per quella mutation.
  const empty = listEligibleForUnit({ id: 'u2', trait_ids: [] });
  assert.equal(
    empty.find((e) => e.id === 'artigli_freeze_to_glacier'),
    undefined,
  );
});

test('listEligibleForUnit: honors mutation chain prereq (applied_mutations)', () => {
  _resetCacheForTest();
  // ferocia_to_supercritical richiede traits=[ferocia] + mutations=[rage_simple_to_super]
  const unitNoChain = { id: 'u1', trait_ids: ['ferocia'], applied_mutations: [] };
  const eligibleNoChain = listEligibleForUnit(unitNoChain).map((e) => e.id);
  assert.ok(
    !eligibleNoChain.includes('ferocia_to_supercritical'),
    'ferocia_to_supercritical NOT eligible without rage_simple_to_super applied',
  );

  const unitChained = {
    id: 'u1',
    trait_ids: ['ferocia'],
    applied_mutations: ['rage_simple_to_super'],
  };
  const eligibleChained = listEligibleForUnit(unitChained).map((e) => e.id);
  assert.ok(
    eligibleChained.includes('ferocia_to_supercritical'),
    'ferocia_to_supercritical eligible with chain prereq met',
  );
  // Already-applied mutations excluded.
  const unitAlreadyApplied = {
    id: 'u1',
    trait_ids: ['ferocia'],
    applied_mutations: ['rage_simple_to_super', 'ferocia_to_supercritical'],
  };
  const eligibleAfterApply = listEligibleForUnit(unitAlreadyApplied).map((e) => e.id);
  assert.ok(
    !eligibleAfterApply.includes('ferocia_to_supercritical'),
    'mutation already applied → excluded',
  );
});

test('Empty/malformed YAML → no crash, returns {} structure', () => {
  _resetCacheForTest();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mutation-loader-test-'));
  const malformedPath = path.join(tmpDir, 'malformed.yaml');
  fs.writeFileSync(malformedPath, ': bad: yaml: ::: [\nunclosed', 'utf8');
  const data = loadMutationCatalog({ refresh: true, catalogPath: malformedPath });
  assert.deepEqual(data.byId, {});
  assert.ok(data.error, 'error flag set');

  // Missing file
  _resetCacheForTest();
  const missingData = loadMutationCatalog({
    refresh: true,
    catalogPath: path.join(tmpDir, 'nope.yaml'),
  });
  assert.deepEqual(missingData.byId, {});
  assert.match(missingData.error, /catalog_file_missing/);
});

test('Memoization: 2 consecutive calls return same instance', () => {
  _resetCacheForTest();
  const a = loadMutationCatalog();
  const b = loadMutationCatalog();
  assert.strictEqual(a, b, 'memoized instance reused');
  // refresh=true → new instance.
  const c = loadMutationCatalog({ refresh: true });
  assert.notStrictEqual(a, c, 'refresh bypasses cache');
});

test('getMutation: direct lookup', () => {
  _resetCacheForTest();
  loadMutationCatalog({ refresh: true });
  const mut = getMutation('artigli_freeze_to_glacier');
  assert.ok(mut);
  assert.equal(mut.tier, 2);
  assert.equal(mut.category, 'physiological');
  assert.equal(getMutation('does_not_exist'), null);
  assert.equal(getMutation(null), null);
  assert.equal(getMutation(''), null);
});

// Sanity: default catalog file exists at expected path (preempt env drift).
test('DEFAULT_CATALOG_PATH points to a real file', () => {
  assert.ok(fs.existsSync(DEFAULT_CATALOG_PATH), `expected ${DEFAULT_CATALOG_PATH} to exist`);
});

// ─── Sprint Spore Moderate (ADR-2026-04-26) — schema lock ─────────────────
//
// Verifica che ogni mutation abbia i 3 nuovi campi shippati nello sprint
// Spore Moderate (Pattern S1+S2+S3): body_slot + derived_ability_id + mp_cost.
// Slot canonici: mouth, appendage, sense, tegument, back. Eccezione esplicita:
// `category: symbiotic` può avere body_slot=null (le simbiosi sono biologicamente
// soprapposte, no slot fisico esclusivo per ADR §S1).

const VALID_BODY_SLOTS = ['mouth', 'appendage', 'sense', 'tegument', 'back'];

test('Schema lock — every mutation has body_slot (canonical slot or null for symbiotic)', () => {
  _resetCacheForTest();
  const data = loadMutationCatalog({ refresh: true });
  for (const [id, entry] of Object.entries(data.byId)) {
    assert.ok('body_slot' in entry, `${id} missing body_slot field`);
    if (entry.body_slot === null) {
      assert.equal(
        entry.category,
        'symbiotic',
        `${id} has body_slot=null but category=${entry.category} (only symbiotic exempted)`,
      );
    } else {
      assert.ok(
        VALID_BODY_SLOTS.includes(entry.body_slot),
        `${id} body_slot=${entry.body_slot} not in canonical set ${VALID_BODY_SLOTS.join('|')}`,
      );
    }
  }
});

test('Schema lock — every mutation has derived_ability_id field (nullable)', () => {
  _resetCacheForTest();
  const data = loadMutationCatalog({ refresh: true });
  for (const [id, entry] of Object.entries(data.byId)) {
    assert.ok('derived_ability_id' in entry, `${id} missing derived_ability_id field`);
    const v = entry.derived_ability_id;
    assert.ok(
      v === null || typeof v === 'string',
      `${id} derived_ability_id must be null or string`,
    );
  }
});

test('Schema lock — every mutation has mp_cost (positive integer per tier)', () => {
  _resetCacheForTest();
  const data = loadMutationCatalog({ refresh: true });
  // Per ADR: tier 1 → 3 MP, tier 2 → 8 MP, tier 3 → 15 MP.
  const TIER_MP_EXPECTED = { 1: 3, 2: 8, 3: 15 };
  for (const [id, entry] of Object.entries(data.byId)) {
    assert.ok('mp_cost' in entry, `${id} missing mp_cost field`);
    assert.equal(typeof entry.mp_cost, 'number', `${id} mp_cost must be number`);
    assert.ok(entry.mp_cost > 0, `${id} mp_cost must be > 0`);
    const expected = TIER_MP_EXPECTED[entry.tier];
    if (expected !== undefined) {
      assert.equal(
        entry.mp_cost,
        expected,
        `${id} mp_cost=${entry.mp_cost} expected ${expected} for tier ${entry.tier}`,
      );
    }
  }
});
