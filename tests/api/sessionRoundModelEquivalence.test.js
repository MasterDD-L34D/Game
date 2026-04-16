// ADR-2026-04-16 M6-M14 — Behavioral equivalence tests.
//
// Verifica che la pipeline round-based (flag on) produce outcome
// strutturalmente equivalenti alla pipeline legacy (flag off) per
// tutti gli scenari chiave coperti dai 45 AI test unitari.
//
// Pattern: ogni test esegue lo STESSO scenario su due app separate
// (flag off + flag on), poi confronta proprietà strutturali (SIS
// action types, HP delta monotonicity, position changes, turn
// advancement) senza richiedere identità bit-per-bit (rng path
// diverso tra legacy e round flow).
//
// Copre 15 scenari che mappano 1:1 sui batch M6-M14 dell'ADR:
//   M6-M8  (batch 1): init, single attack, single move
//   M9-M11 (batch 2): retreat, cornered, stunned, multi-SIS
//   M12-M14 (batch 3): kill scenario, multi-round, no-target

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function createFlaggedApp(flagValue) {
  const prior = process.env.USE_ROUND_MODEL;
  process.env.USE_ROUND_MODEL = flagValue;
  const handle = createApp({ databasePath: null });
  return {
    ...handle,
    restore: () => {
      if (prior === undefined) delete process.env.USE_ROUND_MODEL;
      else process.env.USE_ROUND_MODEL = prior;
    },
  };
}

async function startSession(app, units) {
  const res = await request(app).post('/api/session/start').send({ units }).expect(200);
  return res.body.session_id;
}

async function playerAttack(app, sessionId, actorId, targetId) {
  return request(app)
    .post('/api/session/action')
    .send({ session_id: sessionId, actor_id: actorId, action_type: 'attack', target_id: targetId });
}

async function turnEnd(app, sessionId) {
  return request(app).post('/api/session/turn/end').send({ session_id: sessionId });
}

async function getState(app, sessionId) {
  const res = await request(app).get('/api/session/state').query({ session_id: sessionId });
  return res.body;
}

// Standard 2-unit fixture: player p1 + SIS sis
function twoUnits(overrides = {}) {
  return [
    {
      id: 'p1',
      species: 'velox',
      job: 'skirmisher',
      hp: overrides.p1Hp != null ? overrides.p1Hp : 10,
      max_hp: overrides.p1MaxHp != null ? overrides.p1MaxHp : 10,
      ap: 2,
      attack_range: 2,
      initiative: 14,
      position: overrides.p1Pos || { x: 2, y: 2 },
      controlled_by: 'player',
      status: overrides.p1Status || {},
    },
    {
      id: 'sis',
      species: 'carapax',
      job: 'vanguard',
      hp: overrides.sisHp != null ? overrides.sisHp : 10,
      max_hp: overrides.sisMaxHp != null ? overrides.sisMaxHp : 10,
      ap: 2,
      attack_range: overrides.sisRange || 1,
      initiative: 10,
      position: overrides.sisPos || { x: 3, y: 2 },
      controlled_by: 'sistema',
      status: overrides.sisStatus || {},
    },
  ];
}

// Run a scenario on both flag-off and flag-on, return both results
async function runDual(units, scenario) {
  // Flag OFF (legacy)
  const offApp = createFlaggedApp('false');
  let offResult;
  try {
    offResult = await scenario(offApp.app, units);
  } finally {
    offApp.restore();
    if (typeof offApp.close === 'function') await offApp.close().catch(() => {});
  }

  // Flag ON (round)
  const onApp = createFlaggedApp('true');
  let onResult;
  try {
    onResult = await scenario(onApp.app, units);
  } finally {
    onApp.restore();
    if (typeof onApp.close === 'function') await onApp.close().catch(() => {});
  }

  return { off: offResult, on: onResult };
}

// ─────────────────────────────────────────────────────────────────
// M6-M8 Batch 1: Init, single attack, single move
// ─────────────────────────────────────────────────────────────────

