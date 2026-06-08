// Chronicle emitters -- SPEC-Q M-7 wiring (A3 failure-as-lore: run_failed at session end).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { emitRunFailed } = require('../../apps/backend/services/chronicle/chronicleEmitters');
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
