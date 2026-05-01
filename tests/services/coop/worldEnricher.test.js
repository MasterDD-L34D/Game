// W5-bb — worldEnricher facade tests.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { enrichWorld } = require('../../../apps/backend/services/coop/worldEnricher');

test('enrichWorld empty biomeId returns empty payload', () => {
  const r = enrichWorld({ biomeId: '' });
  assert.deepEqual(r.world, {});
  assert.deepEqual(r.ermes, {});
  assert.equal(r.aliena_summary_it, '');
  assert.deepEqual(r.custode, {});
});

test('enrichWorld savana returns full W5 schema', () => {
  const r = enrichWorld({ biomeId: 'savana', runSeed: 42 });
  // world
  assert.equal(r.world.biome_id, 'savana');
  assert.ok(typeof r.world.biome_label_it === 'string' && r.world.biome_label_it.length > 0);
  assert.ok(['low', 'medium', 'high'].includes(r.world.pressure));
  // ermes
  assert.equal(r.ermes.eco_pressure_score, 0.62);
  assert.equal(r.ermes.bias.predator_density, 0.7);
  // aliena
  assert.match(r.aliena_summary_it, /Savana/);
  // custode
  assert.equal(r.custode.species_id, 'dune_stalker');
  assert.equal(r.custode.biome_origin_id, 'savana');
});

test('enrichWorld caverna returns full W5 schema', () => {
  const r = enrichWorld({ biomeId: 'caverna', runSeed: 42 });
  assert.equal(r.world.biome_id, 'caverna');
  assert.equal(r.ermes.eco_pressure_score, 0.78);
  assert.match(r.aliena_summary_it, /Caverna/);
  assert.equal(r.custode.species_id, 'perfusuas_pedes');
});

test('enrichWorld B3 hybrid override Skiv canonical', () => {
  const r = enrichWorld({ biomeId: 'savana', runSeed: 42, trainerCanonical: true });
  assert.equal(r.custode.display_name, 'Skiv');
  assert.equal(r.custode.voice_modifier, 'canonical');
});

test('enrichWorld MBTI bias propagates to custode', () => {
  const r = enrichWorld({
    biomeId: 'savana',
    formAxes: { T: 0.85, F: 0.15, N: 0.5, S: 0.5 },
  });
  assert.equal(r.custode.voice_modifier, 'fredda_analitica');
});

test('enrichWorld doctrine: aliena_summary never says "ALIENA"', () => {
  const r = enrichWorld({ biomeId: 'savana', runSeed: 42 });
  assert.ok(!r.aliena_summary_it.toLowerCase().includes('aliena'));
});

test('enrichWorld services injection works', () => {
  const mockBiomeAdapter = {
    adaptBiome: (b) => ({ biome_id: b, biome_label_it: 'Mock', pressure: 'low', hazards: [] }),
  };
  const mockAlienaGenerator = { generateAlienaSummary: () => 'mock summary' };
  const mockErmesExporter = {
    getErmesForBiome: () => ({ eco_pressure_score: 0.0, bias: {} }),
  };
  const mockCompanionPicker = {
    pick: () => ({ display_name: 'MockCompanion' }),
  };
  const r = enrichWorld(
    { biomeId: 'savana' },
    {
      biomeAdapter: mockBiomeAdapter,
      alienaGenerator: mockAlienaGenerator,
      ermesExporter: mockErmesExporter,
      companionPicker: mockCompanionPicker,
    },
  );
  assert.equal(r.world.biome_label_it, 'Mock');
  assert.equal(r.aliena_summary_it, 'mock summary');
  assert.equal(r.custode.display_name, 'MockCompanion');
});

test('enrichWorld unknown biome graceful fallback', () => {
  const r = enrichWorld({ biomeId: 'biome_inesistente' });
  assert.deepEqual(r.world, {}); // biomeAdapter empty
  assert.equal(r.ermes.eco_pressure_score, 0.5); // ermes neutral fallback
  // aliena fallback summary
  assert.ok(r.aliena_summary_it.length > 0);
  // custode fallback to savana pool
  assert.equal(r.custode.species_id, 'dune_stalker');
});
