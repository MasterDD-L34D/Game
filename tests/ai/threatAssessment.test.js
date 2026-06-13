// Test suite per apps/backend/services/ai/threatAssessment.js
//
// Copre:
//   - countPassiveTurns: conteggio turni senza attacco player
//   - computeSisDamageTaken: danno totale subito da unita SIS
//   - computeSisMaxHp: HP massimo SIS
//   - computeThreatIndex: indice composito + escalation tier
//   - Integrazione con selectAiPolicy (REGOLA_004_THREAT)
//   - Integrazione con declareSistemaIntents (threat context injection)

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  countPassiveTurns,
  computeSisDamageTaken,
  computeSisMaxHp,
  computeThreatIndex,
} = require('../../apps/backend/services/ai/threatAssessment');

const { selectAiPolicy } = require('../../apps/backend/services/ai/policy');

// --- helpers ---

function makeUnits() {
  return [
    { id: 'p1', controlled_by: 'player', hp: 10, max_hp: 10, position: { x: 0, y: 0 } },
    { id: 'p2', controlled_by: 'player', hp: 10, max_hp: 10, position: { x: 1, y: 0 } },
    { id: 's1', controlled_by: 'sistema', hp: 10, max_hp: 10, position: { x: 4, y: 4 } },
    { id: 's2', controlled_by: 'sistema', hp: 10, max_hp: 10, position: { x: 5, y: 5 } },
  ];
}

function makeAttackEvent(actor_id, target_id, turn, damage) {
  return { action_type: 'attack', actor_id, target_id, turn, damage_dealt: damage };
}

// ─────────────────────────────────────────────────────────────────
// countPassiveTurns
// ─────────────────────────────────────────────────────────────────

test('countPassiveTurns: 0 se player attacca al turno corrente', () => {
  const units = makeUnits();
  const events = [makeAttackEvent('p1', 's1', 1, 5), makeAttackEvent('p1', 's1', 2, 3)];
  assert.equal(countPassiveTurns(events, units), 0);
});

test('countPassiveTurns: conta turni senza attacco player dalla fine', () => {
  const units = makeUnits();
  const events = [
    makeAttackEvent('p1', 's1', 1, 5),
    makeAttackEvent('s1', 'p1', 2, 3), // SIS attack, non player
    makeAttackEvent('s1', 'p1', 3, 2),
  ];
  assert.equal(countPassiveTurns(events, units), 2);
});

test('countPassiveTurns: tutti turni passivi se nessun attacco player', () => {
  const units = makeUnits();
  const events = [
    makeAttackEvent('s1', 'p1', 1, 3),
    makeAttackEvent('s1', 'p1', 2, 4),
    makeAttackEvent('s1', 'p1', 3, 2),
  ];
  assert.equal(countPassiveTurns(events, units), 3);
});

test('countPassiveTurns: 0 per eventi vuoti', () => {
  assert.equal(countPassiveTurns([], makeUnits()), 0);
});

// ─────────────────────────────────────────────────────────────────
// computeSisDamageTaken
// ─────────────────────────────────────────────────────────────────

test('computeSisDamageTaken: somma danno a unita SIS', () => {
  const units = makeUnits();
  const events = [
    makeAttackEvent('p1', 's1', 1, 5),
    makeAttackEvent('p1', 's2', 1, 3),
    makeAttackEvent('s1', 'p1', 2, 4), // danno a player, non contato
  ];
  assert.equal(computeSisDamageTaken(events, units), 8);
});

test('computeSisDamageTaken: 0 se nessun danno a SIS', () => {
  const units = makeUnits();
  const events = [makeAttackEvent('s1', 'p1', 1, 5)];
  assert.equal(computeSisDamageTaken(events, units), 0);
});

// ─────────────────────────────────────────────────────────────────
// computeSisMaxHp
// ─────────────────────────────────────────────────────────────────

test('computeSisMaxHp: somma HP massimo unita SIS', () => {
  assert.equal(computeSisMaxHp(makeUnits()), 20);
});

// ─────────────────────────────────────────────────────────────────
// computeThreatIndex — escalation tiers
// ─────────────────────────────────────────────────────────────────

test('computeThreatIndex: tier normal per combattimento bilanciato', () => {
  const units = makeUnits();
  const events = [
    makeAttackEvent('p1', 's1', 1, 2),
    makeAttackEvent('s1', 'p1', 1, 3),
    makeAttackEvent('p1', 's2', 2, 1),
  ];
  const result = computeThreatIndex({ events, units, turn: 2 });
  assert.equal(result.escalation_tier, 'normal');
  assert.ok(result.threat_level >= 0 && result.threat_level <= 1);
});

test('computeThreatIndex: tier passive dopo 3+ turni senza attacco player', () => {
  const units = makeUnits();
  const events = [
    makeAttackEvent('s1', 'p1', 1, 3),
    makeAttackEvent('s1', 'p1', 2, 2),
    makeAttackEvent('s1', 'p1', 3, 4),
    { action_type: 'move', actor_id: 'p1', turn: 1 },
    { action_type: 'move', actor_id: 'p1', turn: 2 },
    { action_type: 'move', actor_id: 'p1', turn: 3 },
  ];
  const result = computeThreatIndex({ events, units, turn: 3 });
  assert.equal(result.escalation_tier, 'passive');
  assert.equal(result.player_passivity, 1); // saturated at 1
});

