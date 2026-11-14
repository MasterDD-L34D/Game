// OD-024 Phase B3 ai-station 2026-05-14 — sentience tier fold in vc_scoring.
//
// vc_scoring.buildVcSnapshot per_actor[uid] now includes sentience.tier
// (T0-T6) resolved via SpeciesCatalog (Game/ data/core/species/species_catalog.json).
// 4-layer psicologico completo: MBTI + Ennea + Conviction + Sentience.
//
// Closes Pillar P4 Temperamenti depth — sentience surface fully wired.

'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  buildVcSnapshot,
  _resolveSentienceTiers,
  _resetSpeciesCatalogCache,
} = require('../../apps/backend/services/vcScoring');

const SAMPLE_CATALOG = {
  elastovaranus_hydrus: {
    species_id: 'elastovaranus_hydrus',
    sentience_index: 'T1',
    source: 'pack-v2-full-plus',
  },
  perfusuas_pedes: {
    species_id: 'perfusuas_pedes',
    sentience_index: 'T3',
    source: 'pack-v2-full-plus',
  },
  proteus_plasma: {
    species_id: 'proteus_plasma',
    sentience_index: 'T0',
    source: 'pack-v2-full-plus',
  },
};

beforeEach(() => {
  _resetSpeciesCatalogCache();
});

describe('Phase B3 — _resolveSentienceTiers helper', () => {
  test('maps species_id → sentience_index from injected session catalog', () => {
    const units = [
      { id: 'u1', species_id: 'elastovaranus_hydrus' },
      { id: 'u2', species_id: 'perfusuas_pedes' },
      { id: 'u3', species_id: 'proteus_plasma' },
    ];
    const result = _resolveSentienceTiers(units, { species_catalog: SAMPLE_CATALOG });
    assert.equal(result.u1.tier, 'T1');
    assert.equal(result.u1.source, 'species_catalog');
    assert.equal(result.u2.tier, 'T3');
    assert.equal(result.u3.tier, 'T0');
  });

  test('unit with unknown species → T1 default fallback', () => {
    const units = [{ id: 'u1', species_id: 'unknown_creature' }];
    const result = _resolveSentienceTiers(units, { species_catalog: SAMPLE_CATALOG });
    assert.equal(result.u1.tier, 'T1');
    assert.equal(result.u1.source, 'default-fallback');
  });

  test('unit without species_id → T1 default fallback', () => {
    const units = [{ id: 'u1' }];
    const result = _resolveSentienceTiers(units, { species_catalog: SAMPLE_CATALOG });
    assert.equal(result.u1.tier, 'T1');
    assert.equal(result.u1.source, 'default-fallback');
  });

  test('unit.species (legacy field) also accepted', () => {
    const units = [{ id: 'u1', species: 'perfusuas_pedes' }];
    const result = _resolveSentienceTiers(units, { species_catalog: SAMPLE_CATALOG });
    assert.equal(result.u1.tier, 'T3', 'legacy "species" field supported');
  });

  test('empty units array → empty result', () => {
    assert.deepEqual(_resolveSentienceTiers([], { species_catalog: SAMPLE_CATALOG }), {});
  });

  test('null units → empty result', () => {
    assert.deepEqual(_resolveSentienceTiers(null, {}), {});
  });

  test('falls back to disk-loaded catalog when no session injection', () => {
    // Without species_catalog in session, loads from data/core/species/.
    const units = [{ id: 'u1', species_id: 'elastovaranus_hydrus' }];
    const result = _resolveSentienceTiers(units, {});
    // Canonical Game/ catalog v0.3.0 (post ADR-2026-05-15 Q1 Option A merge):
    // elastovaranus_hydrus → T2 (legacy sentience_tier override boost from
    // pack v2 T1 default, max preservation for legacy YAML authoritative).
    // Cross-link: docs/adr/ADR-2026-05-15-species-catalog-schema-fork-resolution.md
    assert.equal(result.u1.tier, 'T2');
    assert.equal(result.u1.source, 'species_catalog');
  });
});

describe('Phase B3 — buildVcSnapshot surfaces sentience per actor', () => {
  test('per_actor[uid].sentience populated for all units', () => {
    const session = {
      events: [],
      units: [
        { id: 'u1', species_id: 'elastovaranus_hydrus' },
        { id: 'u2', species_id: 'perfusuas_pedes' },
      ],
      grid: { width: 6 },
      species_catalog: SAMPLE_CATALOG,
    };
    const snap = buildVcSnapshot(session, {
      indices: {},
      mbti_axes: {},
      ennea_themes: [],
      normalization: {},
    });
    assert.ok(snap.per_actor.u1);
    assert.ok(snap.per_actor.u1.sentience, 'sentience field present');
    assert.equal(snap.per_actor.u1.sentience.tier, 'T1');
    assert.equal(snap.per_actor.u2.sentience.tier, 'T3');
  });

  test('per_actor preserves all 4 psicologico layers', () => {
    const session = {
      events: [],
      units: [{ id: 'u1', species_id: 'elastovaranus_hydrus' }],
      grid: { width: 6 },
      species_catalog: SAMPLE_CATALOG,
    };
    const snap = buildVcSnapshot(session, {
      indices: {},
      mbti_axes: {},
      ennea_themes: [],
      normalization: {},
    });
    const actor = snap.per_actor.u1;
    // 4 layers psicologico
    assert.ok(actor.mbti_axes, 'MBTI layer');
    assert.ok(actor.ennea_archetypes, 'Ennea layer');
    assert.ok(actor.conviction_axis, 'Conviction layer (D2-A)');
    assert.ok(actor.sentience, 'Sentience layer (Phase B3 NEW)');
  });

  test('sentience layer additive — backward-compat existing consumers', () => {
    // Snapshot still contains all old surface; sentience is purely additive.
    const session = {
      events: [],
      units: [{ id: 'u1', species_id: 'elastovaranus_hydrus' }],
      grid: { width: 6 },
      species_catalog: SAMPLE_CATALOG,
    };
    const snap = buildVcSnapshot(session, {
      indices: {},
      mbti_axes: {},
      ennea_themes: [],
      normalization: {},
    });
    const actor = snap.per_actor.u1;
    assert.ok(actor.raw_metrics);
    assert.ok(actor.aggregate_indices);
    assert.ok(actor.mbti_type);
    assert.equal(actor.conviction_axis.utility, 50, 'conviction baseline preserved');
  });
});
