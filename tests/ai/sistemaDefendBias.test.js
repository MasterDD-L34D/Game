// M1 -- defensive-posture overlay: high-threat PG => SIS retreats sooner (+20%).
const test = require('node:test');
const assert = require('node:assert/strict');
const { selectAiPolicy, _cfg } = require('../../apps/backend/services/ai/policy');

function actor(hpRatio) {
  return {
    id: 's1',
    hp: Math.round(hpRatio * 100),
    max_hp: 100,
    attack_range: 1,
    position: { x: 0, y: 0 },
    status: {},
  };
}
function target() {
  return { id: 'p1', hp: 100, max_hp: 100, attack_range: 1, position: { x: 9, y: 9 }, status: {} };
}

test('baseline: hp just above retreat threshold -> not retreat', () => {
  const ratio = _cfg.LOW_HP_RETREAT_THRESHOLD + 0.05;
  const p = selectAiPolicy(actor(ratio), target(), null, null);
  assert.notEqual(p.intent, 'retreat');
});

test('persistent_high_threat: hp in widened band now retreats (+20% threshold)', () => {
  const base = _cfg.LOW_HP_RETREAT_THRESHOLD;
  const between = base + (base * 0.2) / 2; // base < between < base*1.2
  const p = selectAiPolicy(actor(between), target(), null, { persistent_high_threat: true });
  assert.equal(p.intent, 'retreat');
});

test('persistent_high_threat does NOT override critical escalation', () => {
  const p = selectAiPolicy(actor(0.5), target(), null, {
    escalation_tier: 'critical',
    persistent_high_threat: true,
  });
  assert.notEqual(p.intent, 'retreat'); // critical all-in wins
});

test('determinism: same inputs -> same output', () => {
  const a = selectAiPolicy(actor(0.1), target(), null, { persistent_high_threat: true });
  const b = selectAiPolicy(actor(0.1), target(), null, { persistent_high_threat: true });
  assert.deepEqual(a, b);
});
