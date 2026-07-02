// =============================================================================
// ATLAS LIVE — in-match telemetry
//
// Verifica che /api/session/state esponga atlas { match_pressure, momentum,
// warning_signals } durante il match.
// =============================================================================

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const {
  computeMatchPressure,
  computeMomentum,
  computeWarningSignals,
  buildAtlasLive,
} = require('../../apps/backend/services/atlasLive');

test('Atlas: match_pressure 100 when no enemies alive', () => {
  const session = {
    units: [
      { id: 'p1', controlled_by: 'player', hp: 10, max_hp: 10 },
      { id: 'e1', controlled_by: 'sistema', hp: 0, max_hp: 5 },
    ],
  };
  const p = computeMatchPressure(session);
  // No alive enemies → pressure should be 100 (player wins)
  assert.equal(p, 100);
});

test('Atlas: match_pressure 0 when no players alive', () => {
  const session = {
    units: [
      { id: 'p1', controlled_by: 'player', hp: 0, max_hp: 10 },
      { id: 'e1', controlled_by: 'sistema', hp: 5, max_hp: 5 },
    ],
  };
  const p = computeMatchPressure(session);
  assert.equal(p, 0);
});

test('Atlas: match_pressure ~50 when even', () => {
  const session = {
    units: [
      { id: 'p1', controlled_by: 'player', hp: 10, max_hp: 10, ap_remaining: 2, ap: 2 },
      { id: 'e1', controlled_by: 'sistema', hp: 5, max_hp: 5, ap_remaining: 2, ap: 2 },
    ],
  };
  const p = computeMatchPressure(session);
  // Both at 100% HP, both alive, both have AP → should be near 50
  assert.ok(p > 40 && p < 70, `pressure ${p} should be near 50`);
});

test('Atlas: momentum labels reflect pressure ranges', () => {
  const s = { _last_atlas_pressure: 50 };
  assert.equal(computeMomentum(s, 80).label, 'player_dominant');
  assert.equal(computeMomentum(s, 65).label, 'player_advantage');
  assert.equal(computeMomentum(s, 50).label, 'even');
  assert.equal(computeMomentum(s, 30).label, 'enemy_advantage');
  assert.equal(computeMomentum(s, 10).label, 'enemy_dominant');
});

test('Atlas: warning_signals fire on low HP player', () => {
  const session = {
    units: [
      { id: 'p1', controlled_by: 'player', hp: 1, max_hp: 10 }, // 10% — critical
      { id: 'p2', controlled_by: 'player', hp: 3, max_hp: 10 }, // 30% — warning
      { id: 'e1', controlled_by: 'sistema', hp: 5, max_hp: 5 },
    ],
  };
  const signals = computeWarningSignals(session, 50);
  const critical = signals.filter((s) => s.severity === 'critical');
  const warning = signals.filter((s) => s.severity === 'warning');
  assert.ok(critical.length >= 1, 'critical low_hp signal expected');
  assert.ok(warning.length >= 1, 'warning low_hp signal expected');
});

test('Atlas: warning_signals fire victory_imminent at high pressure', () => {
  const session = {
    units: [
      { id: 'p1', controlled_by: 'player', hp: 10, max_hp: 10 },
      { id: 'e1', controlled_by: 'sistema', hp: 1, max_hp: 5 },
    ],
  };
  const signals = computeWarningSignals(session, 80);
  const victory = signals.find((s) => s.type === 'victory_imminent');
  assert.ok(victory, 'victory_imminent signal expected at pressure >= 75');
});

test('Atlas: state endpoint exposes atlas object', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  const sid = startRes.body.session_id;

  const stateRes = await request(app).get('/api/session/state').query({ session_id: sid });
  assert.equal(stateRes.status, 200);
  assert.ok(stateRes.body.atlas, 'state must include atlas');
  assert.ok(typeof stateRes.body.atlas.match_pressure === 'number', 'match_pressure number');
  assert.ok(stateRes.body.atlas.momentum, 'momentum object');
  assert.ok(Array.isArray(stateRes.body.atlas.warning_signals), 'warning_signals array');

  console.log(
    `\n  Atlas snapshot: pressure=${stateRes.body.atlas.match_pressure} momentum=${stateRes.body.atlas.momentum.label}/${stateRes.body.atlas.momentum.trend} signals=${stateRes.body.atlas.warning_signals.length}\n`,
  );
});

test('Atlas: buildAtlasLive returns full package', () => {
  const session = {
    units: [
      { id: 'p1', controlled_by: 'player', hp: 10, max_hp: 10 },
      { id: 'e1', controlled_by: 'sistema', hp: 5, max_hp: 5 },
    ],
  };
  const atlas = buildAtlasLive(session);
  assert.ok(typeof atlas.match_pressure === 'number');
  assert.ok(atlas.momentum && atlas.momentum.label);
  assert.ok(Array.isArray(atlas.warning_signals));
});
