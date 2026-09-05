// tests/api/voloGradePercreatureWire.test.js
//
// Per-creature volo grade end-to-end (move terrain-cost substrate gap-fix). With the
// flag ON, a carrier with volo_grade:3 crosses a HAZARD tile (lava, freed at g3) for
// less AP than a carrier with volo_grade:1 (g1 leaves hazard unchanged). This is the
// behavior that was untestable while the grade was a single global registry value.
// Determinism: the move-gate is deterministic (cheapest-path), no RNG involved.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

// Player carrier of adattamento_volo at (0,0); a lava tile sits at (1,0). A medium
// profile prices lava 1.5 -> g1 leaves it (ceil 1.5 = 2 AP), g3 frees it (1.0 = 1 AP).
function fixture(voloGrade) {
  return {
    units: [
      {
        id: 'p1',
        name: 'Flyer',
        controlled_by: 'player',
        position: { x: 0, y: 0 },
        hp: 10,
        max_hp: 10,
        ap: 3,
        ap_remaining: 3,
        attack: 3,
        defense: 3,
        traits: ['adattamento_volo'],
        volo_grade: voloGrade,
      },
      {
        id: 'e1',
        name: 'Dummy',
        controlled_by: 'sistema',
        position: { x: 3, y: 3 },
        hp: 10,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack: 3,
        defense: 3,
        traits: [],
      },
    ],
    encounter: {
      grid: {
        width: 6,
        height: 6,
        terrain_features: [{ x: 1, y: 0, type: 'lava', defense_mod: 0 }],
      },
    },
  };
}

async function startMoveCost(grade) {
  const { app, close } = createApp({ databasePath: null });
  try {
    const f = fixture(grade);
    const start = await request(app)
      .post('/api/session/start')
      .send({ units: f.units, encounter: f.encounter });
    assert.equal(start.status, 200, `start: ${JSON.stringify(start.body)}`);
    const sid = start.body.session_id;
    const ap0 = start.body.state.units.find((u) => u.id === 'p1').ap_remaining;

    const mv = await request(app)
      .post('/api/session/action')
      .send({ session_id: sid, action_type: 'move', actor_id: 'p1', position: { x: 1, y: 0 } });
    assert.equal(mv.status, 200, `move onto lava: ${JSON.stringify(mv.body)}`);

    const after = await request(app).get('/api/session/state').query({ session_id: sid });
    const ap1 = after.body.units.find((u) => u.id === 'p1').ap_remaining;
    return ap0 - ap1; // AP spent on the lava move
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
}

test('flag ON: volo_grade 3 frees the lava tile (1 AP); volo_grade 1 leaves it (2 AP)', async (t) => {
  process.env.MOVE_TERRAIN_COST_ENABLED = 'true';
  t.after(() => {
    delete process.env.MOVE_TERRAIN_COST_ENABLED;
  });

  const apG3 = await startMoveCost(3);
  const apG1 = await startMoveCost(1);

  assert.equal(apG3, 1, 'grade 3 frees hazard -> ceil(1.0) = 1 AP');
  assert.equal(apG1, 2, 'grade 1 leaves hazard -> ceil(1.5) = 2 AP');
  assert.ok(apG3 < apG1, 'higher volo grade crosses hazard for less AP');
});
