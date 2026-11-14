// =============================================================================
// AI TARGETING — pickLowestHpEnemy
//
// Coverage del faction filter aggiunto in PR #1455 per evitare friendly fire
// (e_nomad → e_nomad fratricide). Vedi sessionHelpers.js:252-274.
// =============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const { pickLowestHpEnemy } = require('../../apps/backend/routes/sessionHelpers');

test('pickLowestHpEnemy: skips same-faction units even when lower HP', () => {
  const session = {
    units: [
      { id: 'sis_a', controlled_by: 'sistema', hp: 10 },
      { id: 'sis_b', controlled_by: 'sistema', hp: 1 }, // lowest but friendly
      { id: 'p_1', controlled_by: 'player', hp: 5 },
    ],
  };
  const actor = session.units[0];
  const target = pickLowestHpEnemy(session, actor);
  assert.equal(target.id, 'p_1', 'must skip friendly low-HP unit, target enemy');
});

test('pickLowestHpEnemy: returns null when no enemy faction present', () => {
  const session = {
    units: [
      { id: 'sis_a', controlled_by: 'sistema', hp: 10 },
      { id: 'sis_b', controlled_by: 'sistema', hp: 5 },
    ],
  };
  const actor = session.units[0];
  const target = pickLowestHpEnemy(session, actor);
  assert.equal(target, null, 'no targets when only own faction alive');
});

test('pickLowestHpEnemy: skips dead enemies (hp <= 0)', () => {
  const session = {
    units: [
      { id: 'sis_a', controlled_by: 'sistema', hp: 10 },
      { id: 'p_dead', controlled_by: 'player', hp: 0 },
      { id: 'p_alive', controlled_by: 'player', hp: 8 },
    ],
  };
  const actor = session.units[0];
  const target = pickLowestHpEnemy(session, actor);
  assert.equal(target.id, 'p_alive');
});

test('pickLowestHpEnemy: player attacking sistema picks lowest sistema', () => {
  const session = {
    units: [
      { id: 'p_a', controlled_by: 'player', hp: 10 },
      { id: 'sis_1', controlled_by: 'sistema', hp: 8 },
      { id: 'sis_2', controlled_by: 'sistema', hp: 3 }, // lowest enemy
      { id: 'sis_3', controlled_by: 'sistema', hp: 5 },
    ],
  };
  const actor = session.units[0];
  const target = pickLowestHpEnemy(session, actor);
  assert.equal(target.id, 'sis_2');
});

test('pickLowestHpEnemy: tie-break is deterministic (first encountered)', () => {
  const session = {
    units: [
      { id: 'sis_a', controlled_by: 'sistema', hp: 10 },
      { id: 'p_x', controlled_by: 'player', hp: 5 },
      { id: 'p_y', controlled_by: 'player', hp: 5 }, // same hp
    ],
  };
  const actor = session.units[0];
  const target = pickLowestHpEnemy(session, actor);
  // first enemy in array order wins on tie
  assert.equal(target.id, 'p_x');
});
