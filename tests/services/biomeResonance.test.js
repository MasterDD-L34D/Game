// Biome resonance — pure unit tests for Skiv #4 + tier values (P1 follow-up).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadSpeciesAffinityMap,
  resetCache,
  getSpeciesBiomeAffinity,
  getBiomeFamily,
  hasResonance,
  computeResonanceTier,
} = require('../../apps/backend/services/combat/biomeResonance');

test('loadSpeciesAffinityMap: parses biome_affinity from species YAML', () => {
  resetCache();
  const map = loadSpeciesAffinityMap();
  // dune_stalker has biome_affinity: savana per species.yaml
  assert.equal(map.dune_stalker, 'savana');
  // polpo_araldo_sinaptico has biome_affinity: frattura_abissale_sinaptica
  assert.equal(map.polpo_araldo_sinaptico, 'frattura_abissale_sinaptica');
});

test('loadSpeciesAffinityMap: caches result; force=true reloads', () => {
  resetCache();
  const a = loadSpeciesAffinityMap();
  const b = loadSpeciesAffinityMap();
  assert.equal(a, b, 'same reference when cached');
  const c = loadSpeciesAffinityMap({ force: true });
  // After force reload the content equals but the reference may differ.
  assert.deepEqual(a, c);
});

test('getSpeciesBiomeAffinity: returns affinity string', () => {
  resetCache();
  assert.equal(getSpeciesBiomeAffinity('dune_stalker'), 'savana');
});

test('getSpeciesBiomeAffinity: returns null for unknown species', () => {
  resetCache();
  assert.equal(getSpeciesBiomeAffinity('no_such_species'), null);
});

test('getSpeciesBiomeAffinity: null/empty input → null', () => {
  resetCache();
  assert.equal(getSpeciesBiomeAffinity(''), null);
  assert.equal(getSpeciesBiomeAffinity(null), null);
  assert.equal(getSpeciesBiomeAffinity(undefined), null);
  assert.equal(getSpeciesBiomeAffinity(123), null); // non-string
});

test('hasResonance: matching species + biome → true', () => {
  resetCache();
  assert.equal(hasResonance('dune_stalker', 'savana'), true);
});

test('hasResonance: mismatched biome → false', () => {
  resetCache();
  assert.equal(hasResonance('dune_stalker', 'frattura_abissale_sinaptica'), false);
});

test('hasResonance: unknown species → false', () => {
  resetCache();
  assert.equal(hasResonance('no_such', 'savana'), false);
});

test('hasResonance: null/empty inputs → false', () => {
  resetCache();
  assert.equal(hasResonance('', 'savana'), false);
  assert.equal(hasResonance('dune_stalker', ''), false);
  assert.equal(hasResonance(null, 'savana'), false);
  assert.equal(hasResonance('dune_stalker', null), false);
});

test('hasResonance: non-string types → false', () => {
  resetCache();
  assert.equal(hasResonance(123, 'savana'), false);
  assert.equal(hasResonance('dune_stalker', { biome: 'savana' }), false);
});

test('hasResonance: case-sensitive match required', () => {
  resetCache();
  assert.equal(hasResonance('dune_stalker', 'Savana'), false);
  assert.equal(hasResonance('dune_stalker', 'SAVANA'), false);
});

test('hasResonance: with explicit map override', () => {
  const customMap = { test_species: 'test_biome' };
  assert.equal(hasResonance('test_species', 'test_biome', { map: customMap }), true);
  assert.equal(hasResonance('test_species', 'other', { map: customMap }), false);
  assert.equal(hasResonance('unknown', 'test_biome', { map: customMap }), false);
});

// ── getBiomeFamily ──────────────────────────────────────────────────────────

test('getBiomeFamily: known open biome returns "open"', () => {
  assert.equal(getBiomeFamily('savana'), 'open');
  assert.equal(getBiomeFamily('pianura_aperta'), 'open');
});

test('getBiomeFamily: known deep biome returns "deep"', () => {
  assert.equal(getBiomeFamily('frattura_abissale_sinaptica'), 'deep');
  assert.equal(getBiomeFamily('caverna'), 'deep');
});

test('getBiomeFamily: unknown biome → null', () => {
  assert.equal(getBiomeFamily('totally_unknown'), null);
  assert.equal(getBiomeFamily(''), null);
  assert.equal(getBiomeFamily(null), null);
});

// ── computeResonanceTier ────────────────────────────────────────────────────

test('computeResonanceTier: perfect match → tier=perfect, discount=1', () => {
  const map = { dune_stalker: 'savana' };
  const r = computeResonanceTier('dune_stalker', 'savana', null, { map });
  assert.equal(r.tier, 'perfect');
  assert.equal(r.discount, 1);
  assert.ok(r.label_it.length > 0);
});

test('computeResonanceTier: same family → tier=secondary, discount=0', () => {
  // dune_stalker affinity=savana (open), encountering pianura_aperta (also open)
  const map = { dune_stalker: 'savana' };
  const r = computeResonanceTier('dune_stalker', 'pianura_aperta', null, { map });
  assert.equal(r.tier, 'secondary');
  assert.equal(r.discount, 0);
  assert.ok(r.label_it.length > 0);
});

test('computeResonanceTier: archetype matches biome dominant → tier=class_match, discount=0', () => {
  // No affinity, but archetype=skirmisher in savana (dominant=skirmisher)
  const map = {};
  const r = computeResonanceTier('unknown_sp', 'savana', 'skirmisher', { map });
  assert.equal(r.tier, 'class_match');
  assert.equal(r.discount, 0);
  assert.ok(r.label_it.length > 0);
});

test('computeResonanceTier: no match → tier=none, discount=0', () => {
  const map = { dune_stalker: 'savana' };
  // savana (open) vs frattura_abissale_sinaptica (deep) — different families
  // archetype=support does NOT match deep dominant (tank) → none
  const r = computeResonanceTier('dune_stalker', 'frattura_abissale_sinaptica', 'support', { map });
  assert.equal(r.tier, 'none');
  assert.equal(r.discount, 0);
  assert.equal(r.label_it, '');
});

test('computeResonanceTier: null/empty inputs → tier=none', () => {
  assert.equal(computeResonanceTier('', 'savana').tier, 'none');
  assert.equal(computeResonanceTier('sp', '').tier, 'none');
  assert.equal(computeResonanceTier(null, 'savana').tier, 'none');
  assert.equal(computeResonanceTier('sp', null).tier, 'none');
});

test('computeResonanceTier: perfect takes precedence over class_match', () => {
  // If affinity matches AND archetype matches, perfect wins
  const map = { dune_stalker: 'savana' };
  const r = computeResonanceTier('dune_stalker', 'savana', 'skirmisher', { map });
  assert.equal(r.tier, 'perfect');
  assert.equal(r.discount, 1);
});
