// Canon-consistency checker (G3) -- cross-entity semantic gate beyond schema.
// Spec: docs/superpowers/specs/2026-06-17-canon-consistency-checker-design.md
// Per-rule unit tests (in-memory index fixtures) + e2e wrapper (real dataset + baseline).
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  rulePromotionLadderMonotonic,
  ruleBiomeRefs,
  ruleJobBiasEnum,
  ruleSynergyConflictClosure,
  ruleI18nCoverage,
  runRules,
  partitionByBaseline,
  checkCanonConsistency,
} = require('../../scripts/check-canon-consistency.cjs');

// Minimal index fixture helpers -- only the slices each rule needs.
function idx(partial) {
  return Object.assign(
    {
      species: [],
      packCreatures: [],
      biomeIds: new Set(),
      jobIds: new Set(),
      glossarySlugs: new Set(),
      glossaryTraits: {},
      indexTraits: [],
      promotions: { tier_ladder: [], thresholds: {} },
    },
    partial,
  );
}

describe('rule: promotion-ladder-monotonic', () => {
  const ladder = ['base', 'veteran', 'captain', 'elite', 'master'];

  test('strictly increasing kills_min -> no violations', () => {
    const index = idx({
      promotions: {
        tier_ladder: ladder,
        thresholds: {
          veteran: { kills_min: 3 },
          captain: { kills_min: 8 },
          elite: { kills_min: 18 },
          master: { kills_min: 35 },
        },
      },
    });
    assert.deepEqual(rulePromotionLadderMonotonic(index), []);
  });

  test('non-increasing kills_min -> one violation at the offending tier', () => {
    const index = idx({
      promotions: {
        tier_ladder: ladder,
        thresholds: {
          veteran: { kills_min: 3 },
          captain: { kills_min: 2 }, // <= veteran 3 -> violation
          elite: { kills_min: 18 },
          master: { kills_min: 35 },
        },
      },
    });
    const v = rulePromotionLadderMonotonic(index);
    assert.equal(v.length, 1);
    assert.equal(v[0].rule, 'promotion-ladder-monotonic');
    assert.equal(v[0].severity, 'error');
    assert.equal(v[0].entity, 'captain');
  });
});

describe('rule: biome-refs', () => {
  const biomeIds = new Set(['badlands', 'savana', 'atollo_obsidiana']);

  test('all biome refs resolve -> no violations', () => {
    const index = idx({
      biomeIds,
      species: [{ species_id: 'echo_backstab', biome_affinity: 'atollo_obsidiana' }],
      packCreatures: [{ id: 'dune-stalker', biomes: ['badlands'] }],
    });
    assert.deepEqual(ruleBiomeRefs(index), []);
  });

  test('catalog biome_affinity (string) dangling -> violation on species', () => {
    const index = idx({
      biomeIds,
      species: [{ species_id: 'ghost_sp', biome_affinity: 'nonexistent_biome' }],
    });
    const v = ruleBiomeRefs(index);
    assert.equal(v.length, 1);
    assert.equal(v[0].rule, 'biome-refs');
    assert.equal(v[0].entity, 'ghost_sp');
    assert.equal(v[0].ref, 'nonexistent_biome');
  });

  test('pack creature biomes[] dangling -> violation per bad ref', () => {
    const index = idx({
      biomeIds,
      packCreatures: [{ id: 'bad-creature', biomes: ['badlands', 'void_zone'] }],
    });
    const v = ruleBiomeRefs(index);
    assert.equal(v.length, 1);
    assert.equal(v[0].entity, 'bad-creature');
    assert.equal(v[0].ref, 'void_zone');
  });

  test('missing/optional biome field -> not a violation', () => {
    const index = idx({ biomeIds, species: [{ species_id: 'no_biome_sp' }] });
    assert.deepEqual(ruleBiomeRefs(index), []);
  });

  test('case-insensitive match (loadCanonIndex lowercases ids + aliases) -> no violation', () => {
    // The real index stores lowercased {biome ids UNION aliases}; an UPPERCASE
    // ref (e.g. echo-wing FORESTA_TEMPERATA / CRYOSTEPPE) must resolve.
    const index = idx({
      biomeIds: new Set(['badlands']),
      species: [{ species_id: 'shout', biome_affinity: 'BADLANDS' }],
      packCreatures: [{ id: 'shout-c', biomes: ['Badlands'] }],
    });
    assert.deepEqual(ruleBiomeRefs(index), []);
  });
});

describe('rule: job-bias-enum', () => {
  const jobIds = new Set(['vanguard', 'warden', 'skirmisher']);

  test('all jobs_bias in enum -> no violations', () => {
    const index = idx({
      jobIds,
      packCreatures: [{ id: 'dune-stalker', jobs_bias: ['vanguard', 'warden'] }],
    });
    assert.deepEqual(ruleJobBiasEnum(index), []);
  });

  test('jobs_bias outside enum -> violation per bad job', () => {
    const index = idx({
      jobIds,
      packCreatures: [{ id: 'bad', jobs_bias: ['vanguard', 'necromancer'] }],
    });
    const v = ruleJobBiasEnum(index);
    assert.equal(v.length, 1);
    assert.equal(v[0].rule, 'job-bias-enum');
    assert.equal(v[0].entity, 'bad');
    assert.equal(v[0].ref, 'necromancer');
  });
});

