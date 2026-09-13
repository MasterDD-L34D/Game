// Sprint v3.5 — Triangle Strategy Conviction surfacing tests.
//
// Scope:
//   - buildConvictionBadges: gating threshold + delta + ordering + color mapping
//   - buildConvictionBadgesMap: shape per_actor + filtering empty
//   - Color palette consistency (4 axes mapped)
//   - Edge cases: dead-band, missing axes, no previous snapshot, low delta

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildConvictionBadges,
  buildConvictionBadgesMap,
  AXIS_COLORS,
  CONVICTION_THRESHOLD,
  CONVICTION_DELTA_MIN,
} = require('../../apps/backend/services/mbtiSurface');

test('buildConvictionBadges: high confidence + decisive value → badge for each axis', () => {
  // 4 axes all decisive (value 0.9 → decisiveness 0.8, full=1.0 → conf 0.8 ≥ 0.75)
  const actor = {
    mbti_axes: {
      E_I: { value: 0.9, coverage: 'full' },
      S_N: { value: 0.1, coverage: 'full' },
      T_F: { value: 0.92, coverage: 'full' },
      J_P: { value: 0.08, coverage: 'full' },
    },
  };
  const badges = buildConvictionBadges(actor);
  assert.equal(badges.length, 4, 'all 4 axes should produce a badge');
  // Color palette: each axis must have its mapped color
  for (const b of badges) {
    assert.equal(b.color, AXIS_COLORS[b.axis].color, `${b.axis} color mismatch`);
    assert.ok(b.confidence >= CONVICTION_THRESHOLD, `${b.axis} below threshold`);
  }
});

test('buildConvictionBadges: low confidence → no badge', () => {
  // value=0.55 → decisiveness 0.1, conf=0.1 < 0.75
  const actor = {
    mbti_axes: {
      E_I: { value: 0.55, coverage: 'full' },
      T_F: { value: 0.5, coverage: 'full' }, // dead-band
    },
  };
  const badges = buildConvictionBadges(actor);
  assert.equal(badges.length, 0, 'no badges below threshold or in dead-band');
});

test('buildConvictionBadges: ordering by confidence DESC', () => {
  const actor = {
    mbti_axes: {
      // confidence 0.6 (partial 0.6 * decisiveness 1.0 = 0.6)
      E_I: { value: 1.0, coverage: 'partial' },
      // confidence 0.8
      T_F: { value: 0.9, coverage: 'full' },
      // confidence 0.94 (highest)
      J_P: { value: 0.97, coverage: 'full' },
    },
  };
  const badges = buildConvictionBadges(actor);
  // Solo T_F e J_P passano threshold 0.75 (E_I conf 0.6 < 0.75)
  assert.equal(badges.length, 2);
  assert.equal(badges[0].axis, 'J_P', 'first should be highest confidence');
  assert.ok(
    badges[0].confidence >= badges[1].confidence,
    'badges must be sorted DESC by confidence',
  );
});

test('buildConvictionBadges: delta gate filters micro-shifts', () => {
  const current = {
    mbti_axes: {
      T_F: { value: 0.9, coverage: 'full' }, // conf=0.8 ≥ 0.75
    },
  };
  const previousMicro = {
    mbti_axes: {
      T_F: { value: 0.89, coverage: 'full' }, // delta=0.01 < 0.08 → no badge
    },
  };
  const badgesMicro = buildConvictionBadges(current, { previousActorVc: previousMicro });
  assert.equal(badgesMicro.length, 0, 'micro-shift filtered');

  const previousBig = {
    mbti_axes: {
      T_F: { value: 0.55, coverage: 'full' }, // delta=0.35 ≥ 0.08 → badge
    },
  };
  const badgesBig = buildConvictionBadges(current, { previousActorVc: previousBig });
  assert.equal(badgesBig.length, 1, 'big shift produces badge');
  assert.equal(badgesBig[0].delta, 0.35);
});

test('buildConvictionBadges: missing/null axes handled gracefully', () => {
  assert.deepEqual(buildConvictionBadges(null), []);
  assert.deepEqual(buildConvictionBadges({}), []);
  assert.deepEqual(buildConvictionBadges({ mbti_axes: null }), []);
  assert.deepEqual(buildConvictionBadges({ mbti_axes: { E_I: null, S_N: { value: null } } }), []);
});

test('buildConvictionBadgesMap: filters actors without badges', () => {
  const vcSnapshot = {
    per_actor: {
      'unit-A': {
        mbti_axes: {
          E_I: { value: 0.9, coverage: 'full' }, // produces badge
        },
      },
      'unit-B': {
        mbti_axes: {
          T_F: { value: 0.5, coverage: 'full' }, // dead-band, no badge
        },
      },
    },
  };
  const map = buildConvictionBadgesMap(vcSnapshot);
  assert.ok('unit-A' in map, 'unit-A should have badges');
  assert.ok(!('unit-B' in map), 'unit-B without badges should be omitted');
  assert.ok(Array.isArray(map['unit-A']));
  assert.equal(map['unit-A'].length, 1);
});

test('buildConvictionBadgesMap: previous snapshot delta gate per actor', () => {
  const current = {
    per_actor: {
      'unit-A': {
        mbti_axes: { T_F: { value: 0.85, coverage: 'full' } },
      },
    },
  };
  const previous = {
    per_actor: {
      'unit-A': {
        mbti_axes: { T_F: { value: 0.84, coverage: 'full' } }, // micro shift
      },
    },
  };
  const map = buildConvictionBadgesMap(current, { previousVcSnapshot: previous });
  assert.ok(!('unit-A' in map), 'micro-shift should filter unit-A out of map');
});

test('AXIS_COLORS: all 4 MBTI axes have distinct colors', () => {
  const colors = ['E_I', 'S_N', 'T_F', 'J_P'].map((a) => AXIS_COLORS[a].color);
  const unique = new Set(colors);
  assert.equal(unique.size, 4, 'all 4 axis colors must be distinct');
  // Sanity: all hex colors
  for (const c of colors) {
    assert.match(c, /^#[0-9a-f]{6}$/i, `color ${c} must be hex`);
  }
});

test('CONVICTION_THRESHOLD constants exposed and stricter than reveal', () => {
  // Reveal default 0.7 (Disco Elysium), conviction stricter 0.75
  assert.ok(CONVICTION_THRESHOLD >= 0.7, 'conviction threshold ≥ reveal default');
  assert.ok(CONVICTION_DELTA_MIN > 0 && CONVICTION_DELTA_MIN < 0.5, 'sane delta min');
});
