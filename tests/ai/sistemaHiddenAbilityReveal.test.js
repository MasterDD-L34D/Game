// SPEC-Q M-4 (L2/P5 Sistema legibility) -- hidden evolving-tactic reveal rule.
//
// QF3-A (ratified 2026-06-08): enemy evolving tactics stay hidden cross-encounter
// until a use-threshold reveals them diegetically (delivery = ALIENA, SPEC-H
// consumer). The WEGO invariant is preserved: this rule NEVER changes the
// per-round intents -- it only emits a `reveals[]` record off the side. First use
// (uses < threshold) stays a generic intent with no reveal. The rule is both
// flag-gated (config.enabled) and data-gated (actor.hidden_ability descriptor),
// so existing encounters with no descriptor are 100% unaffected (band-neutral).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createDeclareSistemaIntents,
  detectHiddenAbilityReveals,
} = require('../../apps/backend/services/ai/declareSistemaIntents');

function manhattanDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
function pickLowestHpEnemy(session, actor) {
  const enemies = session.units.filter(
    (u) => u.id !== actor.id && Number(u.hp) > 0 && u.controlled_by !== actor.controlled_by,
  );
  if (!enemies.length) return null;
  return enemies.reduce((lo, u) => (!lo || u.hp < lo.hp ? u : lo), null);
}
function stepTowards(from, to) {
  const next = { ...from };
  if (from.x !== to.x) next.x += from.x < to.x ? 1 : -1;
  else if (from.y !== to.y) next.y += from.y < to.y ? 1 : -1;
  return next;
}

function sisUnit(overrides = {}) {
  return {
    id: 'sis',
    hp: 10,
    max_hp: 10,
    ap: 2,
    attack_range: 1,
    position: { x: 3, y: 0 },
    controlled_by: 'sistema',
    status: {},
    ...overrides,
  };
}

// ── detectHiddenAbilityReveals (standalone) ──────────────────────────

test('reveal: disabled config -> no reveals even when threshold met', () => {
  const session = {
    units: [sisUnit({ hidden_ability: { id: 'adaptive_swarm', uses: 5 } })],
  };
  assert.deepEqual(detectHiddenAbilityReveals(session, { enabled: false }), []);
  assert.deepEqual(detectHiddenAbilityReveals(session, null), []);
});

test('reveal: enabled + uses >= default threshold (3) -> one reveal record (public)', () => {
  const session = {
    units: [sisUnit({ hidden_ability: { id: 'adaptive_swarm', uses: 3, label_it: 'Sciame' } })],
  };
  const reveals = detectHiddenAbilityReveals(session, { enabled: true });
  assert.equal(reveals.length, 1);
  assert.equal(reveals[0].unit_id, 'sis');
  assert.equal(reveals[0].ability_id, 'adaptive_swarm');
  assert.equal(reveals[0].uses, 3);
  assert.equal(reveals[0].threshold, 3);
  assert.equal(reveals[0].tier, 'public');
  assert.equal(reveals[0].label_it, 'Sciame');
  assert.equal(reveals[0].doctrine, 'cross_encounter');
});

test('reveal: enabled + uses below threshold -> no reveal (first-use stays generic)', () => {
  const session = {
    units: [sisUnit({ hidden_ability: { id: 'adaptive_swarm', uses: 2 } })],
  };
  assert.deepEqual(detectHiddenAbilityReveals(session, { enabled: true }), []);
});

test('reveal: already-revealed ability -> no double reveal', () => {
  const session = {
    units: [sisUnit({ hidden_ability: { id: 'adaptive_swarm', uses: 9, revealed: true } })],
  };
  assert.deepEqual(detectHiddenAbilityReveals(session, { enabled: true }), []);
});

test('reveal: no hidden_ability descriptor -> data-gated inert ([])', () => {
  const session = { units: [sisUnit()] };
  assert.deepEqual(detectHiddenAbilityReveals(session, { enabled: true }), []);
});

