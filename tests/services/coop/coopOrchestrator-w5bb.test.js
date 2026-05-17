// W5-bb — CoopOrchestrator.confirmWorld extension tests.
// Mirrors Godot v2 CoopApi.confirmWorld payload contract.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CoopOrchestrator } = require('../../../apps/backend/services/coop/coopOrchestrator');

function buildOrch() {
  const orch = new CoopOrchestrator({ roomCode: 'TEST', hostId: 'p_h' });
  orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
  // Bypass character_creation by manually advancing phase (test scaffold).
  orch.phase = 'world_setup';
  return orch;
}

test('confirmWorld without biomeId preserves legacy behavior', () => {
  const orch = buildOrch();
  const result = orch.confirmWorld({ scenarioId: 'enc_tutorial_01' });
  assert.equal(result.scenario_id, 'enc_tutorial_01');
  assert.equal(result.enriched_world, null);
  assert.equal(orch.phase, 'combat');
});

test('confirmWorld with biomeId enriches world payload', () => {
  const orch = buildOrch();
  const result = orch.confirmWorld({
    scenarioId: 'enc_tutorial_01',
    biomeId: 'savana',
    runSeed: 42,
  });
  assert.equal(result.scenario_id, 'enc_tutorial_01');
  assert.ok(result.enriched_world);
  assert.equal(result.enriched_world.world.biome_id, 'savana');
  assert.equal(result.enriched_world.custode.species_id, 'dune_stalker');
  assert.match(result.enriched_world.aliena_summary_it, /Savana/);
});

test('confirmWorld with B3 hybrid trainerCanonical returns Skiv', () => {
  const orch = buildOrch();
  const result = orch.confirmWorld({
    scenarioId: 'enc_tutorial_01',
    biomeId: 'savana',
    trainerCanonical: true,
  });
  assert.equal(result.enriched_world.custode.display_name, 'Skiv');
});

test('confirmWorld stores enrichedWorld on orch instance', () => {
  const orch = buildOrch();
  assert.equal(orch.enrichedWorld, null);
  orch.confirmWorld({
    scenarioId: 'enc_tutorial_01',
    biomeId: 'caverna',
  });
  assert.ok(orch.enrichedWorld);
  assert.equal(orch.enrichedWorld.world.biome_id, 'caverna');
});

test('confirmWorld injectable worldEnricher (test isolation)', () => {
  const mockEnricher = {
    enrichWorld: ({ biomeId }) => ({
      world: { biome_id: biomeId, biome_label_it: 'Mock' },
      ermes: { eco_pressure_score: 0.5, bias: {} },
      aliena_summary_it: 'mock',
      custode: { display_name: 'Mock' },
    }),
  };
  const orch = new CoopOrchestrator({
    roomCode: 'TEST',
    hostId: 'p_h',
    worldEnricher: mockEnricher,
  });
  orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
  orch.phase = 'world_setup';
  const result = orch.confirmWorld({
    scenarioId: 'enc_tutorial_01',
    biomeId: 'savana',
  });
  assert.equal(result.enriched_world.world.biome_label_it, 'Mock');
  assert.equal(result.enriched_world.custode.display_name, 'Mock');
});

test('confirmWorld enricher exception does not break phase transition', () => {
  const failingEnricher = {
    enrichWorld: () => {
      throw new Error('mock_failure');
    },
  };
  const orch = new CoopOrchestrator({
    roomCode: 'TEST',
    hostId: 'p_h',
    worldEnricher: failingEnricher,
  });
  orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
  orch.phase = 'world_setup';
  const result = orch.confirmWorld({
    scenarioId: 'enc_tutorial_01',
    biomeId: 'savana',
  });
  // Phase still advances, enriched_world null
  assert.equal(orch.phase, 'combat');
  assert.equal(result.enriched_world, null);
  // Event emitted
  const failureEvent = orch.log.find((e) => e.kind === 'world_enricher_failed');
  assert.ok(failureEvent);
});

test('confirmWorld preserves backward-compat (legacy callers)', () => {
  const orch = buildOrch();
  // Legacy call with just scenarioId — no biomeId
  const result = orch.confirmWorld({ scenarioId: 'enc_tutorial_01' });
  // Should still work, just no enriched_world
  assert.equal(result.scenario_id, 'enc_tutorial_01');
  assert.equal(result.enriched_world, null);
  assert.equal(orch.enrichedWorld, null);
});
