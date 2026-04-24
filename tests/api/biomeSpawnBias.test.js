// V7 Biome-aware spawn bias tests (ADR-2026-04-26)

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyBiomeBias,
  matchAffix,
  biomeMatchScore,
  DEFAULT_BOOST_PER_MATCH,
  MAX_BOOST,
} = require('../../apps/backend/services/combat/biomeSpawnBias');

test('matchAffix: tag intersection', () => {
  assert.equal(matchAffix({ tags: ['fire', 'bio'] }, 'termico'), true);
  assert.equal(matchAffix({ tags: ['ice'] }, 'termico'), false);
  assert.equal(matchAffix({ archetype_tags: ['sand'] }, 'sabbia'), true);
});

test('matchAffix: case insensitive', () => {
  assert.equal(matchAffix({ tags: ['FIRE'] }, 'termico'), true);
  assert.equal(matchAffix({ tags: ['Thermal'] }, 'termico'), true);
});

test('matchAffix: no tags returns false', () => {
  assert.equal(matchAffix({}, 'termico'), false);
  assert.equal(matchAffix({ tags: [] }, 'termico'), false);
});

test('biomeMatchScore: full match = 1.0', () => {
  const unit = { tags: ['fire', 'light', 'spore', 'sand'] };
  const biome = { affixes: ['termico', 'luminescente', 'spore_diluite', 'sabbia'] };
  assert.equal(biomeMatchScore(unit, biome), 1.0);
});

test('biomeMatchScore: no match = 0', () => {
  const unit = { tags: ['ice'] };
  const biome = { affixes: ['termico'] };
  assert.equal(biomeMatchScore(unit, biome), 0);
});

test('biomeMatchScore: partial = fraction', () => {
  const unit = { tags: ['fire'] };
  const biome = { affixes: ['termico', 'luminescente'] };
  assert.equal(biomeMatchScore(unit, biome), 0.5);
});

test('applyBiomeBias: primary archetype gets max boost', () => {
  const pool = [{ unit_id: 'u1', archetype: 'abyssal_forgers', weight: 1 }];
  const biome = {
    affixes: [],
    npc_archetypes: { primary: ['abyssal_forgers'] },
  };
  const result = applyBiomeBias(pool, biome);
  assert.equal(result[0].weight, MAX_BOOST);
  assert.equal(result[0]._biome_bias.boost, MAX_BOOST);
});

test('applyBiomeBias: support archetype gets mid boost', () => {
  const pool = [{ unit_id: 'u1', archetype: 'geode_listeners', weight: 1 }];
  const biome = {
    affixes: [],
    npc_archetypes: { support: ['geode_listeners'] },
  };
  const result = applyBiomeBias(pool, biome);
  assert.ok(result[0].weight > 1, 'support boosted');
  assert.ok(result[0].weight < MAX_BOOST, 'less than max');
});

test('applyBiomeBias: affix match multiplies weight', () => {
  const pool = [{ unit_id: 'u1', tags: ['fire', 'thermal'], weight: 1 }];
  const biome = { affixes: ['termico'] };
  const result = applyBiomeBias(pool, biome);
  assert.ok(result[0].weight > 1, 'affix match boosted');
  assert.equal(result[0]._biome_bias.affix_matches, 1);
});

test('applyBiomeBias: multiple affix matches stack (capped)', () => {
  const pool = [{ unit_id: 'u1', tags: ['fire', 'spore', 'sand'], weight: 1 }];
  const biome = { affixes: ['termico', 'spore_diluite', 'sabbia'] };
  const result = applyBiomeBias(pool, biome);
  assert.ok(result[0].weight <= MAX_BOOST, 'capped at MAX_BOOST');
  assert.equal(result[0]._biome_bias.affix_matches, 3);
});

test('applyBiomeBias: no affixes → unchanged', () => {
  const pool = [{ unit_id: 'u1', tags: ['fire'], weight: 2 }];
  const biome = {};
  const result = applyBiomeBias(pool, biome);
  assert.equal(result[0].weight, 2);
});

test('applyBiomeBias: empty pool returns empty', () => {
  const result = applyBiomeBias([], { affixes: ['termico'] });
  assert.deepEqual(result, []);
});

test('applyBiomeBias: mixed archetype + affix multiplicative', () => {
  const pool = [
    { unit_id: 'u1', archetype: 'magma_wardens', tags: ['fire'], weight: 1 },
    { unit_id: 'u2', archetype: 'unrelated', tags: ['ice'], weight: 1 },
  ];
  const biome = {
    affixes: ['termico'],
    npc_archetypes: { primary: ['magma_wardens'] },
  };
  const result = applyBiomeBias(pool, biome);
  assert.ok(result[0].weight > result[1].weight, 'primary+affix match wins');
  assert.equal(result[1].weight, 1, 'unrelated stays baseline');
});

test('DEFAULT_BOOST_PER_MATCH matches documented canonical', () => {
  assert.equal(DEFAULT_BOOST_PER_MATCH, 1.5);
  assert.equal(MAX_BOOST, 3.0);
});
