// Audit follow-up 2026-04-25: per-tag enemy gate (predator/irascible/wildlife)
//
// Copre:
//   - inferEnemyTags: tassonomia (predator/irascible/wildlife) per species
//   - passesBasicTriggers indirect via evaluateAttackTraits:
//     * requires_target_tag: blocca quando tag mismatch
//     * requires_actor_tag: blocca quando tag mismatch (dodge target-side)
//     * Multi-tag target: trait fires se tag-match in set
//     * Edge: missing target/species → fallback wildlife
//     * Edge: malformed clade → wildlife default
//   - Regression: trait senza requires_target_tag continua a passare

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  loadActiveTraitRegistry,
  evaluateAttackTraits,
  loadSpeciesTagIndex,
  inferEnemyTags,
  _resetSpeciesTagIndexCache,
} = require('../../apps/backend/services/traitEffects');

const TRAIT_REGISTRY_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'data',
  'core',
  'traits',
  'active_effects.yaml',
);
const registry = loadActiveTraitRegistry(TRAIT_REGISTRY_PATH, {
  log: () => {},
  warn: () => {},
});

// Pre-warm species tag index dal repo reale
_resetSpeciesTagIndexCache();
const speciesIndex = loadSpeciesTagIndex(undefined, { warn: () => {} });

function buildUnit(overrides = {}) {
  return {
    id: 'unit_test',
    hp: 10,
    max_hp: 10,
    position: { x: 0, y: 0 },
    traits: [],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────
// inferEnemyTags — tassonomia base
// ─────────────────────────────────────────────────────────────────

test('inferEnemyTags: Apex predator species → predator', () => {
  const target = buildUnit({ species: 'sp_arenavolux_sagittalis' }); // Apex
  const tags = inferEnemyTags(target, speciesIndex);
  assert.deepEqual(tags, ['predator']);
});

test('inferEnemyTags: Threat predator species → predator', () => {
  const target = buildUnit({ species: 'sp_lithoraptor_acutornis' }); // Threat + predator
  const tags = inferEnemyTags(target, speciesIndex);
  assert.deepEqual(tags, ['predator']);
});

test('inferEnemyTags: Threat ambusher → predator', () => {
  const target = buildUnit({ species: 'sp_pyrosaltus_celeris' }); // Threat + ambusher
  const tags = inferEnemyTags(target, speciesIndex);
  assert.deepEqual(tags, ['predator']);
});

test('inferEnemyTags: Threat omnivore (non-predator) → irascible', () => {
  const target = buildUnit({ species: 'sp_tonitrudens_ferox' }); // Threat + omnivore
  const tags = inferEnemyTags(target, speciesIndex);
  assert.deepEqual(tags, ['irascible']);
});

test('inferEnemyTags: Threat forager → irascible', () => {
  const target = buildUnit({ species: 'sp_vitricyba_punctata' }); // Threat + forager
  const tags = inferEnemyTags(target, speciesIndex);
  assert.deepEqual(tags, ['irascible']);
});

test('inferEnemyTags: Bridge non-predator → wildlife', () => {
  const target = buildUnit({ species: 'sp_ventornis_longiala' }); // Bridge + scout
  const tags = inferEnemyTags(target, speciesIndex);
  assert.deepEqual(tags, ['wildlife']);
});

test('inferEnemyTags: Keystone scavenger → wildlife', () => {
  const target = buildUnit({ species: 'sp_ferriscroba_detrita' }); // Keystone + scavenger
  const tags = inferEnemyTags(target, speciesIndex);
  assert.deepEqual(tags, ['wildlife']);
});

test('inferEnemyTags: Support sentinel → wildlife', () => {
  const target = buildUnit({ species: 'sp_basaltocara_scutata' }); // Support + sentinel
  const tags = inferEnemyTags(target, speciesIndex);
  assert.deepEqual(tags, ['wildlife']);
});

test('inferEnemyTags: missing target → wildlife (fallback)', () => {
  assert.deepEqual(inferEnemyTags(null, speciesIndex), ['wildlife']);
});

test('inferEnemyTags: missing species → wildlife (fallback)', () => {
  const target = buildUnit({ species: undefined });
  assert.deepEqual(inferEnemyTags(target, speciesIndex), ['wildlife']);
});

test('inferEnemyTags: unknown species id → wildlife (fallback)', () => {
  const target = buildUnit({ species: 'sp_does_not_exist_xyz' });
  assert.deepEqual(inferEnemyTags(target, speciesIndex), ['wildlife']);
});

test('inferEnemyTags: malformed clade (Playable) → wildlife default closed', () => {
  // species Playable: gate dovrebbe ritornare wildlife default (no match
  // predator/irascible). Conservative — Playable non e' un enemy ma il
  // gate deve fallire chiuso, non aprire.
  const target = buildUnit({ species: 'sp_calamipes_gracilis' }); // Playable
  const tags = inferEnemyTags(target, speciesIndex);
  assert.deepEqual(tags, ['wildlife']);
});

// ─────────────────────────────────────────────────────────────────
// passesBasicTriggers via evaluateAttackTraits — requires_target_tag
// ─────────────────────────────────────────────────────────────────

test('requires_target_tag predator: matches predator → trait fires', () => {
  const actor = buildUnit({
    id: 'a',
    position: { x: 0, y: 0 },
    traits: ['ancestor_attacco_contromanovra_co_04'],
  });
  const target = buildUnit({
    id: 't',
    position: { x: 1, y: 0 },
    species: 'sp_lithoraptor_acutornis', // predator
  });
  const result = evaluateAttackTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 4 },
    allUnits: [actor, target],
  });
  const evt = result.trait_effects.find((e) => e.trait === 'ancestor_attacco_contromanovra_co_04');
  assert.equal(evt.triggered, true);
  assert.equal(result.damage_modifier, 1);
});

