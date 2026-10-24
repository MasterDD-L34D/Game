// tests/ai/utilityPersistentThreat.test.js
// M1 ADR-2026-05-18 Option B -- Utility AI path consumes persistent_high_threat.
// Parity with the legacy selectAiPolicy +20% retreat-threshold bias
// (see sistemaDefendBias.test.js): a Utility-AI Sistema unit with a high-threat
// PG on the field leans more defensive (retreat) than without. Deterministic.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  scoreAction,
  selectAiPolicyUtility,
} = require('../../apps/backend/services/ai/utilityBrain');

function sisActor(hp, maxHp) {
  return {
    id: 'sis_1',
    team: 'sistema',
    hp,
    max_hp: maxHp,
    position: { x: 0, y: 0 },
    attack_range: 2,
  };
}

function pg(hp, maxHp) {
  return { id: 'p1', team: 'player', hp, max_hp: maxHp, position: { x: 1, y: 0 } };
}

// -- scoreAction granularity: guaranteed delta + non-retreat untouched --

test('scoreAction: persistent_high_threat boosts retreat by exactly the bonus', () => {
  const actor = sisActor(6, 10);
  const baseState = { units: { sis_1: actor, p1: pg(10, 10) } };
  const threatState = { ...baseState, persistent_high_threat: true };

  const without = scoreAction({ type: 'retreat' }, actor, baseState);
  const withThreat = scoreAction({ type: 'retreat' }, actor, threatState);

  assert.ok(
    withThreat.score > without.score,
    'retreat should score higher under persistent_high_threat',
  );
  assert.ok(
    Math.abs(withThreat.score - without.score - 0.2) < 1e-9,
    'delta should equal the flat retreat bonus (0.2)',
  );
});

test('scoreAction: persistent_high_threat does NOT change non-retreat actions', () => {
  const actor = sisActor(6, 10);
  const baseState = { units: { sis_1: actor, p1: pg(10, 10) } };
  const threatState = { ...baseState, persistent_high_threat: true };

  const attackBase = scoreAction({ type: 'attack', target: 'p1' }, actor, baseState);
  const attackThreat = scoreAction({ type: 'attack', target: 'p1' }, actor, threatState);
  assert.equal(attackThreat.score, attackBase.score);

  const approachBase = scoreAction({ type: 'approach', target: 'p1' }, actor, baseState);
  const approachThreat = scoreAction({ type: 'approach', target: 'p1' }, actor, threatState);
  assert.equal(approachThreat.score, approachBase.score);
});

// -- selectAiPolicyUtility integration: the flip (leans more defensive) --

test('selectAiPolicyUtility: borderline actor flips attack -> retreat under threat', () => {
  // hp 6/10 chosen so retreat is just-below the attack score without threat;
  // the +0.2 bonus tips the argmax to retreat (mirrors legacy widened band).
  const actor = sisActor(6, 10);
  const target = pg(10, 10);

  const noThreat = selectAiPolicyUtility(actor, target, {});
  assert.equal(noThreat.intent, 'attack', 'baseline (no threat) is aggressive');

  const threat = selectAiPolicyUtility(actor, target, { persistent_high_threat: true });
  assert.equal(threat.intent, 'retreat', 'high-threat PG present -> defensive');
});

test('selectAiPolicyUtility: absent flag preserves baseline (back-compat)', () => {
  const actor = sisActor(6, 10);
  const target = pg(10, 10);
  const a = selectAiPolicyUtility(actor, target, {});
  const b = selectAiPolicyUtility(actor, target, { persistent_high_threat: false });
  assert.equal(a.intent, b.intent);
  assert.equal(a.intent, 'attack');
});

test('selectAiPolicyUtility: deterministic under threat (no RNG)', () => {
  const actor = sisActor(6, 10);
  const target = pg(10, 10);
  const a = selectAiPolicyUtility(actor, target, { persistent_high_threat: true });
  const b = selectAiPolicyUtility(actor, target, { persistent_high_threat: true });
  assert.equal(a.intent, b.intent);
  assert.equal(a.score, b.score);
});
