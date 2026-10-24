'use strict';
// SPEC-P failure-as-lore -- run-end epilogue assembly + codex hook (backend glue).
//
// buildEpilogue = pure run-fail context -> structured payload (the Godot PA1 surface
// renders the diegetic voice; this is the DATA). emitFailureEpilogue appends 2
// chronicle events (run_epilogue tier-public + codex_update {on:'failure'} for the
// SPEC-H Codex consumer). Best-effort, never throws.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  buildEpilogue,
  codexHook,
  emitFailureEpilogue,
  RUN_FAIL_OUTCOMES,
} = require('../../apps/backend/services/narrative/failureEpilogue');
const { getChronicle } = require('../../apps/backend/services/chronicle/chronicleStore');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'fail-epilogue-'));
}

test('RUN_FAIL_OUTCOMES covers the 4 SPEC-P triggers + retreated', () => {
  for (const o of ['wipe', 'timeout', 'objective_failed', 'retreated', 'defeat']) {
    assert.ok(RUN_FAIL_OUTCOMES.has(o), o);
  }
  assert.ok(!RUN_FAIL_OUTCOMES.has('victory'));
});

test('buildEpilogue: run-fail in a wounded biome -> structured payload', () => {
  const ep = buildEpilogue({
    outcome: 'wipe',
    biome_id: 'savana',
    encounter_id: 'enc_x',
    woundedBiomes: ['savana'],
    fallen: [{ id: 'p1', species: 'sp', name: 'Skiv' }],
  });
  assert.equal(ep.outcome, 'wipe');
  assert.equal(ep.biome_id, 'savana');
  assert.equal(ep.encounter_id, 'enc_x');
  assert.equal(ep.wounded, true);
  assert.equal(ep.fallen_count, 1);
  assert.deepEqual(ep.fallen, [{ id: 'p1', species: 'sp', name: 'Skiv' }]);
  assert.equal(ep.degrade_summary, 'biome_wounded');
});

test('buildEpilogue: retreated counts as run-fail', () => {
  assert.ok(buildEpilogue({ outcome: 'retreated', biome_id: 'b' }));
});

test('buildEpilogue: victory -> null (not a run-fail)', () => {
  assert.equal(buildEpilogue({ outcome: 'victory', biome_id: 'b' }), null);
});

test('buildEpilogue: biome not wounded -> wounded:false, degrade none', () => {
  const ep = buildEpilogue({ outcome: 'timeout', biome_id: 'savana', woundedBiomes: ['caverna'] });
  assert.equal(ep.wounded, false);
  assert.equal(ep.degrade_summary, 'none');
});

test('buildEpilogue: fallen filters non-objects + missing ids', () => {
  const ep = buildEpilogue({
    outcome: 'wipe',
    biome_id: 'b',
    fallen: [{ id: 'a' }, null, { name: 'x' }, 'str', 42],
  });
  assert.equal(ep.fallen_count, 1);
  assert.equal(ep.fallen[0].id, 'a');
});

test('buildEpilogue: null/invalid ctx or no outcome -> null', () => {
  assert.equal(buildEpilogue(null), null);
  assert.equal(buildEpilogue('x'), null);
  assert.equal(buildEpilogue({}), null);
});

test('codexHook: biome -> {entry_id, on:failure}; no biome -> null', () => {
  assert.deepEqual(codexHook({ biome_id: 'savana' }), { entry_id: 'savana', on: 'failure' });
  assert.equal(codexHook({}), null);
});

test('emitFailureEpilogue: appends run_epilogue + codex_update chronicle events', () => {
  const baseDir = tmp();
  const out = emitFailureEpilogue(
    {
      campaign_id: 'c1',
      outcome: 'wipe',
      biome_id: 'savana',
      encounter_id: 'e',
      woundedBiomes: ['savana'],
      fallen: [{ id: 'p1' }],
    },
    { baseDir },
  );
  assert.equal(out.ok, true);
  const chron = getChronicle('c1', { baseDir });
  assert.equal(chron.length, 2);
  const ep = chron.find((e) => e.type === 'run_epilogue');
  const cx = chron.find((e) => e.type === 'codex_update');
  assert.ok(ep);
  assert.equal(ep.tier, 'public');
  assert.equal(ep.payload.outcome, 'wipe');
  assert.equal(ep.payload.wounded, true);
  assert.ok(cx);
  assert.equal(cx.tier, 'public');
  assert.equal(cx.payload.on, 'failure');
  assert.equal(cx.payload.entry_id, 'savana');
});

test('emitFailureEpilogue: victory -> not_a_run_fail no-op (no events)', () => {
  const baseDir = tmp();
  const out = emitFailureEpilogue(
    { campaign_id: 'c', outcome: 'victory', biome_id: 'b' },
    { baseDir },
  );
  assert.equal(out.ok, false);
  assert.equal(out.error, 'not_a_run_fail');
  assert.equal(getChronicle('c', { baseDir }).length, 0);
});

test('emitFailureEpilogue: no campaign_id -> no_campaign_id', () => {
  assert.equal(
    emitFailureEpilogue({ outcome: 'wipe', biome_id: 'b' }, { baseDir: tmp() }).error,
    'no_campaign_id',
  );
});

test('emitFailureEpilogue: no biome -> run_epilogue only (no codex_update)', () => {
  const baseDir = tmp();
  emitFailureEpilogue({ campaign_id: 'c', outcome: 'wipe', biome_id: null }, { baseDir });
  const chron = getChronicle('c', { baseDir });
  assert.equal(chron.length, 1);
  assert.equal(chron[0].type, 'run_epilogue');
});

test('emitFailureEpilogue: null ctx -> no_ctx', () => {
  assert.equal(emitFailureEpilogue(null).error, 'no_ctx');
});