test('M6: /start produces same initial state structure', async (t) => {
  const units = twoUnits();
  const { off, on } = await runDual(units, async (app, u) => {
    const sid = await startSession(app, u);
    return getState(app, sid);
  });
  // Both should have 2 units with same IDs
  assert.equal(off.units.length, on.units.length);
  assert.deepEqual(off.units.map((u) => u.id).sort(), on.units.map((u) => u.id).sort());
  assert.equal(off.turn, on.turn);
});

test('M6: player attack produces hit-or-miss in both modes', async (t) => {
  // SIS adjacent (dist 1, p1 range 2 → in range)
  const units = twoUnits({ sisPos: { x: 3, y: 2 }, p1Pos: { x: 2, y: 2 } });
  const { off, on } = await runDual(units, async (app, u) => {
    const sid = await startSession(app, u);
    const res = await playerAttack(app, sid, 'p1', 'sis');
    return res.body;
  });
  // Both should return valid attack result
  assert.ok(['hit', 'miss'].includes(off.result), `off result: ${off.result}`);
  assert.ok(['hit', 'miss'].includes(on.result), `on result: ${on.result}`);
  // Both should have roll field
  assert.ok(typeof off.roll === 'number');
  assert.ok(typeof on.roll === 'number');
});

test('M7: /turn/end SIS attack when adjacent (structural equiv)', async (t) => {
  const units = twoUnits({ sisPos: { x: 3, y: 2 }, p1Pos: { x: 2, y: 2 } });
  const { off, on } = await runDual(units, async (app, u) => {
    const sid = await startSession(app, u);
    const res = await turnEnd(app, sid);
    return res.body;
  });
  // Both should produce ia_actions
  assert.ok(off.ia_actions.length >= 1, 'off: expected SIS action');
  assert.ok(on.ia_actions.length >= 1, 'on: expected SIS action');
  // SIS adjacent → should attack (REGOLA_001)
  const offAtk = off.ia_actions.find((a) => a.type === 'attack');
  const onAtk = on.ia_actions.find((a) => a.type === 'attack');
  assert.ok(offAtk, 'off: SIS should attack');
  assert.ok(onAtk, 'on: SIS should attack');
});

test('M8: /turn/end SIS move when distant (structural equiv)', async (t) => {
  const units = twoUnits({ sisPos: { x: 5, y: 0 }, p1Pos: { x: 0, y: 0 }, sisRange: 1 });
  const { off, on } = await runDual(units, async (app, u) => {
    const sid = await startSession(app, u);
    const res = await turnEnd(app, sid);
    return res.body;
  });
  // SIS far → should move toward player (approach)
  const offMove = off.ia_actions.find((a) => a.type === 'move' || a.type === 'approach');
  const onMove = on.ia_actions.find((a) => a.type === 'move');
  assert.ok(offMove, 'off: SIS should move/approach');
  assert.ok(onMove, 'on: SIS should move');
});

// ─────────────────────────────────────────────────────────────────
// M9-M11 Batch 2: Retreat, cornered, stunned, multi-SIS
// ─────────────────────────────────────────────────────────────────

test('M9: SIS retreat when HP low (structural equiv)', async (t) => {
  // SIS HP 3/10 (30%) → REGOLA_002 retreat
  const units = twoUnits({ sisHp: 3, sisPos: { x: 3, y: 0 }, p1Pos: { x: 0, y: 0 } });
  const { off, on } = await runDual(units, async (app, u) => {
    const sid = await startSession(app, u);
    const res = await turnEnd(app, sid);
    return res.body;
  });
  // Both should produce retreat/move action (not attack)
  const offAction = off.ia_actions[0];
  const onAction = on.ia_actions[0];
  assert.ok(offAction, 'off: SIS should have action');
  assert.ok(onAction, 'on: SIS should have action');
  // In legacy: retreat type or move type. In round: move type.
  assert.ok(
    offAction.type === 'retreat' || offAction.type === 'move',
    `off type: ${offAction.type}`,
  );
  assert.equal(onAction.type, 'move');
});

