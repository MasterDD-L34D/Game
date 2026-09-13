// W5.5 — worldEnricher facade tests for role_gap + aliena_version surfacing.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  enrichWorld,
  enrichWorldAsync,
} = require('../../../apps/backend/services/coop/worldEnricher');

// --- sync enrichWorld ---

test('enrichWorld surfaces role_gap in ermes payload', () => {
  const result = enrichWorld({
    biomeId: 'savana',
    party: [{ job_id: 'esploratore' }, { job_id: 'guerriero' }],
  });
  assert.ok(result.ermes.role_gap, 'role_gap present');
  assert.equal(result.ermes.role_gap.esploratore, 0);
});

test('enrichWorld defaults aliena_version template_v1 (sync)', () => {
  const result = enrichWorld({ biomeId: 'savana', party: [] });
  assert.equal(result.aliena_version, 'template_v1');
  assert.match(result.aliena_summary_it, /Savana/);
});

test('enrichWorld empty biome returns empty payload with empty version', () => {
  const result = enrichWorld({ biomeId: '', party: [] });
  assert.deepEqual(result.world, {});
  assert.equal(result.aliena_version, '');
});

// --- async enrichWorldAsync (LLM path) ---

test('enrichWorldAsync without llmCall returns template_v1', async () => {
  const result = await enrichWorldAsync({ biomeId: 'savana', party: [] });
  assert.equal(result.aliena_version, 'template_v1');
});

test('enrichWorldAsync with llmCall returns llm_v1', async () => {
  const llmCall = async (biomeId) => `LLM ALIENA for ${biomeId}`;
  const result = await enrichWorldAsync({
    biomeId: 'savana',
    party: [{ job_id: 'guerriero' }],
    llmCall,
  });
  assert.equal(result.aliena_version, 'llm_v1');
  assert.equal(result.aliena_summary_it, 'LLM ALIENA for savana');
  // role_gap still computed from sync path.
  assert.ok(result.ermes.role_gap);
});

test('enrichWorldAsync LLM failure falls back template_v1', async () => {
  const llmCall = async () => {
    throw new Error('boom');
  };
  const result = await enrichWorldAsync({
    biomeId: 'savana',
    party: [],
    llmCall,
  });
  assert.equal(result.aliena_version, 'template_v1');
  assert.match(result.aliena_summary_it, /Savana/);
});
