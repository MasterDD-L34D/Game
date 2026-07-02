// W5.5 — alienaGenerator.js LLM envelope tests.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generateAlienaEnvelope,
  ALIENA_VERSION_TEMPLATE_V1,
  ALIENA_VERSION_LLM_V1,
  FALLBACK_SUMMARY,
} = require('../../../apps/backend/services/coop/alienaGenerator');

// --- template fallback path ---

test('envelope without llmCall returns template_v1', async () => {
  const env = await generateAlienaEnvelope('savana');
  assert.match(env.summary, /Savana al margine arido/);
  assert.equal(env.version, ALIENA_VERSION_TEMPLATE_V1);
});

test('envelope unknown biome returns template_v1 fallback summary', async () => {
  const env = await generateAlienaEnvelope('alien_world');
  assert.equal(env.summary, FALLBACK_SUMMARY);
  assert.equal(env.version, ALIENA_VERSION_TEMPLATE_V1);
});

// --- LLM hook path ---

test('envelope with successful llmCall returns llm_v1', async () => {
  const llmCall = async (biomeId) => `LLM custom for ${biomeId}`;
  const env = await generateAlienaEnvelope('savana', { llmCall });
  assert.equal(env.summary, 'LLM custom for savana');
  assert.equal(env.version, ALIENA_VERSION_LLM_V1);
});

test('envelope passes llmContext to llmCall', async () => {
  let captured = null;
  const llmCall = async (biomeId, ctx) => {
    captured = ctx;
    return 'ok';
  };
  const ctx = { formAxes: { T: 0.7 }, party: [{ job_id: 'guerriero' }] };
  await generateAlienaEnvelope('savana', { llmCall, llmContext: ctx });
  assert.deepEqual(captured, ctx);
});

// --- LLM failure graceful fallback ---

test('envelope with throwing llmCall falls back template_v1', async () => {
  const llmCall = async () => {
    throw new Error('LLM down');
  };
  const env = await generateAlienaEnvelope('savana', { llmCall });
  assert.match(env.summary, /Savana al margine arido/);
  assert.equal(env.version, ALIENA_VERSION_TEMPLATE_V1);
});

test('envelope with empty llmCall result falls back template_v1', async () => {
  const llmCall = async () => '';
  const env = await generateAlienaEnvelope('savana', { llmCall });
  assert.match(env.summary, /Savana al margine arido/);
  assert.equal(env.version, ALIENA_VERSION_TEMPLATE_V1);
});

test('envelope with non-string llmCall result falls back template_v1', async () => {
  const llmCall = async () => null;
  const env = await generateAlienaEnvelope('savana', { llmCall });
  assert.equal(env.version, ALIENA_VERSION_TEMPLATE_V1);
});

test('envelope trims whitespace from LLM output', async () => {
  const llmCall = async () => '  Spaced LLM output\n\n';
  const env = await generateAlienaEnvelope('savana', { llmCall });
  assert.equal(env.summary, 'Spaced LLM output');
  assert.equal(env.version, ALIENA_VERSION_LLM_V1);
});
