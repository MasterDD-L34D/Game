'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createAbilityExecutor } = require('../../apps/backend/services/abilityExecutor');
const {
  shouldAutoAdvance,
  PHASE_COMMITTED,
} = require('../../apps/backend/services/roundOrchestrator');
const { evaluateObjective } = require('../../apps/backend/services/combat/objectiveEvaluator');

// TKT-JOB-PHASEC slice B5 SPIKE POC (OQ-MINION verdict V4) — minion runtime
// foundation: summon_companion spawns 1 minion (HP 5, atk +1, mob 3) on an adjacent
// free tile, controlled_by 'player' + owner_id = caster, is_minion true, capped at 2.
// Minions are EXPENDABLE: excluded from the party-wipe lose-condition AND from the
// round-advance intent requirement (they act via pack_command, a follow-up slice —
// NOT declareSistemaIntents). No perks/AI in this spike. coop-phase-validator smoke
// gates the co-op flow (V4 mandate).

function makeExecutor() {
  return createAbilityExecutor({
    performAttack: () => ({ damageDealt: 0, result: {} }),
    buildAttackEvent: () => ({}),
    appendEvent: async () => {},
    manhattanDistance: (p, q) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y),
    rng: () => 0,
  });
}

function bm(extra = {}) {
  return {
    id: 'bm',
    job: 'beastmaster',
    controlled_by: 'player',
    ap: 6,
    ap_remaining: 6,
    position: { x: 5, y: 5 },
    ...extra,
  };
}

test('summon_companion: spawns a minion (player + owner_id + is_minion, HP 5, adjacent)', async () => {
  const ex = makeExecutor();
  const caster = bm();
  const session = { units: [caster], turn: 1, grid: { width: 10, height: 10 } };
  const res = await ex.executeAbility({
    session,
    actor: caster,
    body: { ability_id: 'summon_companion' },
  });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(session.units.length, 2, 'minion added to units');
  const minion = session.units.find((u) => u.is_minion);
  assert.ok(minion, 'minion present');
  assert.strictEqual(minion.controlled_by, 'player');
  assert.strictEqual(minion.owner_id, 'bm');
  assert.strictEqual(minion.hp, 5);
  assert.strictEqual(minion.max_hp, 5);
  const dist =
    Math.abs(minion.position.x - caster.position.x) +
    Math.abs(minion.position.y - caster.position.y);
  assert.strictEqual(dist, 1, 'spawned on an adjacent tile');
});

test('summon_companion: capped at 2 minions per owner (3rd → 400)', async () => {
  const ex = makeExecutor();
  const caster = bm();
  const session = { units: [caster], turn: 1, grid: { width: 10, height: 10 } };
  const r1 = await ex.executeAbility({
    session,
    actor: caster,
    body: { ability_id: 'summon_companion' },
  });
  const r2 = await ex.executeAbility({
    session,
    actor: caster,
    body: { ability_id: 'summon_companion' },
  });
  const r3 = await ex.executeAbility({
    session,
    actor: caster,
    body: { ability_id: 'summon_companion' },
  });
  assert.strictEqual(r1.status, 200);
  assert.strictEqual(r2.status, 200);
  assert.strictEqual(r3.status, 400, 'cap 2 blocks the 3rd');
  assert.strictEqual(session.units.filter((u) => u.is_minion).length, 2);
});

test('summon_companion: no free adjacent tile → 400', async () => {
  const ex = makeExecutor();
  const caster = bm({ position: { x: 0, y: 0 } }); // corner: only (1,0) and (0,1) are in-grid
  const blockerA = { id: 'bA', controlled_by: 'sistema', hp: 10, position: { x: 1, y: 0 } };
  const blockerB = { id: 'bB', controlled_by: 'sistema', hp: 10, position: { x: 0, y: 1 } };
  const session = { units: [caster, blockerA, blockerB], turn: 1, grid: { width: 10, height: 10 } };
  const res = await ex.executeAbility({
    session,
    actor: caster,
    body: { ability_id: 'summon_companion' },
  });
  assert.strictEqual(res.status, 400, 'no free adjacent tile');
  assert.strictEqual(session.units.filter((u) => u.is_minion).length, 0);
});

