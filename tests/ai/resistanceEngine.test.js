// Tests M6-#1 resistance engine Node native.
// Parity semantic con Python services/rules/resolver.py.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  loadSpeciesResistances,
  getArchetypeResistances,
  mergeResistances,
  applyResistance,
  computeUnitResistances,
  DEFAULT_SPECIES_RESISTANCES_PATH,
} = require('../../apps/backend/services/combat/resistanceEngine');

// ─── applyResistance ────────────────────────────────────────────

test('applyResistance resist positive → reduced damage floor', () => {
  const resistances = [{ channel: 'fuoco', modifier_pct: 20 }];
  assert.equal(applyResistance(10, resistances, 'fuoco'), 8); // floor(10*0.8)=8
});

test('applyResistance delta negative → amplify damage (vuln)', () => {
  const resistances = [{ channel: 'fuoco', modifier_pct: -20 }];
  assert.equal(applyResistance(10, resistances, 'fuoco'), 12); // floor(10*1.2)=12
});

test('applyResistance 100 immune → zero damage', () => {
  const resistances = [{ channel: 'fuoco', modifier_pct: 100 }];
  assert.equal(applyResistance(10, resistances, 'fuoco'), 0);
});

test('applyResistance -100 double → 2x damage', () => {
  const resistances = [{ channel: 'fuoco', modifier_pct: -100 }];
  assert.equal(applyResistance(10, resistances, 'fuoco'), 20);
});

test('applyResistance channel not matched → damage invariato', () => {
  const resistances = [{ channel: 'fuoco', modifier_pct: 50 }];
  assert.equal(applyResistance(10, resistances, 'fisico'), 10);
});

test('applyResistance null channel → damage invariato', () => {
  const resistances = [{ channel: 'fuoco', modifier_pct: 50 }];
  assert.equal(applyResistance(10, resistances, null), 10);
});

test('applyResistance empty resistances → damage invariato', () => {
  assert.equal(applyResistance(10, [], 'fuoco'), 10);
  assert.equal(applyResistance(10, null, 'fuoco'), 10);
});

test('applyResistance zero/negative damage → pass through', () => {
  assert.equal(applyResistance(0, [{ channel: 'x', modifier_pct: 50 }], 'x'), 0);
});

// ─── mergeResistances ──────────────────────────────────────────

test('mergeResistances species only 100-neutral → delta', () => {
  // psionico archetype: fisico=120 (vuln), psionico=70 (resist), taglio=120
  const species = { fisico: 120, taglio: 120, psionico: 70 };
  const result = mergeResistances([], species);
  const byCh = Object.fromEntries(result.map((r) => [r.channel, r.modifier_pct]));
  assert.equal(byCh.fisico, -20); // 100-120=-20 (vuln)
  assert.equal(byCh.taglio, -20);
  assert.equal(byCh.psionico, 30); // 100-70=+30 (resist)
});

test('mergeResistances trait only → pass-through delta', () => {
  const traits = [
    { channel: 'fuoco', modifier_pct: 20 },
    { channel: 'fisico', modifier_pct: -15 },
  ];
  const result = mergeResistances(traits, null);
  const byCh = Object.fromEntries(result.map((r) => [r.channel, r.modifier_pct]));
  assert.equal(byCh.fuoco, 20);
  assert.equal(byCh.fisico, -15);
});

test('mergeResistances species + trait stack additivo', () => {
  // corazzato.psionico: 120 → -20 baseline (vuln)
  // trait psionico: +30 (resist)
  // atteso: -20 + 30 = +10
  const species = { fisico: 80, psionico: 120 };
  const traits = [{ channel: 'psionico', modifier_pct: 30 }];
  const result = mergeResistances(traits, species);
  const byCh = Object.fromEntries(result.map((r) => [r.channel, r.modifier_pct]));
  assert.equal(byCh.fisico, 20); // only species: 100-80=+20 (resist)
  assert.equal(byCh.psionico, 10); // -20+30=+10
});