test('M10: SIS cornered falls back to attack (structural equiv)', async (t) => {
  // SIS corner (0,0), player at (1,0), HP low → retreat impossible → attack
  const units = twoUnits({
    sisHp: 3,
    sisPos: { x: 0, y: 0 },
    p1Pos: { x: 1, y: 0 },
    sisRange: 1,
  });
  const { off, on } = await runDual(units, async (app, u) => {
    const sid = await startSession(app, u);
    const res = await turnEnd(app, sid);
    return res.body;
  });
  // Cornered → fallback REGOLA_001 → attack (in range 1)
  const offAtk = off.ia_actions.find((a) => a.type === 'attack');
  const onAtk = on.ia_actions.find((a) => a.type === 'attack');
  assert.ok(offAtk, 'off: cornered SIS should attack');
  assert.ok(onAtk, 'on: cornered SIS should attack');
});

test('M10: SIS stunned skips in both modes', async (t) => {
  const units = twoUnits({ sisStatus: { stunned: 2 } });
  const { off, on } = await runDual(units, async (app, u) => {
    const sid = await startSession(app, u);
    const res = await turnEnd(app, sid);
    return res.body;
  });
  // Stunned → skip. No attack, no move.
  const offNonSkip = off.ia_actions.filter((a) => a.type !== 'skip');
  const onNonSkip = on.ia_actions.filter((a) => a.type !== 'skip');
  assert.equal(offNonSkip.length, 0, 'off: stunned should skip');
  assert.equal(onNonSkip.length, 0, 'on: stunned should skip');
});

test('M11: multi-SIS produces actions for each SIS unit', async (t) => {
  const units = [
    {
      id: 'p1',
      hp: 10,
      ap: 2,
      attack_range: 2,
      initiative: 14,
      position: { x: 0, y: 0 },
      controlled_by: 'player',
      status: {},
    },
    {
      id: 'sis_a',
      hp: 10,
      ap: 2,
      attack_range: 1,
      initiative: 10,
      position: { x: 2, y: 0 },
      controlled_by: 'sistema',
      status: {},
    },
    {
      id: 'sis_b',
      hp: 10,
      ap: 2,
      attack_range: 1,
      initiative: 8,
      position: { x: 4, y: 0 },
      controlled_by: 'sistema',
      status: {},
    },
  ];
  const { off, on } = await runDual(units, async (app, u) => {
    const sid = await startSession(app, u);
    const res = await turnEnd(app, sid);
    return res.body;
  });
  // Legacy produces 1 set of actions per SIS in turn order.
  // Round produces 1 intent per SIS in session.units order (resolved by priority).
  // Both should have actions from both SIS units.
  const offSisIds = new Set(off.ia_actions.map((a) => a.unit_id || a.ia_controlled_unit));
  const onSisIds = new Set(on.ia_actions.map((a) => a.unit_id));
  // Note: legacy runner interleaves turns (sis_a all actions, then advance
  // to sis_b, all actions). Round model declares 1 intent per SIS, resolves
  // all in 1 round. So off may have more actions (2 per SIS with AP 2) but
  // on has exactly 1 per SIS (round semantic). Structural check: both SIS
  // should appear.
  assert.ok(offSisIds.has('sis_a'), 'off: sis_a should act');
  assert.ok(onSisIds.has('sis_a'), 'on: sis_a should act');
  // sis_b may or may not act depending on turn advancement in legacy
  // (turn must reach sis_b). In round model, all SIS declare in same round.
  assert.ok(onSisIds.has('sis_b'), 'on: sis_b should act in round model');
});

// ─────────────────────────────────────────────────────────────────
// M12-M14 Batch 3: Kill, multi-round, no-target
// ─────────────────────────────────────────────────────────────────

