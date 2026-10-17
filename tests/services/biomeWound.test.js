// biomeWound -- SPEC-P A13 write-side (biome degrade cross-run, bounded + recovery).
// PA2 ratified: cap ~2 biomi, step 1 band, recovery by winning. PA4: mechanical (pressure
// within ER2 +/-2) + narrative. Mechanism objective/tested; magnitude N=40-ratify.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  MAX_WOUNDED_BIOMES,
  ER2_PRESSURE_CAP,
  woundBiome,
  healBiome,
  pressureDelta,
  emitBiomeWound,
} = require('../../apps/backend/services/worldgen/biomeWound');
const { getChronicle } = require('../../apps/backend/services/chronicle/chronicleStore');

test('constants: PA2 cap = 2 biomes, PA4 pressure cap = ER2 (2)', () => {
  assert.equal(MAX_WOUNDED_BIOMES, 2);
  assert.equal(ER2_PRESSURE_CAP, 2);
});

test('woundBiome: adds a biome to the wounded set', () => {
  const r = woundBiome([], 'badlands');
  assert.equal(r.added, true);
  assert.deepEqual(r.wounded, ['badlands']);
});

test('woundBiome: already-wounded -> no-op (idempotent)', () => {
  const r = woundBiome(['badlands'], 'badlands');
  assert.equal(r.added, false);
  assert.deepEqual(r.wounded, ['badlands']);
});

test('woundBiome: respects PA2 cap (max 2) -> 3rd rejected', () => {
  const r = woundBiome(['a', 'b'], 'c');
  assert.equal(r.added, false);
  assert.equal(r.capped, true);
  assert.deepEqual(r.wounded, ['a', 'b']); // unchanged
});

test('woundBiome: does not mutate input array', () => {
  const input = ['a'];
  woundBiome(input, 'b');
  assert.deepEqual(input, ['a']);
});

test('healBiome: recovery removes a biome (anti-brick)', () => {
  const r = healBiome(['a', 'b'], 'a');
  assert.equal(r.healed, true);
  assert.deepEqual(r.wounded, ['b']);
});

test('healBiome: not-wounded -> no-op', () => {
  const r = healBiome(['a'], 'zzz');
  assert.equal(r.healed, false);
  assert.deepEqual(r.wounded, ['a']);
});

test('pressureDelta: N wounded -> delta, bounded by ER2 cap (+2)', () => {
  assert.equal(pressureDelta([]), 0);
  assert.equal(pressureDelta(['a']), 1);
  assert.equal(pressureDelta(['a', 'b']), 2);
  // even if somehow > cap, never exceeds ER2 (overconstrain guard)
  assert.equal(pressureDelta(['a', 'b', 'c', 'd']), ER2_PRESSURE_CAP);
});

test('emitBiomeWound: appends biome_wound chronicle event', () => {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-'));
  const out = emitBiomeWound('run1', 'badlands', { baseDir });
  assert.equal(out.ok, true);
  const chron = getChronicle('run1', { baseDir });
  assert.equal(chron.length, 1);
  assert.equal(chron[0].type, 'biome_wound');
  assert.equal(chron[0].payload.biome_id, 'badlands');
});

test('emitBiomeWound: missing biome -> no-op', () => {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-'));
  assert.equal(emitBiomeWound('run1', null, { baseDir }).ok, false);
});