test('mergeResistances clamp ±100', () => {
  const species = { fisico: 50 }; // +50 baseline
  const traits = [{ channel: 'fisico', modifier_pct: 200 }]; // stack +250
  const result = mergeResistances(traits, species);
  assert.equal(result[0].modifier_pct, 100); // clamped
});

test('mergeResistances filter zero sum', () => {
  const traits = [
    { channel: 'x', modifier_pct: 50 },
    { channel: 'x', modifier_pct: -50 },
  ];
  assert.deepEqual(mergeResistances(traits, null), []);
});

test('mergeResistances sorted alphabetical', () => {
  const species = { fuoco: 80, psionico: 70, fisico: 120 };
  const result = mergeResistances([], species);
  const channels = result.map((r) => r.channel);
  assert.deepEqual(channels, channels.slice().sort());
});

// ─── getArchetypeResistances ──────────────────────────────────

test('getArchetypeResistances valid id returns dict', () => {
  const data = {
    species_archetypes: {
      psionico: { resistances: { fisico: 120, psionico: 70 } },
    },
  };
  const result = getArchetypeResistances('psionico', data);
  assert.equal(result.fisico, 120);
  assert.equal(result.psionico, 70);
});

test('getArchetypeResistances unknown id → default fallback', () => {
  const data = {
    species_archetypes: {
      adattivo: { resistances: { fisico: 100, taglio: 100 } },
    },
    default_archetype: 'adattivo',
  };
  const result = getArchetypeResistances('unknown_xyz', data);
  assert.equal(result.fisico, 100); // neutral
});

test('getArchetypeResistances no data → null', () => {
  assert.equal(getArchetypeResistances('corazzato', null), null);
});

// ─── loadSpeciesResistances (real file) ───────────────────────

test('loadSpeciesResistances reads real YAML', () => {
  const data = loadSpeciesResistances(DEFAULT_SPECIES_RESISTANCES_PATH);
  assert.ok(data.species_archetypes);
  for (const req of ['corazzato', 'psionico', 'adattivo']) {
    assert.ok(data.species_archetypes[req], `missing archetype ${req}`);
  }
  assert.equal(data.species_archetypes.corazzato.resistances.fisico, 80);
});

// ─── computeUnitResistances integration ───────────────────────

test('computeUnitResistances end-to-end: archetype psionico + trait', () => {
  const data = loadSpeciesResistances(DEFAULT_SPECIES_RESISTANCES_PATH);
  const traits = [{ channel: 'fuoco', modifier_pct: 20 }];
  const result = computeUnitResistances('psionico', data, traits);
  const byCh = Object.fromEntries(result.map((r) => [r.channel, r.modifier_pct]));
  assert.equal(byCh.fisico, -20); // psionico.fisico 120 → -20
  assert.equal(byCh.fuoco, 20); // trait-only, no species entry for fuoco psionico=100
});

test('computeUnitResistances smoking gun: vulnerability NOT clamped to 0', () => {
  // Regression guard da balance-auditor spike 2026-04-19
  const data = loadSpeciesResistances(DEFAULT_SPECIES_RESISTANCES_PATH);
  const resistances = computeUnitResistances('psionico', data, []);
  const damage = applyResistance(10, resistances, 'fisico');
  // psionico vuln fisico: 120 → -20 delta → factor 1.2 → 10*1.2=12
  assert.equal(damage, 12, `Expected amplify 12, got ${damage}`);
});

test('computeUnitResistances corazzato resist fisico', () => {
  const data = loadSpeciesResistances(DEFAULT_SPECIES_RESISTANCES_PATH);
  const resistances = computeUnitResistances('corazzato', data, []);
  const damage = applyResistance(10, resistances, 'fisico');
  // corazzato.fisico: 80 → +20 resist → factor 0.8 → floor(8)
  assert.equal(damage, 8);
});