describe('rule: synergy-conflict-closure', () => {
  const glossarySlugs = new Set(['trait_a', 'trait_b', 'trait_c']);

  test('all synergy/conflict slugs resolve -> no violations', () => {
    const index = idx({
      glossarySlugs,
      indexTraits: [{ id: 'trait_a', sinergie: ['trait_b'], conflitti: ['trait_c'] }],
    });
    assert.deepEqual(ruleSynergyConflictClosure(index), []);
  });

  test('dangling synergy slug -> violation', () => {
    const index = idx({
      glossarySlugs,
      indexTraits: [{ id: 'trait_a', sinergie: ['ghost_trait'], conflitti: [] }],
    });
    const v = ruleSynergyConflictClosure(index);
    assert.equal(v.length, 1);
    assert.equal(v[0].rule, 'synergy-conflict-closure');
    assert.equal(v[0].entity, 'trait_a');
    assert.equal(v[0].ref, 'ghost_trait');
  });

  test('trait listing itself as conflict -> violation', () => {
    const index = idx({
      glossarySlugs,
      indexTraits: [{ id: 'trait_a', sinergie: [], conflitti: ['trait_a'] }],
    });
    const v = ruleSynergyConflictClosure(index);
    assert.equal(v.length, 1);
    assert.equal(v[0].entity, 'trait_a');
    assert.equal(v[0].ref, 'trait_a');
  });
});

describe('rule: i18n-coverage', () => {
  test('referenced trait with both labels -> no violation', () => {
    const index = idx({
      glossaryTraits: { trait_a: { label_it: 'A', label_en: 'A' } },
      glossarySlugs: new Set(['trait_a']),
      species: [{ species_id: 's1', trait_refs: ['trait_a'] }],
    });
    assert.deepEqual(ruleI18nCoverage(index), []);
  });

  test('referenced trait in glossary missing label_en -> violation', () => {
    const index = idx({
      glossaryTraits: { trait_a: { label_it: 'A', label_en: '' } },
      glossarySlugs: new Set(['trait_a']),
      species: [{ species_id: 's1', trait_refs: ['trait_a'] }],
    });
    const v = ruleI18nCoverage(index);
    assert.equal(v.length, 1);
    assert.equal(v[0].rule, 'i18n-coverage');
    assert.equal(v[0].entity, 'trait_a');
  });

  test('unreferenced glossary trait missing label -> NOT a violation (scope = referenced only)', () => {
    const index = idx({
      glossaryTraits: { lonely_trait: { label_it: '', label_en: '' } },
      glossarySlugs: new Set(['lonely_trait']),
      species: [],
    });
    assert.deepEqual(ruleI18nCoverage(index), []);
  });
});

describe('runRules (registry aggregation)', () => {
  test('aggregates violations from all rules', () => {
    const index = idx({
      biomeIds: new Set(['badlands']),
      species: [{ species_id: 'sp', biome_affinity: 'void' }], // biome violation
      promotions: {
        tier_ladder: ['base', 'veteran', 'captain'],
        thresholds: { veteran: { kills_min: 5 }, captain: { kills_min: 5 } }, // ladder violation
      },
    });
    const v = runRules(index);
    const rules = v.map((x) => x.rule).sort();
    assert.deepEqual(rules, ['biome-refs', 'promotion-ladder-monotonic']);
  });
});

describe('partitionByBaseline', () => {
  const violations = [
    { rule: 'biome-refs', severity: 'error', entity: 'sp1', ref: 'void', message: 'x' },
    { rule: 'job-bias-enum', severity: 'error', entity: 'c1', ref: 'mage', message: 'y' },
  ];

  test('baselined keys excluded from newViolations', () => {
    const baseline = [{ rule: 'biome-refs', entity: 'sp1', ref: 'void' }];
    const { newViolations, baselinedViolations } = partitionByBaseline(violations, baseline);
    assert.equal(newViolations.length, 1);
    assert.equal(newViolations[0].rule, 'job-bias-enum');
    assert.equal(baselinedViolations.length, 1);
  });

  test('empty baseline -> all new', () => {
    const { newViolations } = partitionByBaseline(violations, []);
    assert.equal(newViolations.length, 2);
  });
});

describe('e2e: real canon vs committed baseline (CI gate)', () => {
  const datasetRoot = path.resolve(__dirname, '../..');
  const baselinePath = path.join(datasetRoot, 'data/core/canon-consistency-baseline.json');

  test('no NEW violations against the committed baseline', () => {
    const { newViolations } = checkCanonConsistency({ datasetRoot, baselinePath });
    assert.deepEqual(
      newViolations,
      [],
      `unexpected NEW canon-consistency violations:\n${newViolations
        .map((v) => `  [${v.rule}] ${v.entity} -> ${v.ref}`)
        .join('\n')}`,
    );
  });

  // Negative control (L-041): proves the gate is not vacuous -- the real dataset
  // DOES contain known debt, so against an empty baseline it MUST surface as new.
  test('negative control: known debt surfaces as NEW against an empty baseline', () => {
    const { violations } = checkCanonConsistency({ datasetRoot, baselinePath });
    const { newViolations } = partitionByBaseline(violations, []);
    assert.ok(
      newViolations.length > 0,
      'expected the real dataset to contain baselined debt (gate must be able to fail)',
    );
  });
});
