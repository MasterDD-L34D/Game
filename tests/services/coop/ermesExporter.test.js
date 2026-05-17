// W5-bb — ermesExporter.js tests.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  getErmesForBiome,
  STATIC_FALLBACKS,
  NEUTRAL_FALLBACK,
  _resetCache,
} = require('../../../apps/backend/services/coop/ermesExporter');

function reset() {
  _resetCache();
}

test('savana returns static fallback when no runtime report', () => {
  reset();
  const e = getErmesForBiome('savana', { reportPath: '/tmp/no_such_report.json' });
  assert.equal(e.eco_pressure_score, 0.62);
  assert.equal(e.bias.predator_density, 0.7);
});

test('caverna returns static fallback', () => {
  reset();
  const e = getErmesForBiome('caverna', { reportPath: '/tmp/no_such_report.json' });
  assert.equal(e.eco_pressure_score, 0.78);
  assert.ok(e.bias.ambush_risk > 0);
});

test('unknown biome returns neutral fallback', () => {
  reset();
  const e = getErmesForBiome('biome_inesistente', { reportPath: '/tmp/no_such_report.json' });
  assert.deepEqual(e, NEUTRAL_FALLBACK);
});

test('empty biomeId returns neutral fallback', () => {
  reset();
  const e = getErmesForBiome('');
  assert.equal(e.eco_pressure_score, 0.5);
});

test('runtime report overrides static fallback', () => {
  reset();
  const tmp = path.join(os.tmpdir(), `ermes_test_${Date.now()}.json`);
  fs.writeFileSync(
    tmp,
    JSON.stringify({
      biomes: {
        savana: {
          eco_pressure_score: 0.99,
          bias: { runtime_only: 1.0 },
        },
      },
    }),
  );
  try {
    const e = getErmesForBiome('savana', { reportPath: tmp });
    assert.equal(e.eco_pressure_score, 0.99);
    assert.equal(e.bias.runtime_only, 1.0);
  } finally {
    fs.unlinkSync(tmp);
  }
});

test('runtime report missing biome falls back to static', () => {
  reset();
  const tmp = path.join(os.tmpdir(), `ermes_test_${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify({ biomes: { caverna: { eco_pressure_score: 0.1 } } }));
  try {
    const e = getErmesForBiome('savana', { reportPath: tmp });
    // savana not in runtime, falls to static
    assert.equal(e.eco_pressure_score, 0.62);
  } finally {
    fs.unlinkSync(tmp);
  }
});

test('STATIC_FALLBACKS covers minimum 5 biomes', () => {
  const keys = Object.keys(STATIC_FALLBACKS);
  assert.ok(keys.length >= 5);
  for (const k of ['savana', 'caverna', 'atollo_obsidiana', 'foresta_temperata', 'badlands']) {
    assert.ok(keys.includes(k), `${k} missing from STATIC_FALLBACKS`);
  }
});

test('NEUTRAL_FALLBACK has 0.5 score', () => {
  assert.equal(NEUTRAL_FALLBACK.eco_pressure_score, 0.5);
  assert.deepEqual(NEUTRAL_FALLBACK.bias, {});
});

test('malformed json report returns static fallback', () => {
  reset();
  const tmp = path.join(os.tmpdir(), `ermes_test_${Date.now()}.json`);
  fs.writeFileSync(tmp, '{ invalid json');
  try {
    const e = getErmesForBiome('savana', { reportPath: tmp });
    // Should fall back gracefully to static
    assert.equal(e.eco_pressure_score, 0.62);
  } finally {
    fs.unlinkSync(tmp);
  }
});
