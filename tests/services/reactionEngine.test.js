// Unit test for reactionEngine — coverage gap closed (archeologist excavate 2026-04-25).
//
// Scope: triggerOnDamage (intercept) + triggerOnMove (overwatch_shot) +
// helpers findReaction / consumeReaction. Pure logic, no side effects fuori
// da session/units mutati in place.

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');

const reactionEngine = require('../../apps/backend/services/reactionEngine');

// ─────────────────────────────────────────────────────────────────
// Fixture builders
// ─────────────────────────────────────────────────────────────────

function makeUnit(overrides = {}) {
  return {
    id: 'u1',
    controlled_by: 'player',
    position: { x: 0, y: 0 },
    hp: 10,
    max_hp: 10,
    attack_range: 2,
    reactions: [],
    status: {},
    ...overrides,
  };
}

function makeSession(units = []) {
  return {
    session_id: 'sess_test',
    units,
    damage_taken: {},
  };
}

// ─────────────────────────────────────────────────────────────────
// findReaction / consumeReaction
// ─────────────────────────────────────────────────────────────────

test('findReaction returns matching reaction with index', () => {
  const unit = makeUnit({
    reactions: [
      { trigger: 'ally_attacked_adjacent', ability_id: 'intercept' },
      { trigger: 'enemy_moves_in_range', ability_id: 'overwatch_shot' },
    ],
  });
  const found = reactionEngine.findReaction(unit, 'enemy_moves_in_range');
  assert.equal(found.index, 1);
  assert.equal(found.reaction.ability_id, 'overwatch_shot');
});

test('findReaction returns null on missing unit / no match', () => {
  assert.equal(reactionEngine.findReaction(null, 'ally_attacked_adjacent'), null);
  assert.equal(reactionEngine.findReaction({ reactions: [] }, 'x'), null);
  const unit = makeUnit({ reactions: [{ trigger: 'foo' }] });
  assert.equal(reactionEngine.findReaction(unit, 'bar'), null);
});

test('consumeReaction removes by index, returns removed entry', () => {
  const unit = makeUnit({
    reactions: [{ ability_id: 'a' }, { ability_id: 'b' }],
  });
  const removed = reactionEngine.consumeReaction(unit, 0);
  assert.equal(removed.ability_id, 'a');
  assert.equal(unit.reactions.length, 1);
  assert.equal(unit.reactions[0].ability_id, 'b');
});

// ─────────────────────────────────────────────────────────────────
// triggerOnDamage — intercept
// ─────────────────────────────────────────────────────────────────

test('triggerOnDamage fires intercept when ally adjacent has reaction armed', () => {
  const target = makeUnit({ id: 'target', position: { x: 5, y: 5 }, hp: 5, max_hp: 10 });
  const interceptor = makeUnit({
    id: 'warden',
    position: { x: 5, y: 6 }, // adjacent (manhattan=1)
    hp: 8,
    reactions: [{ trigger: 'ally_attacked_adjacent', ability_id: 'intercept' }],
  });
  const attacker = makeUnit({ id: 'attacker', controlled_by: 'sistema' });
  const session = makeSession([target, interceptor, attacker]);
  session.damage_taken = { target: 5 };

  const res = reactionEngine.triggerOnDamage(session, attacker, target, 5);

  assert.ok(res, 'should return result object');
  assert.equal(res.interceptor_id, 'warden');
  assert.equal(res.damage_rerouted, 5);
  assert.equal(target.hp, 10, 'target hp restored capped at max_hp');
  assert.equal(interceptor.hp, 3, 'interceptor took the damage');
  assert.equal(interceptor.reactions.length, 0, 'reaction consumed');
  assert.equal(session.damage_taken.target, 0, 'target damage_taken decremented');
  assert.equal(session.damage_taken.warden, 5, 'interceptor damage_taken incremented');
});

