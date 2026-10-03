const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeRawMetrics, computeMbtiAxes } = require('../../apps/backend/services/vcScoring');

const units = [{ id: 'unit_1', controlled_by: 'player', max_hp: 10 }];

test('SPEC-A: commit_latency signal-events accumulate into raw.commit_latency_norm', () => {
  const events = [
    { kind: 'signal', type: 'commit_latency', actor_id: 'unit_1', playerId: 'p1', value: 2400 },
    { kind: 'signal', type: 'commit_latency', actor_id: 'unit_1', playerId: 'p1', value: 2700 },
  ];
  const raw = computeRawMetrics(events, units);
  assert.ok(raw.unit_1, 'unit_1 bucket present');
  assert.notEqual(raw.unit_1.commit_latency_norm, null);
  assert.ok(raw.unit_1.commit_latency_norm > 0.5, 'avg 2550/3000 ~ 0.85');
});

test('SPEC-A: hesitation + preview_dwell signal-events also accumulate', () => {
  const events = [
    { kind: 'signal', type: 'hesitation_score', actor_id: 'unit_1', value: 3 },
    { kind: 'signal', type: 'preview_dwell', actor_id: 'unit_1', value: 2000 },
  ];
  const raw = computeRawMetrics(events, units);
  assert.ok(
    Number.isFinite(raw.unit_1.hesitation_rate) && raw.unit_1.hesitation_rate > 0,
    'hesitation_rate finite > 0 (3/5 = 0.6)',
  );
  assert.ok(
    Number.isFinite(raw.unit_1.preview_dwell_norm) && raw.unit_1.preview_dwell_norm > 0,
    'preview_dwell_norm finite > 0 (2000/4000 = 0.5)',
  );
});

test('SPEC-A: high commit_latency pushes J_P toward P (lower value)', () => {
  const baseAxes = computeMbtiAxes({ setup_ratio: 0.5, time_to_commit: 0.5 });
  const sigAxes = computeMbtiAxes({
    setup_ratio: 0.5,
    time_to_commit: 0.5,
    commit_latency_norm: 0.9,
  });
  assert.ok(baseAxes.J_P && sigAxes.J_P, 'both J_P computed');
  assert.ok(
    sigAxes.J_P.value < baseAxes.J_P.value,
    `signal J_P ${sigAxes.J_P.value} < baseline ${baseAxes.J_P.value} (toward P)`,
  );
});

test('SPEC-A: absent commit_latency leaves J_P at legacy two-term value (backward compat)', () => {
  const axes = computeMbtiAxes({ setup_ratio: 0.5, time_to_commit: 0.5 });
  // legacy: 1 - 0.75*setup - 0.25*time_to_commit = 1 - 0.375 - 0.125 = 0.5
  assert.equal(axes.J_P.value, 0.5);
});
