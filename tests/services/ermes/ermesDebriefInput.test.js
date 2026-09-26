// ADR-2026-05-29 TKT-BR-10 -- ermesDebriefInput guard.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const mod = require(
  path.resolve(__dirname, '../../../apps/backend/services/ermes/ermesDebriefInput'),
);

test('buildDebriefPayload shape v1.0.0', () => {
  const p = mod.buildDebriefPayload('sess1', {
    biomesVisited: ['savana', 'caverna_risonante'],
    traitUsageStats: [{ trait_id: 'ferocia', fires: 12 }],
    encounterFireStats: { ambush: 4, scavenger: 1 },
    outcomes: { wins: 1, losses: 0, wipes: 0 },
  });
  assert.equal(p.schema, 'evo_debrief_for_ermes');
  assert.equal(p.schema_version, '1.0.0');
  assert.equal(p.session_id, 'sess1');
  assert.deepEqual(p.biomes_visited, ['savana', 'caverna_risonante']);
  assert.equal(p.trait_usage[0].trait_id, 'ferocia');
  assert.equal(p.encounter_fires.ambush, 4);
  assert.equal(p.outcomes.wins, 1);
});

test('buildDebriefPayload defaults on empty runState', () => {
  const p = mod.buildDebriefPayload('sess2');
  assert.deepEqual(p.biomes_visited, []);
  assert.deepEqual(p.trait_usage, []);
  assert.deepEqual(p.encounter_fires, {});
  assert.deepEqual(p.outcomes, { wins: 0, losses: 0, wipes: 0 });
});

test('writeErmesDebriefInput writes file + returns path', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ermes-debrief-'));
  const target = mod.writeErmesDebriefInput(
    'sess3',
    { biomesVisited: ['savana'] },
    { inputsDir: tmp },
  );
  assert.ok(target, 'should return path');
  assert.ok(fs.existsSync(target), 'file should exist');
  const written = JSON.parse(fs.readFileSync(target, 'utf8'));
  assert.equal(written.session_id, 'sess3');
  assert.deepEqual(written.biomes_visited, ['savana']);
});

test('writeErmesDebriefInput soft-fail returns null on missing sessionId', () => {
  const r = mod.writeErmesDebriefInput(null, {});
  assert.equal(r, null);
});

test('writeErmesDebriefInput sanitizes session_id in filename', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ermes-debrief-'));
  const target = mod.writeErmesDebriefInput('ABCD/../evil', {}, { inputsDir: tmp });
  assert.ok(target, 'should return path');
  assert.ok(!target.includes('..'), 'path traversal sanitized');
  assert.match(path.basename(target), /^[a-zA-Z0-9_-]+\.json$/);
});

test('idempotent overwrite same session_id', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ermes-debrief-'));
  mod.writeErmesDebriefInput('sess4', { biomesVisited: ['a'] }, { inputsDir: tmp });
  const t2 = mod.writeErmesDebriefInput('sess4', { biomesVisited: ['b'] }, { inputsDir: tmp });
  const written = JSON.parse(fs.readFileSync(t2, 'utf8'));
  assert.deepEqual(written.biomes_visited, ['b'], 'overwrite with latest');
});
