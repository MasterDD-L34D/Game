// tests/ai/sistemaRetreatGate.test.js -- il gate fa rispettare a utilityBrain la
// retreat_hp_pct che il path rule-based onora gia' (spec sistema-symmetry sez. 4.3;
// misura: 44/45 ritirate da UTILITY_AI, docs/research/2026-07-10-sistema-cap-falsification.md).
// Flag SISTEMA_RETREAT_GATE_ENABLED default OFF -> byte-identical.
'use strict';
process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isRetreatGateEnabled,
  createDeclareSistemaIntents,
} = require('../../apps/backend/services/ai/declareSistemaIntents');
const { enumerateLegalActions } = require('../../apps/backend/services/ai/utilityBrain');
const { pickLowestHpEnemy, stepTowards } = require('../../apps/backend/routes/sessionHelpers');

const FLAG = 'SISTEMA_RETREAT_GATE_ENABLED';
const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
function withFlag(value, fn) {
  const prev = process.env[FLAG];
  if (value === undefined) delete process.env[FLAG];
  else process.env[FLAG] = value;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env[FLAG];
    else process.env[FLAG] = prev;
  }
}
function declareFor(session) {
  const declare = createDeclareSistemaIntents({
    pickLowestHpEnemy,
    stepTowards,
    manhattanDistance: manhattan,
    gridSize: 16,
    // Load-bearing: senza aiProfiles resolveUseUtilityBrain() -> false e la
    // decisione passa dal path legacy (selectAiPolicy), dove il gate non vive:
    // i test ON diventerebbero vacui (verificato RED: rule REGOLA_001).
    // Mirror di packs/.../ai_profiles.yaml profiles.aggressive (use_utility_brain
    // true + overrides.retreat_hp_pct 0.15), la stessa shape che il gate legge.
    aiProfiles: {
      profiles: {
        aggressive: { use_utility_brain: true, overrides: { retreat_hp_pct: 0.15 } },
      },
    },
  });
  return declare(session);
}
function woundedSession() {
  return {
    units: [
      {
        id: 'sis_w',
        controlled_by: 'sistema',
        hp: 5,
        max_hp: 10,
        ap: 2,
        ap_max: 2,
        mod: 2,
        dc: 12,
        attack_range: 1,
        initiative: 10,
        position: { x: 10, y: 5 },
        status: {},
        ai_profile: 'aggressive',
        damage: { min: 1, max: 3 },
      },
      {
        id: 'p1',
        controlled_by: 'player',
        hp: 12,
        max_hp: 12,
        ap: 2,
        ap_max: 2,
        mod: 2,
        dc: 12,
        attack_range: 1,
        initiative: 12,
        position: { x: 2, y: 5 },
        status: {},
      },
    ],
    grid: { width: 16, height: 12 },
    sistema_pressure: 50,
  };
}

test('isRetreatGateEnabled: default OFF, solo "true" abilita', () => {
  withFlag(undefined, () => assert.equal(isRetreatGateEnabled(), false));
  withFlag('true', () => assert.equal(isRetreatGateEnabled(), true));
  withFlag('1', () => assert.equal(isRetreatGateEnabled(), false));
});

test('enumerateLegalActions: state.retreat_gated toglie retreat dalle legali', () => {
  const actor = { id: 'a', hp: 10, max_hp: 10, position: { x: 0, y: 0 }, controlled_by: 'sistema' };
  const enemy = { id: 'p', hp: 10, max_hp: 10, position: { x: 5, y: 5 }, controlled_by: 'player' };
  const state = { units: { a: actor, p: enemy } };
  const withRetreat = enumerateLegalActions(actor, state).map((a) => a.type);
  assert.ok(withRetreat.includes('retreat'), 'senza gate retreat legale');
  const gated = enumerateLegalActions(actor, { ...state, retreat_gated: true }).map((a) => a.type);
  assert.ok(!gated.includes('retreat'), 'gated: retreat non proposta');
  assert.ok(gated.includes('approach'), 'le altre azioni restano');
});

test('gate ON: unita ferita sopra soglia NON dichiara retreat', () => {
  withFlag('true', () => {
    const { decisions } = declareFor(woundedSession());
    const d = decisions.find((x) => x.unit_id === 'sis_w');
    assert.ok(d, 'decisione emessa');
    // Anti-vacuita': il gate vive SOLO nel branch utility di declareSistemaIntents.
    // Se declareFor perde aiProfiles (o il profilo perde use_utility_brain) la
    // decisione esce dal path legacy (REGOLA_*) e questo assert DEVE fallire --
    // altrimenti il notEqual sotto passerebbe anche cancellando il gate.
    assert.match(d.rule, /^UTILITY/, `atteso rule utility, avuto ${d.rule}`);
    assert.notEqual(d.intent, 'retreat', `atteso non-retreat, avuto ${d.intent} (${d.rule})`);
  });
});

test('gate ON: sotto soglia (hp 10%) il declare loop non crasha', () => {
  withFlag('true', () => {
    const s = woundedSession();
    s.units[0].hp = 1;
    const { decisions } = declareFor(s);
    const d = decisions.find((x) => x.unit_id === 'sis_w');
    assert.ok(d, 'decisione emessa');
    // Stessa anti-vacuita' del test sopra: sotto soglia (10% < 0.15) il gate
    // NON scatta (retreat resta legale) ma il path deve essere quello utility.
    assert.match(d.rule, /^UTILITY/, `atteso rule utility, avuto ${d.rule}`);
    // Mutation-proof (quality review 2026-07-10): a hp 1/10 retreat e' argmax
    // deterministico (score 2.28 vs 1.16, noise 0, non flaky). Con la soglia
    // morta (mutazione retreatGated = true) retreat sparisce dalle legali e
    // questo assert fallisce -- senza, il test non distingue gate-corretto
    // da gate-sempre-attivo.
    assert.equal(d.intent, 'retreat', 'sotto soglia retreat resta legale e vince');
  });
});

test('gate OFF: determinismo baseline (flag unset)', () => {
  const off1 = withFlag(undefined, () => declareFor(woundedSession()));
  const off2 = withFlag(undefined, () => declareFor(woundedSession()));
  assert.deepEqual(off1.decisions, off2.decisions, 'determinismo baseline');
});
