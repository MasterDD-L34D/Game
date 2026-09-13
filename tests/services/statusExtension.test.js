// tests/services/statusExtension.test.js
//
// Status Engine Extension (2026-04-25 audit P0).
// Probes 7 NEW statuses wired in apps/backend/services/combat/statusModifiers.js.
//
// Each test isolates a single status apply → expected stat / HP / log effect.
// Decay is NOT re-tested here (covered by existing universal decay loop in
// sessionRoundBridge.applyEndOfRoundSideEffects).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  computeStatusModifiers,
  applyTurnRegen,
} = require('../../apps/backend/services/combat/statusModifiers');

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function makeUnit(overrides = {}) {
  return {
    id: 'u1',
    hp: 10,
    max_hp: 10,
    mod: 0,
    attack_mod_bonus: 0,
    defense_mod_bonus: 0,
    position: { x: 0, y: 0 },
    controlled_by: 'player',
    status: {},
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────
// 1. linked — +1 attack_mod when ally adjacent
// ─────────────────────────────────────────────────────────────────

test('linked: +1 attack_mod when same-faction ally adjacent', () => {
  const actor = makeUnit({ id: 'a', status: { linked: 2 } });
  const ally = makeUnit({ id: 'a2', position: { x: 1, y: 0 }, controlled_by: 'player' });
  const target = makeUnit({ id: 't', position: { x: 3, y: 0 }, controlled_by: 'sistema' });
  const out = computeStatusModifiers(actor, target, [actor, ally, target]);
  assert.equal(out.attackDelta, 1);
  assert.equal(out.defenseDelta, 0);
  assert.ok(out.log.some((e) => e.status === 'linked'));
});

test('linked: NO bonus when no ally adjacent (alone)', () => {
  const actor = makeUnit({ id: 'a', status: { linked: 2 } });
  const target = makeUnit({ id: 't', position: { x: 3, y: 0 }, controlled_by: 'sistema' });
  const out = computeStatusModifiers(actor, target, [actor, target]);
  assert.equal(out.attackDelta, 0);
  assert.equal(out.log.length, 0);
});

// ─────────────────────────────────────────────────────────────────
// 2. fed — +1 HP regen at turn end, cap max_hp
// ─────────────────────────────────────────────────────────────────

test('fed: +1 HP regen at turn_end, capped at max_hp', () => {
  const u = makeUnit({ hp: 5, max_hp: 10, status: { fed: 1 } });
  const events = applyTurnRegen(u);
  assert.equal(u.hp, 6);
  assert.equal(events.length, 1);
  assert.equal(events[0].status, 'fed');
  assert.equal(events[0].amount, 1);

  // Cap test: at max_hp, no regen.
  const full = makeUnit({ hp: 10, max_hp: 10, status: { fed: 1 } });
  const ev2 = applyTurnRegen(full);
  assert.equal(full.hp, 10);
  assert.equal(ev2.length, 0);
});

// ─────────────────────────────────────────────────────────────────
// 3. healing — HoT regen 2 turns total, then 0
// ─────────────────────────────────────────────────────────────────

test('healing: regen 2 HP over 2 turns, then 0', () => {
  const u = makeUnit({ hp: 4, max_hp: 10, status: { healing: 2 } });
  // Round 1
  const r1 = applyTurnRegen(u);
  assert.equal(r1.length, 1);
  assert.equal(u.hp, 5);
  // Simulate decay loop (universal): healing 2 → 1
  u.status.healing -= 1;
  // Round 2
  const r2 = applyTurnRegen(u);
  assert.equal(r2.length, 1);
  assert.equal(u.hp, 6);
  // Decay: healing 1 → 0
  u.status.healing -= 1;
  // Round 3 — no more regen
  const r3 = applyTurnRegen(u);
  assert.equal(r3.length, 0);
  assert.equal(u.hp, 6);
});

// ─────────────────────────────────────────────────────────────────
// 4. attuned — +1 defense_mod target side
// ─────────────────────────────────────────────────────────────────

test('attuned: +1 defense_mod on target', () => {
  const actor = makeUnit({ id: 'a' });
  const target = makeUnit({ id: 't', status: { attuned: 2 } });
  const out = computeStatusModifiers(actor, target, [actor, target]);
  assert.equal(out.attackDelta, 0);
  assert.equal(out.defenseDelta, 1);
  assert.ok(out.log.some((e) => e.status === 'attuned' && e.side === 'target'));
});

// ─────────────────────────────────────────────────────────────────
// 5. sensed — +1 attack_mod actor (accuracy)
// ─────────────────────────────────────────────────────────────────

test('sensed: +1 attack_mod (accuracy proxy)', () => {
  const actor = makeUnit({ id: 'a', status: { sensed: 1 } });
  const target = makeUnit({ id: 't' });
  const out = computeStatusModifiers(actor, target, [actor, target]);
  assert.equal(out.attackDelta, 1);
  assert.equal(out.defenseDelta, 0);
  assert.ok(out.log.some((e) => e.status === 'sensed' && e.side === 'actor'));
});

// ─────────────────────────────────────────────────────────────────
// 6. telepatic_link — log entry only, no stat effect
// ─────────────────────────────────────────────────────────────────

test('telepatic_link: log marker only, no stat delta', () => {
  const actor = makeUnit({ id: 'a', status: { telepatic_link: 3 } });
  const target = makeUnit({ id: 't' });
  const out = computeStatusModifiers(actor, target, [actor, target]);
  assert.equal(out.attackDelta, 0);
  assert.equal(out.defenseDelta, 0);
  assert.ok(out.log.some((e) => e.status === 'telepatic_link'));
});

// ─────────────────────────────────────────────────────────────────
// 7. frenzy — +1 attack_mod actor + -1 defense_mod when target side
// ─────────────────────────────────────────────────────────────────

test('frenzy: +1 attack_mod (actor) AND -1 defense_mod when frenzied unit is target', () => {
  // Case A: frenzy on actor → +1 attack
  const actorA = makeUnit({ id: 'a', status: { frenzy: 2 } });
  const targetA = makeUnit({ id: 't' });
  const outA = computeStatusModifiers(actorA, targetA, [actorA, targetA]);
  assert.equal(outA.attackDelta, 1);
  assert.equal(outA.defenseDelta, 0);

  // Case B: frenzy on target → -1 defense (exposure)
  const actorB = makeUnit({ id: 'a' });
  const targetB = makeUnit({ id: 't', status: { frenzy: 2 } });
  const outB = computeStatusModifiers(actorB, targetB, [actorB, targetB]);
  assert.equal(outB.attackDelta, 0);
  assert.equal(outB.defenseDelta, -1);

  // Case C: frenzy on BOTH (actor attacks frenzied target) → +1 atk and -1 def stack
  const actorC = makeUnit({ id: 'a', status: { frenzy: 2 } });
  const targetC = makeUnit({ id: 't', status: { frenzy: 2 } });
  const outC = computeStatusModifiers(actorC, targetC, [actorC, targetC]);
  assert.equal(outC.attackDelta, 1);
  assert.equal(outC.defenseDelta, -1);
});

// ─────────────────────────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────────────────────────

test('edge: KO unit (hp=0) gets no regen', () => {
  const u = makeUnit({ hp: 0, max_hp: 10, status: { fed: 1, healing: 2 } });
  const events = applyTurnRegen(u);
  assert.equal(events.length, 0);
  assert.equal(u.hp, 0);
});

test('edge: empty status object → zero deltas, empty log', () => {
  const actor = makeUnit({ id: 'a' });
  const target = makeUnit({ id: 't' });
  const out = computeStatusModifiers(actor, target, [actor, target]);
  assert.equal(out.attackDelta, 0);
  assert.equal(out.defenseDelta, 0);
  assert.equal(out.log.length, 0);
});

test('edge: linked + sensed + frenzy stack on actor when ally adjacent', () => {
  const actor = makeUnit({
    id: 'a',
    status: { linked: 2, sensed: 1, frenzy: 1 },
    position: { x: 0, y: 0 },
  });
  const ally = makeUnit({ id: 'a2', position: { x: 0, y: 1 } });
  const target = makeUnit({ id: 't', position: { x: 5, y: 5 }, controlled_by: 'sistema' });
  const out = computeStatusModifiers(actor, target, [actor, ally, target]);
  assert.equal(out.attackDelta, 3); // linked + sensed + frenzy
  assert.equal(out.defenseDelta, 0);
});
