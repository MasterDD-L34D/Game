// W5-bb — ermesExporter.js tests.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  getErmesForBiome,
  getErmesBucketed,
  computeRoleGap,
  BIOME_ROLE_DEMANDS,
  STATIC_FALLBACKS,
  NEUTRAL_FALLBACK,
  _resetCache,
  _resetBucketsCache,
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

// ===========================================================================
// ADR-2026-05-29 TKT-BR-04 -- schema_version gate + getErmesBucketed banding.
// (gap-fill: pre-existing file covered getErmesForBiome/computeRoleGap only.)
// ===========================================================================

function bucketsReset() {
  _resetCache();
  _resetBucketsCache();
}

function writeReport(obj) {
  const tmp = path.join(
    os.tmpdir(),
    `ermes_bucket_${Date.now()}_${Math.random().toString(36).slice(2)}.json`,
  );
  fs.writeFileSync(tmp, JSON.stringify(obj));
  return tmp;
}

test('schema gate: v1.0.0 report loads (runtime overrides static)', () => {
  bucketsReset();
  const tmp = writeReport({
    schema_version: '1.0.0',
    biomes: { savana: { eco_pressure_score: 0.21, bias: {} } },
  });
  try {
    const e = getErmesForBiome('savana', { reportPath: tmp });
    assert.equal(e.eco_pressure_score, 0.21);
  } finally {
    fs.unlinkSync(tmp);
  }
});

test('schema gate: mismatched version -> falls back to static + warn', () => {
  bucketsReset();
  const tmp = writeReport({
    schema_version: '9.9.9',
    biomes: { savana: { eco_pressure_score: 0.21 } },
  });
  const origWarn = console.warn;
  let warned = '';
  console.warn = (...a) => {
    warned += a.join(' ');
  };
  try {
    const e = getErmesForBiome('savana', { reportPath: tmp });
    assert.equal(e.eco_pressure_score, 0.62, 'savana static fallback on schema mismatch');
    assert.match(warned, /schema_version mismatch/);
  } finally {
    console.warn = origWarn;
    fs.unlinkSync(tmp);
  }
});

test('schema gate: null/undefined schema_version accepted (legacy fixtures)', () => {
  bucketsReset();
  const tmp = writeReport({ biomes: { savana: { eco_pressure_score: 0.77 } } });
  try {
    const e = getErmesForBiome('savana', { reportPath: tmp });
    assert.equal(e.eco_pressure_score, 0.77);
  } finally {
    fs.unlinkSync(tmp);
  }
});

test('getErmesBucketed: eco_pressure bands low/med/high (default thresholds)', () => {
  const cases = [
    [0.2, 'low'],
    [0.5, 'med'],
    [0.8, 'high'],
  ];
  for (const [score, expectedBand] of cases) {
    bucketsReset();
    const tmp = writeReport({
      schema_version: '1.0.0',
      biomes: { savana: { eco_pressure_score: score, bias: {} } },
    });
    try {
      const out = getErmesBucketed('savana', { reportPath: tmp });
      assert.ok(out.buckets.eco_pressure_score, `score ${score} should band`);
      assert.equal(
        out.buckets.eco_pressure_score.band,
        expectedBand,
        `score ${score} -> ${expectedBand}`,
      );
    } finally {
      fs.unlinkSync(tmp);
    }
  }
});

test('getErmesBucketed: surfaces caps + guards from thresholds yaml', () => {
  bucketsReset();
  const tmp = writeReport({
    schema_version: '1.0.0',
    biomes: { savana: { eco_pressure_score: 0.5, bias: {} } },
  });
  try {
    const out = getErmesBucketed('savana', { reportPath: tmp });
    assert.equal(out.caps.max_delta_any_stat, 2);
    assert.equal(out.caps.max_buckets_active_per_unit, 3);
    assert.equal(out.guards.bucket_miss_fallback, 'low');
  } finally {
    fs.unlinkSync(tmp);
  }
});

test('getErmesBucketed: missing buckets yaml -> empty buckets, null caps/guards', () => {
  bucketsReset();
  const tmp = writeReport({
    schema_version: '1.0.0',
    biomes: { savana: { eco_pressure_score: 0.5, bias: {} } },
  });
  try {
    const out = getErmesBucketed('savana', {
      reportPath: tmp,
      bucketsPath: path.join(os.tmpdir(), 'no_such_buckets_xyz.yaml'),
    });
    assert.deepEqual(out.buckets, {});
    assert.equal(out.caps, null);
    assert.equal(out.guards, null);
    assert.equal(out.eco_pressure_score, 0.5);
  } finally {
    fs.unlinkSync(tmp);
  }
});

// ===========================================================================
// ADR-2026-05-29 TKT-BR-11 -- cross-repo parity guard vs Godot v2.
// ===========================================================================

test('BIOME_ROLE_DEMANDS: exact parity snapshot vs Godot ermes_role_gap.gd (TKT-BR-11)', () => {
  // Cross-repo parity contract. This snapshot mirrors, verbatim, the canonical
  // source Game-Godot-v2/scripts/session/ermes_role_gap.gd BIOME_ROLE_DEMANDS.
  // The JS computeRoleGap is a port of that .gd compute. A unilateral edit on
  // either side (add/remove a biome, change a demand count) without mirroring
  // the other fails this assertion -> forces the mirror (the .gd header rule
  // "any edit here MUST land in Godot side too"). The prior >=13 + 5-spot-check
  // test did not catch drift in biomes 6-13.
  const GODOT_SNAPSHOT = {
    savana: { esploratore: 1, guerriero: 1 },
    caverna: { esploratore: 1, custode: 1 },
    atollo_obsidiana: { tessitore: 1, esploratore: 1 },
    foresta_temperata: { tessitore: 1, custode: 1 },
    badlands: { guerriero: 1, esploratore: 1 },
    foresta_miceliale: { tessitore: 2 },
    abisso_vulcanico: { guerriero: 1, esploratore: 1 },
    reef_luminescente: { esploratore: 1, tessitore: 1 },
    caldera_glaciale: { custode: 1, guerriero: 1 },
    pianura_salina_iperarida: { esploratore: 2 },
    mezzanotte_orbitale: { tessitore: 1, esploratore: 1 },
    frattura_abissale_sinaptica: { tessitore: 1, custode: 1 },
    foresta_acida: { custode: 1, tessitore: 1 },
  };
  assert.deepEqual(
    JSON.parse(JSON.stringify(BIOME_ROLE_DEMANDS)),
    GODOT_SNAPSHOT,
    'JS BIOME_ROLE_DEMANDS drifted from Godot ermes_role_gap.gd -- mirror both sides',
  );
});
