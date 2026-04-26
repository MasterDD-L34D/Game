// 2026-04-26 — statusModifiers wire verification.
// Audit balance-illuminator G-04 flagged "computeStatusModifiers wired only
// in single-action path, NOT in round bridge". Verification (grep): wire
// reuses performAttack helper (session.js:369), inherited by all round bridge
// callers (sessionRoundBridge.js:374, 852, 1122). applyTurnRegen wired in
// session.js:1903 + sessionRoundBridge.js:668 (applyEndOfRoundSideEffects).
//
// 68/433 ancestor traits depend on these names (linked/fed/healing/attuned/
// sensed/telepatic_link/frenzy). Tests below pin runtime behavior so future
// refactors cannot silently disconnect them.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeStatusModifiers,
  applyTurnRegen,
  manhattanDistance,
} = require('../../apps/backend/services/combat/statusModifiers');

test('computeStatusModifiers: linked + ally adjacent → +1 attack', () => {
  const actor = {
    id: 'a',
    controlled_by: 'player',
    position: { x: 0, y: 0 },
    status: { linked: 2 },
  };
  const ally = {
    id: 'b',
    controlled_by: 'player',
    position: { x: 1, y: 0 },
    hp: 5,
  };
  const target = { id: 'enemy', controlled_by: 'sistema', status: {} };
  const r = computeStatusModifiers(actor, target, [actor, ally, target]);
  assert.equal(r.attackDelta, 1);
  assert.equal(r.defenseDelta, 0);
});

test('computeStatusModifiers: linked alone (no ally adjacent) → no bonus', () => {
  const actor = {
    id: 'a',
    controlled_by: 'player',
    position: { x: 0, y: 0 },
    status: { linked: 2 },
  };
  const target = { id: 'enemy', controlled_by: 'sistema', status: {} };
  const r = computeStatusModifiers(actor, target, [actor, target]);
  assert.equal(r.attackDelta, 0);
});

test('computeStatusModifiers: sensed → +1 attack', () => {
  const actor = { id: 'a', status: { sensed: 1 } };
  const target = { id: 'b', status: {} };
  const r = computeStatusModifiers(actor, target, []);
  assert.equal(r.attackDelta, 1);
});

test('computeStatusModifiers: frenzy actor +1 atk, frenzy target -1 def', () => {
  const actor = { id: 'a', status: { frenzy: 2 } };
  const target = { id: 'b', status: { frenzy: 1 } };
  const r = computeStatusModifiers(actor, target, []);
  assert.equal(r.attackDelta, 1);
  assert.equal(r.defenseDelta, -1);
});

test('computeStatusModifiers: target attuned → +1 def', () => {
  const actor = { id: 'a', status: {} };
  const target = { id: 'b', status: { attuned: 2 } };
  const r = computeStatusModifiers(actor, target, []);
  assert.equal(r.defenseDelta, 1);
});

test('computeStatusModifiers: telepatic_link → reveal log only, no stat', () => {
  const actor = { id: 'a', status: { telepatic_link: 3 } };
  const target = { id: 'b', status: {} };
  const r = computeStatusModifiers(actor, target, []);
  assert.equal(r.attackDelta, 0);
  assert.equal(r.defenseDelta, 0);
  assert.ok(r.log.some((e) => e.status === 'telepatic_link'));
});

test('applyTurnRegen: fed → +1 hp, cap max_hp', () => {
  const unit = { id: 'a', hp: 5, max_hp: 8, status: { fed: 2 } };
  applyTurnRegen(unit);
  assert.equal(unit.hp, 6);
});

test('applyTurnRegen: healing → +1 hp', () => {
  const unit = { id: 'a', hp: 3, max_hp: 8, status: { healing: 2 } };
  applyTurnRegen(unit);
  assert.equal(unit.hp, 4);
});

test('applyTurnRegen: fed + healing stack (+2 hp)', () => {
  const unit = { id: 'a', hp: 2, max_hp: 8, status: { fed: 2, healing: 2 } };
  applyTurnRegen(unit);
  assert.equal(unit.hp, 4);
});

test('applyTurnRegen: caps at max_hp', () => {
  const unit = { id: 'a', hp: 8, max_hp: 8, status: { fed: 2, healing: 2 } };
  applyTurnRegen(unit);
  assert.equal(unit.hp, 8);
});

test('applyTurnRegen: KO unit (hp<=0) skipped', () => {
  const unit = { id: 'a', hp: 0, max_hp: 8, status: { fed: 2, healing: 2 } };
  applyTurnRegen(unit);
  assert.equal(unit.hp, 0);
});

test('applyTurnRegen: status not active (0 turns) → no regen', () => {
  const unit = { id: 'a', hp: 5, max_hp: 8, status: { fed: 0, healing: 0 } };
  applyTurnRegen(unit);
  assert.equal(unit.hp, 5);
});

test('manhattanDistance basic', () => {
  assert.equal(manhattanDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 7);
});
