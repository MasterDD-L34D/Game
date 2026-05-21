// W5-bb — ermesExporter.js tests.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  getErmesForBiome,
  computeRoleGap,
  BIOME_ROLE_DEMANDS,
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

// ===========================================================================
// computeRoleGap negative + edge case tests (gap coverage 2026-05-20).
// ===========================================================================

test('computeRoleGap: empty party against demand biome → all roles negative', () => {
  const gap = computeRoleGap([], 'savana');
  assert.equal(gap.esploratore, -1);
  assert.equal(gap.guerriero, -1);
});

test('computeRoleGap: null/undefined party defaults to empty', () => {
  const gap1 = computeRoleGap(null, 'caverna');
  const gap2 = computeRoleGap(undefined, 'caverna');
  assert.deepEqual(gap1, { esploratore: -1, custode: -1 });
  assert.deepEqual(gap2, { esploratore: -1, custode: -1 });
});

test('computeRoleGap: unknown biome → empty demand, party roles surface as over-rep', () => {
  const gap = computeRoleGap(['guerriero', 'tessitore'], 'biome_inesistente');
  assert.equal(gap.guerriero, 1);
  assert.equal(gap.tessitore, 1);
});

test('computeRoleGap: party over-fills demand → positive delta', () => {
  // savana demands {esploratore: 1, guerriero: 1}
  const gap = computeRoleGap(['esploratore', 'esploratore', 'guerriero'], 'savana');
  assert.equal(gap.esploratore, 1); // 2 present - 1 demanded
  assert.equal(gap.guerriero, 0);
});

test('computeRoleGap: extra party roles not in demand surface separately', () => {
  // savana demands {esploratore:1, guerriero:1}; party adds tessitore
  const gap = computeRoleGap(['esploratore', 'guerriero', 'tessitore'], 'savana');
  assert.equal(gap.esploratore, 0);
  assert.equal(gap.guerriero, 0);
  assert.equal(gap.tessitore, 1); // over-rep, not in demand
});

test('computeRoleGap: accepts player dict objects with job_id field', () => {
  const party = [{ job_id: 'esploratore' }, { job_id: 'guerriero' }];
  const gap = computeRoleGap(party, 'savana');
  assert.equal(gap.esploratore, 0);
  assert.equal(gap.guerriero, 0);
});

test('computeRoleGap: ignores entries with missing/empty job_id', () => {
  const party = [{ job_id: 'esploratore' }, { job_id: '' }, { name: 'no_job' }, null, 'guerriero'];
  const gap = computeRoleGap(party, 'savana');
  assert.equal(gap.esploratore, 0);
  assert.equal(gap.guerriero, 0);
});

test('BIOME_ROLE_DEMANDS: covers ≥13 biomes (cross-repo parity Godot v2)', () => {
  const keys = Object.keys(BIOME_ROLE_DEMANDS);
  assert.ok(keys.length >= 13, `expected ≥13 biomes, got ${keys.length}`);
  // Spot check 5 known biomes (parity ermes_role_gap.gd).
  for (const b of ['savana', 'caverna', 'atollo_obsidiana', 'foresta_temperata', 'badlands']) {
    assert.ok(BIOME_ROLE_DEMANDS[b], `${b} missing from BIOME_ROLE_DEMANDS`);
  }
});

test('BIOME_ROLE_DEMANDS: all role counts are positive integers', () => {
  for (const [biome, demand] of Object.entries(BIOME_ROLE_DEMANDS)) {
    for (const [role, count] of Object.entries(demand)) {
      assert.ok(Number.isInteger(count), `${biome}.${role} not integer: ${count}`);
      assert.ok(count > 0, `${biome}.${role} not positive: ${count}`);
    }
  }
});
