'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { checkGridRatify } = require('../../tools/js/validate_encounter_grid_ratify');

const baseline = { encounters: { enc_x: { grid_size: [8, 8], evidence_ref: null } } };

test('grid unchanged -> no warn', () => {
  const w = checkGridRatify({ encounter_id: 'enc_x', grid_size: [8, 8] }, baseline);
  assert.equal(w.length, 0);
});

test('grid changed without fresh evidence -> warn', () => {
  const w = checkGridRatify({ encounter_id: 'enc_x', grid_size: [12, 12] }, baseline);
  assert.equal(w.length, 1);
  assert.match(w[0], /grid changed/);
});

test('encounter absent from baseline -> unratified warn', () => {
  const w = checkGridRatify({ encounter_id: 'enc_new', grid_size: [10, 10] }, baseline);
  assert.equal(w.length, 1);
  assert.match(w[0], /unratified/);
});
