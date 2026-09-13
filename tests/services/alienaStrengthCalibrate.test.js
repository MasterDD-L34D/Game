'use strict';
// #5 ALIENA enforcement strength calibration harness test.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calibrate } = require('../../tools/js/aliena_strength_calibrate');

test('calibrate: intruder spawn-share is monotonic non-increasing as strength rises', () => {
  const res = calibrate({ biomeId: 'cryosteppe_convergence' });
  assert.ok(Array.isArray(res.rows) && res.rows.length >= 2, 'rows present');
  for (let i = 1; i < res.rows.length; i += 1) {
    assert.ok(
      res.rows[i].intruder_share <= res.rows[i - 1].intruder_share + 1e-9,
      `intruder_share non-increasing at strength ${res.rows[i].strength}`,
    );
  }
});

test('calibrate: strength=1 suppresses intruder share below strength=0 baseline', () => {
  const res = calibrate({ biomeId: 'cryosteppe_convergence' });
  const off = res.rows.find((r) => r.strength === 0);
  const full = res.rows.find((r) => r.strength === 1);
  assert.ok(off && full, 'has strength 0 and 1 rows');
  assert.ok(full.intruder_share < off.intruder_share, 'strength=1 intruder_share < off');
  assert.ok(full.intruder_share >= 0, 'share non-negative');
});