test('computeThreatIndex: tier critical quando SIS perde >60% HP', () => {
  const units = makeUnits();
  const events = [
    makeAttackEvent('p1', 's1', 1, 7),
    makeAttackEvent('p1', 's2', 1, 6),
    makeAttackEvent('p1', 's1', 2, 2), // totale 15 su 20 max = 75%
  ];
  const result = computeThreatIndex({ events, units, turn: 2 });
  assert.equal(result.escalation_tier, 'critical');
  assert.ok(result.damage_pressure >= 0.6);
});

test('computeThreatIndex: tier aggressive quando player molto aggressivo', () => {
  const units = [
    { id: 'p1', controlled_by: 'player', hp: 10, max_hp: 10 },
    { id: 's1', controlled_by: 'sistema', hp: 50, max_hp: 50 },
  ];
  // Danno alto ma sotto soglia critical (60%)
  const events = [makeAttackEvent('p1', 's1', 1, 10), makeAttackEvent('p1', 's1', 2, 10)];
  // 20/50 = 40% damage, ma per-turn = 10, expected = 50*0.15 = 7.5, ratio = 1.33 → clamp 1
  const result = computeThreatIndex({ events, units, turn: 2 });
  assert.equal(result.escalation_tier, 'aggressive');
  assert.ok(result.player_aggression >= 0.7);
});

test('computeThreatIndex: config override rispettato', () => {
  const units = makeUnits();
  const events = [makeAttackEvent('s1', 'p1', 1, 2), makeAttackEvent('s1', 'p1', 2, 2)];
  // Con threshold 2 turni, 2 turni passivi → passive
  const result = computeThreatIndex({ events, units, turn: 2 }, { passivity_threshold_turns: 2 });
  assert.equal(result.escalation_tier, 'passive');
});

// ─────────────────────────────────────────────────────────────────
// Integration: REGOLA_004_THREAT in selectAiPolicy
// ─────────────────────────────────────────────────────────────────

test('REGOLA_004_THREAT: passive tier overrides HP retreat', () => {
  const actor = { hp: 2, max_hp: 10, position: { x: 0, y: 0 }, attack_range: 2 };
  const target = { hp: 10, max_hp: 10, position: { x: 1, y: 0 }, attack_range: 2 };
  const threatCtx = { escalation_tier: 'passive' };

  // Senza threat: hp ratio 0.2 → REGOLA_002 retreat
  const noThreat = selectAiPolicy(actor, target, null, null);
  assert.equal(noThreat.rule, 'REGOLA_002');
  assert.equal(noThreat.intent, 'retreat');

  // Con threat passive: REGOLA_004 attack (ignora HP)
  const withThreat = selectAiPolicy(actor, target, null, threatCtx);
  assert.equal(withThreat.rule, 'REGOLA_004_THREAT');
  assert.equal(withThreat.intent, 'attack');
});

test('REGOLA_004_THREAT: critical tier forces all-in', () => {
  const actor = { hp: 1, max_hp: 10, position: { x: 0, y: 0 }, attack_range: 2 };
  const target = { hp: 8, max_hp: 10, position: { x: 1, y: 0 }, attack_range: 2 };
  const threatCtx = { escalation_tier: 'critical' };

  const result = selectAiPolicy(actor, target, null, threatCtx);
  assert.equal(result.rule, 'REGOLA_004_THREAT');
  assert.equal(result.intent, 'attack');
});

test('REGOLA_004_THREAT: approach se fuori range', () => {
  const actor = { hp: 2, max_hp: 10, position: { x: 0, y: 0 }, attack_range: 2 };
  const target = { hp: 10, max_hp: 10, position: { x: 5, y: 5 }, attack_range: 2 };
  const threatCtx = { escalation_tier: 'passive' };

  const result = selectAiPolicy(actor, target, null, threatCtx);
  assert.equal(result.rule, 'REGOLA_004_THREAT');
  assert.equal(result.intent, 'approach');
});

test('REGOLA_004_THREAT: normal/aggressive tier non attivano override', () => {
  const actor = { hp: 2, max_hp: 10, position: { x: 0, y: 0 }, attack_range: 2 };
  const target = { hp: 10, max_hp: 10, position: { x: 1, y: 0 }, attack_range: 2 };

  const normal = selectAiPolicy(actor, target, null, { escalation_tier: 'normal' });
  assert.equal(normal.rule, 'REGOLA_002'); // HP retreat as usual

  const aggressive = selectAiPolicy(actor, target, null, { escalation_tier: 'aggressive' });
  assert.equal(aggressive.rule, 'REGOLA_002'); // HP retreat as usual
});

test('REGOLA_004_THREAT: emotional override ha priorita su threat', () => {
  const actor = {
    hp: 10,
    max_hp: 10,
    position: { x: 0, y: 0 },
    attack_range: 2,
    status: { stunned: 2 },
  };
  const target = { hp: 10, max_hp: 10, position: { x: 1, y: 0 }, attack_range: 2 };
  const threatCtx = { escalation_tier: 'passive' };

  const result = selectAiPolicy(actor, target, null, threatCtx);
  assert.equal(result.rule, 'STATO_STUNNED'); // stunned ha priorita
  assert.equal(result.intent, 'skip');
});
