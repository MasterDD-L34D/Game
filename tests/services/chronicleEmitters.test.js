// Chronicle emitters -- SPEC-Q M-7 wiring (A3 failure-as-lore: run_failed at session end).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  emitRunFailed,
  emitMutationLineage,
} = require('../../apps/backend/services/chronicle/chronicleEmitters');
const { getChronicle } = require('../../apps/backend/services/chronicle/chronicleStore');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'chron-emit-'));
}

test('emitRunFailed: defeat outcome appends a run_failed chronicle event', () => {
  const baseDir = tmp();
  const session = { campaign_id: 'c1', outcome: 'wipe', encounter_id: 'enc_x', turn: 7 };
  const out = emitRunFailed(session, { baseDir });
  assert.equal(out.ok, true);
  const chron = getChronicle('c1', { baseDir });
  assert.equal(chron.length, 1);
  assert.equal(chron[0].type, 'run_failed');
  assert.equal(chron[0].tier, 'public');
  assert.equal(chron[0].payload.outcome, 'wipe');
  assert.equal(chron[0].payload.encounter_id, 'enc_x');
  assert.equal(chron[0].payload.turn, 7);
});

test('emitRunFailed: each defeat outcome (timeout/defeat/objective_failed) emits', () => {
  for (const outcome of ['timeout', 'defeat', 'objective_failed']) {
    const baseDir = tmp();
    const out = emitRunFailed({ campaign_id: 'c', outcome }, { baseDir });
    assert.equal(out.ok, true, `outcome ${outcome}`);
    assert.equal(getChronicle('c', { baseDir })[0].payload.outcome, outcome);
  }
});

test('emitRunFailed: victory -> no-op (not_a_defeat, no event)', () => {
  const baseDir = tmp();
  const out = emitRunFailed({ campaign_id: 'c1', outcome: 'victory' }, { baseDir });
  assert.equal(out.ok, false);
  assert.equal(out.error, 'not_a_defeat');
  assert.equal(getChronicle('c1', { baseDir }).length, 0);
});

test('emitRunFailed: missing campaign_id -> no_campaign_id (no crash)', () => {
  const baseDir = tmp();
  assert.equal(emitRunFailed({ outcome: 'wipe' }, { baseDir }).error, 'no_campaign_id');
});

test('emitRunFailed: missing/invalid session -> no_session', () => {
  assert.equal(emitRunFailed(null).error, 'no_session');
});

// SPEC-Q M-3 -- mutation_lineage emitter (4th chronicle emitter, completes M-7).
test('emitMutationLineage: legacy_death appends a mutation_lineage event', () => {
  const baseDir = tmp();
  const out = emitMutationLineage(
    {
      campaign_id: 'c1',
      mutations: ['m_a', 'm_b'],
      species_id: 'sp',
      biome_id: 'savana',
      source: 'legacy_death',
    },
    { baseDir },
  );
  assert.equal(out.ok, true);
  const chron = getChronicle('c1', { baseDir });
  assert.equal(chron.length, 1);
  assert.equal(chron[0].type, 'mutation_lineage');
  assert.equal(chron[0].tier, 'public');
  assert.deepEqual(chron[0].payload.mutations, ['m_a', 'm_b']);
  assert.equal(chron[0].payload.count, 2);
  assert.equal(chron[0].payload.species_id, 'sp');
  assert.equal(chron[0].payload.biome_id, 'savana');
  assert.equal(chron[0].payload.source, 'legacy_death');
});

test('emitMutationLineage: offspring_birth carries lineage_id', () => {
  const baseDir = tmp();
  const out = emitMutationLineage(
    { campaign_id: 'c2', mutations: ['m_c'], lineage_id: 'lin_7', source: 'offspring_birth' },
    { baseDir },
  );
  assert.equal(out.ok, true);
  const ev = getChronicle('c2', { baseDir })[0];
  assert.equal(ev.payload.source, 'offspring_birth');
  assert.equal(ev.payload.lineage_id, 'lin_7');
  assert.equal(ev.payload.count, 1);
});

test('emitMutationLineage: filters non-string mutations', () => {
  const baseDir = tmp();
  emitMutationLineage({ campaign_id: 'c3', mutations: ['ok', '', null, 5, 'ok2'] }, { baseDir });
  assert.deepEqual(getChronicle('c3', { baseDir })[0].payload.mutations, ['ok', 'ok2']);
});

test('emitMutationLineage: no campaign_id -> no_campaign_id (no event)', () => {
  const baseDir = tmp();
  const out = emitMutationLineage({ mutations: ['m'] }, { baseDir });
  assert.equal(out.ok, false);
  assert.equal(out.error, 'no_campaign_id');
  assert.equal(fs.readdirSync(baseDir).length, 0);
});

test('emitMutationLineage: no mutations -> no_mutations no-op (dormant)', () => {
  const baseDir = tmp();
  assert.equal(
    emitMutationLineage({ campaign_id: 'c', mutations: [] }, { baseDir }).error,
    'no_mutations',
  );
  assert.equal(emitMutationLineage({ campaign_id: 'c' }, { baseDir }).error, 'no_mutations');
});

test('emitMutationLineage: null/invalid ctx -> no_ctx', () => {
  assert.equal(emitMutationLineage(null).error, 'no_ctx');
  assert.equal(emitMutationLineage('x').error, 'no_ctx');
});
