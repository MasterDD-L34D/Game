// W5.5 codex P1 fix — coopOrchestrator confirmWorld passes party to enricher.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CoopOrchestrator } = require('../../../apps/backend/services/coop/coopOrchestrator');

function buildOrch({ withCharacters = false } = {}) {
  const orch = new CoopOrchestrator({ roomCode: 'TEST', hostId: 'p_h' });
  orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
  if (withCharacters) {
    // Inject characters directly (bypass character_creation phase for test).
    orch.characters.set('p1', {
      player_id: 'p1',
      name: 'Alice',
      species_id: 'dune_stalker',
      job_id: 'esploratore',
      ready: true,
    });
    orch.characters.set('p2', {
      player_id: 'p2',
      name: 'Bob',
      species_id: 'dune_stalker',
      job_id: 'guerriero',
      ready: true,
    });
  }
  orch.phase = 'world_setup';
  return orch;
}

test('confirmWorld passes party to enricher (role_gap reflects characters)', () => {
  const orch = buildOrch({ withCharacters: true });
  let capturedParty = null;
  const stubEnricher = {
    enrichWorld: (input) => {
      capturedParty = input.party;
      return {
        world: { biome_id: input.biomeId },
        ermes: { eco_pressure_score: 0.5, bias: {}, role_gap: {} },
        aliena_summary_it: 'x',
        aliena_version: 'template_v1',
        custode: {},
      };
    },
  };
  orch._getWorldEnricher = () => stubEnricher;
  orch.confirmWorld({ scenarioId: 'enc_tutorial_01', biomeId: 'savana' });
  assert.ok(Array.isArray(capturedParty), 'party array passed to enricher');
  assert.equal(capturedParty.length, 2);
  assert.equal(capturedParty[0].job_id, 'esploratore');
  assert.equal(capturedParty[1].job_id, 'guerriero');
});

test('confirmWorld with no characters passes empty party (no crash)', () => {
  const orch = buildOrch({ withCharacters: false });
  let capturedParty = null;
  orch._getWorldEnricher = () => ({
    enrichWorld: (input) => {
      capturedParty = input.party;
      return { world: {}, ermes: {}, aliena_summary_it: '', aliena_version: '', custode: {} };
    },
  });
  orch.confirmWorld({ scenarioId: 'enc_tutorial_01', biomeId: 'savana' });
  assert.deepEqual(capturedParty, []);
});

test('confirmWorld real enricher: role_gap correct for confirmed party', () => {
  const orch = buildOrch({ withCharacters: true });
  // Use REAL enricher (no stub) → integration smoke.
  const result = orch.confirmWorld({ scenarioId: 'enc_tutorial_01', biomeId: 'savana' });
  assert.ok(result.enriched_world, 'enriched_world populated');
  const roleGap = result.enriched_world.ermes.role_gap;
  // Savana demands {esploratore: 1, guerriero: 1}.
  // Party has 1 esploratore + 1 guerriero → all zeros.
  assert.equal(roleGap.esploratore, 0, 'esploratore matched');
  assert.equal(roleGap.guerriero, 0, 'guerriero matched');
});
