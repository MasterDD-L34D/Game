// W5-bb — companionPicker.js tests. Mirrors Godot v2
// `tests/unit/test_companion_picker.gd` (PR #62) for parity.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  pick,
  CANONICAL_SKIV,
  _resetCache,
  DEFAULT_POOL_PATH,
} = require('../../../apps/backend/services/companion/companionPicker');

function reset() {
  _resetCache();
}

// --- happy path biome picks ---

test('savana pick returns dune_stalker species', () => {
  reset();
  const c = pick({ biomeId: 'savana', runSeed: 42 });
  assert.equal(c.species_id, 'dune_stalker');
  assert.equal(c.biome_origin_id, 'savana');
});

test('caverna pick returns perfusuas_pedes species', () => {
  reset();
  const c = pick({ biomeId: 'caverna', runSeed: 42 });
  assert.equal(c.species_id, 'perfusuas_pedes');
  assert.equal(c.biome_origin_id, 'caverna');
});

test('atollo_obsidiana pick returns anguis_magnetica species', () => {
  reset();
  const c = pick({ biomeId: 'atollo_obsidiana', runSeed: 42 });
  assert.equal(c.species_id, 'anguis_magnetica');
});

// --- determinism ---

test('same seed returns same name', () => {
  reset();
  const c1 = pick({ biomeId: 'savana', runSeed: 12345 });
  const c2 = pick({ biomeId: 'savana', runSeed: 12345 });
  assert.equal(c1.display_name, c2.display_name);
});

// --- B3 hybrid override (canonical Skiv) ---

test('canonical_trainer + savana returns Skiv canonical', () => {
  reset();
  const c = pick({ biomeId: 'savana', runSeed: 42, trainerCanonical: true });
  assert.equal(c.display_name, 'Skiv');
  assert.equal(c.species_id, 'dune_stalker');
  assert.equal(c.voice_modifier, 'canonical');
});

test('canonical_trainer + non-savana NO override', () => {
  reset();
  const c = pick({ biomeId: 'caverna', runSeed: 42, trainerCanonical: true });
  assert.notEqual(c.display_name, 'Skiv');
  assert.equal(c.species_id, 'perfusuas_pedes');
});

// --- fallback rule ---

test('unknown biome falls back to savana pool', () => {
  reset();
  const c = pick({ biomeId: 'biome_inesistente', runSeed: 42 });
  assert.equal(c.species_id, 'dune_stalker');
  assert.equal(c.biome_origin_id, 'savana');
});

// --- MBTI voice modifier ---

test('T-dominant assigns solitari modifier', () => {
  reset();
  const c = pick({ biomeId: 'savana', formAxes: { T: 0.85, F: 0.15, N: 0.5, S: 0.5 } });
  assert.equal(c.voice_modifier, 'fredda_analitica');
});

test('F-dominant assigns simbionti modifier', () => {
  reset();
  const c = pick({ biomeId: 'savana', formAxes: { T: 0.2, F: 0.8, N: 0.5, S: 0.5 } });
  assert.equal(c.voice_modifier, 'empatica_branco');
});

test('N-dominant assigns esploratori modifier', () => {
  reset();
  const c = pick({ biomeId: 'savana', formAxes: { T: 0.5, F: 0.5, N: 0.8, S: 0.2 } });
  assert.equal(c.voice_modifier, 'visionaria_intuitiva');
});

test('S-dominant assigns sensoriali modifier', () => {
  reset();
  const c = pick({ biomeId: 'savana', formAxes: { T: 0.5, F: 0.5, N: 0.2, S: 0.8 } });
  assert.equal(c.voice_modifier, 'sensoriale_presente');
});

test('neutral axes no modifier', () => {
  reset();
  const c = pick({ biomeId: 'savana', formAxes: { T: 0.5, F: 0.5, N: 0.5, S: 0.5 } });
  assert.equal(c.voice_modifier, '');
});

// --- output shape ---

test('voice_it format matches Godot CompanionPicker', () => {
  reset();
  const c = pick({ biomeId: 'savana', runSeed: 42 });
  assert.match(c.voice_it, /^Allenatore,/);
  assert.match(c.voice_it, /\.$/);
});

test('closing_ritual is from biome closing_pool', () => {
  reset();
  const c = pick({ biomeId: 'savana', runSeed: 42 });
  assert.ok(typeof c.closing_ritual === 'string' && c.closing_ritual.length > 0);
});

// --- guards ---

test('missing biomeId returns empty', () => {
  reset();
  const c = pick({ biomeId: '', runSeed: 42 });
  assert.deepEqual(c, {});
});

test('missing pool path returns empty', () => {
  reset();
  const c = pick({ poolPath: '/tmp/nonexistent_pool.yaml', biomeId: 'savana' });
  assert.deepEqual(c, {});
});

// --- canonical Skiv structure ---

test('CANONICAL_SKIV exposes required fields', () => {
  assert.equal(CANONICAL_SKIV.display_name, 'Skiv');
  assert.equal(CANONICAL_SKIV.species_id, 'dune_stalker');
  assert.equal(CANONICAL_SKIV.biome_origin_id, 'savana');
  assert.ok(CANONICAL_SKIV.voice_it.startsWith('Allenatore,'));
});

// --- DEFAULT_POOL_PATH ---

test('DEFAULT_POOL_PATH points to skiv_archetype_pool.yaml', () => {
  assert.match(DEFAULT_POOL_PATH, /skiv_archetype_pool\.yaml$/);
});
