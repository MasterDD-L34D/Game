// FP->VC wiring integration -- buildVcSnapshot applies the Form Pulse delta when
// session.formPulses is present, and is a no-op (backward compat) when absent.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadTelemetryConfig, buildVcSnapshot } = require('../../apps/backend/services/vcScoring');
const {
  MAX_FP_VC_DELTA,
  PROPOSED_FP_VC_MAPPING,
} = require('../../apps/backend/services/formPulseVc');

const CONFIG_PATH = path.resolve(__dirname, '..', '..', 'data', 'core', 'telemetry.yaml');
const cfg = loadTelemetryConfig(CONFIG_PATH, { log: () => {}, warn: () => {} });

function mkSession() {
  const events = [];
  for (let t = 1; t <= 14; t += 1) {
    events.push({
      turn: t,
      action_type: 'attack',
      actor_id: 'unit_1',
      target_id: 'unit_2',
      position_from: { x: 2, y: 2 },
      target_position_at_attack: { x: 3, y: 2 },
      result: 'hit',
      damage_dealt: 2,
      mos: 3,
      target_hp_before: 10,
      target_hp_after: 8,
    });
  }
  return {
    session_id: 'fp-wire-test',
    turn: 1,
    units: [
      { id: 'unit_1', controlled_by: 'player', hp: 10, max_hp: 10, position: { x: 0, y: 0 } },
      { id: 'unit_2', controlled_by: 'sistema', hp: 10, max_hp: 10, position: { x: 5, y: 5 } },
    ],
    events,
    grid: { width: 6, height: 6 },
  };
}

test('buildVcSnapshot: no formPulses -> no axis is fp_adjusted (backward compat)', () => {
  const snap = buildVcSnapshot(mkSession(), cfg);
  for (const axis of Object.values(snap.per_actor.unit_1.mbti_axes)) {
    if (axis && typeof axis === 'object') assert.notEqual(axis.fp_adjusted, true);
  }
});

test('buildVcSnapshot: session.formPulses applies bounded fp_adjusted nudge to a finite axis', () => {
  // pick the MBTI axis our first proposed mapping targets
  const [fpKey, mapCfg] = Object.entries(PROPOSED_FP_VC_MAPPING)[0];
  const session = mkSession();
  const base = buildVcSnapshot(session, cfg);
  const baseAxis = base.per_actor.unit_1.mbti_axes[mapCfg.mbti];

  session.formPulses = new Map([
    ['p1', { axes: { [fpKey]: 1 } }],
    ['p2', { axes: { [fpKey]: 1 } }],
  ]);
  const withFp = buildVcSnapshot(session, cfg);
  const fpAxis = withFp.per_actor.unit_1.mbti_axes[mapCfg.mbti];

  if (baseAxis && Number.isFinite(Number(baseAxis.value))) {
    assert.equal(fpAxis.fp_adjusted, true);
    const delta = Number(fpAxis.value) - Number(baseAxis.value);
    assert.ok(Math.abs(delta) <= MAX_FP_VC_DELTA + 1e-9, `delta ${delta} exceeds cap`);
  } else {
    // axis null in baseline -> nudge must be a no-op (never crash)
    assert.ok(!fpAxis || fpAxis.fp_adjusted !== true);
  }
});