test('triggerOnDamage skips when no ally adjacent has intercept armed', () => {
  const target = makeUnit({ id: 'target', position: { x: 0, y: 0 } });
  const ally = makeUnit({
    id: 'ally',
    position: { x: 5, y: 5 }, // far away
    reactions: [{ trigger: 'ally_attacked_adjacent', ability_id: 'intercept' }],
  });
  const session = makeSession([target, ally]);
  const res = reactionEngine.triggerOnDamage(session, null, target, 5);
  assert.equal(res, null);
  assert.equal(ally.reactions.length, 1, 'reaction not consumed');
});

test('triggerOnDamage skips KO target / zero damage / null inputs', () => {
  const target = makeUnit({ id: 't', hp: 0 });
  const session = makeSession([target]);
  assert.equal(reactionEngine.triggerOnDamage(session, null, target, 5), null);
  assert.equal(reactionEngine.triggerOnDamage(null, null, target, 5), null);
  assert.equal(reactionEngine.triggerOnDamage(session, null, null, 5), null);
  assert.equal(
    reactionEngine.triggerOnDamage(session, null, makeUnit(), 0),
    null,
    'zero damage skipped',
  );
});

test('triggerOnDamage skips stunned interceptor + opposing-team unit', () => {
  const target = makeUnit({ id: 'target', position: { x: 5, y: 5 } });
  const stunnedAlly = makeUnit({
    id: 'stunned',
    position: { x: 5, y: 6 },
    reactions: [{ trigger: 'ally_attacked_adjacent' }],
    status: { stunned: 1 },
  });
  const enemyAdjacent = makeUnit({
    id: 'enemy',
    controlled_by: 'sistema',
    position: { x: 5, y: 4 },
    reactions: [{ trigger: 'ally_attacked_adjacent' }],
  });
  const session = makeSession([target, stunnedAlly, enemyAdjacent]);
  const res = reactionEngine.triggerOnDamage(session, null, target, 4);
  assert.equal(res, null, 'stunned + cross-team filtered');
});

test('triggerOnDamage detects interceptor killed when damage exceeds hp', () => {
  const target = makeUnit({ id: 't', position: { x: 0, y: 0 }, hp: 5, max_hp: 10 });
  const fragileInterceptor = makeUnit({
    id: 'fragile',
    position: { x: 1, y: 0 },
    hp: 3,
    reactions: [{ trigger: 'ally_attacked_adjacent' }],
  });
  const session = makeSession([target, fragileInterceptor]);
  const res = reactionEngine.triggerOnDamage(session, null, target, 5);
  assert.ok(res);
  assert.equal(res.interceptor_killed, true);
  assert.equal(fragileInterceptor.hp, 0);
});

// ─────────────────────────────────────────────────────────────────
// triggerOnMove — overwatch_shot
// ─────────────────────────────────────────────────────────────────

test('triggerOnMove fires overwatch when enemy moves INTO range', () => {
  const overwatcher = makeUnit({
    id: 'ranger',
    controlled_by: 'player',
    position: { x: 5, y: 5 },
    attack_range: 2,
    reactions: [{ trigger: 'enemy_moves_in_range', ability_id: 'overwatch_shot' }],
  });
  const mover = makeUnit({
    id: 'enemy',
    controlled_by: 'sistema',
    position: { x: 6, y: 5 }, // distance 1 (in range)
    hp: 8,
  });
  const fromPos = { x: 9, y: 5 }; // distance 4 (out of range before)
  const session = makeSession([overwatcher, mover]);

  const performAttack = (atk, mov) => ({
    result: { hit: true, mos: 3, die: 14, roll: 14 },
    damageDealt: 3,
  });

  const res = reactionEngine.triggerOnMove(session, mover, fromPos, performAttack);
  assert.ok(res);
  assert.equal(res.overwatch_id, 'ranger');
  assert.equal(res.hit, true);
  assert.equal(overwatcher.reactions.length, 0, 'reaction consumed');
});

