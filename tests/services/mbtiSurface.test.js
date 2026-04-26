// OD-013 Path A — MBTI phased reveal helper tests.
//
// Scope:
//   - computeRevealedAxes: gating su confidence threshold, label italiani
//   - buildMbtiRevealedMap: shape per_actor coerente
//   - Edge cases: missing axes, malformed entry, dead-band, threshold override
//   - resolveThreshold: env var + opts override + clamp [0..1]

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  computeConfidence,
  computeRevealedAxes,
  buildMbtiRevealedMap,
  resolveThreshold,
  AXIS_LABELS,
  AXIS_HINTS,
} = require('../../apps/backend/services/mbtiSurface');

test('computeConfidence: full coverage + decisive value → high confidence', () => {
  // value=0.9 → decisiveness=0.8, full=1.0 → conf=0.8
  const conf = computeConfidence({ value: 0.9, coverage: 'full' });
  assert.equal(conf, 0.8);
  assert.ok(conf >= 0.7, 'full+decisive should pass default threshold');
});

test('computeConfidence: full coverage + dead-band → low confidence', () => {
  // value=0.5 → decisiveness=0, conf=0
  const conf = computeConfidence({ value: 0.5, coverage: 'full' });
  assert.equal(conf, 0);
});

test('computeConfidence: partial coverage capped lower', () => {
  // value=0.95 → decisiveness=0.9, partial=0.6 → conf=0.54
  const conf = computeConfidence({ value: 0.95, coverage: 'partial' });
  assert.equal(conf, 0.54);
  assert.ok(conf < 0.7, 'partial coverage should not pass default threshold even if decisive');
});

test('computeConfidence: null/missing axis → 0', () => {
  assert.equal(computeConfidence(null), 0);
  assert.equal(computeConfidence(undefined), 0);
  assert.equal(computeConfidence({}), 0);
  assert.equal(computeConfidence({ value: null, coverage: 'full' }), 0);
});

test('computeRevealedAxes: all 4 axes high confidence → all revealed with Italian labels', () => {
  const actorVc = {
    mbti_axes: {
      E_I: { value: 0.9, coverage: 'full' }, // → I (Introversione)
      S_N: { value: 0.1, coverage: 'full' }, // → S (Intuizione → low side)
      T_F: { value: 0.85, coverage: 'full' }, // → F (Pensiero high)
      J_P: { value: 0.15, coverage: 'full' }, // → J (Percezione low side)
    },
  };
  const result = computeRevealedAxes(actorVc);
  assert.equal(result.revealed.length, 4);
  assert.equal(result.hidden.length, 0);
  // Verify Italian labels conservative
  const labels = result.revealed.map((r) => r.label);
  assert.ok(labels.includes('Introversione'));
  assert.ok(labels.includes('Pensiero'));
  // axis_label always present
  for (const r of result.revealed) {
    assert.ok(r.axis_label, `axis_label missing for ${r.axis}`);
    assert.ok(r.confidence >= 0.7, `confidence ${r.confidence} below threshold for ${r.axis}`);
  }
});

test('computeRevealedAxes: 2 axes low confidence → 2 hidden with hints', () => {
  const actorVc = {
    mbti_axes: {
      E_I: { value: 0.95, coverage: 'full' }, // revealed
      S_N: { value: 0.5, coverage: 'full' }, // dead-band → hidden
      T_F: { value: 0.05, coverage: 'full' }, // revealed
      J_P: null, // → hidden
    },
  };
  const result = computeRevealedAxes(actorVc);
  assert.equal(result.revealed.length, 2);
  assert.equal(result.hidden.length, 2);
  const hiddenAxes = result.hidden.map((h) => h.axis).sort();
  assert.deepEqual(hiddenAxes, ['J_P', 'S_N']);
  for (const h of result.hidden) {
    assert.ok(h.hint, `hint missing for ${h.axis}`);
    assert.ok(typeof h.hint === 'string' && h.hint.length > 0);
  }
});

test('computeRevealedAxes: threshold override loosens reveal gate', () => {
  // partial coverage + value=0.95 → conf=0.54 → hidden at default 0.7
  const actorVc = {
    mbti_axes: {
      E_I: { value: 0.95, coverage: 'partial' },
      S_N: null,
      T_F: null,
      J_P: null,
    },
  };
  const strict = computeRevealedAxes(actorVc, { threshold: 0.7 });
  assert.equal(strict.revealed.length, 0);
  const loose = computeRevealedAxes(actorVc, { threshold: 0.5 });
  assert.equal(loose.revealed.length, 1);
  assert.equal(loose.revealed[0].axis, 'E_I');
});

test('computeRevealedAxes: missing actorVc / malformed → empty arrays', () => {
  assert.deepEqual(computeRevealedAxes(null), { revealed: [], hidden: [] });
  assert.deepEqual(computeRevealedAxes({}), { revealed: [], hidden: [] });
  assert.deepEqual(computeRevealedAxes({ mbti_axes: null }), { revealed: [], hidden: [] });
  // malformed but truthy → fills hidden for all 4 axes
  const result = computeRevealedAxes({ mbti_axes: { E_I: 'broken', S_N: 42 } });
  assert.equal(result.revealed.length, 0);
  assert.equal(result.hidden.length, 4);
});

