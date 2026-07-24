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

test('grid changed with fresh matching evidence -> no warn', () => {
  const b = {
    encounters: {
      enc_y: {
        grid_size: [16, 16],
        evidence_ref: 'docs/reports/2026-07-01-n40-evidence.md',
      },
    },
  };
  const w = checkGridRatify({ encounter_id: 'enc_y', grid_size: [16, 16] }, b);
  assert.equal(w.length, 0);
});

test('grid changed with STALE evidence (ratified a different size) -> still warn', () => {
  // Reproduces reviewer finding: an entry with ANY evidence_ref must not
  // permanently suppress the warning once grid_size changes again without
  // re-ratifying. baseline.grid_size represents the size the evidence_ref
  // actually ratified (per spec workflow); current grid diverges from it.
  const b = {
    encounters: {
      enc_z: {
        grid_size: [10, 10],
        evidence_ref: 'docs/reports/2026-06-01-n40-evidence.md',
      },
    },
  };
  const w = checkGridRatify({ encounter_id: 'enc_z', grid_size: [16, 16] }, b);
  assert.equal(w.length, 1);
  assert.match(w[0], /grid changed/);
});
