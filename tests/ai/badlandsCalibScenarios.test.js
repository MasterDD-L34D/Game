// S1 (2026-06-18): coverage for the badlands elite + ambient calibration scenarios
// (#2850 follow-up). Mirrors badlandsPilotScenario.test.js for the NEW builders so a
// roster typo / missing species YAML / adapter role-map regression fails in CI, not
// only at batch-runner runtime (audit gate-coverage gap, 2026-06-18).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  BADLANDS_ELITE_SCENARIO_01,
  BADLANDS_ELITE_ENEMY_IDS,
  buildBadlandsEliteUnits01,
  BADLANDS_AMBIENT_SCENARIO_01,
  BADLANDS_AMBIENT_ENEMY_IDS,
  buildBadlandsAmbientUnits01,
  loadBadlandsSpecies,
} = require('../../apps/backend/services/worldgen/badlandsPilotScenario');
const { deriveCombatStats } = require('../../apps/backend/services/worldgen/ecologyCombatAdapter');

const CASES = [
  {
    name: 'elite',
    scenario: BADLANDS_ELITE_SCENARIO_01,
    ids: BADLANDS_ELITE_ENEMY_IDS,
    build: buildBadlandsEliteUnits01,
    id: 'enc_badlands_elite_01',
    cls: 'badlands_elite',
  },
  {
    name: 'ambient',
    scenario: BADLANDS_AMBIENT_SCENARIO_01,
    ids: BADLANDS_AMBIENT_ENEMY_IDS,
    build: buildBadlandsAmbientUnits01,
    id: 'enc_badlands_ambient_01',
    cls: 'badlands_ambient',
  },
];

for (const c of CASES) {
  test(`${c.name}: scenario metadata`, () => {
    assert.equal(c.scenario.id, c.id);
    assert.equal(c.scenario.biome_id, 'badlands');
    assert.equal(c.scenario.encounter_class, c.cls);
    assert.ok(Number.isInteger(c.scenario.grid_size));
  });

  test(`${c.name}: builder returns players + adapter-derived enemies (every roster id resolves)`, () => {
    const units = c.build();
    const players = units.filter((u) => u.controlled_by === 'player');
    const enemies = units.filter((u) => u.controlled_by === 'sistema');
    assert.ok(players.length >= 4, `>=4 players, got ${players.length}`);
    assert.equal(enemies.length, c.ids.length, 'enemy count == roster length');
    for (const id of c.ids) {
      // loadBadlandsSpecies throws (ENOENT) if the roster id has no backing YAML --
      // this is the CI guard against a typo'd / missing roster id.
      const expected = deriveCombatStats(loadBadlandsSpecies(id));
      const enemy = units.find((u) => u.controlled_by === 'sistema' && u.species === id);
      assert.ok(enemy, `enemy for ${id} present`);
      assert.equal(enemy.hp, expected.hp, `${id} hp adapter-derived`);
      assert.equal(enemy.max_hp, enemy.hp, `${id} max_hp == hp on spawn`);
      assert.ok(enemy.id && enemy.ai_profile, `${id} battle-ready (id + ai_profile)`);
      assert.ok(Array.isArray(enemy.traits), `${id} traits array`);
    }
  });

  test(`${c.name}: deterministic (no RNG in build)`, () => {
    assert.deepEqual(c.build(), c.build());
  });
}

// Verifies the S1 ecologyCombatAdapter ROLE_TROFICO_MAP extension (#2850 legacy roles):
// without it these 5 species silently fall back to PREDATOR (wrong calibration).
test('adapter role-map: #2850 species map to the intended role_class', () => {
  const cases = [
    ['ferrimordax-rutilus', 'APEX'], // predatore_terziario
    ['rubrospina-velox', 'PREDATOR'], // consumatore_secondario
    ['ferriscroba-detrita', 'SUPPORT'], // decompositore
  ];
  for (const [id, roleClass] of cases) {
    const stats = deriveCombatStats(loadBadlandsSpecies(id));
    assert.equal(stats._adapter.role_class, roleClass, `${id} -> ${roleClass}`);
    assert.deepEqual(stats._adapter.warnings, [], `${id} no adapter warnings`);
  }
});
