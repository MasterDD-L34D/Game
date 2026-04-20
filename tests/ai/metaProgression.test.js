// Baseline tests for metaProgression.js — protects against regression
// during Prompt 4 Prisma persistence migration (integrated-map L06).
//
// Shipped: 2026-04-21 as safety net BEFORE impl swap in-memory → Prisma.
// Coverage: affinity/trust clamps + recruit/mate gates + rollMating
// compatibility + cooldowns + nest state.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createMetaTracker,
  RECRUIT_AFFINITY_MIN,
  RECRUIT_TRUST_MIN,
  MATING_TRUST_MIN,
  AFFINITY_MIN,
  AFFINITY_MAX,
  TRUST_MIN,
  TRUST_MAX,
} = require('../../apps/backend/services/metaProgression');

// ─── Constants (canonical P0 Q11 B — Freeze scale) ─────────────────

test('constants: Affinity range -2..+2 (Freeze §20)', () => {
  assert.equal(AFFINITY_MIN, -2);
  assert.equal(AFFINITY_MAX, 2);
});

test('constants: Trust range 0..5 (Freeze §20)', () => {
  assert.equal(TRUST_MIN, 0);
  assert.equal(TRUST_MAX, 5);
});

test('constants: gate thresholds', () => {
  assert.equal(RECRUIT_AFFINITY_MIN, 0);
  assert.equal(RECRUIT_TRUST_MIN, 2);
  assert.equal(MATING_TRUST_MIN, 3);
});

// ─── Factory ───────────────────────────────────────────────────────

test('createMetaTracker: returns API shape', () => {
  const tracker = createMetaTracker();
  assert.equal(typeof tracker.updateAffinity, 'function');
  assert.equal(typeof tracker.updateTrust, 'function');
  assert.equal(typeof tracker.canRecruit, 'function');
  assert.equal(typeof tracker.recruit, 'function');
  assert.equal(typeof tracker.canMate, 'function');
  assert.equal(typeof tracker.rollMating, 'function');
  assert.equal(typeof tracker.setNest, 'function');
  assert.equal(typeof tracker.tickCooldowns, 'function');
  assert.equal(typeof tracker.listNpcs, 'function');
  assert.equal(typeof tracker.getNest, 'function');
});

test('createMetaTracker: new tracker has empty npc list + default nest', () => {
  const tracker = createMetaTracker();
  assert.deepEqual(tracker.listNpcs(), []);
  const nest = tracker.getNest();
  assert.equal(nest.level, 0);
  assert.equal(nest.biome, null);
  assert.equal(nest.requirements_met, false);
});

// ─── Affinity ──────────────────────────────────────────────────────

test('updateAffinity: creates NPC on first call with defaults', () => {
  const tracker = createMetaTracker();
  const npc = tracker.updateAffinity('npc_1', 1);
  assert.equal(npc.affinity, 1);
  assert.equal(npc.trust, 0);
  assert.equal(npc.recruited, false);
});

test('updateAffinity: clamps to AFFINITY_MAX', () => {
  const tracker = createMetaTracker();
  const npc = tracker.updateAffinity('npc_1', 10);
  assert.equal(npc.affinity, 2);
});

test('updateAffinity: clamps to AFFINITY_MIN', () => {
  const tracker = createMetaTracker();
  const npc = tracker.updateAffinity('npc_1', -10);
  assert.equal(npc.affinity, -2);
});

test('updateAffinity: cumulative deltas', () => {
  const tracker = createMetaTracker();
  tracker.updateAffinity('npc_1', 1);
  tracker.updateAffinity('npc_1', 1);
  const npc = tracker.updateAffinity('npc_1', -1);
  assert.equal(npc.affinity, 1);
});

// ─── Trust ─────────────────────────────────────────────────────────

test('updateTrust: clamps to TRUST_MAX (5)', () => {
  const tracker = createMetaTracker();
  const npc = tracker.updateTrust('npc_1', 100);
  assert.equal(npc.trust, 5);
});

test('updateTrust: clamps to TRUST_MIN (0), never negative', () => {
  const tracker = createMetaTracker();
  const npc = tracker.updateTrust('npc_1', -100);
  assert.equal(npc.trust, 0);
});

test('updateTrust: from 0, cumulative', () => {
  const tracker = createMetaTracker();
  tracker.updateTrust('npc_1', 3);
  const npc = tracker.updateTrust('npc_1', 1);
  assert.equal(npc.trust, 4);
});

// ─── Recruit gate ──────────────────────────────────────────────────

test('canRecruit: false by default (affinity 0, trust 0)', () => {
  const tracker = createMetaTracker();
  tracker.updateAffinity('npc_1', 0); // create
  assert.equal(tracker.canRecruit('npc_1'), false);
});

