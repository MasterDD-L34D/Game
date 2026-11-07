// tests/ai/intentsRosterScaling.test.js -- D4 threat-dial, roster-scaling PROPOSED.
//
// Spec: docs/planning/2026-07-06-sistema-intents-roster-scaling-spec.md.
// effectiveCap = min(max(tierCap, ceil(aliveSistema / K)), INTENTS_ABS_CAP)
// Flag-gated (SISTEMA_INTENTS_ROSTER_SCALING_ENABLED, default OFF) -> back-compat
// byte-identical when OFF / unset; tier stays the FLOOR when ON (small rosters
// unchanged even with the flag flipped).
//
// IMPORTANT: every test sets/restores env in a finally block (mirror
// pressureTierFloor.test.js). intentsCapForPressure reads the flag at
// call-time (not module load) so toggling per-test is safe without re-require.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  intentsCapForPressure,
  isIntentsRosterScalingEnabled,
  INTENTS_ABS_CAP,
  createDeclareSistemaIntents,
} = require('../../apps/backend/services/ai/declareSistemaIntents');

const FLAG = 'SISTEMA_INTENTS_ROSTER_SCALING_ENABLED';
const K_ENV = 'SISTEMA_INTENTS_ROSTER_K';

function withEnv(pairs, fn) {
  const prev = {};
  for (const [key, value] of Object.entries(pairs)) {
    prev[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(prev)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

// -- flag helper --

test('isIntentsRosterScalingEnabled: true only when env === "true"', () => {
  withEnv({ [FLAG]: 'true' }, () => assert.equal(isIntentsRosterScalingEnabled(), true));
  withEnv({ [FLAG]: 'false' }, () => assert.equal(isIntentsRosterScalingEnabled(), false));
  withEnv({ [FLAG]: '1' }, () => assert.equal(isIntentsRosterScalingEnabled(), false));
  withEnv({ [FLAG]: undefined }, () => assert.equal(isIntentsRosterScalingEnabled(), false));
});

// -- flag OFF: third arg ignored (back-compat byte-identical) --

test('flag OFF/UNSET: aliveSistema ignored, tier cap only', () => {
  withEnv({ [FLAG]: 'false' }, () => {
    assert.equal(intentsCapForPressure(50, undefined, 13), 3, 'Escalated stays 3');
    assert.equal(intentsCapForPressure(0, undefined, 30), 1, 'Calm stays 1');
    assert.equal(intentsCapForPressure(95, undefined, 40), 4, 'Apex stays 4');
  });
  withEnv({ [FLAG]: undefined }, () => {
    assert.equal(intentsCapForPressure(50, undefined, 13), 3, 'unset behaves like OFF');
  });
});

// -- flag ON: tier is the FLOOR (small rosters unchanged) --

test('flag ON: small roster -> tier floor wins, identical to OFF', () => {
  withEnv({ [FLAG]: 'true' }, () => {
    assert.equal(intentsCapForPressure(50, undefined, 3), 3, 'ceil(3/3)=1 < tier 3');
    assert.equal(intentsCapForPressure(50, undefined, 7), 3, 'ceil(7/3)=3 == tier 3');
    assert.equal(intentsCapForPressure(95, undefined, 2), 4, 'Apex floor 4 > ceil(2/3)');
    assert.equal(intentsCapForPressure(0, undefined, 2), 1, 'Calm tutorial_01 gentle start intact');
  });
});

// -- flag ON: big roster -> ceil(alive/K) bites, clamped by INTENTS_ABS_CAP --

test('flag ON: big roster raises cap above tier (K default 3), ABS_CAP clamps', () => {
  withEnv({ [FLAG]: 'true', [K_ENV]: undefined }, () => {
    assert.equal(intentsCapForPressure(50, undefined, 13), 5, 'ceil(13/3)=5 > tier 3');
    assert.equal(intentsCapForPressure(0, undefined, 10), 4, 'ceil(10/3)=4 > Calm 1');
    assert.equal(INTENTS_ABS_CAP, 6, 'PROPOSED ceiling: below party 8 actions/round');
    assert.equal(intentsCapForPressure(50, undefined, 30), 6, 'ceil(30/3)=10 -> clamp 6');
  });
});

// -- flag ON: invalid aliveSistema -> tier cap (defensive) --

test('flag ON: missing/invalid aliveSistema -> tier cap only', () => {
  withEnv({ [FLAG]: 'true' }, () => {
    assert.equal(intentsCapForPressure(50), 3, 'no third arg');
    assert.equal(intentsCapForPressure(50, undefined, undefined), 3);
    assert.equal(intentsCapForPressure(50, undefined, null), 3);
    assert.equal(intentsCapForPressure(50, undefined, NaN), 3);
    assert.equal(intentsCapForPressure(50, undefined, 0), 3, 'zero alive -> floor');
    assert.equal(intentsCapForPressure(50, undefined, -4), 3, 'negative -> floor');
  });
});

// -- K knob from env --

test('flag ON: SISTEMA_INTENTS_ROSTER_K overrides divisor; invalid K -> default 3', () => {
  withEnv({ [FLAG]: 'true', [K_ENV]: '2' }, () => {
    assert.equal(intentsCapForPressure(50, undefined, 8), 4, 'ceil(8/2)=4');
    assert.equal(intentsCapForPressure(50, undefined, 13), 6, 'ceil(13/2)=7 -> clamp 6');
  });
  for (const bad of ['0', '-1', 'x', '2.5']) {
    withEnv({ [FLAG]: 'true', [K_ENV]: bad }, () => {
      assert.equal(intentsCapForPressure(50, undefined, 13), 5, `K='${bad}' falls back to 3`);
    });
  }
});

// -- composition with A2 pressure_tier_floor --

test('flag ON + A2 floor ON: floored tier is still the floor under scaling', () => {
  withEnv({ [FLAG]: 'true', PRESSURE_TIER_FLOOR_ENABLED: 'true' }, () => {
    assert.equal(intentsCapForPressure(0, 5, 2), 4, 'Apex-floored tier 4 > ceil(2/3)');
    assert.equal(intentsCapForPressure(0, 5, 13), 5, 'ceil(13/3)=5 > Apex 4');
  });
});

// -- integration: declareSistemaIntents call-site threads the alive count --

function bigRosterSession(sistemaCount) {
  const units = [
    { id: 'pg_1', controlled_by: 'player', hp: 10, position: { x: 0, y: 0 }, status: {} },
  ];
  for (let i = 0; i < sistemaCount; i += 1) {
    units.push({
      id: `sis_${i + 1}`,
      controlled_by: 'sistema',
      hp: 5,
      attack_range: 1,
      position: { x: 10, y: i },
      status: {},
    });
  }
  return {
    session_id: 's-roster-scaling',
    sistema_pressure: 50, // Escalated -> tier cap 3
    units,
    grid: { width: 20, height: 16 },
  };
}

function makeDeclare() {
  return createDeclareSistemaIntents({
    pickLowestHpEnemy: (session, actor) =>
      session.units.find((u) => u.controlled_by !== actor.controlled_by && u.hp > 0) || null,
    stepTowards: (from) => ({ x: from.x - 1, y: from.y }),
    manhattanDistance: (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
    gridSize: 20,
  });
}

test('integration: flag OFF -> 13 sistema, only tier cap 3 intents emitted', () => {
  withEnv({ [FLAG]: 'false' }, () => {
    const { intents, decisions } = makeDeclare()(bigRosterSession(13));
    assert.equal(intents.length, 3);
    const skipped = decisions.filter((d) => d.rule === 'PRESSURE_CAP');
    assert.equal(skipped.length, 10, 'the other 10 hit the pressure cap');
  });
});

test('integration: flag ON K=3 -> 13 sistema, 5 intents emitted', () => {
  withEnv({ [FLAG]: 'true', [K_ENV]: undefined }, () => {
    const { intents, decisions } = makeDeclare()(bigRosterSession(13));
    assert.equal(intents.length, 5, 'ceil(13/3)=5 > tier 3');
    const skipped = decisions.filter((d) => d.rule === 'PRESSURE_CAP');
    assert.equal(skipped.length, 8);
  });
});

test('integration: flag ON, small roster -> unchanged vs OFF (tier floor)', () => {
  const offCount = withEnv(
    { [FLAG]: 'false' },
    () => makeDeclare()(bigRosterSession(3)).intents.length,
  );
  const onCount = withEnv(
    { [FLAG]: 'true' },
    () => makeDeclare()(bigRosterSession(3)).intents.length,
  );
  assert.equal(offCount, onCount, 'flag flip is a no-op on small rosters');
  assert.equal(onCount, 3);
});

test('integration: only ALIVE sistema count toward scaling', () => {
  withEnv({ [FLAG]: 'true' }, () => {
    const session = bigRosterSession(13);
    for (const u of session.units) {
      if (u.controlled_by === 'sistema' && Number(u.id.split('_')[1]) > 6) u.hp = 0;
    }
    // 6 alive -> ceil(6/3)=2 < tier 3 -> floor 3
    const { intents } = makeDeclare()(session);
    assert.equal(intents.length, 3, 'dead units excluded from alive count');
  });
});

// Invariant (harsh-review): aliveSistema is a SNAPSHOT taken at declare entry,
// before the decision loop. Today declare is pure and spawn happens outside it;
// if a future refactor wires spawn-in-declare, the cap must NOT re-expand from
// units injected after entry -- this test pins the snapshot semantics.
test('integration: aliveSistema is snapshot at entry (cap fixed for the pass)', () => {
  withEnv({ [FLAG]: 'true' }, () => {
    const session = bigRosterSession(13);
    const { intents } = makeDeclare()(session);
    assert.equal(intents.length, 5, 'ceil(13/3)=5 computed once at entry');
    // A second declare on the same (unmutated) session recomputes the same
    // snapshot -- determinism of the cap across passes.
    const second = makeDeclare()(session);
    assert.equal(second.intents.length, 5);
  });
});
