// W5.5 — ermesExporter.computeRoleGap tests + cross-repo parity guarantees.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeRoleGap,
  BIOME_ROLE_DEMANDS,
} = require('../../../apps/backend/services/coop/ermesExporter');

// --- compute basic ---

test('savana perfect match → all zeros', () => {
  const gap = computeRoleGap(['esploratore', 'guerriero'], 'savana');
  assert.equal(gap.esploratore, 0);
  assert.equal(gap.guerriero, 0);
});

test('savana under-rep esploratore → -1', () => {
  const gap = computeRoleGap(['guerriero'], 'savana');
  assert.equal(gap.esploratore, -1);
  assert.equal(gap.guerriero, 0);
});

test('savana over-rep esploratore → +2', () => {
  const gap = computeRoleGap(['esploratore', 'esploratore', 'esploratore', 'guerriero'], 'savana');
  assert.equal(gap.esploratore, 2);
  assert.equal(gap.guerriero, 0);
});

test('role not in demand appears positive', () => {
  const gap = computeRoleGap(['esploratore', 'guerriero', 'tessitore'], 'savana');
  assert.equal(gap.tessitore, 1);
});

test('unknown biome uses fallback empty demand → all positive', () => {
  const gap = computeRoleGap(['guerriero', 'guerriero'], 'alien_world');
  assert.equal(gap.guerriero, 2);
});

// --- input formats ---

test('accepts dict party with job_id field', () => {
  const gap = computeRoleGap(
    [
      { player_id: 'p1', job_id: 'esploratore' },
      { player_id: 'p2', job_id: 'guerriero' },
    ],
    'savana',
  );
  assert.equal(gap.esploratore, 0);
  assert.equal(gap.guerriero, 0);
});

test('skips empty job_id entries', () => {
  const gap = computeRoleGap(
    [
      { player_id: 'p1', job_id: '' },
      { player_id: 'p2', job_id: 'guerriero' },
    ],
    'savana',
  );
  assert.equal(gap.guerriero, 0);
  assert.equal(gap.esploratore, -1);
});

// --- cross-repo parity ---

test('all 13 canonical biomes have demand entry (Godot parity)', () => {
  const canonical = [
    'savana',
    'caverna',
    'atollo_obsidiana',
    'foresta_temperata',
    'badlands',
    'foresta_miceliale',
    'abisso_vulcanico',
    'reef_luminescente',
    'caldera_glaciale',
    'pianura_salina_iperarida',
    'mezzanotte_orbitale',
    'frattura_abissale_sinaptica',
    'foresta_acida',
  ];
  for (const biomeId of canonical) {
    assert.ok(biomeId in BIOME_ROLE_DEMANDS, `${biomeId} has demand entry`);
  }
});

test('parity: identical input → identical output across calls', () => {
  // Determinism floor — ensures Godot ErmesRoleGap.compute can match
  // exactly against this output for parity assertion.
  const party = ['esploratore', 'guerriero', 'tessitore'];
  const a = computeRoleGap(party, 'savana');
  const b = computeRoleGap(party, 'savana');
  assert.deepEqual(a, b);
});