test('canRecruit: true when affinity >= 0 AND trust >= 2', () => {
  const tracker = createMetaTracker();
  tracker.updateAffinity('npc_1', 0);
  tracker.updateTrust('npc_1', 2);
  assert.equal(tracker.canRecruit('npc_1'), true);
});

test('canRecruit: false if trust < 2 even with affinity high', () => {
  const tracker = createMetaTracker();
  tracker.updateAffinity('npc_1', 2);
  tracker.updateTrust('npc_1', 1);
  assert.equal(tracker.canRecruit('npc_1'), false);
});

test('canRecruit: false if affinity < 0 even with high trust', () => {
  const tracker = createMetaTracker();
  tracker.updateAffinity('npc_1', -1);
  tracker.updateTrust('npc_1', 5);
  assert.equal(tracker.canRecruit('npc_1'), false);
});

test('recruit: success marks recruited + gate consumes', () => {
  const tracker = createMetaTracker();
  tracker.updateAffinity('npc_1', 1);
  tracker.updateTrust('npc_1', 3);
  const result = tracker.recruit('npc_1');
  assert.equal(result.success, true);
  assert.equal(result.npc.recruited, true);
  // Second recruit fails (already recruited)
  const retry = tracker.recruit('npc_1');
  assert.equal(retry.success, false);
  assert.equal(retry.reason, 'gate_not_met');
});

test('recruit: fails when gate not met', () => {
  const tracker = createMetaTracker();
  const result = tracker.recruit('npc_never_met');
  assert.equal(result.success, false);
  assert.equal(result.reason, 'gate_not_met');
});

// ─── Mate gate ─────────────────────────────────────────────────────

test('canMate: false without recruitment', () => {
  const tracker = createMetaTracker();
  tracker.updateTrust('npc_1', 5);
  assert.equal(tracker.canMate('npc_1'), false);
});

test('canMate: false without nest requirements met', () => {
  const tracker = createMetaTracker();
  tracker.updateAffinity('npc_1', 1);
  tracker.updateTrust('npc_1', 4);
  tracker.recruit('npc_1');
  // Nest requirements NOT met yet
  assert.equal(tracker.canMate('npc_1'), false);
});

test('canMate: true when recruited + trust >= 3 + nest ready', () => {
  const tracker = createMetaTracker();
  tracker.updateAffinity('npc_1', 1);
  tracker.updateTrust('npc_1', 3);
  tracker.recruit('npc_1');
  tracker.setNest('savana', true);
  assert.equal(tracker.canMate('npc_1'), true);
});

test('canMate: false if trust < 3 even recruited', () => {
  const tracker = createMetaTracker();
  tracker.updateAffinity('npc_1', 1);
  tracker.updateTrust('npc_1', 2);
  tracker.recruit('npc_1');
  tracker.setNest('savana', true);
  assert.equal(tracker.canMate('npc_1'), false);
});

// ─── rollMating ────────────────────────────────────────────────────

function _setupMatable(tracker, npcId = 'npc_1', trust = 4) {
  tracker.updateAffinity(npcId, 2);
  tracker.updateTrust(npcId, trust);
  tracker.recruit(npcId);
  tracker.setNest('savana', true);
}

test('rollMating: gate_not_met if not recruited', () => {
  const tracker = createMetaTracker();
  const result = tracker.rollMating('npc_1', { mbti_type: 'NEUTRA' });
  assert.equal(result.success, false);
  assert.equal(result.reason, 'gate_not_met');
});

test('rollMating: deterministic success with fixed rng', () => {
  const tracker = createMetaTracker();
  _setupMatable(tracker);
  // rng returns 0.95 → d20 = floor(0.95 * 20) + 1 = 19 + 1 = 20
  const result = tracker.rollMating('npc_1', { mbti_type: 'NEUTRA' }, {}, () => 0.95);
  assert.equal(result.success, true);
  assert.equal(result.roll, 20);
  assert.ok(Array.isArray(result.offspring_traits));
});

test('rollMating: deterministic fail with low rng', () => {
  const tracker = createMetaTracker();
  _setupMatable(tracker, 'npc_1', 3); // trust exactly MATING_TRUST_MIN, bonus 0
  // rng 0.05 → d20 = 1 + 1 = 2, fail threshold 12
  const result = tracker.rollMating('npc_1', { mbti_type: 'NEUTRA' }, {}, () => 0.05);
  assert.equal(result.success, false);
  assert.equal(result.reason, 'roll_failed');
});

