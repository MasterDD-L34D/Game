'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveRecruitUnit } = require('../../tools/sim/recruit-resolver');

test('resolveRecruitUnit: real species -> faithful canonical stats as a player unit', () => {
  const u = resolveRecruitUnit({
    npcId: 'recruit_s1',
    speciesId: 'sand-burrower',
    position: { x: 2, y: 5 },
  });
  assert.equal(u.id, 'recruit_s1');
  assert.equal(u.species, 'sand-burrower');
  assert.equal(u.controlled_by, 'player');
  assert.deepEqual(u.position, { x: 2, y: 5 });
  // deriveCombatStats output is a viable combat unit (no invented zeros / no throw).
  assert.ok(u.hp > 0, `hp > 0, got ${u.hp}`);
  assert.equal(u.max_hp, u.hp, 'max_hp mirrors derived hp');
  assert.ok(u.dc > 0 && u.mod >= 0 && u.attack_range >= 1);
  assert.ok(typeof u.job === 'string' && u.job.length > 0, 'has a job for AI bias');
});

test('resolveRecruitUnit: deterministic (same species id -> identical unit)', () => {
  const a = resolveRecruitUnit({ npcId: 'r', speciesId: 'dune-stalker', position: { x: 2, y: 1 } });
  const b = resolveRecruitUnit({ npcId: 'r', speciesId: 'dune-stalker', position: { x: 2, y: 1 } });
  assert.deepEqual(a, b);
});
