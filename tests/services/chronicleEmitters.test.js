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
  emitHeirloom,
  emitCreatureFell,
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

// SPEC-Q M-1 -- heirloom emitter (L3 named artifact, FFT provenance lineage->object).
test('emitHeirloom: legacy_death appends a heirloom_created event with provenance', () => {
  const baseDir = tmp();
  const out = emitHeirloom(
    {
      campaign_id: 'c1',
      creature_id: 'u_apex',
      creature_name: 'Vorshak',
      species_id: 'dune_stalker',
      biome_id: 'savana',
      lineage_id: 'lin_3',
      mutations: ['rage_simple_to_super'],
      source: 'legacy_death',
    },
    { baseDir },
  );
  assert.equal(out.ok, true);
  const chron = getChronicle('c1', { baseDir });
  assert.equal(chron.length, 1);
  assert.equal(chron[0].type, 'heirloom_created');
  assert.equal(chron[0].tier, 'public');
  assert.equal(chron[0].actor_id, 'u_apex');
  assert.equal(chron[0].payload.creature_name, 'Vorshak');
  assert.equal(chron[0].payload.species_id, 'dune_stalker');
  assert.equal(chron[0].payload.biome_id, 'savana');
  assert.equal(chron[0].payload.lineage_id, 'lin_3');
  assert.deepEqual(chron[0].payload.mutations, ['rage_simple_to_super']);
  assert.equal(chron[0].payload.source, 'legacy_death');
  // Provenance must yield a non-empty, deterministic heirloom name.
  assert.equal(typeof chron[0].payload.heirloom_name, 'string');
  assert.ok(chron[0].payload.heirloom_name.length > 0);
});

test('emitHeirloom: heirloom_name is deterministic for the same provenance', () => {
  const ctx = { campaign_id: 'c', creature_name: 'Vorshak', mutations: ['rage_simple_to_super'] };
  const a = emitHeirloom(ctx, { baseDir: tmp() });
  const b = emitHeirloom(ctx, { baseDir: tmp() });
  assert.equal(a.event.payload.heirloom_name, b.event.payload.heirloom_name);
});

test('emitHeirloom: explicit heirloom_name overrides the derived one', () => {
  const baseDir = tmp();
  emitHeirloom(
    { campaign_id: 'c', species_id: 'cryo_lynx', heirloom_name: 'Zanna del Primo Gelo' },
    { baseDir },
  );
  assert.equal(getChronicle('c', { baseDir })[0].payload.heirloom_name, 'Zanna del Primo Gelo');
});

test('emitHeirloom: species_id alone is enough provenance (no personal name)', () => {
  const baseDir = tmp();
  const out = emitHeirloom({ campaign_id: 'c', species_id: 'cryo_lynx' }, { baseDir });
  assert.equal(out.ok, true);
  assert.equal(getChronicle('c', { baseDir })[0].payload.species_id, 'cryo_lynx');
});

test('emitHeirloom: no provenance (no name, no species) -> no_provenance no-op', () => {
  const baseDir = tmp();
  const out = emitHeirloom({ campaign_id: 'c' }, { baseDir });
  assert.equal(out.ok, false);
  assert.equal(out.error, 'no_provenance');
  assert.equal(getChronicle('c', { baseDir }).length, 0);
});

test('emitHeirloom: no campaign_id -> no_campaign_id (no event)', () => {
  const baseDir = tmp();
  const out = emitHeirloom({ creature_name: 'X' }, { baseDir });
  assert.equal(out.ok, false);
  assert.equal(out.error, 'no_campaign_id');
  assert.equal(fs.readdirSync(baseDir).length, 0);
});

test('emitHeirloom: null/invalid ctx -> no_ctx', () => {
  assert.equal(emitHeirloom(null).error, 'no_ctx');
  assert.equal(emitHeirloom('x').error, 'no_ctx');
});

test('emitHeirloom: filters non-string mutations', () => {
  const baseDir = tmp();
  emitHeirloom(
    { campaign_id: 'c', species_id: 'sp', mutations: ['ok', '', null, 7, 'ok2'] },
    { baseDir },
  );
  assert.deepEqual(getChronicle('c', { baseDir })[0].payload.mutations, ['ok', 'ok2']);
});

// SPEC-J -- creature_death emitter (failure-as-lore J5 + SPEC-D death beat).
test('emitCreatureFell: a lethal death appends a public creature_death event', () => {
  const baseDir = tmp();
  const out = emitCreatureFell(
    {
      campaign_id: 'c1',
      creature_id: 'u_apex',
      creature_name: 'Vorshak',
      species_id: 'dune_stalker',
      biome_id: 'savana',
      lineage_id: 'lin_3',
      encounter_id: 'enc_lethal_01',
      turn: 9,
    },
    { baseDir },
  );
  assert.equal(out.ok, true);
  const chron = getChronicle('c1', { baseDir });
  assert.equal(chron.length, 1);
  assert.equal(chron[0].type, 'creature_death');
  assert.equal(chron[0].tier, 'public');
  assert.equal(chron[0].actor_id, 'u_apex');
  assert.equal(chron[0].payload.creature_name, 'Vorshak');
  assert.equal(chron[0].payload.species_id, 'dune_stalker');
  assert.equal(chron[0].payload.biome_id, 'savana');
  assert.equal(chron[0].payload.lineage_id, 'lin_3');
  assert.equal(chron[0].payload.encounter_id, 'enc_lethal_01');
  assert.equal(chron[0].payload.turn, 9);
  // Succession trigger (SPEC-E E2 / J4): default true (a fall opens succession).
  assert.equal(chron[0].payload.succession_trigger, true);
});

test('emitCreatureFell: succession_trigger can be opted out (e.g. non-MVP creature)', () => {
  const baseDir = tmp();
  emitCreatureFell({ campaign_id: 'c', creature_id: 'u2', succession_trigger: false }, { baseDir });
  assert.equal(getChronicle('c', { baseDir })[0].payload.succession_trigger, false);
});

test('emitCreatureFell: no creature_id -> no_creature no-op (a fall commemorates a creature)', () => {
  const baseDir = tmp();
  const out = emitCreatureFell({ campaign_id: 'c' }, { baseDir });
  assert.equal(out.ok, false);
  assert.equal(out.error, 'no_creature');
  assert.equal(getChronicle('c', { baseDir }).length, 0);
});

test('emitCreatureFell: no campaign_id -> no_campaign_id (no event)', () => {
  const baseDir = tmp();
  const out = emitCreatureFell({ creature_id: 'u1' }, { baseDir });
  assert.equal(out.ok, false);
  assert.equal(out.error, 'no_campaign_id');
  assert.equal(fs.readdirSync(baseDir).length, 0);
});

test('emitCreatureFell: null/invalid ctx -> no_ctx (never throws)', () => {
  assert.equal(emitCreatureFell(null).error, 'no_ctx');
  assert.equal(emitCreatureFell('x').error, 'no_ctx');
});