test('rollMating: MBTI like bonus +3', () => {
  const tracker = createMetaTracker();
  _setupMatable(tracker);
  const compatTable = { ESTJ: { likes: ['NEUTRA'], dislikes: [] } };
  // Setup npc.mbti_type = NEUTRA (default), player ESTJ likes NEUTRA
  const result = tracker.rollMating('npc_1', { mbti_type: 'ESTJ' }, compatTable, () => 0.5);
  // roll = 11, modifier = +3 like + (trust 4 - 3) = +4, total = 15 >= 12
  assert.equal(result.modifier, 4);
  assert.equal(result.success, true);
});

test('rollMating: MBTI dislike penalty -3', () => {
  const tracker = createMetaTracker();
  _setupMatable(tracker, 'npc_1', 3); // no trust bonus
  const compatTable = { ESTJ: { likes: [], dislikes: ['NEUTRA'] } };
  const result = tracker.rollMating('npc_1', { mbti_type: 'ESTJ' }, compatTable, () => 0.5);
  // roll = 11, modifier = -3, total = 8 < 12 → fail
  assert.equal(result.modifier, -3);
  assert.equal(result.success, false);
});

test('rollMating: fail sets cooldown 1', () => {
  const tracker = createMetaTracker();
  _setupMatable(tracker, 'npc_1', 3);
  tracker.rollMating('npc_1', { mbti_type: 'NEUTRA' }, {}, () => 0.05);
  // Retry immediately should fail gate (cooldown)
  assert.equal(tracker.canMate('npc_1'), false);
});

test('rollMating: offspring traits merge parent + npc', () => {
  const tracker = createMetaTracker();
  _setupMatable(tracker);
  const result = tracker.rollMating(
    'npc_1',
    { mbti_type: 'NEUTRA', trait_ids: ['zampe_a_molla', 'pelle_elastomera'] },
    {},
    () => 0.99,
  );
  assert.equal(result.success, true);
  assert.ok(result.offspring_traits.length >= 1 && result.offspring_traits.length <= 3);
  // All offspring traits must come from parent pool
  for (const t of result.offspring_traits) {
    assert.ok(['zampe_a_molla', 'pelle_elastomera'].includes(t));
  }
});

test('rollMating: seed_generated=1 on success', () => {
  const tracker = createMetaTracker();
  _setupMatable(tracker);
  const result = tracker.rollMating('npc_1', { mbti_type: 'NEUTRA' }, {}, () => 0.99);
  assert.equal(result.seed_generated, 1);
});

// ─── Cooldown ──────────────────────────────────────────────────────

test('tickCooldowns: decrements mating_cooldown', () => {
  const tracker = createMetaTracker();
  _setupMatable(tracker, 'npc_1', 3);
  tracker.rollMating('npc_1', { mbti_type: 'NEUTRA' }, {}, () => 0.05); // fail → cooldown 1
  tracker.tickCooldowns();
  const npc = tracker.listNpcs().find((n) => n.npc_id === 'npc_1');
  assert.equal(npc.mating_cooldown, 0);
});

test('tickCooldowns: idempotent at 0', () => {
  const tracker = createMetaTracker();
  tracker.updateAffinity('npc_1', 0);
  tracker.tickCooldowns();
  const npc = tracker.listNpcs()[0];
  assert.equal(npc.mating_cooldown, 0);
});

// ─── Nest ──────────────────────────────────────────────────────────

test('setNest: bumps level 0 → 1 + biome + requirements_met', () => {
  const tracker = createMetaTracker();
  const nest = tracker.setNest('savana', true);
  assert.equal(nest.level, 1);
  assert.equal(nest.biome, 'savana');
  assert.equal(nest.requirements_met, true);
});

test('setNest: requirements_met false allowed', () => {
  const tracker = createMetaTracker();
  const nest = tracker.setNest('caverna_risonante', false);
  assert.equal(nest.requirements_met, false);
});

test('getNest: returns copy (no mutation)', () => {
  const tracker = createMetaTracker();
  tracker.setNest('savana', true);
  const snapshot = tracker.getNest();
  snapshot.level = 99;
  assert.equal(tracker.getNest().level, 1);
});

// ─── listNpcs ──────────────────────────────────────────────────────

test('listNpcs: returns all tracked NPCs', () => {
  const tracker = createMetaTracker();
  tracker.updateAffinity('npc_a', 1);
  tracker.updateAffinity('npc_b', -1);
  tracker.updateAffinity('npc_c', 0);
  const list = tracker.listNpcs();
  assert.equal(list.length, 3);
  const ids = list.map((n) => n.npc_id);
  assert.ok(ids.includes('npc_a'));
  assert.ok(ids.includes('npc_b'));
  assert.ok(ids.includes('npc_c'));
});

// ─── Isolation ─────────────────────────────────────────────────────

test('isolation: separate trackers do not share state', () => {
  const t1 = createMetaTracker();
  const t2 = createMetaTracker();
  t1.updateAffinity('npc_1', 2);
  assert.equal(t2.listNpcs().length, 0);
});
