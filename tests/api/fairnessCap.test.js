'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { checkCapPtBudget, consumeCapPt, FALLBACK_CAP_PT_MAX } = require(
  path.resolve(__dirname, '../../apps/backend/services/fairnessCap'),
);

test('checkCapPtBudget: within budget', () => {
  const result = checkCapPtBudget({ cap_pt_used: 0 }, 1, { cap_pt_max: 1 });
  assert.deepEqual(result, { ok: true, used: 0, max: 1, requested: 1 });
});

test('checkCapPtBudget: exactly at the boundary (used + req == max)', () => {
  const result = checkCapPtBudget({ cap_pt_used: 1 }, 1, { cap_pt_max: 2 });
  assert.equal(result.ok, true);
  assert.equal(result.used, 1);
  assert.equal(result.max, 2);
  assert.equal(result.requested, 1);
});

test('checkCapPtBudget: over budget', () => {
  const result = checkCapPtBudget({ cap_pt_used: 1 }, 1, { cap_pt_max: 1 });
  assert.equal(result.ok, false);
});

test('checkCapPtBudget: requested non-positive / non-finite is clamped to 0', () => {
  for (const requested of [0, -5, NaN]) {
    const result = checkCapPtBudget({ cap_pt_used: 0 }, requested, { cap_pt_max: 1 });
    assert.equal(result.requested, 0);
    assert.equal(result.ok, true);
  }
});

test('checkCapPtBudget: config missing / cap_pt_max non-finite falls back to FALLBACK_CAP_PT_MAX', () => {
  const result1 = checkCapPtBudget({ cap_pt_used: 0 }, 1, undefined);
  assert.equal(result1.max, FALLBACK_CAP_PT_MAX);

  const result2 = checkCapPtBudget({ cap_pt_used: 0 }, 1, {});
  assert.equal(result2.max, 1);
});

test('checkCapPtBudget: session missing / cap_pt_used non-finite is treated as used 0', () => {
  const result = checkCapPtBudget(undefined, 1, { cap_pt_max: 1 });
  assert.equal(result.used, 0);
  assert.equal(result.ok, true);
});

test('consumeCapPt: accumulates', () => {
  const s = { cap_pt_used: 0 };
  consumeCapPt(s, 2);
  consumeCapPt(s, 3);
  assert.equal(s.cap_pt_used, 5);
});

test('consumeCapPt: initializes a non-finite counter', () => {
  const s = {};
  consumeCapPt(s, 3);
  assert.equal(s.cap_pt_used, 3);
});

test('consumeCapPt: no-op on non-positive / non-finite amount', () => {
  for (const amount of [0, -1, NaN]) {
    const s = { cap_pt_used: 4 };
    consumeCapPt(s, amount);
    assert.equal(s.cap_pt_used, 4);
  }
});

test('consumeCapPt: returns undefined', () => {
  const s = { cap_pt_used: 0 };
  const result = consumeCapPt(s, 1);
  assert.equal(result, undefined);
});
