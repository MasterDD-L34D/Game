// SPEC-J first lethal mission scenario-builder -- enc_badlands_ultima_caccia_01.
//
// Materializes the #3107 lethal roster (master-dd KO-gate verdict 2026-06-30) with
// canonical adapter stats + serves it via GET /api/tutorial/<id> so the lethal mission
// is playable at the calibrated difficulty. lethal:true rides the scenario (inert until
// LETHAL_MISSIONS_ENABLED + consent; band-neutral).

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
process.env.IDEA_ENGINE_STUB_ORCHESTRATOR = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const {
  ULTIMA_CACCIA_SCENARIO,
  ULTIMA_CACCIA_ENEMY_IDS,
  buildUltimaCacciaUnits01,
} = require('../../apps/backend/services/worldgen/ultimaCacciaScenario');
const {
  loadBadlandsSpecies,
} = require('../../apps/backend/services/worldgen/badlandsPilotScenario');
const { deriveCombatStats } = require('../../apps/backend/services/worldgen/ecologyCombatAdapter');
const { createApp } = require('../../apps/backend/app');

test('ULTIMA_CACCIA_SCENARIO: id + biome + lethal metadata', () => {
  assert.equal(ULTIMA_CACCIA_SCENARIO.id, 'enc_badlands_ultima_caccia_01');
  assert.equal(ULTIMA_CACCIA_SCENARIO.biome_id, 'badlands');
  assert.equal(ULTIMA_CACCIA_SCENARIO.encounter_class, 'hardcore');
  assert.equal(ULTIMA_CACCIA_SCENARIO.lethal, true, 'scenario arms the lethal flag');
});

test('roster = the #3107 KO-gate roster (apex Skiv + 2 echo + 2 rust)', () => {
  assert.deepEqual(ULTIMA_CACCIA_ENEMY_IDS, [
    'dune-stalker',
    'echo-wing',
    'echo-wing',
    'rust-scavenger',
    'rust-scavenger',
  ]);
});

test('buildUltimaCacciaUnits01: 4 players + 5 enemies, adapter-derived stats', () => {
  const units = buildUltimaCacciaUnits01();
  const players = units.filter((u) => u.controlled_by === 'player');
  const enemies = units.filter((u) => u.controlled_by === 'sistema');
  assert.equal(players.length, 4, 'authored quartet');
  assert.equal(enemies.length, 5, '#3107 roster size');
  // every enemy's core stats equal deriveCombatStats(loaded species).
  for (const e of enemies) {
    const expected = deriveCombatStats(loadBadlandsSpecies(e.species));
    assert.equal(e.hp, expected.hp, `${e.species} hp`);
    assert.equal(e.mod, expected.mod, `${e.species} mod`);
    assert.equal(e.dc, expected.dc, `${e.species} dc`);
    assert.equal(e.max_hp, e.hp, `${e.id} max_hp == hp`);
    assert.ok(e.id && e.position && e.ai_profile, `${e.id} battle-ready`);
  }
});

test('buildUltimaCacciaUnits01: deterministic (no RNG in build)', () => {
  assert.deepEqual(buildUltimaCacciaUnits01(), buildUltimaCacciaUnits01());
});

test('GET /api/tutorial/enc_badlands_ultima_caccia_01 -> scenario + units + lethal', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app).get('/api/tutorial/enc_badlands_ultima_caccia_01');
  assert.equal(res.status, 200);
  assert.equal(res.body.id, 'enc_badlands_ultima_caccia_01');
  assert.equal(res.body.lethal, true, 'route surfaces lethal:true');
  const enemies = (res.body.units || []).filter((u) => u.controlled_by === 'sistema');
  const players = (res.body.units || []).filter((u) => u.controlled_by === 'player');
  assert.equal(players.length, 4);
  assert.equal(enemies.length, 5);
});

test('e2e: start the lethal scenario units -> session.lethal public', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sc = await request(app).get('/api/tutorial/enc_badlands_ultima_caccia_01');
  const res = await request(app)
    .post('/api/session/start')
    .send({ units: sc.body.units, encounter: { lethal: true }, modulation: 'full' });
  assert.equal(res.status, 200);
  assert.equal(res.body.state.lethal, true, 'lethal mission armed (inert until flag+consent)');
});
