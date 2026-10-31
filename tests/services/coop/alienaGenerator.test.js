// W5-bb — alienaGenerator.js tests.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generateAlienaSummary,
  generateAuthoringTags,
  STATIC_SUMMARIES,
  FALLBACK_SUMMARY,
} = require('../../../apps/backend/services/coop/alienaGenerator');

test('generateAlienaSummary savana returns canonical text', () => {
  const s = generateAlienaSummary('savana');
  assert.match(s, /Savana al margine arido/);
});

test('generateAlienaSummary caverna returns canonical text', () => {
  const s = generateAlienaSummary('caverna');
  assert.match(s, /Caverna risonante/);
});

test('generateAlienaSummary unknown biome returns fallback', () => {
  const s = generateAlienaSummary('biome_inesistente');
  assert.equal(s, FALLBACK_SUMMARY);
});

test('generateAlienaSummary empty string returns fallback', () => {
  const s = generateAlienaSummary('');
  assert.equal(s, FALLBACK_SUMMARY);
});

test('generateAlienaSummary null returns fallback', () => {
  const s = generateAlienaSummary(null);
  assert.equal(s, FALLBACK_SUMMARY);
});

test('STATIC_SUMMARIES never includes word "ALIENA" (doctrine)', () => {
  // A.L.I.E.N.A. system name MUST never surface to player.
  for (const [biomeId, summary] of Object.entries(STATIC_SUMMARIES)) {
    assert.ok(
      !summary.toLowerCase().includes('aliena'),
      `${biomeId} summary contains "aliena" — doctrine breach`,
    );
  }
});

test('FALLBACK_SUMMARY never contains "ALIENA"', () => {
  assert.ok(!FALLBACK_SUMMARY.toLowerCase().includes('aliena'));
});

test('generateAuthoringTags returns empty array (W5-bb MVP)', () => {
  const tags = generateAuthoringTags('savana');
  assert.deepEqual(tags, []);
});

test('STATIC_SUMMARIES covers minimum 5 biomes', () => {
  const keys = Object.keys(STATIC_SUMMARIES);
  assert.ok(keys.length >= 5);
  for (const k of ['savana', 'caverna', 'atollo_obsidiana', 'foresta_temperata']) {
    assert.ok(keys.includes(k), `${k} missing from STATIC_SUMMARIES`);
  }
});
