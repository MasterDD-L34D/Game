// Catalog + balance invariants for Beast Bond reaction trigger (Sprint 6).
//
// 1. Active trait registry: 2 nuovi trait caricati con schema corretto
//    (range, species_filter, atk_delta, def_delta, duration valorizzati).
//    Note: pack_tactics rimosso in V10 C delete batch 2026-05-10
//    (species predoni_nomadi non esiste in species.yaml/species_expansion.yaml).
// 2. data/core/species.yaml: ogni species i cui trait_plan referenzia un
//    trait Beast Bond deve usare un trait_id che il registry conosce.
// 3. Balance invariant: con N (=2) holder bonded adiacenti all'attacker, il
//    totale reactions emesse e' esattamente N (no double-count).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const { checkBeastBondReactions } = require('../../apps/backend/services/combat/beastBondReaction');
const { loadActiveTraitRegistry } = require('../../apps/backend/services/traitEffects');

const BOND_TRAIT_IDS = ['legame_di_branco', 'spirito_combattivo'];

function loadCatalog() {
  const yamlPath = path.resolve(__dirname, '..', '..', 'data', 'core', 'species.yaml');
  const text = fs.readFileSync(yamlPath, 'utf8');
  const parsed = yaml.load(text);
  return parsed && parsed.species ? parsed.species : [];
}

test('catalog: registry loads 2 Beast Bond traits with valid schema', () => {
  const registry = loadActiveTraitRegistry();
  for (const traitId of BOND_TRAIT_IDS) {
    const def = registry[traitId];
    assert.ok(def, `${traitId} present in registry`);
    const cfg = def.triggers_on_ally_attack;
    assert.ok(cfg, `${traitId} carries triggers_on_ally_attack block`);
    assert.equal(typeof cfg.range, 'number', `${traitId}.range is number`);
    assert.equal(typeof cfg.species_filter, 'string', `${traitId}.species_filter is string`);
    assert.equal(typeof cfg.atk_delta, 'number', `${traitId}.atk_delta is number`);
    assert.equal(typeof cfg.def_delta, 'number', `${traitId}.def_delta is number`);
    assert.equal(typeof cfg.duration, 'number', `${traitId}.duration is number`);
  }
});

test('catalog: species.yaml trait_plan only references known trait IDs', () => {
  const registry = loadActiveTraitRegistry();
  const species = loadCatalog();
  let bondAdoptionCount = 0;
  for (const sp of species) {
    const plan = sp.trait_plan || {};
    const ids = []
      .concat(plan.core || [])
      .concat(plan.optional || [])
      .concat(plan.synergies || []);
    for (const traitId of ids) {
      if (BOND_TRAIT_IDS.includes(traitId)) {
        bondAdoptionCount += 1;
        assert.ok(
          registry[traitId],
          `species ${sp.id} references bond trait ${traitId} but registry missing it`,
        );
      }
    }
  }
  // Sprint 6 follow-up: at least 3 species must adopt a bond trait in catalog.
  assert.ok(
    bondAdoptionCount >= 3,
    `expected >=3 species to adopt bond traits, got ${bondAdoptionCount}`,
  );
});

test('balance invariant: 2 bonded adjacent allies → exactly 2 reactions (no double-count)', () => {
  const registry = loadActiveTraitRegistry();
  const attacker = {
    id: 'A',
    species: 'predoni_nomadi',
    controlled_by: 'sistema',
    hp: 5,
    position: { x: 5, y: 5 },
    traits: [],
    status: {},
  };
  const ally1 = {
    id: 'B',
    species: 'predoni_nomadi',
    controlled_by: 'sistema',
    hp: 5,
    position: { x: 6, y: 5 },
    traits: ['legame_di_branco'],
    status: {},
  };
  const ally2 = {
    id: 'C',
    species: 'predoni_nomadi',
    controlled_by: 'sistema',
    hp: 5,
    position: { x: 4, y: 5 },
    traits: ['legame_di_branco'],
    status: {},
  };
  const reactions = checkBeastBondReactions(attacker, [attacker, ally1, ally2], registry);
  assert.equal(reactions.length, 2, 'one reaction per bonded ally — no duplicate');
  const holderIds = reactions.map((r) => r.holder_id).sort();
  assert.deepEqual(holderIds, ['B', 'C']);
});

test('balance invariant: bond firing on holder with both legame + spirito stacks deltas correctly', () => {
  const registry = loadActiveTraitRegistry();
  // Single holder with two compatible bond traits → 2 reactions, summed atk_delta = 2.
  const attacker = {
    id: 'A',
    species: 'predoni_nomadi',
    controlled_by: 'sistema',
    hp: 5,
    position: { x: 5, y: 5 },
    traits: [],
    status: {},
  };
  const holder = {
    id: 'B',
    species: 'predoni_nomadi',
    controlled_by: 'sistema',
    hp: 5,
    position: { x: 6, y: 5 },
    traits: ['legame_di_branco', 'spirito_combattivo'],
    status: {},
  };
  const reactions = checkBeastBondReactions(attacker, [attacker, holder], registry);
  assert.equal(reactions.length, 2);
  const totalAtk = reactions.reduce((sum, r) => sum + r.effect.atk_delta, 0);
  const totalDef = reactions.reduce((sum, r) => sum + r.effect.def_delta, 0);
  // legame_di_branco: +1 atk +1 def. spirito_combattivo: +1 atk +0 def.
  assert.equal(totalAtk, 2, 'atk_delta total');
  assert.equal(totalDef, 1, 'def_delta total');
});

test('balance invariant: range=1 strict — Manhattan=2 holders never trigger', () => {
  const registry = loadActiveTraitRegistry();
  const attacker = {
    id: 'A',
    species: 'predoni_nomadi',
    controlled_by: 'sistema',
    hp: 5,
    position: { x: 0, y: 0 },
    traits: [],
    status: {},
  };
  const farHolder = {
    id: 'B',
    species: 'predoni_nomadi',
    controlled_by: 'sistema',
    hp: 5,
    position: { x: 2, y: 0 }, // Manhattan = 2
    traits: ['legame_di_branco', 'spirito_combattivo'],
    status: {},
  };
  const reactions = checkBeastBondReactions(attacker, [attacker, farHolder], registry);
  assert.equal(reactions.length, 0, 'all 3 bond traits use range=1, none should fire at dist=2');
});