test('buildMbtiRevealedMap: per_actor shape preserved keyed by unit id', () => {
  const vcSnapshot = {
    per_actor: {
      unit_alpha: {
        mbti_axes: {
          E_I: { value: 0.9, coverage: 'full' },
          S_N: { value: 0.1, coverage: 'full' },
          T_F: { value: 0.9, coverage: 'full' },
          J_P: { value: 0.1, coverage: 'full' },
        },
      },
      unit_beta: {
        mbti_axes: {
          E_I: null,
          S_N: null,
          T_F: null,
          J_P: null,
        },
      },
    },
  };
  const map = buildMbtiRevealedMap(vcSnapshot);
  assert.deepEqual(Object.keys(map).sort(), ['unit_alpha', 'unit_beta']);
  assert.equal(map.unit_alpha.revealed.length, 4);
  assert.equal(map.unit_beta.hidden.length, 4);
});

test('buildMbtiRevealedMap: empty/malformed snapshot → empty map', () => {
  assert.deepEqual(buildMbtiRevealedMap(null), {});
  assert.deepEqual(buildMbtiRevealedMap({}), {});
  assert.deepEqual(buildMbtiRevealedMap({ per_actor: null }), {});
});

test('resolveThreshold: opts > env > default; clamp [0..1]', () => {
  // default
  delete process.env.MBTI_REVEAL_THRESHOLD;
  assert.equal(resolveThreshold(undefined), 0.7);
  // env override
  process.env.MBTI_REVEAL_THRESHOLD = '0.5';
  assert.equal(resolveThreshold(undefined), 0.5);
  // opts beats env
  assert.equal(resolveThreshold(0.9), 0.9);
  // out-of-range opts → fallback to env
  assert.equal(resolveThreshold(1.5), 0.5);
  assert.equal(resolveThreshold(-0.1), 0.5);
  // out-of-range env → fallback to default
  process.env.MBTI_REVEAL_THRESHOLD = '99';
  assert.equal(resolveThreshold(undefined), 0.7);
  delete process.env.MBTI_REVEAL_THRESHOLD;
});

test('buildMbtiRevealedMap: short session (events_count < 30) uses threshold 0.6 default', () => {
  // partial coverage + value=0.95 → confidence=0.54.
  // Default threshold 0.7 → hidden. Short-session threshold 0.6 → still hidden.
  // value 0.85 + full coverage → conf=0.7 → reveals at 0.7. Lower it: 0.75 + full → 0.5 conf.
  // We want a case where 0.6 reveals but 0.7 doesn't. value=0.7+full → conf=0.4 (no good).
  // Use partial+0.85: confidence = 0.6 * (|0.85-0.5|*2) = 0.6 * 0.7 = 0.42. Still below 0.6.
  // Use full + 0.8: conf = 1.0 * 0.6 = 0.6 → reveals at 0.6 but not 0.7.
  delete process.env.MBTI_REVEAL_THRESHOLD;
  const vcSnapshot = {
    meta: { events_count: 10 },
    per_actor: {
      u1: {
        mbti_axes: {
          E_I: { value: 0.8, coverage: 'full' }, // conf = 0.6
          S_N: null,
          T_F: null,
          J_P: null,
        },
      },
    },
  };
  const map = buildMbtiRevealedMap(vcSnapshot);
  // events_count=10 < 30 → threshold 0.6 → conf 0.6 reveals.
  assert.equal(map.u1.revealed.length, 1);
  assert.equal(map.u1.revealed[0].axis, 'E_I');
});

test('buildMbtiRevealedMap: long session (events_count >= 30) keeps threshold 0.7', () => {
  delete process.env.MBTI_REVEAL_THRESHOLD;
  const vcSnapshot = {
    meta: { events_count: 100 },
    per_actor: {
      u1: {
        mbti_axes: {
          E_I: { value: 0.8, coverage: 'full' }, // conf = 0.6
          S_N: null,
          T_F: null,
          J_P: null,
        },
      },
    },
  };
  const map = buildMbtiRevealedMap(vcSnapshot);
  // events_count=100 >= 30 → threshold 0.7 → conf 0.6 below → hidden.
  assert.equal(map.u1.revealed.length, 0);
  assert.equal(map.u1.hidden.length, 4);
});

test('buildMbtiRevealedMap: explicit opts.threshold beats short-session boost', () => {
  delete process.env.MBTI_REVEAL_THRESHOLD;
  const vcSnapshot = {
    meta: { events_count: 10 },
    per_actor: {
      u1: {
        mbti_axes: {
          E_I: { value: 0.8, coverage: 'full' }, // conf = 0.6
          S_N: null,
          T_F: null,
          J_P: null,
        },
      },
    },
  };
  // Explicit higher threshold should win even on short session.
  const map = buildMbtiRevealedMap(vcSnapshot, { threshold: 0.9 });
  assert.equal(map.u1.revealed.length, 0);
});

test('AXIS_LABELS + AXIS_HINTS export coverage for all 4 axes', () => {
  for (const axis of ['E_I', 'S_N', 'T_F', 'J_P']) {
    assert.ok(AXIS_LABELS[axis], `AXIS_LABELS missing ${axis}`);
    assert.ok(AXIS_LABELS[axis].lo);
    assert.ok(AXIS_LABELS[axis].hi);
    assert.ok(AXIS_LABELS[axis].label);
    assert.ok(AXIS_HINTS[axis], `AXIS_HINTS missing ${axis}`);
    assert.ok(typeof AXIS_HINTS[axis] === 'string' && AXIS_HINTS[axis].length > 0);
  }
});