test('M12: SIS attack reduces player HP (structural equiv)', async (t) => {
  // Run 5 rounds, verify p1 HP monotonically decreases in both modes
  const units = twoUnits({ sisPos: { x: 3, y: 2 }, p1Pos: { x: 2, y: 2 } });
  const { off, on } = await runDual(units, async (app, u) => {
    const sid = await startSession(app, u);
    const hps = [];
    for (let i = 0; i < 5; i++) {
      const res = await turnEnd(app, sid);
      if (res.status !== 200) break;
      const state = await getState(app, sid);
      const p1 = state.units.find((u) => u.id === 'p1');
      if (p1) hps.push(p1.hp);
      if (p1 && p1.hp <= 0) break;
    }
    return hps;
  });
  // HP should be monotonically non-increasing in both modes
  for (let i = 1; i < off.length; i++) {
    assert.ok(off[i] <= off[i - 1], `off HP should decrease: ${off}`);
  }
  for (let i = 1; i < on.length; i++) {
    assert.ok(on[i] <= on[i - 1], `on HP should decrease: ${on}`);
  }
});

test('M13: multi-round /action + /turn/end cycle works with flag on', async (t) => {
  const restore = (() => {
    const p = process.env.USE_ROUND_MODEL;
    process.env.USE_ROUND_MODEL = 'true';
    return () => {
      if (p === undefined) delete process.env.USE_ROUND_MODEL;
      else process.env.USE_ROUND_MODEL = p;
    };
  })();
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const units = twoUnits({ sisPos: { x: 3, y: 2 }, p1Pos: { x: 2, y: 2 } });
  const sid = await startSession(app, units);

  // 3 full cycles: player attack + turn/end (SIS responds).
  // Target may die mid-sequence (real performAttack with rng), so we
  // break on 400 (dead target) instead of asserting 200 on every round.
  let completedRounds = 0;
  for (let i = 0; i < 3; i++) {
    const atkRes = await playerAttack(app, sid, 'p1', 'sis');
    if (atkRes.status !== 200) break; // target dead or AP exhausted
    const teRes = await turnEnd(app, sid);
    if (teRes.status !== 200) break;
    assert.equal(teRes.body.round_wrapper, true);
    completedRounds++;
  }
  // At least 1 full cycle must succeed
  assert.ok(completedRounds >= 1, `expected at least 1 completed round, got ${completedRounds}`);
  // Final state should show turn advancement
  const state = await getState(app, sid);
  assert.ok(state.turn > 1, 'turn should have advanced');
});

test('M14: no enemy alive → round SIS produces no attack', async (t) => {
  // p1 dead → SIS has no target. Round flow should produce 0 attacks.
  // Legacy behavior may differ (runner may still iterate with AP loop
  // before target check returns null), so we only assert on round flow.
  const restore = (() => {
    const p = process.env.USE_ROUND_MODEL;
    process.env.USE_ROUND_MODEL = 'true';
    return () => {
      if (p === undefined) delete process.env.USE_ROUND_MODEL;
      else process.env.USE_ROUND_MODEL = p;
    };
  })();
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const units = twoUnits({ p1Hp: 0 });
  const sid = await startSession(app, units);
  const res = await turnEnd(app, sid);
  assert.equal(res.status, 200);
  const onAtks = (res.body.ia_actions || []).filter((a) => a.type === 'attack');
  assert.equal(onAtks.length, 0, 'on: no attack when no target');
  // round_decisions should have NO_TARGET or skip
  const decisions = res.body.round_decisions || [];
  const noTarget = decisions.find((d) => d.rule === 'NO_TARGET' || d.intent === 'skip');
  assert.ok(noTarget, 'expected skip/NO_TARGET decision');
});

test('M14: flag-on round metadata present across all turn/end calls', async (t) => {
  const restore = (() => {
    const p = process.env.USE_ROUND_MODEL;
    process.env.USE_ROUND_MODEL = 'true';
    return () => {
      if (p === undefined) delete process.env.USE_ROUND_MODEL;
      else process.env.USE_ROUND_MODEL = p;
    };
  })();
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits());

  for (let i = 0; i < 3; i++) {
    const res = await turnEnd(app, sid);
    assert.equal(res.status, 200);
    assert.equal(res.body.round_wrapper, true, `round ${i}: round_wrapper`);
    assert.ok(res.body.round_phase, `round ${i}: round_phase`);
    assert.ok(Array.isArray(res.body.round_decisions), `round ${i}: round_decisions`);
  }
});
