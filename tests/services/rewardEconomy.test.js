// Unit test for rewardEconomy — coverage gap closed (archeologist excavate 2026-04-25).
//
// Scope: computeSessionPE (per-actor PE w/ VC + Ennea bonus), convertPE (5:1
// PE→PI), buildDebriefSummary (debrief payload shape). Pure logic, no IO.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PE_BASE_BY_DIFFICULTY,
  PE_PER_PI,
  computeSessionPE,
  convertPE,
  buildDebriefSummary,
} = require('../../apps/backend/services/rewardEconomy');

// ─────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────

function makeVcSnapshot(perActor = {}, turns = 5) {
  return { turns_played: turns, per_actor: perActor };
}

function makeActorVc({ indices = {}, mbti = null, ennea = [] } = {}) {
  return {
    aggregate_indices: indices,
    mbti_type: mbti,
    ennea_archetypes: ennea,
  };
}

// ─────────────────────────────────────────────────────────────────
// computeSessionPE — base + bonus tiers
// ─────────────────────────────────────────────────────────────────

test('computeSessionPE applies tutorial base (3) when difficulty=tutorial', () => {
  const snap = makeVcSnapshot({
    u1: makeActorVc({ indices: { agg: 0.0 } }),
  });
  const res = computeSessionPE(snap, { difficulty: 'tutorial' });
  assert.equal(res.per_actor.u1.pe_base, 3);
  assert.equal(res.per_actor.u1.pe_total, 3, 'no bonus at avg=0');
  assert.equal(res.session_total, 3);
});

test('computeSessionPE defaults to standard base (5) when difficulty unknown', () => {
  const snap = makeVcSnapshot({ u1: makeActorVc({ indices: { x: 0.0 } }) });
  const res = computeSessionPE(snap, { difficulty: 'unknown_xyz' });
  assert.equal(res.per_actor.u1.pe_base, 5);
});

test('computeSessionPE applies eccellente bonus (+3) when avg >= 0.7', () => {
  const snap = makeVcSnapshot({
    hero: makeActorVc({ indices: { dom: 0.8, sup: 0.7 } }), // avg 0.75
  });
  const res = computeSessionPE(snap, { difficulty: 'standard' });
  assert.equal(res.per_actor.hero.pe_vc_bonus, 3);
  assert.equal(res.per_actor.hero.bonus_reason, 'eccellente');
  assert.equal(res.per_actor.hero.pe_total, 5 + 3);
});

test('computeSessionPE applies tier thresholds in order (buono / sufficiente / nessuno)', () => {
  const snap = makeVcSnapshot({
    a: makeActorVc({ indices: { v: 0.55 } }), // buono +2
    b: makeActorVc({ indices: { v: 0.35 } }), // sufficiente +1
    c: makeActorVc({ indices: { v: 0.1 } }), // nessuno
  });
  const res = computeSessionPE(snap, { difficulty: 'standard' });
  assert.equal(res.per_actor.a.pe_vc_bonus, 2);
  assert.equal(res.per_actor.a.bonus_reason, 'buono');
  assert.equal(res.per_actor.b.pe_vc_bonus, 1);
  assert.equal(res.per_actor.c.pe_vc_bonus, 0);
  assert.equal(res.per_actor.c.bonus_reason, 'nessun bonus');
});

test('computeSessionPE adds ennea bonus capped at 2', () => {
  const snap = makeVcSnapshot({
    multiArc: makeActorVc({ indices: { v: 0.0 }, ennea: ['t1', 't2', 't3', 't4'] }),
    oneArc: makeActorVc({ indices: { v: 0.0 }, ennea: ['t1'] }),
    none: makeActorVc({ indices: { v: 0.0 }, ennea: [] }),
  });
  const res = computeSessionPE(snap, { difficulty: 'standard' });
  assert.equal(res.per_actor.multiArc.pe_ennea_bonus, 2, 'capped at 2');
  assert.equal(res.per_actor.oneArc.pe_ennea_bonus, 1);
  assert.equal(res.per_actor.none.pe_ennea_bonus, 0);
});

test('computeSessionPE handles boss difficulty + multi-actor session_total', () => {
  const snap = makeVcSnapshot({
    a: makeActorVc({ indices: { v: 0.8 }, ennea: ['x'] }), // 12 + 3 + 1 = 16
    b: makeActorVc({ indices: { v: 0.4 } }), // 12 + 1 = 13
  });
  const res = computeSessionPE(snap, { difficulty: 'boss' });
  assert.equal(res.per_actor.a.pe_base, 12);
  assert.equal(res.per_actor.a.pe_total, 16);
  assert.equal(res.per_actor.b.pe_total, 13);
  assert.equal(res.session_total, 29);
});