test('shouldAutoAdvance: a minion without an intent does NOT block round advance', () => {
  const state = {
    round_phase: 'planning',
    units: [
      { id: 'hero', controlled_by: 'player', hp: 10 },
      { id: 'm1', controlled_by: 'player', hp: 5, is_minion: true, owner_id: 'hero' },
    ],
    pending_intents: [{ unit_id: 'hero', action: { type: 'attack' } }],
  };
  // hero declared, minion did not — minion is expendable/commanded, must not stall.
  assert.strictEqual(shouldAutoAdvance(state), PHASE_COMMITTED);
});

test('shouldAutoAdvance: still blocks on a non-minion player with no intent', () => {
  const state = {
    round_phase: 'planning',
    units: [
      { id: 'hero', controlled_by: 'player', hp: 10 },
      { id: 'ally', controlled_by: 'player', hp: 10 },
    ],
    pending_intents: [{ unit_id: 'hero', action: { type: 'attack' } }],
  };
  assert.strictEqual(shouldAutoAdvance(state), null, 'ally still owes an intent');
});

test('objective elimination: a surviving minion does NOT prevent player_wipe (coop-smoke gap)', () => {
  // coop-phase-validator GAP fix: objectiveEvaluator.countFactionAlive('player')
  // must exclude minions, else an objective-driven encounter stalls on wipe when a
  // summoned minion outlives the real party.
  const session = {
    turn: 5,
    units: [
      { id: 'hero', controlled_by: 'player', hp: 0 }, // real player down
      { id: 'm1', controlled_by: 'player', hp: 5, is_minion: true, owner_id: 'hero' }, // minion alive
      { id: 'foe', controlled_by: 'sistema', hp: 10 },
    ],
  };
  const r = evaluateObjective(session, { objective: { type: 'elimination' } });
  assert.strictEqual(r.outcome, 'wipe', 'minion must not keep the party alive');
  assert.strictEqual(r.reason, 'player_wipe');
});

test('summon_companion: dead minions do NOT count toward the cap (Codex #2544 P2)', async () => {
  const ex = makeExecutor();
  const caster = bm();
  const session = { units: [caster], turn: 1, grid: { width: 10, height: 10 } };
  await ex.executeAbility({ session, actor: caster, body: { ability_id: 'summon_companion' } });
  await ex.executeAbility({ session, actor: caster, body: { ability_id: 'summon_companion' } });
  // both minions die
  for (const u of session.units) if (u.is_minion) u.hp = 0;
  const r = await ex.executeAbility({
    session,
    actor: caster,
    body: { ability_id: 'summon_companion' },
  });
  assert.strictEqual(r.status, 200, 'dead minions free up the cap');
  assert.strictEqual(session.units.filter((u) => u.is_minion && u.hp > 0).length, 1);
});

test('summon_companion: a corpse does NOT block a spawn tile (Codex #2544 P2)', async () => {
  const ex = makeExecutor();
  const caster = bm({ position: { x: 0, y: 0 } }); // in-grid neighbours: (1,0) and (0,1)
  const corpseA = { id: 'cA', controlled_by: 'sistema', hp: 0, position: { x: 1, y: 0 } };
  const corpseB = { id: 'cB', controlled_by: 'sistema', hp: 0, position: { x: 0, y: 1 } };
  const session = { units: [caster, corpseA, corpseB], turn: 1, grid: { width: 10, height: 10 } };
  const r = await ex.executeAbility({
    session,
    actor: caster,
    body: { ability_id: 'summon_companion' },
  });
  assert.strictEqual(r.status, 200, 'corpses do not occupy spawn tiles');
  assert.strictEqual(session.units.filter((u) => u.is_minion).length, 1);
});
