// M14-B 2026-04-25 — pincer detection unit tests.
// Ref: docs/research/triangle-strategy-transfer-plan.md:187,209
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { detectPincer } = require('../../apps/backend/services/grid/hexGrid');

test('pincer: ally on antipodal hex → pincer=true', () => {
  const attacker = { q: 1, r: 0 };
  const target = { q: 0, r: 0 };
  const allies = [{ q: -1, r: 0, id: 'ally_1' }];
  const result = detectPincer(attacker, target, allies);
  assert.equal(result.pincer, true);
  assert.equal(result.opposite_ally_id, 'ally_1');
  assert.deepEqual(result.opposite_hex, { q: -1, r: 0 });
});

test('pincer: no ally on antipodal hex → pincer=false but hex exposed', () => {
  const attacker = { q: 1, r: 0 };
  const target = { q: 0, r: 0 };
  const allies = [{ q: 0, r: 1, id: 'ally_side' }];
  const result = detectPincer(attacker, target, allies);
  assert.equal(result.pincer, false);
  assert.equal(result.opposite_ally_id, null);
  assert.deepEqual(result.opposite_hex, { q: -1, r: 0 });
});

test('pincer: attacker not adjacent → pincer=false', () => {
  const attacker = { q: 2, r: 0 };
  const target = { q: 0, r: 0 };
  const allies = [{ q: -2, r: 0, id: 'ally_1' }];
  const result = detectPincer(attacker, target, allies);
  assert.equal(result.pincer, false);
  assert.equal(result.opposite_hex, null);
});

test('pincer: all 6 antipodal hex pairs work (axial directions)', () => {
  const target = { q: 5, r: 5 };
  const pairs = [
    [
      { q: 6, r: 5 },
      { q: 4, r: 5 },
    ], // +q / -q
    [
      { q: 6, r: 4 },
      { q: 4, r: 6 },
    ], // NE / SW
    [
      { q: 5, r: 4 },
      { q: 5, r: 6 },
    ], // -r / +r
  ];
  for (const [attacker, oppHex] of pairs) {
    const result = detectPincer(attacker, target, [{ ...oppHex, id: 'opp' }]);
    assert.equal(result.pincer, true, `expected pincer for attacker ${JSON.stringify(attacker)}`);
  }
});

test('pincer: allies=null handled gracefully', () => {
  const attacker = { q: 1, r: 0 };
  const target = { q: 0, r: 0 };
  const result = detectPincer(attacker, target, null);
  assert.equal(result.pincer, false);
  assert.deepEqual(result.opposite_hex, { q: -1, r: 0 });
});

test('pincer: missing attacker/target → pincer=false', () => {
  assert.equal(detectPincer(null, { q: 0, r: 0 }, []).pincer, false);
  assert.equal(detectPincer({ q: 1, r: 0 }, null, []).pincer, false);
});

test('pincer: ally id null when anonymous ally hex present', () => {
  const result = detectPincer(
    { q: 1, r: 0 },
    { q: 0, r: 0 },
    [{ q: -1, r: 0 }], // no id field
  );
  assert.equal(result.pincer, true);
  assert.equal(result.opposite_ally_id, null);
});
