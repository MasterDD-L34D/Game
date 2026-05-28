'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  scoreAlienaCoherence,
  ALIENA_WEIGHTS,
} = require('../../apps/backend/services/authorial/alienaCoherence');

test('aliena scorer: full plausibilita + eco + narrative = 1.0 aggregate', () => {
  const entry = {
    id: 'dune_stalker',
    tags: ['desert', 'sand'],
    role: 'apex',
    narrative_hooks: ['hunt-pattern'],
  };
  const biomeConfig = {
    id: 'dune',
    affixes: ['sabbia'],
    role_templates: [{ role: 'apex', tier: 'T2', primary: true }],
  };
  const canonicalPool = [{ id: 'dune_stalker' }];
  const r = scoreAlienaCoherence(entry, biomeConfig, { canonicalPool });
  assert.ok(r.aggregate > 0.95);
  assert.equal(r.sub_scores.plausibilita, 1.0);
  assert.ok(r.sub_scores.coerenza_eco > 0);
  assert.equal(r.sub_scores.ancoraggio_narrativo, 1.0);
});

test('aliena scorer: empty entry returns aggregate baseline (no throw)', () => {
  const r = scoreAlienaCoherence({}, {}, {});
  assert.ok(Number.isFinite(r.aggregate));
  assert.ok(r.aggregate >= 0 && r.aggregate <= 1);
});

test('aliena scorer: weights export matches design (0.4/0.4/0.2)', () => {
  assert.equal(ALIENA_WEIGHTS.plausibilita, 0.4);
  assert.equal(ALIENA_WEIGHTS.coerenza_eco, 0.4);
  assert.equal(ALIENA_WEIGHTS.ancoraggio_narrativo, 0.2);
});

test('aliena scorer: out-of-pool no-role entry -> plausibilita 0', () => {
  const entry = { id: 'random_creature', tags: [] };
  const biomeConfig = { id: 'dune', affixes: ['sabbia'], role_templates: [] };
  const r = scoreAlienaCoherence(entry, biomeConfig, { canonicalPool: [{ id: 'other' }] });
  assert.equal(r.sub_scores.plausibilita, 0);
});

test('aliena scorer: pool miss + role match -> plausibilita 0.5', () => {
  const entry = { id: 'wandering_apex', tags: [], role: 'apex' };
  const biomeConfig = {
    id: 'dune',
    affixes: [],
    role_templates: [{ role: 'apex', tier: 'T2', primary: true }],
  };
  const r = scoreAlienaCoherence(entry, biomeConfig, { canonicalPool: [{ id: 'other' }] });
  assert.equal(r.sub_scores.plausibilita, 0.5);
});

test('aliena scorer: no narrative data -> ancoraggio_narrativo 0.5 neutral', () => {
  const entry = { id: 'plain', tags: ['desert'] };
  const biomeConfig = { id: 'dune', affixes: ['sabbia'] };
  const r = scoreAlienaCoherence(entry, biomeConfig, {});
  assert.equal(r.sub_scores.ancoraggio_narrativo, 0.5);
});

const { applyBiomeBias } = require('../../apps/backend/services/combat/biomeSpawnBias');

test('hook: applyBiomeBias emits aliena_coherence telemetry per entry (opt-in)', () => {
  const pool = [
    { id: 'dune_stalker', weight: 1.0, tags: ['desert', 'sand'], role: 'apex' },
    { id: 'random', weight: 1.0, tags: [] },
  ];
  const biomeConfig = {
    id: 'dune',
    affixes: ['sabbia'],
    role_templates: [{ role: 'apex', tier: 'T2', primary: true }],
  };
  const telemetry = [];
  const out = applyBiomeBias(pool, biomeConfig, {
    canonicalPool: [{ id: 'dune_stalker' }],
    emitAlienaCoherence: (event) => telemetry.push(event),
  });
  assert.equal(out.length, pool.length, 'pool length unchanged (no enforcement)');
  assert.equal(telemetry.length, pool.length, 'telemetry emitted per entry');
  const dune = telemetry.find((t) => t.entry_id === 'dune_stalker');
  assert.ok(dune.aggregate > 0.7, 'dune_stalker has high coherence');
  const random = telemetry.find((t) => t.entry_id === 'random');
  assert.ok(random.aggregate < 0.5, 'random has low coherence');
});

test('hook: no emitAlienaCoherence callback -> no telemetry, no throw (back-compat)', () => {
  const pool = [{ id: 'x', weight: 1.0 }];
  const out = applyBiomeBias(pool, { id: 'dune', affixes: [] });
  assert.equal(out.length, 1);
});
