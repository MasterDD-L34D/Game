// Shared test helpers for session round-model integration tests.
// Extracted from sessionRoundEndpoints, sessionLegacyActionWrapper,
// sessionTurnEndWrapper, sessionRoundModelEquivalence test files.
// Token optimization: avoids 4x duplication of withRoundFlag + startSession.

'use strict';

const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

/**
 * Set USE_ROUND_MODEL env var and return a restore function.
 * Use in t.after(restore) to clean up.
 */
function withRoundFlag(value) {
  const prior = process.env.USE_ROUND_MODEL;
  process.env.USE_ROUND_MODEL = value;
  return () => {
    if (prior === undefined) delete process.env.USE_ROUND_MODEL;
    else process.env.USE_ROUND_MODEL = prior;
  };
}

/**
 * Create an app with the given flag value. Returns { app, close, restore }.
 */
function createFlaggedApp(flagValue) {
  const restore = withRoundFlag(flagValue);
  const handle = createApp({ databasePath: null });
  return { ...handle, restore };
}

/**
 * Start a session with given units. Returns session_id.
 */
async function startSession(app, units) {
  const defaultUnits = [
    {
      id: 'p1',
      species: 'velox',
      job: 'skirmisher',
      hp: 10,
      ap: 2,
      attack_range: 2,
      initiative: 14,
      position: { x: 2, y: 2 },
      controlled_by: 'player',
    },
    {
      id: 'sis',
      species: 'carapax',
      job: 'vanguard',
      hp: 10,
      ap: 2,
      attack_range: 1,
      initiative: 10,
      position: { x: 3, y: 2 },
      controlled_by: 'sistema',
    },
  ];
  const res = await request(app)
    .post('/api/session/start')
    .send({ units: units || defaultUnits })
    .expect(200);
  return res.body.session_id;
}

/**
 * Send player attack action. Returns supertest response.
 */
async function playerAttack(app, sessionId, actorId, targetId) {
  return request(app)
    .post('/api/session/action')
    .send({ session_id: sessionId, actor_id: actorId, action_type: 'attack', target_id: targetId });
}

/**
 * Send turn/end. Returns supertest response.
 */
async function turnEnd(app, sessionId) {
  return request(app).post('/api/session/turn/end').send({ session_id: sessionId });
}

/**
 * Get session state. Returns response body.
 */
async function getState(app, sessionId) {
  const res = await request(app).get('/api/session/state').query({ session_id: sessionId });
  return res.body;
}

/**
 * Standard 2-unit fixture: player p1 + SIS sis.
 * Handles falsy overrides correctly (0 is valid for hp).
 */
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
      // 2026-05-15 (PR #2271 flaky-fix): optional attack mod override per tests
      // that need deterministic hit/miss. d20 + mod vs DC ~10 → mod 99 = always hit.
      // Backward-compat: omit override → mod undefined (treated 0 in resolveAttack).
      mod: overrides.p1Mod,
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

/**
 * Run same scenario with flag-off and flag-on, return both results.
 */
async function runDual(units, scenario) {
  const offApp = createFlaggedApp('false');
  let offResult;
  try {
    offResult = await scenario(offApp.app, units);
  } finally {
    offApp.restore();
    if (typeof offApp.close === 'function') await offApp.close().catch(() => {});
  }
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

module.exports = {
  withRoundFlag,
  createFlaggedApp,
  startSession,
  playerAttack,
  turnEnd,
  getState,
  twoUnits,
  runDual,
};
