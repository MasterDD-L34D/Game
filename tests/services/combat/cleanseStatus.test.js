// tests/services/combat/cleanseStatus.test.js
//
// cleanse_status core (creature-trait mechanics, filtri_bioattivi ACTIVE mode).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//   filtri active (1 AP, 2-round cd): cleanse ALL negative statuses on an adjacent
//   ally. Scope = TRANSIENT combat debuffs (bleeding/fracture/panic/confused/
//   sbilanciato/abbagliato/inibito/slowed/chilled/disorient + severity companions).
//   Durable/structural states (wounds/wounded_perma/nucleo_*) are NOT cleansed --
//   those heal via the Nido ritual (SPEC-J), not a 1-AP filter. (Design call: flagged.)
// Real-module tests (CommonJS), CI-gated via tests/services/*/*.test.js.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  cleanseNegativeStatuses,
  NEGATIVE_STATUSES,
} = require('../../../apps/backend/services/combat/cleanseStatus');

test('removes all transient negative statuses + their severity companions', () => {
  const u = {
    status: {
      bleeding: 3,
      bleeding_severity: 'major',
      panic: 2,
      sbilanciato: 1,
      // a positive/neutral status that must NOT be cleansed:
      attuned: 2,
    },
  };
  const cleansed = cleanseNegativeStatuses(u);
  assert.ok(!('bleeding' in u.status), 'bleeding removed');
  assert.ok(!('bleeding_severity' in u.status), 'severity removed');
  assert.ok(!('panic' in u.status), 'panic removed');
  assert.ok(!('sbilanciato' in u.status), 'sbilanciato removed');
  assert.equal(u.status.attuned, 2, 'positive status untouched');
  assert.deepEqual(cleansed.sort(), ['bleeding', 'panic', 'sbilanciato']);
});

test('does NOT cleanse durable/structural states (wounds, wounded_perma, nucleo_*)', () => {
  const u = {
    status: {
      wounded_perma: { severity: 'severe' },
      nucleo_distrutto: 99,
      danno_nucleo: 99,
      bleeding: 2,
    },
  };
  const cleansed = cleanseNegativeStatuses(u);
  assert.ok(u.status.wounded_perma, 'wounded_perma preserved (heals via Nido ritual)');
  assert.ok(u.status.nucleo_distrutto > 0, 'weak-point state preserved');
  assert.ok(u.status.danno_nucleo > 0, 'weak-point state preserved');
  assert.deepEqual(cleansed, ['bleeding'], 'only the transient debuff cleansed');
});

test('no negative statuses -> empty result, no mutation', () => {
  const u = { status: { attuned: 1, healing: 2 } };
  assert.deepEqual(cleanseNegativeStatuses(u), []);
  assert.equal(u.status.attuned, 1);
});

test('tolerant of missing/empty status', () => {
  assert.deepEqual(cleanseNegativeStatuses({}), []);
  assert.deepEqual(cleanseNegativeStatuses(null), []);
  assert.deepEqual(cleanseNegativeStatuses({ status: {} }), []);
});

test('NEGATIVE_STATUSES covers the transient debuffs, excludes durable states', () => {
  assert.ok(NEGATIVE_STATUSES.has('bleeding'));
  assert.ok(NEGATIVE_STATUSES.has('abbagliato'));
  assert.ok(NEGATIVE_STATUSES.has('inibito'));
  assert.ok(!NEGATIVE_STATUSES.has('wounded_perma'), 'durable wound excluded');
  assert.ok(!NEGATIVE_STATUSES.has('nucleo_distrutto'), 'weak-point excluded');
  assert.ok(!NEGATIVE_STATUSES.has('coordinamento'), 'positive aura excluded');
});

// ─── executeCleanseStatus handler (filtri_purga, trait-granted active ability) ───
// The ability is resolved from the regenerated jobs.yaml (trait_native filtri_purga).

const { createAbilityExecutor } = require('../../../apps/backend/services/abilityExecutor');

function makeExec() {
  return createAbilityExecutor({
    performAttack: () => ({}),
    buildAttackEvent: () => ({}),
    buildMoveEvent: () => ({}),
    appendEvent: () => {},
    manhattanDistance: (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
  });
}

test('executeCleanseStatus: cleanses an adjacent ally, spends AP, sets the cooldown', async () => {
  const exec = makeExec();
  const actor = {
    id: 'medic',
    controlled_by: 'players',
    position: { x: 0, y: 0 },
    ap: 2,
    ap_remaining: 2,
  };
  const ally = {
    id: 'hurt',
    controlled_by: 'players',
    position: { x: 1, y: 0 },
    hp: 10,
    status: { bleeding: 3, panic: 2 },
  };
  const session = { session_id: 's', units: [actor, ally], events: [], turn: 1 };
  const res = await exec.executeAbility({
    session,
    actor,
    body: { ability_id: 'filtri_purga', target_id: 'hurt' },
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(!('bleeding' in ally.status), 'ally bleeding cleansed');
  assert.ok(!('panic' in ally.status), 'ally panic cleansed');
  assert.equal(actor.ap_remaining, 1, '1 AP spent');
  assert.equal(actor._filtri_cleanse_cd_until, 3, 'cooldown set to turn + 2');
});

test('executeCleanseStatus: rejects an out-of-range ally and an enemy target (no cleanse)', async () => {
  const exec = makeExec();
  const actor = {
    id: 'medic',
    controlled_by: 'players',
    position: { x: 0, y: 0 },
    ap: 2,
    ap_remaining: 2,
  };
  const farAlly = {
    id: 'far',
    controlled_by: 'players',
    position: { x: 3, y: 0 },
    hp: 10,
    status: { bleeding: 1 },
  };
  const enemy = {
    id: 'foe',
    controlled_by: 'sistema',
    position: { x: 1, y: 0 },
    hp: 10,
    status: { bleeding: 1 },
  };
  const session = { session_id: 's', units: [actor, farAlly, enemy], events: [], turn: 1 };
  const far = await exec.executeAbility({
    session,
    actor,
    body: { ability_id: 'filtri_purga', target_id: 'far' },
  });
  assert.equal(far.status, 400, 'out-of-range ally rejected');
  assert.ok(farAlly.status.bleeding > 0, 'far ally not cleansed');
  const foe = await exec.executeAbility({
    session,
    actor,
    body: { ability_id: 'filtri_purga', target_id: 'foe' },
  });
  assert.equal(foe.status, 400, 'enemy target rejected');
  assert.ok(enemy.status.bleeding > 0, 'enemy not cleansed');
});
