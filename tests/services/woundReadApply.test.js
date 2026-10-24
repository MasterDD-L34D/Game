// OD-058 D2 read-apply, flag-gated (issue #2531 -- "apply computeWoundMaluses in
// resolver" slice of the live cutover). Engine #2535 shipped woundSystem.js + the
// double-apply guard, but NOTHING consumed computeWoundMaluses in combat: injected
// wounds had zero effect, so the N=40 magnitude probe would have measured nothing
// (anti-pattern #14). Behind WOUND_LOCATION_V2=true (default OFF = status quo
// byte-identical):
//   - computeStatusModifiers folds the actor's wound attack_mod + accuracy maluses
//     into attackDelta and the target's defense_mod malus into defenseDelta
//     (the same per-attack delta seam every other modifier uses);
//   - applyApRefill applies the wound ap malus (testa grave) to the per-turn refill;
//   - mobility has NO engine consumer (no move-range stat) -> intentionally inert,
//     pinned by test + documented in the evidence report.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { computeStatusModifiers } = require('../../apps/backend/services/combat/statusModifiers');
const { applyApRefill } = require('../../apps/backend/routes/sessionHelpers');
const { woundEffect } = require('../../apps/backend/services/combat/woundSystem');

function wound(location, severity) {
  const { stat, malus } = woundEffect(location, severity);
  return { location, severity, stat, malus };
}

function unitWith(wounds, extra = {}) {
  return {
    id: 'u1',
    controlled_by: 'player',
    hp: 10,
    position: { x: 0, y: 0 },
    status: { wounds },
    ...extra,
  };
}

const cleanTarget = () => ({
  id: 't1',
  controlled_by: 'sistema',
  hp: 10,
  position: { x: 1, y: 0 },
  status: {},
});

function withFlag(value, fn) {
  const prev = process.env.WOUND_LOCATION_V2;
  if (value === null) delete process.env.WOUND_LOCATION_V2;
  else process.env.WOUND_LOCATION_V2 = value;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env.WOUND_LOCATION_V2;
    else process.env.WOUND_LOCATION_V2 = prev;
  }
}

// D3 cutover (verdetto 2026-06-10): default e' ON -- l'opt-out e' esplicito.
test('flag OFF (explicit opt-out): wounds produce NO attack/defense delta', () => {
  withFlag('false', () => {
    const actor = unitWith([wound('arti_anteriori', 'grave')]);
    const r = computeStatusModifiers(actor, cleanTarget(), []);
    assert.equal(r.attackDelta, 0);
    assert.equal(r.defenseDelta, 0);
  });
});

test('flag ON: actor arti_anteriori grave -> attackDelta -2', () => {
  withFlag('true', () => {
    const actor = unitWith([wound('arti_anteriori', 'grave')]);
    const r = computeStatusModifiers(actor, cleanTarget(), []);
    assert.equal(r.attackDelta, -2);
    assert.ok(r.log.some((l) => l.status === 'wound'));
  });
});

test('flag ON: actor testa lieve (accuracy) folds into attackDelta -1', () => {
  withFlag('true', () => {
    const actor = unitWith([wound('testa', 'lieve')]);
    const r = computeStatusModifiers(actor, cleanTarget(), []);
    assert.equal(r.attackDelta, -1);
  });
});

test('flag ON: target torso grave -> defenseDelta -2 (easier to hit)', () => {
  withFlag('true', () => {
    const actor = unitWith([]);
    const target = { ...cleanTarget(), status: { wounds: [wound('torso', 'grave')] } };
    const r = computeStatusModifiers(actor, target, []);
    assert.equal(r.defenseDelta, -2);
    assert.equal(r.attackDelta, 0);
  });
});

test('flag ON: maluses sum across wounds (atk lieve + testa lieve -> -2 attack)', () => {
  withFlag('true', () => {
    const actor = unitWith([wound('arti_anteriori', 'lieve'), wound('testa', 'lieve')]);
    const r = computeStatusModifiers(actor, cleanTarget(), []);
    assert.equal(r.attackDelta, -2);
  });
});

test('flag ON: arti_posteriori (mobility) is INERT on attack/defense/ap (no consumer)', () => {
  withFlag('true', () => {
    const actor = unitWith([wound('arti_posteriori', 'grave')], { ap: 2 });
    const r = computeStatusModifiers(actor, cleanTarget(), []);
    assert.equal(r.attackDelta, 0);
    assert.equal(r.defenseDelta, 0);
    applyApRefill(actor);
    assert.equal(actor.ap_remaining, 2);
  });
});

test('flag ON: wound presence still yields legacy wounded_perma (no double-apply)', () => {
  withFlag('true', () => {
    const actor = unitWith([wound('arti_anteriori', 'media')], {
      status: {
        wounds: [wound('arti_anteriori', 'media')],
        wounded_perma: { severity: 'critical', hp_penalty: 2, stacks: 1 },
      },
    });
    const r = computeStatusModifiers(actor, cleanTarget(), []);
    // Only the location wound (-1); the legacy critical penalty (-2) must NOT stack.
    assert.equal(r.attackDelta, -1);
  });
});

test('flag OFF (explicit opt-out): applyApRefill ignores wound ap malus', () => {
  withFlag('false', () => {
    const u = unitWith([wound('testa', 'grave')], { ap: 2 });
    applyApRefill(u);
    assert.equal(u.ap_remaining, 2);
  });
});

test('flag ON: applyApRefill applies testa grave -> 2 AP refills to 1', () => {
  withFlag('true', () => {
    const u = unitWith([wound('testa', 'grave')], { ap: 2 });
    applyApRefill(u);
    assert.equal(u.ap_remaining, 1);
  });
});

test('flag ON: ap refill floors at 0 (wound + defy never negative)', () => {
  withFlag('true', () => {
    const u = unitWith([wound('testa', 'grave')], {
      ap: 1,
      status: { wounds: [wound('testa', 'grave')], defy_penalty: 1 },
    });
    applyApRefill(u);
    assert.equal(u.ap_remaining, 0);
  });
});