test('reveal: per-unit reveal_threshold overrides config defaultThreshold', () => {
  const session = {
    units: [sisUnit({ hidden_ability: { id: 'x', uses: 4, reveal_threshold: 5 } })],
  };
  assert.deepEqual(detectHiddenAbilityReveals(session, { enabled: true, defaultThreshold: 3 }), []);
  session.units[0].hidden_ability.uses = 5;
  assert.equal(
    detectHiddenAbilityReveals(session, { enabled: true, defaultThreshold: 3 }).length,
    1,
  );
});

test('reveal: config defaultThreshold is honored when no per-unit threshold', () => {
  const session = {
    units: [sisUnit({ hidden_ability: { id: 'x', uses: 2 } })],
  };
  assert.equal(
    detectHiddenAbilityReveals(session, { enabled: true, defaultThreshold: 2 }).length,
    1,
  );
});

test('reveal: only sistema-controlled units reveal (player descriptor ignored)', () => {
  const session = {
    units: [
      sisUnit({ id: 'p1', controlled_by: 'player', hidden_ability: { id: 'pa', uses: 99 } }),
      sisUnit({ id: 'sis', hidden_ability: { id: 'adaptive_swarm', uses: 9 } }),
    ],
  };
  const reveals = detectHiddenAbilityReveals(session, { enabled: true });
  assert.equal(reveals.length, 1);
  assert.equal(reveals[0].unit_id, 'sis');
});

// ── declareSistemaIntents integration (WEGO invariant) ───────────────

function buildDeclare(hiddenAbilityReveal) {
  return createDeclareSistemaIntents({
    pickLowestHpEnemy,
    stepTowards,
    manhattanDistance,
    gridSize: 6,
    hiddenAbilityReveal,
  });
}

test('declareSistemaIntents: return always carries a reveals[] (empty by default)', () => {
  const declare = buildDeclare();
  const session = {
    session_id: 't',
    turn: 1,
    grid: { width: 6, height: 6 },
    sistema_pressure: 100,
    units: [
      { id: 'p1', hp: 10, position: { x: 0, y: 0 }, controlled_by: 'player', status: {} },
      sisUnit({ attack_range: 2, position: { x: 1, y: 0 } }),
    ],
  };
  const out = declare(session);
  assert.ok(Array.isArray(out.reveals));
  assert.equal(out.reveals.length, 0);
});

test('declareSistemaIntents: threshold-met reveal is surfaced WITHOUT changing intents (WEGO)', () => {
  const session = {
    session_id: 't',
    turn: 1,
    grid: { width: 6, height: 6 },
    sistema_pressure: 100,
    units: [
      { id: 'p1', hp: 10, position: { x: 0, y: 0 }, controlled_by: 'player', status: {} },
      sisUnit({
        attack_range: 2,
        position: { x: 1, y: 0 },
        hidden_ability: { id: 'adaptive_swarm', uses: 3 },
      }),
    ],
  };
  const baseline = buildDeclare(/* disabled */)(session);
  const revealed = buildDeclare({ enabled: true })(session);
  // Intents are identical regardless of reveal -- WEGO telegraph untouched.
  assert.deepEqual(revealed.intents, baseline.intents);
  assert.deepEqual(revealed.decisions, baseline.decisions);
  // ...but the reveal is emitted off the side when enabled.
  assert.equal(baseline.reveals.length, 0);
  assert.equal(revealed.reveals.length, 1);
  assert.equal(revealed.reveals[0].ability_id, 'adaptive_swarm');
});

test('declareSistemaIntents: reveal detection does not mutate session', () => {
  const session = {
    session_id: 't',
    turn: 1,
    grid: { width: 6, height: 6 },
    sistema_pressure: 100,
    units: [
      { id: 'p1', hp: 10, position: { x: 0, y: 0 }, controlled_by: 'player', status: {} },
      sisUnit({
        attack_range: 2,
        position: { x: 1, y: 0 },
        hidden_ability: { id: 'adaptive_swarm', uses: 5 },
      }),
    ],
  };
  const snapshot = JSON.parse(JSON.stringify(session));
  buildDeclare({ enabled: true })(session);
  assert.deepEqual(session, snapshot);
});
