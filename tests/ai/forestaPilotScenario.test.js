// S2 (2026-06-18): coverage for the foresta_temperata pilot scenario (#2850 follow-up).
// Mirrors badlandsCalibScenarios.test.js so a roster typo / missing species YAML /
// adapter role-map regression fails in CI, not only at batch-runner runtime.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  FORESTA_PILOT_SCENARIO_01,
  FORESTA_PILOT_ENEMY_IDS,
  buildForestaPilotUnits01,
  loadForestaSpecies,
} = require('../../apps/backend/services/worldgen/forestaPilotScenario');
const { deriveCombatStats } = require('../../apps/backend/services/worldgen/ecologyCombatAdapter');

test('foresta pilot: scenario metadata', () => {
  assert.equal(FORESTA_PILOT_SCENARIO_01.id, 'enc_foresta_pilot_01');
  assert.equal(FORESTA_PILOT_SCENARIO_01.biome_id, 'foresta_temperata');
  assert.equal(FORESTA_PILOT_SCENARIO_01.encounter_class, 'foresta_pilot');
  assert.ok(Number.isInteger(FORESTA_PILOT_SCENARIO_01.grid_size));
});

test('foresta pilot: builder returns players + adapter-derived enemies (every roster id resolves)', () => {
  const units = buildForestaPilotUnits01();
  const players = units.filter((u) => u.controlled_by === 'player');
  const enemies = units.filter((u) => u.controlled_by === 'sistema');
  assert.ok(players.length >= 4, `>=4 players, got ${players.length}`);
  assert.equal(enemies.length, FORESTA_PILOT_ENEMY_IDS.length, 'enemy count == roster length');
  for (const id of FORESTA_PILOT_ENEMY_IDS) {
    // loadForestaSpecies throws (ENOENT) if a roster id has no backing YAML -- the CI guard.
    const expected = deriveCombatStats(loadForestaSpecies(id));
    const e = units.find((u) => u.controlled_by === 'sistema' && u.species === id);
    assert.ok(e, `enemy for ${id} present`);
    assert.equal(e.hp, expected.hp, `${id} hp adapter-derived`);
    assert.equal(e.max_hp, e.hp, `${id} max_hp == hp on spawn`);
    assert.ok(e.id && e.ai_profile, `${id} battle-ready`);
  }
});

test('foresta pilot: adapter role mapping (incl #2850 grazers -> PREY)', () => {
  const cases = [
    ['lupus-temperatus', 'APEX'],
    ['nebulocornis-mollis', 'PREY'], // #2850 grazer (consumatore_primario)
    ['arboryxis-lenis', 'PREY'], // #2850 grazer
    ['sentinella-radice', 'SUPPORT'], // ingegneri_ecosistema
    ['blight-micotico', 'HAZARD'], // minaccia_microbica
    ['evento-seme-uragano', 'HAZARD'], // evento_ecologico
  ];
  for (const [id, roleClass] of cases) {
    const s = deriveCombatStats(loadForestaSpecies(id));
    assert.equal(s._adapter.role_class, roleClass, `${id} -> ${roleClass}`);
    assert.deepEqual(s._adapter.warnings, [], `${id} no adapter warnings`);
  }
});

test('foresta pilot: deterministic (no RNG in build)', () => {
  assert.deepEqual(buildForestaPilotUnits01(), buildForestaPilotUnits01());
});
