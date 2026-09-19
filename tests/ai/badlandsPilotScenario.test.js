// TKT-ADAPTER-ECO-COMBAT phase 2a (spec #2457) -- badlands pilot scenario.
//
// enc_badlands_pilot_01: NEW badlands encounter whose ENEMIES are populated by
// ecologyCombatAdapter.deriveCombatStats from REAL loaded badlands species YAML.
// Proves the adapter end-to-end on real ecology data. Band calibration = phase 2b.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  BADLANDS_SCENARIO_01,
  buildBadlandsUnits01,
  loadBadlandsSpecies,
  BADLANDS_ENEMY_IDS,
} = require('../../apps/backend/services/worldgen/badlandsPilotScenario');
const { deriveCombatStats } = require('../../apps/backend/services/worldgen/ecologyCombatAdapter');

test('BADLANDS_SCENARIO_01: id + biome + grid metadata', () => {
  assert.equal(BADLANDS_SCENARIO_01.id, 'enc_badlands_pilot_01');
  assert.equal(BADLANDS_SCENARIO_01.biome_id, 'badlands');
  assert.ok(BADLANDS_SCENARIO_01.encounter_class, 'has encounter_class');
  assert.ok(Number.isInteger(BADLANDS_SCENARIO_01.grid_size));
});

test('loadBadlandsSpecies: reads real YAML with adapter input fields', () => {
  const s = loadBadlandsSpecies('dune-stalker');
  assert.equal(s.threat_tier, 'T3');
  assert.equal(s.role_trofico, 'predatore_terziario_apex');
  assert.ok(Array.isArray(s.genetic_traits.core) && s.genetic_traits.core.length > 0);
  assert.equal(s.morphotype, 'cursoriale_quadrupede');
});

test('buildBadlandsUnits01: returns players + enemies', () => {
  const units = buildBadlandsUnits01();
  const players = units.filter((u) => u.controlled_by === 'player');
  const enemies = units.filter((u) => u.controlled_by === 'sistema');
  assert.ok(players.length >= 4, `>=4 players, got ${players.length}`);
  assert.ok(enemies.length >= 4, `>=4 enemies, got ${enemies.length}`);
});

test('buildBadlandsUnits01: enemy stats are ADAPTER-DERIVED from real species', () => {
  const units = buildBadlandsUnits01();
  // For every enemy, its core stats must equal deriveCombatStats(loaded species).
  for (const id of BADLANDS_ENEMY_IDS) {
    const expected = deriveCombatStats(loadBadlandsSpecies(id));
    const enemy = units.find((u) => u.controlled_by === 'sistema' && u.species === id);
    assert.ok(enemy, `enemy for ${id} present`);
    assert.equal(enemy.hp, expected.hp, `${id} hp`);
    assert.equal(enemy.mod, expected.mod, `${id} mod`);
    assert.equal(enemy.dc, expected.dc, `${id} dc`);
    assert.equal(enemy.guardia, expected.guardia, `${id} guardia`);
    assert.equal(enemy.attack_range, expected.attack_range, `${id} attack_range`);
    assert.deepEqual(enemy.traits, expected.traits, `${id} traits passthrough`);
  }
});

test('buildBadlandsUnits01: enemies satisfy full battle-ready unit contract', () => {
  const enemies = buildBadlandsUnits01().filter((u) => u.controlled_by === 'sistema');
  for (const e of enemies) {
    for (const f of ['hp', 'max_hp', 'ap', 'mod', 'dc', 'guardia', 'attack_range']) {
      assert.ok(Number.isInteger(e[f]) && e[f] >= 0, `${e.id}.${f} int>=0 (got ${e[f]})`);
    }
    assert.equal(e.max_hp, e.hp, `${e.id} max_hp == hp on spawn`);
    assert.ok(e.id && e.species, `${e.id} has id + species`);
    assert.ok(e.position && Number.isInteger(e.position.x) && Number.isInteger(e.position.y));
    assert.equal(e.controlled_by, 'sistema');
    assert.ok(e.ai_profile, `${e.id} has ai_profile`);
    assert.ok(Array.isArray(e.traits));
  }
});

test('GAP-A: all enemy species are in the badlands foodweb (no exclusion)', () => {
  // The 6 full badlands species are all in data/ecosystems/badlands.ecosystem.yaml.
  const FOODWEB = new Set([
    'sand-burrower',
    'rust-scavenger',
    'ferrocolonia-magnetotattica',
    'echo-wing',
    'dune-stalker',
    'nano-rust-bloom',
  ]);
  for (const id of BADLANDS_ENEMY_IDS) {
    assert.ok(FOODWEB.has(id), `${id} in badlands foodweb (GAP-A)`);
  }
});

test('buildBadlandsUnits01: deterministic (no RNG in build)', () => {
  const a = buildBadlandsUnits01();
  const b = buildBadlandsUnits01();
  assert.deepEqual(a, b);
});

test('BADLANDS_ENEMY_IDS: 4-6 badlands enemies for the pilot', () => {
  assert.ok(Array.isArray(BADLANDS_ENEMY_IDS));
  assert.ok(BADLANDS_ENEMY_IDS.length >= 4 && BADLANDS_ENEMY_IDS.length <= 6);
});