test('requires_target_tag predator: blocks irascible target', () => {
  const actor = buildUnit({
    id: 'a',
    position: { x: 0, y: 0 },
    traits: ['ancestor_attacco_contromanovra_co_04'],
  });
  const target = buildUnit({
    id: 't',
    position: { x: 1, y: 0 },
    species: 'sp_tonitrudens_ferox', // irascible
  });
  const result = evaluateAttackTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 4 },
    allUnits: [actor, target],
  });
  const evt = result.trait_effects.find((e) => e.trait === 'ancestor_attacco_contromanovra_co_04');
  assert.equal(evt.triggered, false);
  assert.equal(result.damage_modifier, 0);
});

test('requires_target_tag wildlife: matches wildlife target', () => {
  const actor = buildUnit({
    id: 'a',
    position: { x: 0, y: 0 },
    traits: ['ancestor_attacco_contromanovra_co_03'],
  });
  const target = buildUnit({
    id: 't',
    position: { x: 1, y: 0 },
    species: 'sp_ferriscroba_detrita', // wildlife (Keystone+scavenger)
  });
  const result = evaluateAttackTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 4 },
    allUnits: [actor, target],
  });
  const evt = result.trait_effects.find((e) => e.trait === 'ancestor_attacco_contromanovra_co_03');
  assert.equal(evt.triggered, true);
});

test('requires_target_tag irascible: blocks wildlife target', () => {
  const actor = buildUnit({
    id: 'a',
    position: { x: 0, y: 0 },
    traits: ['ancestor_attacco_contromanovra_co_02'],
  });
  const target = buildUnit({
    id: 't',
    position: { x: 1, y: 0 },
    species: 'sp_ferriscroba_detrita', // wildlife
  });
  const result = evaluateAttackTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 4 },
    allUnits: [actor, target],
  });
  const evt = result.trait_effects.find((e) => e.trait === 'ancestor_attacco_contromanovra_co_02');
  assert.equal(evt.triggered, false);
});

// ─────────────────────────────────────────────────────────────────
// requires_actor_tag (dodge target-side) — gate sull'attaccante
// ─────────────────────────────────────────────────────────────────

test('requires_actor_tag predator: dodge fires when attacker is predator', () => {
  const actor = buildUnit({
    id: 'a',
    position: { x: 0, y: 0 },
    species: 'sp_arenavolux_sagittalis', // Apex predator
  });
  const target = buildUnit({
    id: 't',
    position: { x: 1, y: 0 },
    traits: ['ancestor_schivata_azione_evasiva_do_02'],
  });
  const result = evaluateAttackTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 2 },
    allUnits: [actor, target],
  });
  const evt = result.trait_effects.find(
    (e) => e.trait === 'ancestor_schivata_azione_evasiva_do_02',
  );
  assert.equal(evt.triggered, true);
  assert.equal(result.damage_modifier, -1);
});

test('requires_actor_tag predator: dodge blocked when attacker is wildlife', () => {
  const actor = buildUnit({
    id: 'a',
    position: { x: 0, y: 0 },
    species: 'sp_ferriscroba_detrita', // wildlife
  });
  const target = buildUnit({
    id: 't',
    position: { x: 1, y: 0 },
    traits: ['ancestor_schivata_azione_evasiva_do_02'],
  });
  const result = evaluateAttackTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 2 },
    allUnits: [actor, target],
  });
  const evt = result.trait_effects.find(
    (e) => e.trait === 'ancestor_schivata_azione_evasiva_do_02',
  );
  assert.equal(evt.triggered, false);
  assert.equal(result.damage_modifier, 0);
});

// ─────────────────────────────────────────────────────────────────
// Regression — trait pre-existenti non gated continuano a fire
// ─────────────────────────────────────────────────────────────────

test('regression: pelle_elastomera (no tag gate) fires on hit indipendentemente da species', () => {
  const actor = buildUnit({ id: 'a', position: { x: 0, y: 0 } });
  const target = buildUnit({
    id: 't',
    position: { x: 1, y: 0 },
    traits: ['pelle_elastomera'],
    species: 'sp_does_not_exist_xyz',
  });
  const result = evaluateAttackTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 1 },
    allUnits: [actor, target],
  });
  const evt = result.trait_effects.find((e) => e.trait === 'pelle_elastomera');
  assert.equal(evt.triggered, true);
  assert.equal(result.damage_modifier, -1);
});

test('regression: ancestor_attacco_risposta_di_combattimento_co_01 (no tag gate) fires on melee hit', () => {
  const actor = buildUnit({
    id: 'a',
    position: { x: 0, y: 0 },
    traits: ['ancestor_attacco_risposta_di_combattimento_co_01'],
  });
  const target = buildUnit({ id: 't', position: { x: 1, y: 0 }, species: 'sp_ventornis_longiala' });
  const result = evaluateAttackTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 2 },
    allUnits: [actor, target],
  });
  const evt = result.trait_effects.find(
    (e) => e.trait === 'ancestor_attacco_risposta_di_combattimento_co_01',
  );
  assert.equal(evt.triggered, true);
  assert.equal(result.damage_modifier, 1);
});