test('triggerOnMove skips when mover already was in range (no INTO)', () => {
  const overwatcher = makeUnit({
    id: 'ranger',
    position: { x: 5, y: 5 },
    attack_range: 2,
    reactions: [{ trigger: 'enemy_moves_in_range' }],
  });
  const mover = makeUnit({
    id: 'enemy',
    controlled_by: 'sistema',
    position: { x: 6, y: 5 },
  });
  const fromPos = { x: 4, y: 5 }; // already distance 1 → still in range
  const session = makeSession([overwatcher, mover]);
  const performAttack = () => ({ result: { hit: true }, damageDealt: 3 });
  const res = reactionEngine.triggerOnMove(session, mover, fromPos, performAttack);
  assert.equal(res, null);
  assert.equal(overwatcher.reactions.length, 1, 'reaction NOT consumed');
});

test('triggerOnMove damage_step_mod=-1 refunds damage from mover', () => {
  const overwatcher = makeUnit({
    id: 'ranger',
    position: { x: 5, y: 5 },
    attack_range: 2,
    reactions: [
      { trigger: 'enemy_moves_in_range', ability_id: 'overwatch_shot', damage_step_mod: -1 },
    ],
  });
  const mover = makeUnit({
    id: 'enemy',
    controlled_by: 'sistema',
    position: { x: 6, y: 5 },
    hp: 8,
    max_hp: 10,
  });
  const fromPos = { x: 9, y: 5 };
  const session = makeSession([overwatcher, mover]);

  // performAttack pre-applies damage to mover (3 dmg → hp 5)
  mover.hp = 5;
  const performAttack = () => ({ result: { hit: true, mos: 3 }, damageDealt: 3 });
  const res = reactionEngine.triggerOnMove(session, mover, fromPos, performAttack);
  assert.ok(res);
  assert.equal(res.damage_dealt, 2, 'damage reduced by mod');
  assert.equal(mover.hp, 6, 'refund 1 hp applied');
});

test('triggerOnMove skips when no fromPos / KO mover / null inputs', () => {
  const session = makeSession([]);
  const mover = makeUnit({ id: 'm' });
  assert.equal(
    reactionEngine.triggerOnMove(session, mover, null, () => ({})),
    null,
  );
  assert.equal(
    reactionEngine.triggerOnMove(null, mover, { x: 0, y: 0 }, () => ({})),
    null,
  );
  const koMover = makeUnit({ id: 'm', hp: 0 });
  assert.equal(
    reactionEngine.triggerOnMove(session, koMover, { x: 5, y: 5 }, () => ({})),
    null,
  );
});

test('triggerOnMove respects single-actor reaction cap (consumed not refireable)', () => {
  const overwatcher = makeUnit({
    id: 'ranger',
    position: { x: 5, y: 5 },
    attack_range: 2,
    reactions: [{ trigger: 'enemy_moves_in_range', ability_id: 'overwatch_shot' }],
  });
  const mover = makeUnit({
    id: 'enemy',
    controlled_by: 'sistema',
    position: { x: 6, y: 5 },
    hp: 10,
  });
  const session = makeSession([overwatcher, mover]);
  const performAttack = () => ({ result: { hit: true, mos: 2 }, damageDealt: 2 });

  const res1 = reactionEngine.triggerOnMove(session, mover, { x: 9, y: 5 }, performAttack);
  assert.ok(res1, 'first move fires');

  // Second move (mover steps out then in again) — reaction already consumed
  mover.position = { x: 9, y: 5 };
  const res2 = reactionEngine.triggerOnMove(session, mover, { x: 9, y: 5 }, performAttack);
  // mover.position == fromPos so distNow==4, but distBefore==4 → not INTO. Use real movement:
  mover.position = { x: 6, y: 5 };
  const res3 = reactionEngine.triggerOnMove(session, mover, { x: 9, y: 5 }, performAttack);
  assert.equal(res3, null, 'reaction not refired (cap 1/actor)');
});