test('computeSessionPE empty per_actor → session_total=0', () => {
  const snap = makeVcSnapshot({});
  const res = computeSessionPE(snap, { difficulty: 'standard' });
  assert.deepEqual(res.per_actor, {});
  assert.equal(res.session_total, 0);
});

test('computeSessionPE filters non-numeric / null index values when computing avg', () => {
  const snap = makeVcSnapshot({
    u1: makeActorVc({
      indices: { real: 0.8, missing: null, str: 'noise', undef: undefined },
    }),
  });
  const res = computeSessionPE(snap, { difficulty: 'standard' });
  assert.equal(res.per_actor.u1.vc_performance, 0.8, 'avg only on numeric');
  assert.equal(res.per_actor.u1.pe_vc_bonus, 3);
});

// ─────────────────────────────────────────────────────────────────
// convertPE — 5:1 ratio
// ─────────────────────────────────────────────────────────────────

test('convertPE 5:1 — exact + remainder + zero', () => {
  assert.deepEqual(convertPE(15), { pi_gained: 3, pe_remaining: 0 });
  assert.deepEqual(convertPE(13), { pi_gained: 2, pe_remaining: 3 });
  assert.deepEqual(convertPE(0), { pi_gained: 0, pe_remaining: 0 });
  assert.deepEqual(convertPE(4), { pi_gained: 0, pe_remaining: 4 });
});

// ─────────────────────────────────────────────────────────────────
// buildDebriefSummary — payload shape
// ─────────────────────────────────────────────────────────────────

test('buildDebriefSummary returns expected canonical shape', () => {
  const session = {
    session_id: 'sess_1',
    // 2026-04-26 Q19 Opzione A: PE→PI conversion gated on outcome=victory.
    outcome: 'victory',
    events: [{ a: 1 }, { a: 2 }],
    damage_taken: { u1: 0, u2: 5, u3: -3 },
  };
  const vcSnapshot = makeVcSnapshot(
    {
      u1: makeActorVc({
        indices: { v: 0.8 },
        mbti: 'ENTJ',
        ennea: ['t8'],
      }),
    },
    7,
  );
  const peResult = computeSessionPE(vcSnapshot, { difficulty: 'standard' });
  const debrief = buildDebriefSummary(session, vcSnapshot, peResult);

  assert.equal(debrief.session_id, 'sess_1');
  assert.equal(debrief.turns_played, 7);
  assert.ok(debrief.economy);
  assert.equal(debrief.economy.pe_session_total, peResult.session_total);
  // 5+3+1=9 → 1 PI + 4 remainder (post-victory gate)
  assert.equal(debrief.economy.pi_converted, 1);
  assert.equal(debrief.economy.pe_remaining, 4);
  // seed_earned removed 2026-04-26 (orphan currency cleanup PR #1870)
  assert.equal(debrief.combat.total_events, 2);
  // damage_taken values <= 0 count as kill: u1=0 + u3=-3 → 2
  assert.equal(debrief.combat.kills, 2);
  assert.deepEqual(debrief.vc_summary.per_actor.u1, {
    aggregate_indices: { v: 0.8 },
    mbti_type: 'ENTJ',
    ennea_archetypes: ['t8'],
  });
});

test('buildDebriefSummary tolerates missing events / damage_taken / pf_session', () => {
  const session = { session_id: 'sess_2' };
  const snap = makeVcSnapshot({}, 0);
  const pe = computeSessionPE(snap, {});
  const debrief = buildDebriefSummary(session, snap, pe);
  assert.equal(debrief.combat.total_events, 0);
  assert.equal(debrief.combat.kills, 0);
  assert.deepEqual(debrief.pf_session, {});
  assert.equal(debrief.economy.pe_session_total, 0);
});

test('exports surface canonical constants', () => {
  assert.equal(PE_PER_PI, 5);
  assert.equal(PE_BASE_BY_DIFFICULTY.tutorial, 3);
  assert.equal(PE_BASE_BY_DIFFICULTY.standard, 5);
  assert.equal(PE_BASE_BY_DIFFICULTY.elite, 8);
  assert.equal(PE_BASE_BY_DIFFICULTY.boss, 12);
});
